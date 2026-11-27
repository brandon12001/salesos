import {SENIOR_TITLES,seniorRole,roleRank,companyIdentity,companyDomain,normalPhone,freshProviderDate,validSeniorPreview,type SeniorPreview,type SeniorContact} from '../src/lib/seniorRoles.js';
import {contactTargets,existingContact,blockedPhone,type ContactWorkspace,type ContactTarget} from '../src/lib/contactResearchRules.js';
export class LushaError extends Error{constructor(message:string,public status=502){super(message)}}
type RawContact={updateDate?:string;id?:string;firstName?:string;lastName?:string;fullName?:string;jobTitle?:{title?:string};company?:{name?:string;domain?:string};location?:{country?:string;countryIso2?:string};socialLinks?:{linkedin?:string};canReveal?:Array<{field?:string;credits?:number;source?:string}>;phones?:Array<{number?:string;type?:string;updateDate?:string;doNotCall?:boolean;dataSource?:string}>;error?:unknown;statusReason?:string};
type LushaResponse={results?:RawContact[];billing?:{creditsCharged?:number};job?:unknown;credits?:{remaining?:number};pricing?:Record<string,{credits:number;perQuantity:number}>};
const BASE='https://api.lusha.com/v3';
async function api(path:string,key:string,body?:unknown):Promise<LushaResponse>{
 let r:Response;try{r=await fetch(BASE+path,{method:body?'POST':'GET',headers:{api_key:key,'Content-Type':'application/json',Accept:'application/json'},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(12000)})}catch{throw new LushaError('Lusha did not confirm a result. Quota may have been used; check Lusha before an intentional retry. No automatic retry was sent.')}
 if(!r.ok)throw new LushaError(r.status===402?'Lusha quota is insufficient. No account upgrade was requested.':r.status===429?'Lusha rate limit reached. Retry later; no automatic retry.':r.status===401||r.status===403?'Lusha rejected the key or this API entitlement. Check the existing account API access.':'Lusha request failed. Quota may have been used; no automatic retry.',r.status===402||r.status===429?r.status:502);
 try{return await r.json() as LushaResponse}catch{throw new LushaError('Lusha returned an invalid response. Quota may have been used; no automatic retry.')}
}
function charged(r:LushaResponse){const n=r.billing?.creditsCharged;return Number.isInteger(n)&&n!>=0?n!:null}
export async function lushaStatus(key:string){
 if(!key)return {configured:false,remaining:null,searchCredits:1,maxPhoneCredits:5};
 const r=await api('/account/usage',key),search=r.pricing?.contactSearch,phone=r.pricing?.revealPhone;
 if(!search||!phone||search.credits!==1||search.perQuantity<25||!Number.isInteger(phone.credits)||phone.credits<0||phone.credits>5||phone.perQuantity!==1||!Number.isFinite(r.credits?.remaining)||r.credits!.remaining!<0)throw new LushaError('Lusha pricing or quota could not be verified within the 1-credit search / 5-credit phone cap. No contact search or reveal sent.',503);
 return {configured:true,remaining:r.credits!.remaining!,searchCredits:1,maxPhoneCredits:phone.credits};
}
function matches(raw:RawContact,t:ContactTarget,w:ContactWorkspace):SeniorPreview|null{
 const title=raw.jobTitle?.title||'',name=raw.fullName?.trim()||[raw.firstName,raw.lastName].filter(Boolean).join(' '),domain=companyDomain(raw.company?.domain),country=raw.location?.countryIso2||raw.location?.country;
 if(raw.error||raw.statusReason==='COMPLIANCE_RESTRICTED'||!seniorRole(title)||!['GB','United Kingdom'].includes(country||'')||companyIdentity(raw.company?.name)!==companyIdentity(t.company)||!domain||t.domain&&domain!==t.domain||existingContact(w,t,name,raw.socialLinks?.linkedin))return null;
 const field=raw.canReveal?.find(c=>c.field==='phones');if(!field||!Number.isInteger(field.credits)||field.credits!<0||field.credits!>5||field.source&&field.source.toLowerCase()!=='lusha')return null;
 const p={id:raw.id||'',name,title,company:raw.company!.name!,domain,linkedin:raw.socialLinks?.linkedin||'',phoneCredits:field.credits!};return validSeniorPreview(p)?p:null;
}
async function search(key:string,targets:ContactTarget[],ids?:string[]){
 return api('/contacts/prospecting',key,{pagination:{page:0,size:25},filters:{contacts:{include:{jobTitlesExactMatch:[...SENIOR_TITLES],countries:['GB'],...(ids?{ids}:{})}},companies:{include:{names:targets.map(t=>t.company)}}},options:{includePartialProfiles:false,maxContactsPerCompany:5}});
}
export async function searchSeniorContacts(w:ContactWorkspace,ids:string[],key:string,now=new Date()){
 const targets=select(w,ids,now),usage=await lushaStatus(key);if(!usage.configured)throw new LushaError('Add LUSHA_API_KEY to the Vercel Production environment first.',503);if(usage.remaining!<1)throw new LushaError('Lusha quota is insufficient for one search.',402);
 const result=await search(key,targets);if(!Array.isArray(result.results)||result.results.length>25)throw new LushaError('Invalid Lusha preview response; no profiles saved.');
 const rows=targets.map(t=>({id:t.id,company:t.company,stamp:t.stamp,searchedAt:now.toISOString(),previews:result.results!.map(c=>matches(c,t,w)).filter((p):p is SeniorPreview=>!!p).sort((a,b)=>roleRank(a.title)-roleRank(b.title)).filter((p,i,all)=>all.findIndex(x=>x.id===p.id)===i).slice(0,5)}));
 return {rows,charged:charged(result),rejected:result.results.length-rows.reduce((n,r)=>n+r.previews.length,0)};
}
function select(w:ContactWorkspace,ids:string[],now:Date){if(!Array.isArray(ids)||!ids.length||ids.length>4||ids.some(id=>typeof id!=='string')||new Set(ids).size!==ids.length)throw new LushaError('Select one to four unique qualified companies.',400);const available=contactTargets(w,now),targets=ids.map(id=>available.find(t=>t.id===id));if(targets.some(t=>!t))throw new LushaError('A company is no longer eligible for contact research. Refresh after cloud saving.',409);return targets as ContactTarget[]}
export async function revealSeniorContacts(w:ContactWorkspace,selections:Array<{id:string;contactId:string}>,key:string,now=new Date()){
 const targets=select(w,selections.map(x=>x.id),now),picks=selections.map((x,i)=>targets[i].research?.previews.find(p=>p.id===x.contactId));
 if(picks.some((p,i)=>!p||!validSeniorPreview(p)||!targets[i].research?.searchedAt||!Number.isFinite(Date.parse(targets[i].research!.searchedAt))||Date.parse(targets[i].research!.searchedAt)>+now+300000||+now-Date.parse(targets[i].research!.searchedAt)>86400000))throw new LushaError('Choose a current saved approved-title preview. Search again if it expired.',409);
 const limit=1+picks.reduce((n,p)=>n+p!.phoneCredits,0),usage=await lushaStatus(key);if(!usage.configured)throw new LushaError('Lusha API is not configured.',503);if(usage.remaining!<limit)throw new LushaError('Lusha quota is insufficient for this bounded reveal.',402);
 // Revalidate current role/company through the provider before any phone charge.
 const verify=await search(key,targets,picks.map(p=>p!.id));if(!Array.isArray(verify.results))throw new LushaError('Lusha could not verify the selected profiles. No phone reveal sent.');
 const checked=picks.map((p,i)=>{const raw=verify.results!.find(r=>r.id===p!.id),current=raw&&matches(raw,targets[i],w);return current&&current.domain===p!.domain&&current.name===p!.name&&current.title===p!.title&&current.phoneCredits<=p!.phoneCredits?current:null});
 if(checked.some(p=>!p))throw new LushaError('A selected role, company, price or profile changed. No phone reveal sent; search again.',409);
 const result=await api('/contacts/enrich',key,{ids:checked.map(p=>p!.id),reveal:['phones'],waterfallEnabled:false});if(result.job)throw new LushaError('Lusha returned a background job despite Lusha-only mode. Do not repeat this reveal; check the existing job in Lusha.');if(!Array.isArray(result.results))throw new LushaError('Lusha returned an incomplete reveal. Do not retry automatically.');
 const rows=targets.map((t,i)=>{
  const p=checked[i]!,raw=result.results!.find(r=>r.id===p.id);let contact:SeniorContact|undefined;
  const currentTitle=raw?.jobTitle?.title,domain=companyDomain(raw?.company?.domain),country=raw?.location?.countryIso2||raw?.location?.country;
  if(raw&&freshProviderDate(raw.updateDate,+now)&&!raw.error&&raw.statusReason!=='COMPLIANCE_RESTRICTED'&&currentTitle===p.title&&seniorRole(currentTitle)&&companyIdentity(raw.company?.name)===companyIdentity(t.company)&&domain===p.domain&&['GB','United Kingdom'].includes(country||'')&&(raw.fullName?.trim()||[raw.firstName,raw.lastName].filter(Boolean).join(' '))===p.name){
   const phones=(raw.phones||[]).filter(n=>n.doNotCall===false&&freshProviderDate(n.updateDate,+now)&&(!n.dataSource||n.dataSource.toLowerCase()==='lusha')&&['mobile','direct','direct_dial'].includes(n.type||'')).map(n=>({number:normalPhone(n.number),kind:n.type==='mobile'?'mobile' as const:'phone' as const,updatedAt:n.updateDate!})).filter((n,i,all)=>/^\+44\d{9,10}$/.test(n.number)&&!blockedPhone(w,n.number)&&all.findIndex(x=>x.number===n.number)===i).slice(0,2);
   if(phones.length)contact={...p,phones,checkedAt:now.toISOString(),providerUpdatedAt:raw.updateDate!};
  }
  return {id:t.id,company:t.company,stamp:t.stamp,contact,reason:contact?'':'No callable approved-role profile survived current company, UK, recent provider-data, DNC and invalid-number checks.'};
 });
 const costs=[charged(verify),charged(result)];return {rows,charged:costs.every(n=>n!==null)?costs.reduce<number>((n,c)=>n+c!,0):null,limit};
}
