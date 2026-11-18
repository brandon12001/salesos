// Manual contact administration only. This module never creates or completes sales tasks.
import type {Contact,Lead,MethodKind,SalesforceContactStatus,State,Task} from '../types';
import {core} from './core';
import {suppressed,usableMethod} from './intelligence/eligibility';
import {protectedTask} from './intelligence/evidence';
export const SF_STATUSES:Record<SalesforceContactStatus,string>={not_checked:'Not Checked',needs_adding:'Needs Adding',added:'Added'};
export type ContactRef={leadId:string;contactId:string};
export const contactRefKey=(r:ContactRef)=>r.leadId+':'+r.contactId;
export type SalesforceFields={company:string;firstName:string;lastName:string;title:string;phone:string;email:string;industry:string};
export const SF_FIELDS:[keyof SalesforceFields,string][]=[['company','Company'],['firstName','First Name'],['lastName','Last Name'],['title','Job Title'],['phone','Phone'],['email','Email'],['industry','Industry']];
export const salesforceStatus=(c:Contact):SalesforceContactStatus=>c.salesforceStatus&&Object.hasOwn(SF_STATUSES,c.salesforceStatus)?c.salesforceStatus:'not_checked';
export const statusStamp=(c:Contact)=>JSON.stringify([salesforceStatus(c),c.salesforceStatusUpdatedAt||'',c.salesforceVerificationNote||'']);
export const detailStamp=(c:Contact)=>JSON.stringify([c.name,c.title,c.firstName,c.lastName,c.roleStatus,c.active,c.optedOut,c.methods]);
export function resolveContact(s:State,r:ContactRef){const lead=s.leads.find(l=>l.id===r.leadId),contact=lead?.contacts.find(c=>c.id===r.contactId);if(!lead||!contact)throw Error('This company/contact record is no longer available.');return {lead,contact}}
export function contactRestriction(s:State,l:Lead,c:Contact){return suppressed(s,l,c)?'Suppressed contact: phone/email copying and corrections are disabled. Administrative status confirmation does not permit outreach.':!c.active||['left_company','not_responsible'].includes(c.roleStatus)?'Inactive or restricted contact: phone/email copying and corrections are disabled. Status updates do not make this person contactable.':''}
export function quickAddFields(s:State,l:Lead,c:Contact):SalesforceFields{
 const parts=c.name.trim().split(/\s+/),phone=['mobile','phone'].flatMap(kind=>c.methods.filter(m=>m.kind===kind&&usableMethod(m)))[0],email=c.methods.find(m=>m.kind==='email'&&usableMethod(m));
 const blocked=!!contactRestriction(s,l,c);
 return {company:l.company,firstName:c.firstName??(parts.length>1?parts.slice(0,-1).join(' '):parts[0]||''),lastName:c.lastName??(parts.length>1?parts[parts.length-1]:''),title:c.title,phone:blocked?'':phone?core.phoneDial(phone.value):'',email:blocked?'':email?.value||'',industry:l.sector};
}
export function tabSeparatedFields(fields:SalesforceFields){return SF_FIELDS.map(([key])=>fields[key].replace(/[\t\r\n]+/g,' ')).join('\t')}
export function setSalesforceStatuses(s:State,refs:ContactRef[],status:SalesforceContactStatus,note:string|undefined,expected:Record<string,string>,now:Date,confirmed=false){
 if(!Object.hasOwn(SF_STATUSES,status))throw Error('Choose a supported Salesforce contact status.');
 const unique=[...new Map(refs.map(r=>[contactRefKey(r),r])).values()];if(!unique.length)throw Error('Select at least one contact.');
 if(unique.length>1&&!confirmed)throw Error('Confirm the bulk status update explicitly.');
 const contacts=unique.map(r=>{const {contact}=resolveContact(s,r);if(expected[contactRefKey(r)]!==statusStamp(contact))throw Error('A selected contact status changed. Reopen the contact or reselect the rows to review the latest status.');return contact});
 for(const c of contacts){c.salesforceStatus=status;c.salesforceStatusUpdatedAt=now.toISOString();if(note!==undefined)c.salesforceVerificationNote=note.trim()}
 return contacts;
}
function addCorrectedMethod(s:State,l:Lead,c:Contact,kind:MethodKind,value:string){
 const existing=c.methods.find(m=>m.kind===kind&&(kind==='email'?m.value.trim().toLowerCase()===value.toLowerCase():core.phoneDial(m.value)===core.phoneDial(value)));
 if(existing){if(!usableMethod(existing))throw Error('That method is already invalid or blocked. It cannot be revalidated here.');return}
 const m=core.addMethod(s,l,c,kind,value,'unverified');if(!m||m.duplicate)throw Error('Contact method could not be saved.');return m;
}
export function saveQuickAddDetails(s:State,ref:ContactRef,fields:SalesforceFields,expected:string){
 const {lead:l,contact:c}=resolveContact(s,ref);if(detailStamp(c)!==expected)throw Error('Contact details changed while this form was open. Your copy form is retained; reopen to review the saved details.');
 const restriction=contactRestriction(s,l,c);if(restriction)throw Error(restriction);
 const phone=fields.phone.trim(),email=fields.email.trim();
 for(const [kind,value] of [['phone',phone],['email',email]] as const){if(value&&!usableMethod({id:'draft',kind,value,status:'unverified'}))throw Error('Enter a usable '+kind+' or leave it blank.');}
 const name=[fields.firstName.trim(),fields.lastName.trim()].filter(Boolean).join(' ');if(!name)throw Error('Record at least one contact name.');
 if(l.contacts.some(x=>x.id!==c.id&&x.name.trim().toLowerCase()===name.toLowerCase()))throw Error('That name belongs to another contact at this company; review identity before saving.');
 // Retain old methods and their flags/history. Reuse known methods; new ones remain unverified.
 const oldPhone=c.methods.find(m=>['mobile','phone'].includes(m.kind)&&core.phoneDial(m.value)===core.phoneDial(phone)),oldEmail=c.methods.find(m=>m.kind==='email'&&m.value.trim().toLowerCase()===email.toLowerCase());
 if(phone&&oldPhone&&!usableMethod(oldPhone)||email&&oldEmail&&!usableMethod(oldEmail))throw Error('That method is invalid or blocked; it cannot be revalidated here.');
 if(phone){const chosen=oldPhone||addCorrectedMethod(s,l,c,c.methods.some(m=>m.kind==='mobile'&&usableMethod(m))?'mobile':'phone',phone);if(chosen)c.methods=[chosen,...c.methods.filter(m=>m.id!==chosen.id)]}
 if(email){const chosen=oldEmail||addCorrectedMethod(s,l,c,'email',email);if(chosen)c.methods=[chosen,...c.methods.filter(m=>m.id!==chosen.id)]}
 c.name=name;c.firstName=fields.firstName.trim();c.lastName=fields.lastName.trim();c.title=fields.title.trim();
 // Company/Industry are copy-form values, never implicit company edits.
 return c;
}
export type QueueRow={ref:ContactRef;lead:Lead;contact:Contact;status:SalesforceContactStatus;priority:number;reason:string;context:string;nextDate:string};
export function salesforceQueue(s:State,now:Date):QueueRow[]{
 const taskMap=new Map(s.tasks.map(t=>[t.id,t])),promises=new Map<string,Task[]>(),upcoming=new Map<string,Task[]>(),conversations=new Map<string,string>();
 for(const t of s.tasks){if(t.status!=='pending'||!t.leadId||!t.contactId)continue;const key=contactRefKey({leadId:t.leadId,contactId:t.contactId}),map=protectedTask(t)?promises:upcoming;const list=map.get(key)||[];list.push(t);map.set(key,list)}
 for(const a of s.activities){if(a.type!=='Call'||!['Meaningful conversation','Callback requested','Meeting booked'].includes(a.outcome)||!Number.isFinite(Date.parse(a.at))||Date.parse(a.at)>+now)continue;const id=a.contactId!==undefined?a.contactId:taskMap.get(a.taskId||'')?.contactId;if(!a.leadId||!id)continue;const key=contactRefKey({leadId:a.leadId,contactId:id});if(a.at>(conversations.get(key)||''))conversations.set(key,a.at)}
 const day=core.today(now),week=core.addDays(day,7);
 return s.leads.flatMap(l=>l.contacts.map(c=>{const ref={leadId:l.id,contactId:c.id},key=contactRefKey(ref),promised=promises.get(key)||[],planned=upcoming.get(key)||[],active=l.status==='Active'&&l.leadPool!=='reserve'&&!contactRestriction(s,l,c);
  let priority=5,reason='No recorded engagement for this contact.';
  if(active&&['Meeting Booked','Successful Meeting','Onboarding','Account Open'].includes(l.stage)){priority=0;reason='Company is at '+l.stage+'; prepare its contact records.'}
  else if(active&&promised.length){priority=1;reason='A promised action is recorded for this contact.'}
  else if(active&&(conversations.has(key)||l.readiness!==null&&l.readiness>=3&&!!l.readinessEvidence)){priority=2;reason=conversations.has(key)?'A meaningful conversation is recorded for this contact.':'Company has explicitly recorded Buyer Readiness evidence.'}
  else if(active&&planned.some(t=>t.dueAt<=week)){priority=3;reason='A follow-up for this contact is due within seven days.'}
  else if(active){priority=4;reason='Active prospect; no stronger recorded contact signal.'}
  const nextDate=[...promised,...planned].map(t=>t.dueAt).sort()[0]||'';
  return {ref,lead:l,contact:c,status:salesforceStatus(c),priority,reason,context:`${l.stage} · ${l.status} · ${l.leadPool==='reserve'?'Lead Reserve':'Active pool'} · Company clearance: ${l.crmClearance}`,nextDate};
 })).sort((a,b)=>a.priority-b.priority||(a.nextDate||'9999').localeCompare(b.nextDate||'9999')||a.lead.company.localeCompare(b.lead.company)||a.contact.name.localeCompare(b.contact.name)||contactRefKey(a.ref).localeCompare(contactRefKey(b.ref)));
}
