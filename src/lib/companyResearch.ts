import type {Lead,State} from '../types';
const CH='https://find-and-update.company-information.service.gov.uk';
export function companiesHouse(lead:Pick<Lead,'company'|'companyNumber'>){
 const number=String(lead.companyNumber||'').trim().toUpperCase();
 // Format check only: this does not establish existence or legal-entity identity.
 const exact=/^(?:\d{8}|[A-Z]{2}\d{6}|R\d{7})$/.test(number);
 return {exact,url:exact?`${CH}/company/${number}`:`${CH}/search?q=${encodeURIComponent(lead.company)}`};
}
export function websiteUrl(raw:string):string|null{
 const text=String(raw||'').trim();
 if(!text||text.length>2048||/[\s\\\u0000-\u001f\u007f]/.test(text)||text.startsWith('//'))return null;
 // Reject malformed or non-web schemes rather than interpreting them as a domain.
 const hostPort=/^[^/:?#]+\.[^/:?#]+:\d+(?:[/?#]|$)/.test(text);
 const scheme=!hostPort&&/^[a-z][a-z\d+.-]*:/i.test(text);
 if(scheme&&!/^https?:\/\//i.test(text))return null;
 try{
  const url=new URL(scheme?text:'https://'+text);
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password)return null;
  const host=url.hostname;
  if(!host.includes('.')||host.split('.').some(label=>!/^([a-z\d]|[a-z\d][a-z\d-]{0,61}[a-z\d])$/i.test(label)))return null;
  return url.href;
 }catch{return null}
}
export function websiteSearch(company:string){return 'https://www.google.com/search?q='+encodeURIComponent(company+' official company website')}
export type SaveWebsite=(leadId:string,value:string,expected:string)=>string|void;
export function saveWebsite(state:State,leadId:string,value:string,expected:string){
 const lead=state.leads.find(l=>l.id===leadId);if(!lead)throw Error('This company is no longer available.');
 if((lead.companyDomain||'')!==expected)throw Error('The saved website changed. Close and reopen Add Website before editing.');
 const url=websiteUrl(value);if(!url)throw Error('Enter a valid HTTP or HTTPS company website, without sign-in credentials.');
 lead.companyDomain=url;
}
