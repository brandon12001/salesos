import {useMemo,useState} from 'react';
import type {State} from '../types';
import {cloud} from '../lib/cloud';
import {preSearchScreen,needsRegistryRefresh,sameResearchCompany} from '../lib/researchScreen';
import {leadFactory,researchProfiles,qualityTier,candidatePriority,type Candidate,type Discovery,type ResearchSector,type RegistryUpdate,type WebResearchUpdate} from '../lib/leadFactory';
import {Badge,Empty,Icon} from './UI';
type Props={
 state:State;
 onDiscover:(rows:Discovery[],profile:ResearchSector,nextCursor:number)=>string|void;
 onRegistryChecks:(rows:RegistryUpdate[])=>string|void;
 onWebResearch:(rows:WebResearchUpdate[])=>string|void;
 onAvailable:(id:string)=>string|void;
 onHold:(id:string,owner:string,lastActivity:string)=>string|void;
 onMove:(ids:string[])=>string|void;
 onDismiss:(id:string)=>string|void;
 onDupes:()=>void;onReserve:()=>void;
};
type Filter='ready'|'research'|'screen-held'|'flagged'|'cleared'|'all';
export function LeadResearch({state,onDiscover,onRegistryChecks,onWebResearch,onAvailable,onHold,onMove,onDismiss,onDupes,onReserve}:Props){
 const registry=leadFactory(state),[profile,setProfile]=useState<ResearchSector>('recruitment');
 const [running,setRunning]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState('');
 const [filter,setFilter]=useState<Filter>('ready'),[search,setSearch]=useState('');
 const [verified,setVerified]=useState(false),[ownerId,setOwnerId]=useState(''),[owner,setOwner]=useState(''),[activity,setActivity]=useState('');
 const [selected,setSelected]=useState<Record<string,boolean>>({});
 const candidates=registry.candidates;
 const ready=candidates.filter(c=>c.status==='unchecked'&&qualityTier(c)==='ready');
 const backlog=candidates.filter(c=>c.status==='unchecked'&&qualityTier(c)==='research');
 const flagged=candidates.filter(c=>c.status==='unchecked'&&['flagged','excluded'].includes(qualityTier(c)));
 const cleared=candidates.filter(c=>c.status==='cleared'&&qualityTier(c)==='ready');
 const held=candidates.filter(c=>c.status==='held');
 const unverified=candidates.filter(c=>c.status==='unchecked'&&needsRegistryRefresh(c.registryCheck)).slice(0,12);
 const screen=(c:Candidate)=>state.leads.some(l=>sameResearchCompany(c,l))
  ?{eligible:false,reasons:['Already tracked in SalesOS; no search credits will be spent.']}:preSearchScreen(c.sector,c.registryCheck);
 const pendingWeb=candidates.filter(c=>c.status==='unchecked'&&!c.webCheckedAt&&c.sector===profile);
 const eligibleWeb=pendingWeb.filter(c=>screen(c).eligible).sort((a,b)=>candidatePriority(b)-candidatePriority(a)||a.company.localeCompare(b.company));
 const webQueue=eligibleWeb.slice(0,4),screenHeld=pendingWeb.filter(c=>!screen(c).eligible);
 const webCompleted=candidates.filter(c=>c.status==='unchecked'&&!!c.webCheckedAt).length;
 const visible=useMemo(()=>candidates.filter(c=>(filter==='all'?c.status!=='dismissed'&&c.status!=='moved':
  filter==='screen-held'?c.status==='unchecked'&&!c.webCheckedAt&&c.sector===profile&&!screen(c).eligible:
  filter==='cleared'?c.status==='cleared':c.status==='unchecked'&&(
   filter==='flagged'?['flagged','excluded'].includes(qualityTier(c)):qualityTier(c)===filter))
  &&(!search||[c.company,c.companyNumber,c.reason].join(' ').toLowerCase().includes(search.toLowerCase())))
  .sort((a,b)=>candidatePriority(b)-candidatePriority(a)||a.company.localeCompare(b.company)).slice(0,100),[candidates,filter,search,profile,state.leads]);
 const picked=cleared.filter(c=>selected[c.id]);
 function failed(message:string|void){if(message){setError(message);return true}setError('');return false}
 async function copy(value:string){try{await navigator.clipboard.writeText(value);setStatus('Copied '+value)}catch{setStatus('Clipboard blocked; select company name manually.')} }
 async function api(payload:unknown):Promise<any>{
  if(!cloud)throw Error('Sign in to the SalesOS cloud workspace first.');
  const {data,error}=await cloud.auth.getSession();if(error||!data.session)throw Error('SalesOS sign-in expired.');
  const response=await fetch('/api/lead-research',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token},body:JSON.stringify(payload)});
  const raw=await response.text();let parsed:any;
  try{parsed=JSON.parse(raw)}catch{throw Error('Research server responded with an error ('+response.status+'). No records changed.')}
  if(!response.ok)throw Error(typeof parsed?.error==='string'?parsed.error:'Research request failed ('+response.status+').');
  return parsed;
 }
 async function run(){
  if(running)return;setRunning(true);setError('');setStatus('');
  try{
   const result=await api({profile,cursor:registry.cursors[profile]||0});
   if(!Array.isArray(result.items)||!Number.isInteger(result.nextCursor))throw Error('Invalid company research response.');
   if(failed(onDiscover(result.items as Discovery[],profile,result.nextCursor)))return;
   setFilter('ready');
   setStatus('Reviewed '+result.resultsScanned+' registered companies · '+(result.preSearchHeld||0)+' held before web search · '+(result.knownSkipped||0)+' already tracked. '+(result.webResearchEnabled?result.webSearches+' Brave requests.':'No independent web verification connected.')+' Only strongly researched candidates appear in Salesforce clearance.');
  }catch(e){setError((e as Error).message)}finally{setRunning(false)}
 }
 async function rescreen(){
  if(running||!unverified.length)return;setRunning(true);setError('');setStatus('');
  try{
   const result=await api({mode:'recheck',candidates:unverified.map(c=>({company:c.company,companyNumber:c.companyNumber,sector:c.sector,sicCodes:c.sicCodes,incorporated:c.incorporated}))});
   if(!Array.isArray(result.checks)||result.checks.length!==unverified.length)throw Error('Registry recheck incomplete; no records changed.');
   if(failed(onRegistryChecks(result.checks as RegistryUpdate[])))return;
   setFilter('screen-held');
   setStatus('Rechecked '+result.checked+' existing companies using official registry profiles; '+result.ready+' passed legal/filing checks. Passing these checks does not prove FX exposure.');
  }catch(e){setError((e as Error).message)}finally{setRunning(false)}
 }
 async function webResearch(){
  if(running||!webQueue.length)return;setRunning(true);setError('');setStatus('');
  try{
   const result=await api({mode:'web-enrich',candidates:webQueue.map(c=>({company:c.company,companyNumber:c.companyNumber,sector:c.sector,sicCodes:c.sicCodes,incorporated:c.incorporated}))});
   if(!Array.isArray(result.updates)||result.updates.length!==webQueue.length)throw Error('Web research returned an incomplete batch; no records changed.');
   if(failed(onWebResearch(result.updates as WebResearchUpdate[])))return;
   setFilter('ready');
   setStatus('Web researched '+result.webCompleted+' companies using '+result.webSearches+' Brave requests ('+result.webErrors+' provider errors). '+(result.preSearchHeld||0)+' held by refreshed filters; '+(result.knownSkipped||0)+' already tracked. '+(result.rateLimited?'Provider rate limit reached; remaining names stay retryable.':'Research saved with source links and FX discovery questions.')+' Salesforce clearance still requires manual checks.');
  }catch(e){setError((e as Error).message)}finally{setRunning(false)}
 }
 function accept(c:Candidate){if(!verified){setError('Confirm you checked Salesforce first.');return}if(!failed(onAvailable(c.id)))setStatus('Salesforce check recorded. Company ready to transfer.')}
 function bank(c:Candidate){
  if(!owner.trim()||!verified){setError('Enter the Salesforce owner and confirm your manual check.');return}
  if(!failed(onHold(c.id,owner.trim(),activity))){setOwnerId('');setOwner('');setActivity('');setStatus('Company banked in Duplicate Queue; never auto-contacted.')}
 }
 function move(ids:string[]){
  if(!ids.length)return;
  if(!window.confirm('Move '+ids.length+' researched and Salesforce-cleared companies to Lead Reserve? No calls will be generated automatically.'))return;
  if(!failed(onMove(ids))){setSelected({});setStatus('Moved '+ids.length+' eligible companies to reserve. No outbound tasks generated.')}
 }
 const tierLabel=(c:Candidate)=>qualityTier(c)==='ready'?'International signal found':qualityTier(c)==='excluded'?'Excluded by registry':qualityTier(c)==='flagged'?'Registry concerns':'Needs FX evidence';
 const tierColor=(c:Candidate):'green'|'amber'|'muted'=>qualityTier(c)==='ready'?'green':qualityTier(c)==='excluded'?'amber':'muted';
 return <div className="page-content">
  <div className="page-heading"><div><span className="eyebrow">RULES-BASED · NO AI</span><h1>Lead Research & Clearance</h1><p>Only businesses with acceptable registry records and independent cross-border evidence reach your Salesforce-checking list. All existing discoveries are retained for research.</p></div>
   <div className="button-row"><button className="btn secondary" onClick={onDupes}><Icon name="archive"/> Duplicate Queue</button><button className="btn secondary" onClick={onReserve}><Icon name="target"/> Lead Reserve</button></div></div>
  <div className="metrics-grid">
   <div className="metric"><span>Worth a Salesforce check</span><strong>{ready.length}</strong><small>Registry verified + strong web clue</small></div>
   <div className="metric"><span>Research backlog</span><strong>{backlog.length}</strong><small>{webCompleted} checked on the web; evidence still uncertain</small></div>
   <div className="metric"><span>Registry flags / exclusions</span><strong>{flagged.length}</strong><small>Overdue filings, holding companies or closure concerns</small></div>
   <div className="metric"><span>Salesforce-cleared / duplicates</span><strong>{cleared.length} / {held.length}</strong><small>Transfer or manager review</small></div>
  </div>
  <section className="panel stack">
   <div className="section-between"><h2>Find and screen UK companies</h2><Badge tone="blue">Companies House</Badge></div>
   <p className="hint">Before spending a Brave request: active private limited company, at least two years old, a completed non-dormant accounts filing, acceptable filing health and a targeted SIC. Recruitment targets temporary staffing / HR provision (78200, 78300); goods targets equipment wholesalers (46690, 46620, 46610, 46630, 46520). Generic placement, holding/head-office and unclear profiles stay on hold. These are fit filters, not proof of FX needs, turnover or headcount.</p>
   <div className="button-row"><label className="field" style={{minWidth:250}}>Sector<select aria-label="Research sector" value={profile} onChange={e=>setProfile(e.target.value as ResearchSector)}>{researchProfiles.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
    <button className="btn primary" disabled={running} onClick={()=>void run()}>{running?'Checking records…':'Find next screened batch'}</button>
    <button className="btn secondary" disabled={running||!unverified.length} onClick={()=>void rescreen()}>Verify saved registry ({unverified.length} next)</button>
    <button className="btn primary" disabled={running||!webQueue.length} onClick={()=>void webResearch()}>{running?'Research in progress…':'Research saved companies on web ('+webQueue.length+' next)'}</button></div>
   <p className="hint">Selected sector: {eligibleWeb.length} saved companies pass the free filters; {screenHeld.length} held. Each manual research action takes up to four eligible companies and uses at most eight Brave requests. The server refreshes official facts and checks your saved workspace before searching. Existing companies, held duplicates and already researched candidates are skipped. Verify saved registry first for older discoveries. Searches use your Brave allowance; no background research or daily/monthly quota enforcement is enabled.</p>
   <div className="button-row"><button className="btn secondary small" onClick={()=>setFilter('screen-held')}>Review pre-search holds ({screenHeld.length})</button></div>
   {registry.lastRunAt&&<small>Last scan: {new Date(registry.lastRunAt).toLocaleString('en-GB')}</small>}
  </section>
  <section className="panel stack">
   <div className="section-between"><h2>Prospect research queues</h2><Badge>{visible.length} shown</Badge></div>
   <div className="filters"><div className="search-wrap"><Icon name="search"/><input aria-label="Search research candidates" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search company or registration number"/></div>
    <select aria-label="Lead research queue" value={filter} onChange={e=>setFilter(e.target.value as Filter)}><option value="ready">Ready for Salesforce ({ready.length})</option><option value="research">Needs research ({backlog.length})</option><option value="screen-held">Pre-search holds ({screenHeld.length})</option><option value="flagged">Flagged / excluded ({flagged.length})</option><option value="cleared">Salesforce cleared ({cleared.length})</option><option value="all">All tracked companies</option></select></div>
   <label className="check-row"><input type="checkbox" checked={verified} onChange={e=>setVerified(e.target.checked)}/> I personally checked Salesforce for any company I mark available or already owned.</label>
   <div className="button-row"><button className="btn primary" disabled={!cleared.length} onClick={()=>move(cleared.map(x=>x.id))}>Move all {cleared.length} eligible cleared</button>
    <button className="btn secondary" disabled={!picked.length} onClick={()=>move(picked.map(x=>x.id))}>Move selected ({picked.length})</button></div>
   {visible.length?<div className="stack">{visible.map(c=><div key={c.id} className="panel inset stack">
    <div className="section-between"><div><strong>{c.company}</strong><p className="hint">{c.companyNumber} · {c.sector==='recruitment'?'Recruitment':'Machinery distribution'} · Incorporated {c.incorporated||'unknown'}</p></div>
     <div className="button-row"><Badge tone={tierColor(c)}>{tierLabel(c)}</Badge><Badge tone="muted">{candidatePriority(c)}/100 screening</Badge></div></div>
    {c.registryCheck?.flags?.length?<p className="hint">{c.registryCheck.flags.join(' · ')}</p>:<p className="hint">{c.registryCheck?.risk==='ok'?'Company profile and filing status checked. No FX requirement confirmed.':'Detailed Companies House profile not checked yet.'}</p>}
    {!c.webCheckedAt&&c.status==='unchecked'&&<p className="hint"><strong>{screen(c).eligible?'Passes pre-search filters:':'No Brave search yet — on hold:'}</strong> {screen(c).reasons.join(' ')}</p>}
    {c.fxHypothesis&&<p className="hint"><strong>FX hypothesis:</strong> {c.fxHypothesis}</p>}
    {c.discoveryQuestion&&<p className="hint"><strong>Call discovery question:</strong> {c.discoveryQuestion}</p>}
    {c.webCheckedAt&&<small>Web checked {new Date(c.webCheckedAt).toLocaleDateString('en-GB')} · {c.webQueries||0} successful search queries</small>}
    {c.evidence?.length?<div className="stack"><small>Public web clues (not confirmed FX)</small>{c.evidence.slice(0,4).map((e,i)=><p className="hint" key={e.sourceUrl+i}><strong>{e.label}</strong> · <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer">Source</a> · {e.excerpt}</p>)}</div>:<p className="hint">No source-backed cross-border payments evidence. Keep in research rather than checking Salesforce.</p>}
    <div className="button-row"><a className="btn secondary small" href={c.sourceUrl} target="_blank" rel="noopener noreferrer">Companies House <Icon name="external" size={13}/></a>
     <button className="btn secondary small" onClick={()=>void copy(c.company)}><Icon name="copy"/> Copy name</button>
     {c.status==='unchecked'&&qualityTier(c)==='ready'&&<><button className="btn primary small" disabled={!verified} onClick={()=>accept(c)}>Available — checked</button>
      <button className="btn secondary small" onClick={()=>{setOwnerId(ownerId===c.id?'':c.id);setOwner('');setActivity('')}}>Already owned</button></>}
     {c.status==='unchecked'&&<button className="btn quiet small" onClick={()=>{if(window.confirm('Dismiss '+c.company+' from research?'))failed(onDismiss(c.id))}}>Dismiss</button>}
     {c.status==='cleared'&&qualityTier(c)==='ready'&&<><label className="check-row"><input type="checkbox" checked={!!selected[c.id]} onChange={e=>setSelected(s=>({...s,[c.id]:e.target.checked}))}/> Select</label><button className="btn primary small" onClick={()=>move([c.id])}>Move to reserve</button></>}
     {c.status==='held'&&<Badge tone="amber">Owned by {c.crmOwner||'colleague'}</Badge>}{c.status==='moved'&&<Badge tone="green">In reserve</Badge>}</div>
    {ownerId===c.id&&<div className="panel stack"><label className="field">Salesforce owner<input value={owner} onChange={e=>setOwner(e.target.value)} maxLength={120} placeholder="Actual CRM owner"/></label>
     <label className="field">Last qualifying activity (optional)<input type="date" value={activity} max={new Date().toISOString().slice(0,10)} onChange={e=>setActivity(e.target.value)}/></label>
     <div className="button-row"><button className="btn primary small" disabled={!verified||!owner.trim()} onClick={()=>bank(c)}>Bank duplicate</button><button className="btn quiet small" onClick={()=>setOwnerId('')}>Cancel</button></div></div>}
   </div>)}</div>:<Empty title={filter==='ready'?'No evidence-backed companies yet':'No companies in this view'} detail={filter==='ready'?'Click Research saved companies on web to find supported cross-border payment hypotheses. Companies without evidence remain in the backlog.':'Use the discovery or research buttons to investigate companies.'}/>}
  </section>{error&&<p className="form-error" role="alert">{error}</p>}{status&&<p role="status" className="hint">{status}</p>}
 </div>;
}
