import {useMemo,useState} from 'react';
import type {State} from '../types';
import {cloud} from '../lib/cloud';
import {leadFactory,researchProfiles,type Candidate,type Discovery,type ResearchSector} from '../lib/leadFactory';
import {Badge,Empty,Icon} from './UI';
type Props={
 state:State;
 onDiscover:(rows:Discovery[],profile:ResearchSector,nextCursor:number)=>string|void;
 onAvailable:(id:string)=>string|void;
 onHold:(id:string,owner:string,lastActivity:string)=>string|void;
 onMove:(ids:string[])=>string|void;
 onDismiss:(id:string)=>string|void;
 onDupes:()=>void;
 onReserve:()=>void;
};
export function LeadResearch({state,onDiscover,onAvailable,onHold,onMove,onDismiss,onDupes,onReserve}:Props){
 const registry=leadFactory(state),[profile,setProfile]=useState<ResearchSector>('recruitment');
 const [running,setRunning]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState('');
 const [filter,setFilter]=useState<'unchecked'|'cleared'|'all'>('unchecked'),[search,setSearch]=useState('');
 const [verified,setVerified]=useState(false),[ownerId,setOwnerId]=useState(''),[owner,setOwner]=useState(''),[activity,setActivity]=useState('');
 const [selected,setSelected]=useState<Record<string,boolean>>({});
 const pending=registry.candidates.filter(c=>c.status==='unchecked'),cleared=registry.candidates.filter(c=>c.status==='cleared'),held=registry.candidates.filter(c=>c.status==='held');
 const visible=useMemo(()=>registry.candidates.filter(c=>(filter==='all'?c.status!=='dismissed'&&c.status!=='moved':c.status===filter)
  &&(!search||[c.company,c.companyNumber,c.reason].join(' ').toLowerCase().includes(search.toLowerCase())))
  .sort((a,b)=>b.priority-a.priority||a.company.localeCompare(b.company)).slice(0,100),[registry,filter,search]);
 const checked=cleared.filter(c=>selected[c.id]);
 function failed(value:string|void){if(value){setError(value);return true}setError('');return false}
 async function copy(text:string){try{await navigator.clipboard.writeText(text);setStatus('Copied: '+text)}catch{setStatus('Clipboard unavailable. Select the company name and copy it manually.')}}
 async function run(){
  if(running)return;setRunning(true);setError('');setStatus('');
  try{
   if(!cloud)throw Error('Sign into the SalesOS cloud workspace to run authenticated research.');
   const {data,error}=await cloud.auth.getSession();if(error||!data.session)throw Error('Sign in again to use Lead Research.');
   const response=await fetch('/api/lead-research',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token},body:JSON.stringify({profile,cursor:registry.cursors[profile]||0})});
   const payload=await response.json();
   if(!response.ok)throw Error(payload.error||'Research source unavailable.');
   const rows=payload.items as Discovery[];
   if(!Array.isArray(rows)||!Number.isInteger(payload.nextCursor))throw Error('Research returned an unexpected result. Nothing was imported.');
   if(failed(onDiscover(rows,profile,payload.nextCursor)))return;
   setFilter('unchecked');
   setStatus('Checked '+payload.resultsScanned+' official company records (SIC '+payload.sourceSic+'). New legal entities were added to the clearance queue; existing companies were skipped.');
  }catch(e){setError((e as Error).message)}finally{setRunning(false)}
 }
 function accept(id:string){if(!verified){setError('Confirm you personally checked Salesforce before marking a company available.');return}if(!failed(onAvailable(id)))setStatus('Salesforce availability recorded. Move the company to Lead Reserve when ready.')}
 function bank(c:Candidate){if(!owner.trim()){setError('Enter the Salesforce owner name.');return}if(!verified){setError('Confirm you checked Salesforce before recording an ownership hold.');return}
  if(!failed(onHold(c.id,owner.trim(),activity))){setOwnerId('');setOwner('');setActivity('');setStatus('Duplicate banked in the ranked Duplicate Queue. No outreach allowed.')}
 }
 function move(ids:string[]){if(!ids.length)return;const names=ids.length===1?'this cleared company':ids.length+' cleared companies';
  if(!window.confirm('Move '+names+' into Lead Reserve? They will remain inactive, without calling tasks, until contact enrichment and reserve activation checks are completed.'))return;
  if(!failed(onMove(ids))){setSelected({});setStatus('Moved '+ids.length+' cleared companies to the Lead Reserve. No call tasks created.')}
 }
 return <div className="page-content">
  <div className="page-heading"><div><span className="eyebrow">COMPANIES HOUSE DISCOVERY</span><h1>Lead Research & Clearance</h1><p>Discover companies automatically, check each name in Salesforce, then move cleared companies individually or in bulk. This is a screening stage, not verified FX qualification.</p></div>
   <div className="button-row"><button className="btn secondary" onClick={onDupes}><Icon name="archive"/> Duplicate Queue</button><button className="btn secondary" onClick={onReserve}><Icon name="target"/> Lead Reserve</button></div></div>
  <div className="metrics-grid">
   <div className="metric"><span>Awaiting Salesforce check</span><strong>{pending.length}</strong><small>Never callable</small></div>
   <div className="metric"><span>Cleared to transfer</span><strong>{cleared.length}</strong><small>Move one or all</small></div>
   <div className="metric"><span>Banked as duplicates</span><strong>{held.length}</strong><small>Manager review required</small></div>
   <div className="metric"><span>Already transferred</span><strong>{registry.candidates.filter(c=>c.status==='moved').length}</strong><small>Now in Lead Reserve</small></div>
  </div>
  <section className="panel stack">
   <div className="section-between"><h2>Discover new UK companies</h2><Badge tone="blue">Free public-register data</Badge></div>
   <p className="hint">No company submission needed. The scanner chooses a fresh page of active UK registered companies in the selected SIC industries and skips existing SalesOS names and registration numbers. It rotates through industry codes on subsequent runs.</p>
   <div className="button-row"><label className="field" style={{minWidth:250}}>Research sector<select aria-label="Research sector" value={profile} onChange={e=>{setProfile(e.target.value as ResearchSector);setError('')}}>{researchProfiles.map(x=><option value={x.id} key={x.id}>{x.label}</option>)}</select></label><button className="btn primary" disabled={running} onClick={()=>void run()}>{running?'Checking public register…':'Find next batch of companies'}</button></div>
   <p className="hint">Research priority is capped at 65/100 because SIC classification and company age do <strong>not</strong> establish international payments. No domains, contacts, FX volumes or buyer interest are guessed. A free Companies House API key must be configured server-side for this scanner to run.</p>
   {registry.lastRunAt&&<small>Last saved research run: {new Date(registry.lastRunAt).toLocaleString('en-GB')}</small>}
  </section>
  <section className="panel stack">
   <div className="section-between"><h2>Salesforce clearance queue</h2><Badge>{visible.length} shown</Badge></div>
   <label className="check-row"><input type="checkbox" checked={verified} onChange={e=>setVerified(e.target.checked)}/> I personally checked the relevant company names in Salesforce before saving any clearance or ownership decision.</label>
   <div className="filters"><div className="search-wrap"><Icon name="search"/><input aria-label="Search research candidates" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find company or registration number"/></div>
   <select aria-label="Clearance queue filter" value={filter} onChange={e=>setFilter(e.target.value as typeof filter)}><option value="unchecked">Awaiting check</option><option value="cleared">Cleared — ready to transfer</option><option value="all">All research records</option></select></div>
   <div className="button-row">
    <button className="btn primary" disabled={!cleared.length} onClick={()=>move(cleared.map(c=>c.id))}>Move all {cleared.length} cleared to reserve</button>
    <button className="btn secondary" disabled={!checked.length} onClick={()=>move(checked.map(c=>c.id))}>Move selected ({checked.length})</button>
   </div>
   {visible.length?<div className="stack">{visible.map(c=><div key={c.id} className="panel inset stack">
    <div className="section-between"><div><strong>{c.company}</strong><p className="hint">{c.companyNumber} · {c.sector==='recruitment'?'Recruitment':'Machinery & equipment'} · Incorporated {c.incorporated||'date unknown'}</p></div>
    <Badge tone={c.priority>=58?'blue':'muted'}>{c.priority}/65 screening</Badge></div>
    <p className="hint">{c.reason}</p>
    <div className="button-row"><a className="btn secondary small" href={c.sourceUrl} target="_blank" rel="noopener noreferrer">Companies House <Icon name="external" size={13}/></a><button className="btn secondary small" onClick={()=>void copy(c.company)}><Icon name="copy"/> Copy name</button>
    {c.status==='unchecked'&&<><button className="btn primary small" disabled={!verified} onClick={()=>accept(c.id)}>Available — checked</button><button className="btn secondary small" onClick={()=>{setOwnerId(ownerId===c.id?'':c.id);setOwner('');setActivity('')}}>Already owned</button><button className="btn quiet small" onClick={()=>{if(window.confirm('Dismiss '+c.company+' from the research queue?'))failed(onDismiss(c.id))}}>Dismiss</button></>}
    {c.status==='cleared'&&<><label className="check-row"><input type="checkbox" checked={!!selected[c.id]} onChange={e=>setSelected(s=>({...s,[c.id]:e.target.checked}))}/> Select</label><button className="btn primary small" onClick={()=>move([c.id])}>Move to reserve</button></>}
    {c.status==='held'&&<Badge tone="amber">Banked duplicate · {c.crmOwner||'Owner unknown'}</Badge>}
    {c.status==='moved'&&<Badge tone="green">In reserve</Badge>}</div>
    {ownerId===c.id&&<div className="panel stack"><strong>Bank this Salesforce duplicate</strong>
     <label className="field">Salesforce owner<input value={owner} onChange={e=>setOwner(e.target.value)} placeholder="Owner name (required)" maxLength={120}/></label>
     <label className="field">Last qualifying Salesforce activity (optional)<input type="date" value={activity} max={new Date().toISOString().slice(0,10)} onChange={e=>setActivity(e.target.value)}/></label>
     <p className="hint">If you don't know the date, leave it blank. Your manager can check it later. This will appear in the Duplicate Queue, ranked by research priority; it will not be released automatically.</p>
     <div className="button-row"><button className="btn primary small" disabled={!verified||!owner.trim()} onClick={()=>bank(c)}>Bank duplicate</button><button className="btn quiet small" onClick={()=>setOwnerId('')}>Cancel</button></div></div>}
   </div>)}</div>:<Empty title="No companies in this view" detail="Run the public-register scanner to populate the queue. Existing SalesOS records will be skipped automatically."/>}
   {registry.candidates.filter(c=>filter==='all'?c.status!=='dismissed'&&c.status!=='moved':c.status===filter).length>100&&<p className="hint">Showing top 100. Search for a specific company to narrow the queue.</p>}
  </section>
  {error&&<p className="form-error" role="alert">{error}</p>}
  {status&&<p role="status" className="hint">{status}</p>}
 </div>;
}
