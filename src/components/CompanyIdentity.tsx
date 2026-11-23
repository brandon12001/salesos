import {useState} from 'react';
import type {Lead,State} from '../types';
import {callPreparation} from '../lib/callPreparation';
import {CompanyBriefing,type SaveCompanyBriefing} from './CompanyBriefing';
import {descriptionStamp} from '../lib/companyEnrichment';
import {industryForLead,industryLabel} from '../lib/industryFocus';

// Plain-English company identity shown in Focus and company details.
// Currency pairs are expressly hypotheses unless a confirmed currency is recorded.
export function CompanyIdentity({state,lead,onSave,onSaveBriefing,showQuestion=true}:{showQuestion?:boolean;state:State;lead:Lead;onSave:(id:string,value:string,expected:string)=>string|void;onSaveBriefing:SaveCompanyBriefing}){
 const prep=callPreparation(state,lead);
 const [editing,setEditing]=useState(false),[draft,setDraft]=useState(lead.businessDescription||''),[error,setError]=useState('');
 const start=()=>{setDraft(lead.businessDescription||'');setError('');setEditing(true)};
 const save=()=>{const result=onSave(lead.id,draft,descriptionStamp(lead));if(result){setError(result);return}setEditing(false);setError('')};
 return <section className="company-identity" aria-label="Company business summary">
  <div className="section-between company-identity-title"><span className="micro-label">WHAT THIS COMPANY DOES</span><button type="button" className="btn quiet small" onClick={start} disabled={editing}>Edit description</button></div>
  {editing?<div className="company-identity-editor"><label className="field">Plain-English company description<textarea rows={3} maxLength={500} value={draft} onChange={e=>setDraft(e.target.value)} placeholder="e.g. Recruits technology contractors for businesses in Europe."/></label>{error&&<p className="form-error" role="alert">{error}</p>}<div className="button-row"><button className="btn primary small" onClick={save} disabled={draft.trim().length<8}>Save description</button><button className="btn quiet small" onClick={()=>{setEditing(false);setError('')}}>Cancel</button></div></div>:
  <p className={'company-identity-description'+(!lead.businessDescription?' is-missing':'')}>{lead.businessDescription||'No company description added yet.'}</p>}
  <CompanyBriefing lead={lead} onSave={onSaveBriefing}/>
  <div className="company-identity-chips"><span><strong>Industry:</strong> {industryLabel(state,industryForLead(state,lead))}</span>{lead.standardisedIndustry&&<span><strong>Research category:</strong> {lead.standardisedIndustry}</span>}{lead.countriesMentioned&&<span><strong>Countries mentioned:</strong> {lead.countriesMentioned}</span>}{lead.currenciesConfirmed&&<span><strong>Currencies confirmed:</strong> {lead.currenciesConfirmed}</span>}{lead.potentialCurrencyPairs&&<span><strong>Potential pairs (unverified):</strong> {lead.potentialCurrencyPairs}</span>}</div>
  {prep?<><p className="company-identity-fx"><strong>FX clue:</strong> {prep.fxClue||'No specific FX clue recorded — qualify it on the call.'}</p>{showQuestion&&<p className="company-identity-fx"><strong>Call-preparation question:</strong> {prep.question}</p>}</>:lead.researchRationale&&<p className="company-identity-fx"><strong>FX research:</strong> {lead.researchRationale}</p>}
  {(prep||lead.researchReviewFlag||lead.descriptionVerification||lead.internationalActivityEvidence)&&<details className="company-identity-evidence"><summary>{lead.researchReviewFlag?'Research review recommended':'Research evidence and verification'}</summary>{prep&&<><p><strong>Original scoring research:</strong> {lead.researchRationale||'Not recorded'}</p>{lead.callObjective&&<p><strong>Original research question:</strong> {lead.callObjective}</p>}{lead.researchHypothesis&&<p><strong>Original hypothesis:</strong> {lead.researchHypothesis}</p>}{prep.hypothesis&&<p><strong>Call-preparation hypothesis (unverified):</strong> {prep.hypothesis}</p>}{prep.internationalEvidence&&<p><strong>Call-preparation international evidence:</strong> {prep.internationalEvidence}</p>}</>}{lead.descriptionVerification&&<p><strong>Description verification:</strong> {lead.descriptionVerification}</p>}{lead.internationalActivityEvidence&&<p><strong>International evidence:</strong> {lead.internationalActivityEvidence}</p>}{lead.researchReviewFlag&&<p><strong>Review note:</strong> {lead.researchReviewFlag}</p>}</details>}
 </section>;
}
