import type {Lead,State} from '../types';
import type {Candidate} from './leadFactory';
import {preSearchScreen} from './researchScreen';
import {turnoverFit,hmrcQualified,hmrcFitPriority} from './companyContext';
import {companyIdentity,personIdentity,companyDomain,normalPhone,validSeniorContact,type ContactResearch} from './seniorRoles';
export type ContactWorkspace={leads:Lead[];factory:{version:number;candidates:Candidate[];turnoverTarget?:{min:number;max:number}}|null;settings:State['settings'];suppression:State['suppression']};
export type ContactTarget={id:string;kind:'reserve'|'research';company:string;domain:string;priority:number;stamp:string;research?:ContactResearch};
const stamp=(v:unknown)=>JSON.stringify(v,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
export const contactWorkspace=(s:State):ContactWorkspace=>({leads:s.leads,factory:s.meta.leadFactory as ContactWorkspace['factory']||null,settings:s.settings,suppression:s.suppression});
const recent=(value:string,days:number,now:Date)=>{const n=Date.parse(value);return Number.isFinite(n)&&n<=+now+300000&&+now-n<=days*86400000};
const contactable=(l:Lead)=>l.contacts.some(c=>c.active&&!c.optedOut&&!['left_company','not_responsible'].includes(c.roleStatus)&&c.methods.some(m=>['mobile','phone'].includes(m.kind)&&['valid','unverified'].includes(m.status)&&/^\+?[0-9][0-9\s()\-]{7,18}$/.test(m.value)));
function suppressed(w:ContactWorkspace,company:string){return w.suppression.some(v=>{const x=v as {scope?:string;company?:string};return x?.scope==='company'&&companyIdentity(x.company)===companyIdentity(company)})}
export function contactTargets(w:ContactWorkspace,now=new Date()):ContactTarget[]{
 const rows:ContactTarget[]=[];
 for(const l of w.leads){
  if(l.leadPool!=='reserve'||l.status!=='Active'||l.stage==='First Trade'||l.crmClearance!=='cleared'||!recent(l.crmCheckedAt,30,now)||suppressed(w,l.company)||!Number.isFinite(l.opportunityScore)||l.opportunityScore!<Math.max(60,w.settings.reserveMinScore??60)||!l.researchRationale?.trim()||!recent(l.researchDate,30,now)||!l.researchSources?.includes('https://')||contactable(l))continue;
  rows.push({id:l.id,kind:'reserve',company:l.company,domain:companyDomain(l.companyDomain),priority:l.opportunityScore!,stamp:stamp([l,w.suppression]),research:(l as Lead&{contactResearch?:ContactResearch}).contactResearch});
 }
 if(w.factory?.version===1)for(const c of w.factory.candidates){
  if(c.contactResearch?.contact&&validSeniorContact(c.contactResearch.contact)&&recent(c.contactResearch.contact.checkedAt,30,now))continue;
  if(!['unchecked','cleared'].includes(c.status)||c.registryCheck?.risk!=='ok'||!recent(c.registryCheck.checkedAt,7,now)||!preSearchScreen(c.sector,c.registryCheck,now.toISOString()).eligible||!turnoverFit(c.turnover,w.factory.turnoverTarget,+now).eligible||suppressed(w,c.company)||w.leads.some(l=>companyIdentity(l.company)===companyIdentity(c.company)||l.companyNumber&&l.companyNumber===c.companyNumber))continue;
  const strong=c.researchMethod==='web-rule-screen'&&(c.evidence||[]).some(e=>e.strength==='strong'&&e.sourceUrl.startsWith('https://'));
  if(!strong&&!hmrcQualified(c,+now))continue;
  rows.push({id:c.id,kind:'research',company:c.company,domain:'',priority:Math.max(c.priority,hmrcFitPriority(c,+now)),stamp:stamp([c,w.factory.turnoverTarget,w.suppression]),research:c.contactResearch});
 }
 return rows.filter(t=>rows.filter(x=>companyIdentity(x.company)===companyIdentity(t.company)).length===1).sort((a,b)=>b.priority-a.priority||a.company.localeCompare(b.company));
}
export function existingContact(w:ContactWorkspace,target:ContactTarget,name:string,linkedin=''){
 return w.leads.filter(l=>companyIdentity(l.company)===companyIdentity(target.company)).some(l=>l.contacts.some(c=>personIdentity(c.name)===personIdentity(name)||linkedin&&c.methods.some(m=>m.kind==='linkedin'&&m.value.replace(/\/$/,'')===linkedin.replace(/\/$/,''))))||w.suppression.some(v=>{const x=v as {scope?:string;company?:string;contact?:string};return x?.scope==='contact'&&companyIdentity(x.company)===companyIdentity(target.company)&&personIdentity(x.contact)===personIdentity(name)});
}
export function blockedPhone(w:ContactWorkspace,number:string){return w.suppression.some(v=>{const x=v as {phone?:string};return x?.phone&&normalPhone(x.phone)===number})||w.leads.some(l=>l.contacts.some(c=>c.methods.some(m=>['mobile','phone'].includes(m.kind)&&normalPhone(m.value)===number&&(m.status==='invalid'||c.optedOut||!c.active||['left_company','not_responsible'].includes(c.roleStatus)))))}
