import {useEffect,useMemo,useState} from 'react';
import type {Activity,State} from '../types';
import {activityStamp,fieldsFor,type ActivityFields} from '../lib/activityWorkflow';
import {Field} from './Dialogs';
import {Badge,Empty} from './UI';

export function ActivityEditor({activity:a,state,onSave,onNext,draftScope='browser'}:{activity:Activity;state:State;onSave:(id:string,patch:ActivityFields,expected:string)=>string|void;onNext:()=>void;draftScope?:string}){
 const key=`salesos.activityDraft.v1.${draftScope}.${a.id}`,stamp=activityStamp(a);
 const values=(a:Activity)=>({notes:a.notes,minutes:a.durationMins===undefined?'':String(a.durationMins),contactId:a.contactId||'',followUpNotes:a.followUpNotes||''});
 const [draft,setDraft]=useState(()=>{try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved?.values&&typeof saved.expected==='string')return {...saved,dirty:true} as {values:ReturnType<typeof values>;expected:string;dirty:boolean}}catch{}return {values:values(a),expected:stamp,dirty:false}});
 const [error,setError]=useState(''),[storageWarning,setStorageWarning]=useState(false);
 useEffect(()=>{if(!draft.dirty&&draft.expected!==stamp)setDraft({values:values(a),expected:stamp,dirty:false})},[a,stamp,draft.dirty,draft.expected]);
 useEffect(()=>{const persist=()=>{try{if(draft.dirty)localStorage.setItem(key,JSON.stringify(draft));else localStorage.removeItem(key);return true}catch{return false}};const timer=setTimeout(()=>{if(!persist())setStorageWarning(true)},250);return()=>{clearTimeout(timer);persist()}},[draft,key]);
 const change=(k:keyof typeof draft.values,v:string)=>setDraft(d=>({...d,dirty:true,values:{...d.values,[k]:v}}));
 const save=(next=false)=>{const patch:ActivityFields={notes:draft.values.notes,contactId:draft.values.contactId||null,followUpNotes:draft.values.followUpNotes};if(a.type==='Call')patch.durationMins=draft.values.minutes===''?undefined:Number(draft.values.minutes);const err=onSave(a.id,patch,draft.expected);if(err){setError(err);return}setError('');setDraft(d=>({...d,dirty:false,expected:JSON.stringify({...fieldsFor(a),...patch})}));try{localStorage.removeItem(key)}catch{}if(next)onNext()};
 const lead=state.leads.find(l=>l.id===a.leadId);
 return <section className="post-call-editor stack" aria-label="Activity details">
  <div className="section-between"><h3>{a.type==='Call'?'Conversation notes':'Activity notes'}</h3><Badge tone={draft.dirty?'amber':'green'}>{draft.dirty?'Unsaved draft':'Recorded'}</Badge></div>
  <p className="hint">{a.type} · {a.outcome} · Logged {new Date(a.at).toLocaleString('en-GB')}{a.phoneCallLocalTime?` · Phone call ${a.phoneCallLocalTime.slice(11)} (${a.phoneCallLocalTime.slice(0,10)})`:null}</p>
  <Field label={a.type==='Call'?'Saved call notes':'Saved activity notes'} multiline value={draft.values.notes} onChange={v=>change('notes',v)}/>
  <details><summary>Correct time, contact or follow-up information</summary>
   {a.type==='Call'&&<Field label="Recorded talk time (minutes)" type="number" value={draft.values.minutes} onChange={v=>change('minutes',v)}/>}
   <label className="field">Recorded contact<select aria-label="Recorded contact" value={draft.values.contactId} onChange={e=>change('contactId',e.target.value)}><option value="">Contact not recorded</option>{lead?.contacts.map(c=><option key={c.id} value={c.id}>{c.name||'Unnamed contact'} · {c.title||'Title unknown'}</option>)}</select></label>
   <Field label="Follow-up / correction information" multiline value={draft.values.followUpNotes} onChange={v=>change('followUpNotes',v)}/>
   <p className="hint">These corrections update this record. Existing commitments retain their original contact and dates. Outcome changes need downstream reconciliation and are reserved for a separate review; this editor never replays the call or changes readiness.</p>
  </details>
  {draft.expected!==stamp&&draft.dirty&&<p className="form-error">A newer saved version exists. Your draft is retained. Copy any text you need before choosing the saved version.</p>}
  {storageWarning&&<p className="form-error">Browser draft storage is unavailable. Your input remains on this screen; save it before leaving.</p>}
  {error&&<p className="form-error" role="alert">{error}</p>}
  <div className="button-row"><button className="btn primary" onClick={()=>save()}>Save updates</button><button className="btn secondary" onClick={()=>save(true)}>Save updates & Next</button>{draft.dirty&&<button className="btn quiet" onClick={()=>{setDraft({values:values(a),expected:stamp,dirty:false});setError('')}}>Use saved version</button>}</div>
  {!!a.editHistory?.length&&<details><summary>Correction audit · {a.editHistory.length}</summary>{[...a.editHistory].reverse().map(e=><div className="history-line" key={e.id}><small>{new Date(e.at).toLocaleString('en-GB')}</small><p>Notes: {e.before.notes||'—'} → {e.after.notes||'—'}</p>{e.before.durationMins!==e.after.durationMins&&<p>Minutes: {e.before.durationMins??'Unknown'} → {e.after.durationMins??'Unknown'}</p>}{e.before.contactId!==e.after.contactId&&<p>Contact association corrected; planned tasks unchanged.</p>}</div>)}</details>}
 </section>;
}

