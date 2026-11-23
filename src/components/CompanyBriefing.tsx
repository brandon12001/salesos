import {useState} from 'react';
import type {Lead} from '../types';
import {briefingStamp} from '../lib/companyBriefing';

export type SaveCompanyBriefing=(id:string,value:string,expected:string)=>string|void;

// Read only when wanted; the phone number and next best action stay above the fold.
export function CompanyBriefing({lead,onSave}:{lead:Lead;onSave:SaveCompanyBriefing}){
 const [editing,setEditing]=useState(false);
 const [draft,setDraft]=useState('');
 const [error,setError]=useState('');
 const [expected,setExpected]=useState('');
 const start=()=>{setDraft(lead.companyBriefing||'');setExpected(briefingStamp(lead));setError('');setEditing(true)};
 const save=()=>{
  const failure=onSave(lead.id,draft,expected);
  if(failure){setError(failure);return}
  setEditing(false);setError('');
 };
 return <details className="company-briefing">
   <summary>More about this company</summary>
   <div className="company-briefing-content">
    {!editing?<><p>{lead.companyBriefing||'No additional company context recorded yet.'}</p><button type="button" className="btn quiet small" onClick={start}>{lead.companyBriefing?'Edit company context':'Add company context'}</button></>:
    <div className="company-briefing-editor">
      <label className="field">Company background, customers, operations or an interesting verified development
       <textarea value={draft} onChange={event=>setDraft(event.target.value)} rows={5} maxLength={1400} placeholder="What makes this business different? Who does it serve? Where does it operate? Only add details supported by your research."/>
      </label>
      <p className="hint">Write naturally. Include only details you have checked; do not guess at FX payments.</p>
      {error&&<p className="form-error" role="alert">{error}</p>}
      <div className="button-row"><button type="button" className="btn primary small" onClick={save}>Save context</button><button type="button" className="btn quiet small" onClick={()=>{setEditing(false);setError('')}}>Cancel</button></div>
    </div>}
   </div>
  </details>;
}
