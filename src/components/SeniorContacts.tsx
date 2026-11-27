import {useEffect,useMemo,useState} from 'react';
import type {State} from '../types';
import {validSeniorContact} from '../lib/seniorRoles';
import {researchApi} from '../lib/researchApi';
import {contactTargets,contactWorkspace} from '../lib/contactResearchRules';
import {seniorContactCSV,type ContactUpdate} from '../lib/contactResearch';

type Provider={configured:boolean;remaining:number|null;searchCredits:number;maxPhoneCredits:number};
export function SeniorContacts({state,syncStatus,onApply}:{state:State;syncStatus:string;onApply:(updates:ContactUpdate[],mode:'search'|'reveal')=>void}){
 const [provider,setProvider]=useState<Provider|null>(null),[refresh,setRefresh]=useState(0),[running,setRunning]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[choices,setChoices]=useState<Record<string,string>>({}),[retrieved,setRetrieved]=useState<ContactUpdate[]>([]);
 useEffect(()=>{let cancelled=false;researchApi({mode:'lusha-status'}).then(p=>{if(!cancelled)setProvider(p)}).catch(e=>{if(!cancelled)setError((e as Error).message)});return ()=>{cancelled=true}},[refresh]);
 const targets=useMemo(()=>contactTargets(contactWorkspace(state)),[state]);
 const ready=targets.filter(t=>t.research?.previews.length&&Date.now()-Date.parse(t.research.searchedAt)<86400000).slice(0,4);
 const next=targets.filter(t=>!t.research?.searchedAt||Date.now()-Date.parse(t.research.searchedAt)>86400000).slice(0,4);
 const selections=ready.map(t=>({id:t.id,contactId:choices[t.id]||t.research!.previews[0].id}));
 const limit=1+ready.reduce((n,t)=>n+(t.research!.previews.find(p=>p.id===(choices[t.id]||t.research!.previews[0].id))?.phoneCredits||0),0);
 const saved=syncStatus==='saved',enabled=provider?.configured&&saved&&!running;
 async function search(){if(!enabled||!next.length)return;setRunning(true);setError('');setMessage('');try{const r=await researchApi({mode:'lusha-search',ids:next.map(t=>t.id)});onApply(r.rows,'search');setMessage(`${r.rows.reduce((n:number,row:ContactUpdate)=>n+(row.previews?.length||0),0)} approved-role previews found. ${r.rejected} other or unsuitable results rejected. Quota used: ${r.charged??'not reported'}. No phone reveal or outreach yet.`);setRefresh(x=>x+1)}catch(e){setError((e as Error).message)}finally{setRunning(false)}}
 async function reveal(){if(!enabled||!ready.length)return;setRunning(true);setError('');setMessage('');try{const r=await researchApi({mode:'lusha-reveal',selections});setRetrieved(r.rows);onApply(r.rows,'reveal');setMessage(`${r.rows.filter((x:ContactUpdate)=>x.contact).length} callable senior contacts saved. Quota used: ${r.charged??'not reported'}. Companies stay in their current queue; ownership checks and activation remain separate.`);setRefresh(x=>x+1)}catch(e){setError((e as Error).message+' No automatic reveal retry will run.')}finally{setRunning(false)}}
 function download(){const blob=new Blob(['\ufeff'+seniorContactCSV(retrieved)],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='SalesOS_Lusha_senior_contacts_'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 return <section className="panel stack senior-contacts" aria-label="Lusha senior contact sourcing">
  <div className="section-between"><div><h2>Find callable decision-makers</h2><p className="hint">MD · CEO · CFO · Finance Director · Head of Finance only. Exact titles, UK company match and callable numbers; no title widening.</p></div><span className="hint">{provider?.configured?`${provider.remaining?.toLocaleString('en-GB')} Lusha credits available`:'Lusha connection required'}</span></div>
  <p className="hint">Company fit comes first: research-qualified companies or cleared reserve prospects scoring at least 60. Known turnover outside your target, ownership holds, opt-outs, existing contacts and invalid numbers are excluded. Unknown turnover stays unknown.</p>
  {provider&&!provider.configured&&<p role="status">Add <strong>LUSHA_API_KEY</strong> as a server-side Vercel Production secret, then redeploy. Never paste the key into a spreadsheet or contact field.</p>}
  {!saved&&<p role="status">Wait for Saved to cloud before spending Lusha quota.</p>}
  <div className="button-row"><button className="btn secondary" disabled={!enabled||!next.length||ready.length>0} onClick={()=>void search()}>{running?'Contact research in progress…':`Search next ${next.length} qualified companies`}</button><button className="btn quiet" disabled={running} onClick={()=>setRefresh(x=>x+1)}>Check Lusha connection</button><span className="hint">Up to 1 included credit per search. No unattended or third-party waterfall calls.</span></div>
  {!targets.length&&<p className="hint">No eligible contact gaps right now. Find companies with HMRC trade or strong cross-border evidence first; held companies never enter this contact queue.</p>}
  {ready.map(t=><div className="panel inset stack" key={t.id}><strong>{t.company}</strong><label className="field">Approved contact for {t.company}<select aria-label={'Approved contact for '+t.company} value={choices[t.id]||t.research!.previews[0].id} onChange={e=>setChoices(c=>({...c,[t.id]:e.target.value}))}>{t.research!.previews.map(p=><option key={p.id} value={p.id}>{p.name} · {p.title} · {p.domain}</option>)}</select></label><small>Review the company match before reveal. A job title does not confirm responsibility for FX.</small><button className="btn quiet small" disabled={running||!saved} onClick={()=>{try{onApply([{id:t.id,company:t.company,stamp:t.stamp,searchedAt:new Date().toISOString(),previews:[]}],'search')}catch(e){setError((e as Error).message)}}}>Skip these contact previews</button></div>)}
  {ready.length>0&&<button className="btn primary" disabled={!enabled||provider?.remaining===null||provider!.remaining!<limit} onClick={()=>void reveal()}>Reveal phones for {ready.length} contacts · up to {limit} credits</button>}
  {retrieved.some(r=>r.contact&&validSeniorContact(r.contact))&&<button className="btn secondary" onClick={download}>Download retrieved senior contacts</button>}
  {message&&<p role="status">{message}</p>}{error&&<p role="alert" className="error-text">{error}</p>}
 </section>;
}