export type HistoryFilters={query:string;type:string;outcome:string;from:string;to:string;completed:boolean};
export const emptyHistoryFilters=():HistoryFilters=>({query:'',type:'',outcome:'',from:'',to:'',completed:false});
export function ActivityHistory({state,onOpen,filters,onFilters,leadId,embedded=false}:{state:State;onOpen:(a:Activity)=>void;filters:HistoryFilters;onFilters:(f:HistoryFilters)=>void;leadId?:string;embedded?:boolean}){
 const [limit,setLimit]=useState(100);
 const index=useMemo(()=>{const leads=new Map(state.leads.map(l=>[l.id,l])),tasks=new Map(state.tasks.map(t=>[t.id,t]));return state.activities.map(a=>{const l=leads.get(a.leadId||''),t=tasks.get(a.taskId||''),c=l?.contacts.find(c=>c.id===(a.contactId!==undefined?a.contactId:t?.contactId));return {a,company:l?.company||'Workspace',contact:c?.name||'Contact not recorded',task:t,search:[l?.company,c?.name,c?.title,a.type,a.outcome,a.notes,a.followUpNotes,t?.title].join(' ').toLocaleLowerCase()}}).sort((a,b)=>b.a.at.localeCompare(a.a.at)||b.a.id.localeCompare(a.a.id))},[state.activities,state.leads,state.tasks]);
 const rows=useMemo(()=>index.filter(r=>(!leadId||r.a.leadId===leadId)&&(!filters.query||filters.query.toLocaleLowerCase().split(/\s+/).every(q=>r.search.includes(q)))&&(!filters.type||r.a.type===filters.type)&&(!filters.outcome||r.a.outcome===filters.outcome)&&(!filters.from||r.a.at.slice(0,10)>=filters.from)&&(!filters.to||r.a.at.slice(0,10)<=filters.to)&&(!filters.completed||r.task?.status==='completed')),[index,filters,leadId]);
 const update=(k:keyof HistoryFilters,v:string|boolean)=>{setLimit(100);onFilters({...filters,[k]:v})};
 return <div className={embedded?'stack':'page-content stack'}><div className="page-heading"><div><span className="eyebrow">RECORDED SALES WORK</span><h1>{embedded?'Prospect history':'Activity History'}</h1><p>Search recorded work and reopen it without completing it again.</p></div><Badge>{rows.length} results</Badge></div>
  <Field label="Search activity history" value={filters.query} onChange={v=>update('query',v)} placeholder="Company, contact, notes, outcome or task"/>
  <div className="history-filters"><label className="field">Activity type<select aria-label="Activity type" value={filters.type} onChange={e=>update('type',e.target.value)}><option value="">All types</option>{[...new Set(index.map(r=>r.a.type))].sort().map(t=><option key={t}>{t}</option>)}</select></label><label className="field">Recorded outcome<select aria-label="Recorded outcome" value={filters.outcome} onChange={e=>update('outcome',e.target.value)}><option value="">All outcomes</option>{[...new Set(index.map(r=>r.a.outcome))].sort().map(o=><option key={o}>{o}</option>)}</select></label><Field label="From date" type="date" value={filters.from} onChange={v=>update('from',v)}/><Field label="To date" type="date" value={filters.to} onChange={v=>update('to',v)}/></div><label className="check-row"><input type="checkbox" checked={filters.completed} onChange={e=>update('completed',e.target.checked)}/> Completed tasks only</label>
  {rows.length?<><div className="activity-list">{rows.slice(0,limit).map(r=><button className="activity-row" key={r.a.id} onClick={()=>onOpen(r.a)}><span><strong>{r.company} · {r.contact}</strong><small>{r.a.type} · {r.a.outcome} · {new Date(r.a.at).toLocaleString('en-GB')}</small><span>{r.a.notes||'No notes recorded'}</span></span><Badge tone={r.task?.status==='completed'?'green':'muted'}>{r.task?.status==='completed'?'Completed task':'Recorded activity'}</Badge></button>)}</div>{rows.length>limit&&<button className="btn secondary" onClick={()=>setLimit(n=>n+100)}>Show 100 more</button>}</>:<Empty title="No matching activity" detail="Change your filters; no records have been deleted."/>}
 </div>;
}
