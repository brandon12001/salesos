import type {State} from '../types';
import {core} from './core';
import {contactTargets,contactWorkspace,existingContact,blockedPhone} from './contactResearchRules';
import {companyIdentity,companyDomain,validSeniorPreview,validSeniorContact,type SeniorPreview,type SeniorContact} from './seniorRoles';
export type ContactUpdate={id:string;company:string;stamp:string;searchedAt?:string;previews?:SeniorPreview[];contact?:SeniorContact;reason?:string};
export function applyContactResearch(s:State,updates:ContactUpdate[],mode:'search'|'reveal',now=new Date()){
 if(!Array.isArray(updates)||!updates.length||updates.length>4||new Set(updates.map(u=>u.id)).size!==updates.length)throw Error('Invalid senior contact batch.');
 const w=contactWorkspace(s),available=contactTargets(w,now),targets=updates.map(u=>available.find(t=>t.id===u.id));
 if(targets.some((t,i)=>!t||t.stamp!==updates[i].stamp))throw Error('A company, contact or permission changed. Retrieved details have been retained for download; refresh before applying.');
 for(let i=0;i<updates.length;i++){
  const u=updates[i],t=targets[i]!;
  if(u.company!==t.company)throw Error('Company identity changed. No records changed.');
  if(mode==='search'){
   if(!u.searchedAt||!Number.isFinite(Date.parse(u.searchedAt))||Date.parse(u.searchedAt)>+now+300000||+now-Date.parse(u.searchedAt)>86400000||!Array.isArray(u.previews)||u.previews.length>5||new Set(u.previews.map(p=>p.id)).size!==u.previews.length||u.previews.some(p=>!validSeniorPreview(p)||companyIdentity(p.company)!==companyIdentity(t.company)||t.domain&&p.domain!==t.domain||existingContact(w,t,p.name,p.linkedin)))throw Error('Invalid or mismatched senior contact preview. No records changed.');
  }else if(u.contact){
   const c=u.contact,p=t.research?.previews.find(p=>p.id===c.id);
   if(!p||!validSeniorContact(c)||+now-Date.parse(c.checkedAt)>86400000||Date.parse(c.checkedAt)>+now+300000||p.title!==c.title||p.name!==c.name||p.domain!==c.domain||companyIdentity(c.company)!==companyIdentity(t.company)||existingContact(w,t,c.name,c.linkedin)||c.phones.some(p=>blockedPhone(w,p.number)))throw Error('A retrieved contact no longer passes role, company or suppression checks. No records changed.');
  }
 }
 let added=0;
 for(let i=0;i<updates.length;i++){
  const u=updates[i],t=targets[i]!,lead=t.kind==='reserve'?s.leads.find(l=>l.id===t.id):null,candidate=t.kind==='research'?w.factory!.candidates.find(c=>c.id===t.id):null,target=lead||candidate!;
  if(mode==='search')target.contactResearch={version:1,searchedAt:u.searchedAt!,previews:u.previews!};
  else if(u.contact){
   target.contactResearch={version:1,searchedAt:t.research!.searchedAt,previews:[],contact:u.contact};
   if(lead){
    const c=core.addContact(s,lead,seniorContactData(u.contact));if(!c||c.duplicate)throw Error('Contact already exists; no history was overwritten.');lead.primaryContactId=c.id;
    if(!companyDomain(lead.companyDomain))lead.companyDomain=u.contact.domain;
   }
   added++;
  }
 }
 return added;
}
export function seniorContactData(c:SeniorContact){return {name:c.name,contact:c.name,title:c.title,methods:[...c.phones.map(p=>({kind:p.kind,value:p.number,status:'unverified',updatedAt:c.checkedAt})),...(c.linkedin?[{kind:'linkedin',value:c.linkedin,status:'unverified'}]:[])],mobile:c.phones.find(p=>p.kind==='mobile')?.number||'',phone:c.phones.find(p=>p.kind==='phone')?.number||'',linkedin:c.linkedin,roleStatus:'unknown',notes:`Lusha ${c.id}, retrieved ${c.checkedAt.slice(0,10)}. Provider profile updated ${c.providerUpdatedAt}; current provider title: ${c.title}. Number and FX responsibility still need confirmation on the call.`}}
export function seniorContactCSV(rows:ContactUpdate[]){
 const data=rows.flatMap(r=>r.contact&&validSeniorContact(r.contact)&&companyIdentity(r.contact.company)===companyIdentity(r.company)?[{...r.contact,company:r.company}]:[]),cell=(v:string)=>'"'+v.replace(/"/g,'""').replace(/^[=@-]/,"'$&")+'"';
 return [['Company','Contact Name','Job Title','Mobile','Alternative Mobile','Phone','LinkedIn','Company Domain','Source','Source Date'],...data.map(c=>[c.company,c.name,c.title,c.phones.find(p=>p.kind==='mobile')?.number||'',c.phones.filter(p=>p.kind==='mobile')[1]?.number||'',c.phones.find(p=>p.kind==='phone')?.number||'',c.linkedin,c.domain,'Lusha',c.checkedAt.slice(0,10)])].map(row=>row.map(cell).join(',')).join('\r\n');
}
