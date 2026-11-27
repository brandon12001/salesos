import {useEffect,useMemo,useState,type ReactNode} from 'react';
import type {Lead,State} from '../types';
import {core} from '../lib/core';
import {reserveAvailability} from '../lib/reserveAvailability';
import {industryFocusConfig,industryOptions,industryForLead,industryLabel,industrySupply} from '../lib/industryFocus';
import {Badge,Empty,Icon,day} from './UI';

type ReserveSettings={reserveAutoActivate:number;reserveSupplyFloor:number;reserveActivationBatch:number;reserveMinScore:number;reserveActiveCap:number;reserveIntelligentRefill:number};
const settingsFrom=(s:State):ReserveSettings=>({
  reserveAutoActivate:s.settings.reserveAutoActivate??0,
  reserveSupplyFloor:s.settings.reserveSupplyFloor??20,
  reserveActivationBatch:s.settings.reserveActivationBatch??5,
  reserveMinScore:s.settings.reserveMinScore??60,
  reserveActiveCap:s.settings.reserveActiveCap??150,
  reserveIntelligentRefill:s.settings.reserveIntelligentRefill??0
});
export function LeadReserve({state,onActivate,onSettings,onImport,onReviewCRM,onDupeQueue,onResearch,seniorContacts}:{seniorContacts?:ReactNode;state:State;onActivate:(ids:string[])=>void;onSettings:(changes:ReserveSettings)=>void;onImport:()=>void;onReviewCRM:(id:string,clearance:'cleared'|'hold',note:string,lastActivityAt:string)=>boolean;onDupeQueue:()=>void;onResearch:()=>void}){
  const focus=industryFocusConfig(state);
  const [phoneOnly,setPhoneOnly]=useState(state.settings.coldCallMode===1);
  const [industryFilter,setIndustryFilter]=useState(()=>focus.enabled?focus.category:'all');
  const ranked=useMemo(()=>(core.reserveRank(state) as Lead[]).filter(l=>l.crmClearance!=='hold'&&(industryFilter==='all'||industryForLead(state,l)===industryFilter)),[state,industryFilter]);
  const holdCount=state.leads.filter(l=>l.leadPool==='reserve'&&l.crmClearance==='hold').length;
  const [settings,setSettings]=useState<ReserveSettings>(()=>settingsFrom(state));
  const [review,setReview]=useState<Lead|null>(null),[reviewStatus,setReviewStatus]=useState<'cleared'|'hold'>('cleared'),[reviewNote,setReviewNote]=useState(''),[lastActivityAt,setLastActivityAt]=useState(''),[acknowledged,setAcknowledged]=useState(false);
  const openReview=(lead:Lead)=>{setReview(lead);setReviewStatus(lead.crmClearance==='hold'?'hold':'cleared');setReviewNote('');setLastActivityAt(lead.crmLastActivityAt||'');setAcknowledged(false)};
  useEffect(()=>{setSettings(settingsFrom(state))},[state.settings]);
  const threshold=state.settings.reserveMinScore??60;
  const availability=reserveAvailability(state,ranked,threshold,phoneOnly),eligible=availability.eligible;
  const needsScore=ranked.filter(l=>l.opportunityScore===null).length;
  const overdue=ranked.filter(l=>core.reserveReviewDue(l)<=core.today()).length;
  const stale=ranked.filter(l=>l.researchDate&&core.daysBetween(core.today(),l.researchDate)>=30).length;
  const active=state.leads.filter(l=>l.leadPool!=='reserve'&&l.status==='Active'&&l.stage!=='First Trade'&&(industryFilter==='all'||industryForLead(state,l)===industryFilter)).length;
  const supply=core.leadSupply(state);
  const update=(key:keyof ReserveSettings,value:number)=>setSettings(s=>({...s,[key]:value}));
  const save=()=>{
    if(settings.reserveAutoActivate&&!state.settings.reserveAutoActivate&&!window.confirm('Enable automatic activation? SalesOS can immediately activate a small batch of highest-ranked eligible leads if task supply is low.'))return;
    onSettings(settings);
  };
  return <div className="page-content">
    <div className="page-heading"><div><span className="eyebrow">RESEARCHED LEAD SUPPLY</span><h1>Lead Reserve</h1><p>Cleared companies enter here from Lead Research. They still need real contact details, reliable FX evidence and activation checks before calling.</p></div><div className="button-row"><button className="btn primary" onClick={onResearch}><Icon name="search"/> Find new companies</button><button className="btn secondary" onClick={onDupeQueue}><Icon name="archive"/> Dupe Queue ({holdCount})</button><button className="btn secondary" onClick={onImport}><Icon name="upload"/> Import scored CSV</button></div></div>
    <div className="panel industry-reserve-filter"><label className="field">Filter Lead Reserve by industry<select aria-label="Reserve industry filter" value={industryFilter} onChange={e=>setIndustryFilter(e.target.value)}><option value="all">All industries</option>{industryOptions(state).map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label><label className="check-row"><input type="checkbox" checked={phoneOnly} onChange={e=>setPhoneOnly(e.target.checked)}/> With a usable phone number only</label><span className="hint">{industryFilter==='all'?'All available industries':`${industryLabel(state,industryFilter)} only`} · Select a filter to activate leads from that industry without changing your Focus preference.</span>{industryFilter!=='all'&&<small>{industrySupply(state,industryFilter).eligibleCallable} eligible callable companies · {industrySupply(state,industryFilter).researchNeeded} needing research</small>}</div>
    <div className="metrics-grid">
      <div className="metric"><span>Available reserve (not on CRM hold)</span><strong>{ranked.length}</strong><small>Not in active outreach</small></div>
      <div className="metric"><span>Ready at score ≥ {threshold}</span><strong>{eligible.length}</strong><small>Scored, permitted and {phoneOnly?'callable':'contactable'}</small></div>
      <div className="metric"><span>Research needed</span><strong>{needsScore}</strong><small>Unscored companies cannot activate</small></div>
      <div className="metric"><span>Review due</span><strong>{overdue}</strong><small>{stale} researched over 30 days ago · {holdCount} banked duplicates</small></div>
    </div>
    <section className="panel stack">
      <div className="section-between"><h2>Activate the best available prospects</h2><Badge tone="blue">{active} active in this industry view</Badge></div>
      {!eligible.length&&<div role="status" className="stack"><strong>No {phoneOnly?'callable ':''}prospects pass the current activation checks.</strong><p>{availability.belowScore.length} otherwise eligible {phoneOnly?'callable ':''}prospects are below the minimum score of {threshold}{availability.highestBelowScore!==null?`; highest available score: ${availability.highestBelowScore}`:''}. {availability.missingPhone} otherwise eligible prospects have email only.</p>{availability.belowScore.length>0&&<button className="btn secondary" onClick={()=>document.getElementById('reserve-minimum-score')?.focus()}>Review minimum score</button>}<p className="hint">Review the research before changing the score threshold. Ownership holds, opt-outs and missing contact details still block activation.</p></div>}
      {availability.blocked.length>0&&<details><summary>Why reserve leads cannot activate</summary><ul>{availability.blocked.map(([reason,count])=><li key={reason}>{count} · {reason}</li>)}</ul><small>{holdCount} ownership-held duplicates remain in Dupe Queue.</small></details>}
      <p className="hint">Scores determine cold-lead activation order after an explicit Salesforce ownership check. Existing conversations, meetings and promised callbacks remain prioritised in Focus Mode. Opted-out or uncontactable leads are excluded.</p>
      <div className="button-row"><button className="btn primary" disabled={!eligible.length} onClick={()=>onActivate(eligible.slice(0,5).map(l=>l.id))}>Activate top 5</button><button className="btn secondary" disabled={!eligible.length} onClick={()=>onActivate(eligible.slice(0,10).map(l=>l.id))}>Activate top 10</button><button className="btn secondary" disabled={!eligible.length} onClick={()=>{if(window.confirm(`Activate up to 25 eligible ${industryFilter==='all'?'prospects':industryLabel(state,industryFilter)+' prospects'}?`))onActivate(eligible.slice(0,25).map(l=>l.id))}}>Activate top 25</button><button className="btn secondary" disabled={!eligible.length} onClick={()=>{if(window.confirm(`Activate up to 50 eligible ${industryFilter==='all'?'prospects':industryLabel(state,industryFilter)+' prospects'}?`))onActivate(eligible.slice(0,50).map(l=>l.id))}}>Activate top 50</button><button className="btn quiet" onClick={onImport}>Upload refreshed research</button></div>
      <small>{supply.ready+supply.upcoming} tasks due in the configured {supply.days}-working-day supply window. No lead activates merely because it was imported unless you explicitly enable auto-replenishment below.</small>
    </section>
    {seniorContacts}
    <section className="panel stack">
      <div className="section-between"><h2>Controlled automatic replenishment</h2><Badge tone={state.settings.reserveAutoActivate?'green':'muted'}>{state.settings.reserveAutoActivate?'Enabled':'Disabled by default'}</Badge></div>
      <label className="check-row"><input type="checkbox" checked={!!settings.reserveAutoActivate} onChange={e=>update('reserveAutoActivate',e.target.checked?1:0)}/> Activate top eligible prospects when upcoming work drops below the floor</label>
      <label className="check-row"><input type="checkbox" checked={!!settings.reserveIntelligentRefill} onChange={e=>update('reserveIntelligentRefill',e.target.checked?1:0)}/> Use intelligent replenishment: count currently due safe work, with a refill-loop guard</label>
      <button className="btn secondary small" onClick={()=>setSettings(s=>({...s,reserveIntelligentRefill:1,reserveSupplyFloor:40,reserveActivationBatch:10,reserveMinScore:65}))}>Use suggested 40 / 10 / 65 rules</button>
      <p className="hint">Suggested rules do not enable automation. Auto-activation remains OFF until you explicitly enable it and save. In intelligent mode, settings/feedback changes cannot trigger repeated batches; a new completion or working day permits the next refill.</p>
      <div className="three-fields">
        <label className="field">Minimum opportunity score<input id="reserve-minimum-score" aria-label="Minimum opportunity score" type="number" min="0" max="100" value={settings.reserveMinScore} onChange={e=>update('reserveMinScore',Number(e.target.value))}/></label>
        <label className="field">Task supply floor<input aria-label="Task supply floor" type="number" min="1" max="200" value={settings.reserveSupplyFloor} onChange={e=>update('reserveSupplyFloor',Number(e.target.value))}/></label>
        <label className="field">Maximum leads per replenishment<input aria-label="Maximum leads per replenishment" type="number" min="1" max="25" value={settings.reserveActivationBatch} onChange={e=>update('reserveActivationBatch',Number(e.target.value))}/></label>
      </div>
      <label className="field">Maximum active prospects<input aria-label="Maximum active prospects" type="number" min="1" max="2000" value={settings.reserveActiveCap} onChange={e=>update('reserveActiveCap',Number(e.target.value))}/></label>
      <details><summary>Recent automatic activations and reasons</summary>{state.activities.filter(a=>a.type==='Reserve'&&a.outcome==='Intelligent replenishment').slice(-5).reverse().map(a=><div key={a.id}><p>{a.at}: {(a as typeof a&{activatedNames?:string[]}).activatedNames?.join(', ')}</p><small>{a.notes}</small></div>)}</details>
      <p className="hint">Automatic activation only runs after an actual saved action. The active-prospect cap applies to automatic replenishment; manual activation remains available when the other checks pass. Score, batch size and task-supply rules still apply to automatic activation. No external AI or search API is called.</p>
      <button className="btn secondary" onClick={save}>Save activation rules</button>
    </section>
    <section className="panel stack">
      <div className="section-between"><h2>Ranked research queue</h2><Badge>{ranked.length} companies</Badge></div>
      {ranked.length?<><div className="table-wrap"><table className="data-table">
        <thead><tr><th>Company & evidence</th><th>Score</th><th>Research</th><th>Reserve review</th><th>Salesforce / activation</th></tr></thead>
        <tbody>{ranked.slice(0,250).map(l=>{
          const reason=core.reserveEligibility(state,l,threshold) as string|| (phoneOnly&&!availability.callable(l)?'Usable telephone contact needed for call-only activation':'');
          const reviewDue=core.reserveReviewDue(l) as string;
          const old=l.researchDate&&core.daysBetween(core.today(),l.researchDate)>=30;
          const due=reviewDue<=core.today();
          return <tr key={l.id}>
            <td><strong>{l.company}</strong><small>{l.sector||'Sector not recorded'} {l.companyNumber?' · CH '+l.companyNumber:''}</small><small>{l.researchRationale||'Research and scoring still required'}</small>{l.researchSources&&<small>Evidence: {l.researchSources}</small>}</td>
            <td><Badge tone={l.opportunityScore===null?'muted':l.opportunityScore>=80?'green':l.opportunityScore>=60?'blue':'amber'}>{l.opportunityScore===null?'Unscored':l.opportunityScore+'/100'}</Badge></td>
            <td>{l.researchDate?day(l.researchDate):'Not researched'}<small>{l.researchConfidence||'Confidence not stated'}</small>{old&&<Badge tone="amber">Refresh research</Badge>}</td>
            <td>{day(reviewDue)} {due&&<Badge tone="amber">Review due</Badge>}</td>
            <td><small>{l.crmClearance==='cleared'?'CRM cleared '+(l.crmCheckedAt||''):l.crmClearance==='hold'?'CRM ownership hold':'CRM check not recorded'}</small><div className="button-row">{!reason&&<button className="btn secondary small" onClick={()=>onActivate([l.id])}>Activate</button>}<button className="btn quiet small" onClick={()=>openReview(l)}>Record CRM check</button></div>{reason&&<small>{reason}</small>}</td>
          </tr>;
        })}</tbody>
      </table></div>{ranked.length>250&&<p className="hint">Showing the top 250 ranked records of {ranked.length}. Use a refreshed CSV to update older research in bulk.</p>}</>:
      <Empty title="No reserve leads in this view" detail="Try All industries, or import researched contacts. Ownership-held companies remain in Dupe Queue."/>}
      <p className="hint">Priority review: 80+ within five working days; other reserve leads within 15 working days. Thirty-day-old research is flagged for reassessment, not silently rescored. Salesforce ownership checks must be manually verified and refreshed after 30 days.</p>
    </section>
    {review&&<div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setReview(null)}}><div className="dialog compact" role="dialog" aria-modal="true" aria-label="Record Salesforce ownership check"><div className="dialog-top"><div><span className="eyebrow">MANUAL CRM VERIFICATION</span><h2>Record Salesforce check</h2><small>{review.company}</small></div><button className="icon-btn" aria-label="Close" onClick={()=>setReview(null)}><Icon name="x"/></button></div><div className="dialog-content"><p className="hint">SalesOS cannot read Salesforce. Check ownership and contact/activity rules in Salesforce before marking this prospect available.</p><label className="field">Ownership result<select value={reviewStatus} onChange={e=>setReviewStatus(e.target.value as 'cleared'|'hold')}>{review.crmClearance!=='hold'&&<option value="cleared">Cleared for outreach under current CRM rules</option>}<option value="hold">Hold / assigned / not available</option></select></label>{reviewStatus==='hold'&&<label className="field">Last qualifying Salesforce activity date (if known)<input aria-label="Last qualifying Salesforce activity date" type="date" max={core.today()} value={lastActivityAt} onChange={e=>setLastActivityAt(e.target.value)}/><small>If unknown, leave empty; the company stays in Dupe Queue without an assumed reclaim date.</small></label>}{review.crmClearance==='hold'&&<p className="hint">This company cannot be cleared here. Use Dupe Queue to record a submitted reclaim request and actual reassignment approval.</p>}<label className="field">What did you verify?<textarea rows={3} value={reviewNote} onChange={e=>setReviewNote(e.target.value)} placeholder="Owner and recent activity checked; outcome and rationale"/></label><label className="check-row"><input type="checkbox" checked={acknowledged} onChange={e=>setAcknowledged(e.target.checked)}/> I checked Salesforce and am recording the result accurately</label></div><div className="dialog-footer"><button className="btn quiet" onClick={()=>setReview(null)}>Cancel</button><button className="btn primary" disabled={!acknowledged||!reviewNote.trim()} onClick={()=>{if(onReviewCRM(review.id,reviewStatus,reviewNote,reviewStatus==='hold'?lastActivityAt:''))setReview(null)}}>Save CRM check</button></div></div></div>}
  </div>;
}
