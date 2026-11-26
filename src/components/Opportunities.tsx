import {useEffect,useRef,useMemo,useState} from 'react';
import type {Lead,State,Task} from '../types';
import {opportunityRows,opportunityPlan,opportunityStamp,opportunityEvidence,type OpportunityInput} from '../lib/opportunities';
import {contactAllowed} from '../lib/intelligence/eligibility';
import {protectedTask,localDate} from '../lib/intelligence/evidence';
import {Badge,Empty,day} from './UI';
import {Field} from './Dialogs';
type Save=(id:string,input:OpportunityInput,expected:string,positive:boolean)=>string|void;
export function Opportunities({state,onOpen,onWork,onSave,copy}:{state:State;onOpen:(id:string)=>void;onWork:(task:Task)=>void;onSave:Save;copy:(value:string)=>void}){
 const [tick,setTick]=useState(0);
 useEffect(()=>{const timer=window.setInterval(()=>setTick(t=>t+1),15000);return()=>window.clearInterval(timer)},[]);
 const [search,setSearch]=useState(''),[filter,setFilter]=useState('open'),[editor,setEditor]=useState<{id:string;positive:boolean}|null>(null);
 const rows=useMemo(()=>opportunityRows(state,new Date()),[state,tick]),open=rows.filter(r=>!r.closed),due=open.filter(r=>r.due),gaps=open.filter(r=>r.gaps.length||r.attention.length);
 const visible=rows.filter(r=>(filter==='closed'?r.closed:!r.closed&&(filter!=='due'||r.due)&&(filter!=='needs-step'||r.gaps.length>0||r.attention.length>0))&&[r.lead.company,r.contact?.name||'',r.evidence.evidence,r.plan.nextStep].join(' ').toLowerCase().includes(search.toLowerCase()));
 if(filter==='needs-step')visible.sort((a,b)=>a.attentionRank-b.attentionRank);
 return <div className="page-content"><div className="page-heading"><div><span className="eyebrow">BUYER INTEREST · NEXT STEPS</span><h1>Opportunities</h1><p>Every recorded positive response, including future follow-ups and opportunities without a task. Interest does not change Buyer Readiness or acquisition stage.</p></div><button className="btn primary" onClick={()=>setEditor({id:'',positive:true})}>Record positive response</button></div>
  <div className="metrics-grid"><div className="metric"><span>Open opportunities</span><strong>{open.length}</strong><small>All schedules, including paused or held records</small></div><div className="metric"><span>Actions due</span><strong>{due.length}</strong><small>Due or overdue next actions</small></div><div className="metric"><span>Needs attention</span><strong>{gaps.length}</strong><small>Overdue, missing next action, quiet or blocked</small></div></div>
  <div className="filters"><label className="field">Search opportunities<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Company, contact or next step"/></label><label className="field">Opportunity view<select aria-label="Opportunity view" value={filter} onChange={e=>setFilter(e.target.value)}><option value="open">All open</option><option value="due">Action due</option><option value="needs-step">Needs attention</option><option value="closed">Closed / first trade</option></select></label></div>
  {filter==='needs-step'&&<p className="hint">Overdue promises appear first. Quiet means seven calendar days without a recorded buyer conversation or positive response; scheduled future follow-ups are respected. Review restrictions before contacting anyone.</p>}
  <div className="stack">{visible.map(r=><article className="panel stack" key={r.lead.id} aria-label={'Opportunity · '+r.lead.company}>
   <div className="section-between"><div><h2>{r.lead.company}</h2><p>{r.contact?.name||'Contact needs review'}{r.contact?.title?' · '+r.contact.title:''}</p></div><Badge tone={r.closed?'muted':r.due||r.attention.length?'amber':'green'}>{r.closed?r.lead.stage==='First Trade'?'First trade':r.lead.status:r.lead.status==='Negative Nurture'?'Paused':r.lead.crmClearance==='hold'?'Ownership hold':r.lead.leadPool==='reserve'?'In reserve':'Open opportunity'}</Badge></div>
   {!!r.attention.length&&<p aria-label="Opportunity attention"><strong>Needs attention:</strong> {r.attention.map(a=>a.message).join(' · ')}</p>}
   <p><strong>Positive response:</strong> {r.evidence.evidence||'Buyer interest recorded'} <small>· {day(r.evidence.at.slice(0,10))}</small></p>
   <p><strong>Next step:</strong> {r.plan.nextStep||r.next&&protectedTask(r.next)?r.plan.nextStep||r.next!.description||r.next!.title:'Not recorded — confirm with the prospect'}</p>
   <p><strong>Next action:</strong> {r.next?<>{r.next.title} · {day(r.next.dueAt)}{r.next.dueTime?' '+r.next.dueTime:''}{protectedTask(r.next)?' · Promised / scheduled commitment':''}</>:'No pending action scheduled'}</p>
   {r.commitment&&r.commitment.id!==r.next?.id&&<p><strong>Promised action:</strong> {r.commitment.title} · {day(r.commitment.dueAt)} {r.commitment.dueTime}</p>}
   <p><strong>What’s needed:</strong> {r.plan.barrier||r.lead.barrier||r.gaps[0]||'Deliver the next recorded action and confirm progress'}</p>
   {!!r.gaps.length&&!r.closed&&<p className="hint">{r.gaps.join(' · ')}</p>}
   <p className="hint">Stage: {r.lead.stage} · Buyer Readiness: {r.lead.readiness??'Unassessed'} · Last recorded conversation: {r.lastContact?day(r.lastContact.slice(0,10)):'Not recorded; response may have arrived elsewhere'}</p>
   {r.phone&&!r.closed&&<p className="hint">Call route: {r.routeContactName} · {r.phone}</p>}
   <div className="button-row">{r.phone&&!r.closed&&<button className="btn secondary" onClick={()=>copy(r.phone)}>Copy number</button>}<button className="btn secondary" onClick={()=>onOpen(r.lead.id)}>Open prospect</button>{!r.closed&&<button className="btn secondary" onClick={()=>setEditor({id:r.lead.id,positive:false})}>Update next step</button>}{r.next&&r.canWork&&<button className="btn primary" onClick={()=>onWork(r.next!)}>{['call','callback'].includes(r.next.type)?'Log call outcome':'Open due action'}</button>}</div>
  </article>)}</div>
  {!visible.length&&<Empty title={filter==='closed'?'No closed opportunities':'No opportunities in this view'} detail="Log a Positive response — interested call, a booked meeting, or record an actual positive email/LinkedIn response here. A connected call, research score or copied number alone does not create an opportunity."/>}
  {editor&&<OpportunityEditor key={editor.id||'new'} state={state} leadId={editor.id} positive={editor.positive} onClose={()=>setEditor(null)} onSave={onSave}/>}
 </div>;
}
function OpportunityEditor({state,leadId,positive,onSave,onClose}:{state:State;leadId:string;positive:boolean;onSave:Save;onClose:()=>void}){
 const dialog=useRef<HTMLDivElement>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;dialog.current?.querySelector<HTMLButtonElement>('button')?.focus();return()=>previous?.focus()},[]);
 const choices=state.leads.filter(l=>['Active','Negative Nurture'].includes(l.status)&&l.stage!=='First Trade'),first=leadId?choices.find(l=>l.id===leadId):undefined;
 const initial=(l?:Lead):OpportunityInput=>{
  const allowed=l?.contacts.filter(c=>c.name.trim()&&contactAllowed(state,l,c))||[],next=state.tasks.filter(t=>t.leadId===l?.id&&t.status==='pending').sort((a,b)=>Number(protectedTask(b))-Number(protectedTask(a))||a.dueAt.localeCompare(b.dueAt))[0];
  const preferred=next?.contactId||(l?opportunityEvidence(state,l,new Date())?.contactId:null)||l?.primaryContactId;
  const contactId=positive?(allowed.length===1?allowed[0].id:''):allowed.find(c=>c.id===preferred)?.id||(allowed.length===1?allowed[0].id:'');
  return {contactId,evidence:'',observedAt:localDate(new Date()),nextStep:l?opportunityPlan(state,l.id).nextStep:'',barrier:l?.barrier||'',date:'',time:'',kind:next?.type==='email'?'email':next?.type==='deal'?'deal':'call'};
 };
 const [id,setId]=useState(first?.id||''),[input,setInput]=useState(()=>initial(first)),[expected,setExpected]=useState(()=>first?opportunityStamp(state,first):''),[error,setError]=useState('');
 const lead=state.leads.find(l=>l.id===id),promise=state.tasks.find(t=>t.leadId===id&&t.status==='pending'&&protectedTask(t));
 const change=(key:keyof OpportunityInput,value:string)=>setInput(p=>({...p,[key]:value}));
 function choose(value:string){const l=state.leads.find(l=>l.id===value);setId(value);setInput(initial(l));setExpected(l?opportunityStamp(state,l):'');setError('')}
 function save(){const message=onSave(id,input,expected,positive);if(message)setError(message);else onClose()}
 return <div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div ref={dialog} className="dialog" role="dialog" aria-modal="true" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose()}if(e.key==='Tab'){const controls=[...e.currentTarget.querySelectorAll<HTMLElement>('button,input,select,textarea,summary,a[href]')].filter(x=>x.getClientRects().length>0&&!x.hasAttribute('disabled')),first=controls[0],last=controls[controls.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}}} aria-label={positive?'Record positive response':'Update opportunity next step'}><div className="dialog-top"><h2>{positive?'Record positive response':'Update next step'}</h2><button className="icon-btn" aria-label="Close" onClick={onClose}>×</button></div><div className="dialog-content stack">
  {positive?<label className="field">Company<select aria-label="Company" value={id} onChange={e=>choose(e.target.value)}><option value="">Choose a prospect</option>{choices.map(l=><option key={l.id} value={l.id}>{l.company}</option>)}</select></label>:<strong>{lead?.company}</strong>}
  <label className="field">Contact<select aria-label="Contact" value={input.contactId} onChange={e=>change('contactId',e.target.value)}><option value="">Choose a permitted named contact</option>{lead?.contacts.filter(c=>c.name.trim()&&contactAllowed(state,lead,c)).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
  {positive&&<><Field label="What positive response did they give?" value={input.evidence} onChange={v=>change('evidence',v)} required multiline/><Field label="Response date" type="date" value={input.observedAt} onChange={v=>change('observedAt',v)}/><p className="hint">Saving confirms actual buyer interest or an agreed next step. It records no call, sent message, stage advance or readiness change.</p></>}
  <Field label="Next agreed step" value={input.nextStep} onChange={v=>change('nextStep',v)} multiline/><Field label="Main blocker / what’s needed" value={input.barrier} onChange={v=>change('barrier',v)}/>
  {promise?<p className="hint">Existing promised action: {promise.title} · {day(promise.dueAt)} {promise.dueTime}. Its schedule is protected; these notes do not replace it.</p>:<details><summary>Schedule a next action (optional)</summary><div className="stack"><label className="field">Action type<select aria-label="Action type" value={input.kind} onChange={e=>change('kind',e.target.value)}><option value="call">Call</option><option value="email">Email</option><option value="deal">Internal review / next step</option></select></label><Field label="Follow-up date" type="date" value={input.date} onChange={v=>change('date',v)}/><Field label="Follow-up time (optional)" type="time" value={input.time} onChange={v=>change('time',v)}/><p className="hint">Creates or updates one next-action task. No communication is sent and the date is not treated as a buyer promise.</p></div></details>}
  {error&&<p className="form-error" role="alert">{error}</p>}
 </div><div className="dialog-footer"><button className="btn quiet" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!lead||positive&&!input.evidence.trim()} onClick={save}>{positive?'Add opportunity':'Save next step'}</button></div></div></div>;
}
