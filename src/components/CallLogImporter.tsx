import {useMemo,useState} from 'react';
import type {State} from '../types';
import {defaultSelections,matchingOptions,minuteKpi,parsePhoneHistory,registry,secondsLabel,type PhoneCallRow,type ImportSelection} from '../lib/callLogImport';

function ukDay(){
 const ps=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const f=(key:string)=>ps.find(p=>p.type===key)?.value||'';
 return [f('year'),f('month'),f('day')].join('-');
}
export function CallLogImporter({state,onImport,onClose}:{state:State;onImport:(rows:PhoneCallRow[],selections:ImportSelection)=>string|void;onClose:()=>void}){
 const [input,setInput]=useState(''),[date,setDate]=useState(ukDay),[decisions,setDecisions]=useState<ImportSelection>({}),[confirmed,setConfirmed]=useState(false),[error,setError]=useState('');
 const parsed=useMemo(()=>{try{return {data:parsePhoneHistory(input,date),error:''}}catch(err){return {data:null,error:(err as Error).message}}},[input,date]);
 const rows=parsed.data?.rows||[];
 const proposed=useMemo(()=>defaultSelections(state,rows),[state,rows]);
 const savedKeys=useMemo(()=>new Set(registry(state).records.map(x=>x.key)),[state]);
 const chosen=(row:PhoneCallRow)=>savedKeys.has(row.key)?'skip':decisions[row.key]||proposed[row.key]||'review';
 const unlogged=rows.filter(row=>chosen(row)==='unlogged');
 const pending=rows.filter(row=>chosen(row)==='review');
 const matched=rows.filter(row=>!['review','unlogged','skip'].includes(chosen(row)));
 const toImport=rows.filter(row=>chosen(row)!=='skip');
 const totalSeconds=rows.reduce((n,row)=>n+row.durationSeconds,0);
 const nowKpi=minuteKpi(state,new Date());
 const set=(key:string,value:string)=>{setDecisions(prev=>({...prev,[key]:value}));setError('');setConfirmed(false)};
 const markUnresolved=()=>{setDecisions(prev=>({...prev,...Object.fromEntries(pending.map(row=>[row.key,'unlogged']))}));setConfirmed(false);setError('')};
 const save=()=>{
  if(!toImport.length){setError('No new outgoing calls to import.');return}
  if(pending.length){setError('Select an existing call, KPI-only dial or Skip for each unresolved row.');return}
  if(unlogged.length&&!confirmed){setError('Confirm that the KPI-only calls really happened and have not already been logged in SalesOS.');return}
  const error=onImport(rows,Object.fromEntries(rows.map(row=>[row.key,chosen(row)])));
  if(error){setError(error);return}
  setInput('');setDecisions({});setConfirmed(false);setError('');
 };
 return <section className="phone-log-import" aria-label="Paste outbound phone history">
  <div className="section-between"><h3>Import phone call history</h3><button className="btn quiet small" onClick={onClose}>Close</button></div>
  <p className="hint">Paste the outgoing call history you normally copy from Teams. We'll match phone numbers and times to recorded calls. Nothing is changed until you review and apply.</p>
  <div className="phone-log-fields">
   <label className="field">Call date <input type="date" value={date} max={ukDay()} onChange={event=>{setDate(event.target.value);setDecisions({});setError('');setConfirmed(false)}}/></label>
  </div>
  <label className="field">Paste call history<textarea rows={7} value={input} onChange={event=>{setInput(event.target.value);setDecisions({});setError('');setConfirmed(false)}} placeholder={'+44 7700 900123\nOutgoing\n13:31\n2m 40s\n+44 7700 900456\nOutgoing\n13:29\n21s\n+44 7700 900789\nOutgoing\n13:28'}/></label>
  {!!parsed.error&&<p className="form-error" role="alert">{parsed.error}</p>}
  {!!rows.length&&<><div className="phone-log-totals">
    <div><span>Outgoing rows</span><b>{rows.length}</b></div>
    <div><span>Dial allowance</span><b>{rows.length} min</b></div>
    <div><span>Recorded duration</span><b>{secondsLabel(totalSeconds)}</b></div>
    <div><span>Potential KPI time</span><b>{(rows.length+totalSeconds/60).toFixed(2)} min</b></div>
   </div>
   <p className="hint">These are the pasted rows only, not extra KPI credit. Already logged/imported calls are deduplicated when applied. Incoming calls excluded: {parsed.data?.incoming||0}.</p>
   {!!parsed.data?.warnings.length&&<p className="hint" role="status">{parsed.data.warnings.slice(0,4).join(' · ')}</p>}
   <div className="section-between"><h4>Review matches</h4>{pending.length>0&&<button className="btn quiet small" type="button" onClick={markUnresolved}>Mark {pending.length} unresolved as KPI-only</button>}</div>
   <div className="phone-log-table" role="region" aria-label="Phone call matching results" tabIndex={0}>
    <table><thead><tr><th>Time</th><th>Phone / company</th><th>Duration</th><th>Match / count</th></tr></thead>
     <tbody>{rows.map(row=>{
      const options=matchingOptions(state,row),choice=chosen(row),already=savedKeys.has(row.key),single=options.contacts.length===1?options.contacts[0]:null;
      return <tr key={row.key}>
       <td>{row.time}</td>
       <td><strong>{row.number}</strong><small>{single?single.company+' · '+single.name:options.contacts.length>1?options.contacts.length+' possible prospect contacts': 'No matching contact'}</small></td>
       <td>{row.hasDuration?secondsLabel(row.durationSeconds):'Not shown (0s)'}</td>
       <td>{already?<span className="hint">Already imported</span>:<select aria-label={'Match call '+row.time+' '+row.number} value={choice} onChange={event=>set(row.key,event.target.value)}>
        <option value="review">Choose action</option>
        {options.activities.map(a=><option key={a.activityId} value={a.activityId}>Match: {a.label}</option>)}
        <option value="unlogged">New outbound dial · KPI only</option>
        <option value="skip">Exclude from KPI</option>
       </select>}</td>
      </tr>;
     })}</tbody></table>
   </div>
   <p className="hint">{matched.length} existing calls to update · {unlogged.length} unlogged outgoing calls · {pending.length} need a decision · {rows.length-toImport.length} skipped.</p>
   {!!unlogged.length&&<label className="phone-log-confirm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> I confirm these {unlogged.length} KPI-only entries were genuine outgoing business calls and are not already logged in SalesOS. They will not create new prospect activities.</label>}
   <div className="phone-log-outcome"><span>Current day: <strong>{nowKpi.calls} dials</strong> and <strong>{nowKpi.totalMinutes.toFixed(2)} KPI minutes</strong></span><span>Imported durations update existing recorded calls without changing outcomes, notes or readiness.</span></div>
   {error&&<p className="form-error" role="alert">{error}</p>}
   <div className="button-row"><button className="btn primary" disabled={!toImport.length||!!pending.length||(unlogged.length>0&&!confirmed)} onClick={save}>Apply reviewed call log</button><button className="btn secondary" onClick={onClose}>Cancel</button></div>
  </>}
 </section>;
}
