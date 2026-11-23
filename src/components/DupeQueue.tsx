import {useMemo,useState} from 'react';
import type {Lead,State} from '../types';
import {core} from '../lib/core';
import {Badge,Empty,Icon,day} from './UI';

type DialogMode='check'|'request'|'decision';
type Decision='approved'|'declined';
type Filter='all'|'review-due'|'waiting'|'missing-activity'|'requested'|'declined';
export function DupeQueue({state,onCRMCheck,onRequest,onDecision,onReserve}:{
  state:State;
  onCRMCheck:(id:string,note:string,lastActivityAt:string)=>boolean;
  onRequest:(id:string,note:string)=>boolean;
  onDecision:(id:string,decision:Decision,note:string)=>boolean;
  onReserve:()=>void;
}){
  const held=useMemo(()=>(core.dupeQueue(state) as Lead[]).slice().sort((a,b)=>(b.opportunityScore??-1)-(a.opportunityScore??-1)||a.company.localeCompare(b.company)),[state]);
  const [filter,setFilter]=useState<Filter>('all'),[query,setQuery]=useState('');
  const [dialog,setDialog]=useState<{id:string;mode:DialogMode}|null>(null);
  const [activityDate,setActivityDate]=useState(''),[note,setNote]=useState(''),[decision,setDecision]=useState<Decision>('approved'),[ack,setAck]=useState(false);
  const open=(l:Lead,mode:DialogMode)=>{
    setDialog({id:l.id,mode});setActivityDate(l.crmLastActivityAt||'');setNote('');setDecision('approved');setAck(false);
  };
  const close=()=>setDialog(null);
  const current=dialog?state.leads.find(l=>l.id===dialog.id):null;
  const due=held.filter(l=>core.dupeState(l)==='review-due').length;
  const pending=held.filter(l=>core.dupeState(l)==='requested').length;
  const undated=held.filter(l=>core.dupeState(l)==='missing-activity').length;
  const shown=held.filter(l=>(filter==='all'||core.dupeState(l)===filter)&&(!query||l.company.toLowerCase().includes(query.toLowerCase())||l.sector.toLowerCase().includes(query.toLowerCase())));
  const save=()=>{
    if(!dialog||!current||!ack)return;
    const ok=dialog.mode==='check'?onCRMCheck(current.id,note,activityDate):
      dialog.mode==='request'?onRequest(current.id,note):onDecision(current.id,decision,note);
    if(ok)close();
  };
  return <div className="page-content">
    <div className="page-heading"><div><span className="eyebrow">FUTURE RECLAIM OPPORTUNITIES</span><h1>Duplicate Queue</h1><p>Bank Salesforce-owned prospects ranked by research priority. Your manager can verify missing activity dates for exceptional companies; three calendar months without qualifying activity permits a manual reassignment request.</p></div><button className="btn secondary" onClick={onReserve}><Icon name="target"/> Back to Lead Reserve</button></div>
    <div className="metrics-grid">
      <div className="metric"><span>Banked duplicates</span><strong>{held.length}</strong><small>Excluded from calls and activation</small></div>
      <div className="metric"><span>Review date reached</span><strong>{due}</strong><small>Recheck CRM before any request</small></div>
      <div className="metric"><span>Requests pending</span><strong>{pending}</strong><small>Awaiting actual ownership decision</small></div>
      <div className="metric"><span>Activity date needed</span><strong>{undated}</strong><small>No guessed eligibility date</small></div>
    </div>
    <section className="panel stack">
      <h2>Three-month reclaim rule</h2>
      <p className="hint">A company becomes <strong>due for review</strong> three calendar months after its last recorded qualifying Salesforce activity, not automatically eligible for outreach. Before requesting reassignment, check that no newer qualifying activity has occurred and that your organisation's ownership rules permit a request. SalesOS does not read Salesforce or send any request for you.</p>
      <p className="hint">After the request is submitted, the company stays on hold. Only explicitly recording an approved reassignment releases it back into your ranked Lead Reserve. Declined requests remain banked.</p>
    </section>
    <section className="panel stack">
      <div className="section-between"><h2>Banked companies · highest screening priority first</h2><Badge>{shown.length} shown</Badge></div>
      <div className="filters"><div className="search-wrap"><Icon name="search"/><input aria-label="Search duplicates" placeholder="Search banked companies" value={query} onChange={e=>setQuery(e.target.value)}/></div><select aria-label="Reclaim status" value={filter} onChange={e=>setFilter(e.target.value as Filter)}><option value="all">All CRM holds</option><option value="review-due">Review due</option><option value="waiting">Waiting three months</option><option value="missing-activity">Last activity needed</option><option value="requested">Request submitted</option><option value="declined">Request declined</option></select></div>
      {shown.length?<div className="table-wrap"><table className="data-table"><thead><tr><th>Company</th><th>FX score</th><th>Last qualifying CRM activity</th><th>Review date</th><th>Reclaim stage</th><th>Next action</th></tr></thead><tbody>{shown.slice(0,250).map(l=>{
        const stage=core.dupeState(l) as string,dueDate=core.reclaimReviewDate(l) as string;
        const status=stage==='review-due'?'Review due':stage==='waiting'?'Waiting':stage==='requested'?'Awaiting decision':stage==='declined'?'Declined':'Activity date needed';
        return <tr key={l.id}>
          <td><strong>{l.company}</strong><button className="btn quiet small" onClick={()=>void navigator.clipboard.writeText(l.company)}>Copy name</button><small>{l.sector||'Sector unknown'}</small><small>{l.crmNote||'Salesforce ownership hold'}</small></td>
          <td><Badge tone={l.opportunityScore!==null&&l.opportunityScore>=80?'green':'muted'}>{l.opportunityScore===null?'Not scored':l.opportunityScore+'/100'}</Badge></td>
          <td>{l.crmLastActivityAt?day(l.crmLastActivityAt):'Not recorded'}</td>
          <td>{dueDate?day(dueDate):'Needs activity date'}</td>
          <td><Badge tone={stage==='review-due'?'amber':stage==='requested'?'blue':'muted'}>{status}</Badge>{l.crmReclaimRequestedAt&&<small>Requested {day(l.crmReclaimRequestedAt.slice(0,10))}</small>}{l.crmReclaimNote&&<small>{l.crmReclaimNote}</small>}</td>
          <td><div className="button-row"><button className="btn quiet small" onClick={()=>open(l,'check')}>Recheck CRM</button>{stage==='review-due'&&<button className="btn secondary small" onClick={()=>open(l,'request')}>Log reclaim request</button>}{stage==='requested'&&<button className="btn secondary small" onClick={()=>open(l,'decision')}>Record decision</button>}</div></td>
        </tr>;
      })}</tbody></table></div>:<Empty title="No duplicates match" detail="Record Salesforce ownership holds in Lead Reserve; they will appear here without generating outreach tasks."/>}
      {shown.length>250&&<p className="hint">Showing the first 250 held companies. Refine your search to locate others.</p>}
    </section>
    {dialog&&current&&<div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><div className="dialog compact" role="dialog" aria-modal="true" aria-label="Duplicate queue action">
      <div className="dialog-top"><div><span className="eyebrow">SALESFORCE OWNERSHIP · MANUAL</span><h2>{dialog.mode==='check'?'Recheck CRM activity':dialog.mode==='request'?'Log submitted reclaim request':'Record ownership decision'}</h2><p>{current.company}</p></div><button className="icon-btn" aria-label="Close" onClick={close}><Icon name="x"/></button></div>
      <div className="dialog-content">
        {dialog.mode==='check'&&<>
          <p className="hint">Check Salesforce for the latest qualifying activity under your company's ownership rules. If you cannot determine the date, leave it blank; the prospect stays on hold.</p>
          <label className="field">Last qualifying Salesforce activity date<input aria-label="Last qualifying Salesforce activity date" type="date" max={core.today()} value={activityDate} onChange={e=>setActivityDate(e.target.value)}/></label>
          <p className="hint">If newer activity occurred, enter that newer date. This resets the review clock and invalidates an outstanding reclaim request.</p>
        </>}
        {dialog.mode==='request'&&<>
          <p className="hint">A review date is not automatic ownership. Recheck Salesforce today using the CRM recheck action and confirm no newer qualifying activity, then submit the request through your normal internal process. This button only <strong>logs a request you've already submitted</strong>.</p>
          <small>Last checked: {current.crmCheckedAt||'Never'} · Last activity: {current.crmLastActivityAt||'Unknown'} · Earliest review: {core.reclaimReviewDate(current)||'Unknown'}</small>
        </>}
        {dialog.mode==='decision'&&<>
          <p className="hint">Only record approval if reassignment has actually been authorised and ownership updated under your Salesforce rules. Recording approval will release the company back into the reserve for future activation.</p>
          <label className="field">Decision<select value={decision} onChange={e=>setDecision(e.target.value as Decision)}><option value="approved">Approved — ownership reassigned</option><option value="declined">Declined — remain on hold</option></select></label>
        </>}
        <label className="field">{dialog.mode==='check'?'What did you verify?':dialog.mode==='request'?'Submitted request reference / method':'Who confirmed the decision and what was the outcome?'}<textarea rows={3} value={note} onChange={e=>setNote(e.target.value)} placeholder="Record the relevant owner, review, ticket or decision evidence"/></label>
        <label className="check-row"><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/>{dialog.mode==='check'?'I checked Salesforce and recorded the latest qualifying activity accurately':dialog.mode==='request'?'I have actually submitted the reassignment request outside SalesOS':'I have received and verified this ownership decision'}</label>
      </div>
      <div className="dialog-footer"><button className="btn quiet" onClick={close}>Cancel</button><button className="btn primary" disabled={!ack||!note.trim()} onClick={save}>Save {dialog.mode==='check'?'CRM review':dialog.mode==='request'?'submitted request':'decision'}</button></div>
    </div></div>}
  </div>;
}
