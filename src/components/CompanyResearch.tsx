import {useState} from 'react';
import {Icon} from './UI';
import type {Lead} from '../types';
import {companiesHouse,websiteSearch,websiteUrl,type SaveWebsite} from '../lib/companyResearch';
export function CompanyResearch({lead,onSave}:{lead:Lead;onSave:SaveWebsite}){
 const ch=companiesHouse(lead),url=websiteUrl(lead.companyDomain);
 const [editing,setEditing]=useState(false),[value,setValue]=useState(''),[expected,setExpected]=useState(''),[error,setError]=useState('');
 const external={target:'_blank',rel:'noopener noreferrer',referrerPolicy:'no-referrer' as const};
 return <div className="company-research" aria-label={'Company research for '+lead.company}>
  <div className="button-row"><a className="btn secondary small" href={ch.url} {...external} title={ch.exact?'Open recorded registration number · confirm the legal entity':'Name search only · confirm the correct legal entity'}>{ch.exact?'Companies House':'Companies House · Search'} <span aria-hidden="true"><Icon name="external" size={14}/></span></a>
  {url?<a className="btn secondary small" href={url} {...external}>Company Website <span aria-hidden="true"><Icon name="external" size={14}/></span></a>:<><span className="research-unavailable">Company Website · {lead.companyDomain?'Invalid URL':'Not recorded'}</span><a className="btn secondary small" href={websiteSearch(lead.company)} {...external}>Find Website <span aria-hidden="true"><Icon name="external" size={14}/></span></a></>}
  <button className="btn quiet small" onClick={()=>{setValue(lead.companyDomain||'');setExpected(lead.companyDomain||'');setError('');setEditing(true)}}>{url?'Edit Website':'Add Website'}</button></div>
  {editing&&<form className="research-editor" onSubmit={e=>{e.preventDefault();const failure=onSave(lead.id,value,expected);if(failure)setError(failure);else{setEditing(false);setError('')}}}>
   <label className="field">Verified company website<input aria-label="Verified company website" autoFocus value={value} maxLength={2048} onChange={e=>setValue(e.target.value)} placeholder="https://company.example"/></label>
   <p className="hint">Save only after checking this is the right company. No domain is guessed or saved by opening a search.</p>
   <div className="button-row"><button className="btn secondary small" type="submit">Save verified website</button><button className="btn quiet small" type="button" onClick={()=>setEditing(false)}>Cancel website edit</button></div>{error&&<p role="alert" className="form-error">{error}</p>}
  </form>}
 </div>;
}
