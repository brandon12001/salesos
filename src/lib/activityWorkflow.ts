import type {Activity,Contact,MethodKind,State,Task} from '../types';
import {core} from './core';
import {channel,contactAllowed,leadRestriction,usableMethod} from './intelligence/eligibility';
import {localDate,validDate} from './intelligence/evidence';

export const CONVERSATION_OUTCOMES=['Meaningful conversation','Callback requested','Meeting booked'];
export type ActivityFields=Pick<Activity,'notes'|'durationMins'|'contactId'|'followUpNotes'>;
export function fieldsFor(a:Activity):ActivityFields{return {notes:a.notes||'',durationMins:a.durationMins,contactId:a.contactId??null,followUpNotes:a.followUpNotes||''}}
export function activityStamp(a:Activity){return JSON.stringify(fieldsFor(a))}
export function activityForTask(s:State,t:Task):Activity|undefined{
 return [...s.activities].reverse().find(a=>a.taskId===t.id&&!['Snoozed','Skipped to next working day'].includes(a.outcome));
}
export function activityContact(s:State,a:Activity):Contact|null{
 const l=s.leads.find(l=>l.id===a.leadId),t=s.tasks.find(t=>t.id===a.taskId),id=a.contactId!==undefined?a.contactId:t?.contactId;
 return l&&id?l.contacts.find(c=>c.id===id)||null:null;
}
export function saveActivityDetails(s:State,id:string,patch:ActivityFields,expected:string,now:Date){
 const a=s.activities.find(a=>a.id===id);if(!a)throw Error('Activity no longer exists.');
 if(Object.keys(patch).some(k=>!['notes','durationMins','contactId','followUpNotes'].includes(k)))throw Error('Outcome and business-logic corrections require a separate reconciliation workflow.');
 if(activityStamp(a)!==expected)throw Error('This activity changed since editing began. Your draft is retained; review the saved version first.');
 if(patch.durationMins!==undefined&&(a.type!=='Call'||!Number.isFinite(patch.durationMins)||patch.durationMins<0||patch.durationMins>240))throw Error('Call time must be between 0 and 240 minutes.');
 const l=s.leads.find(l=>l.id===a.leadId);
 if(patch.contactId&&!l?.contacts.some(c=>c.id===patch.contactId))throw Error('Choose a contact belonging to this prospect.');
 const before=fieldsFor(a),after={...before,...patch};
 if(JSON.stringify(before)===JSON.stringify(after))return a;
 a.editHistory??=[];a.editHistory.push({id:core.uid(),at:now.toISOString(),before:structuredClone(before),after:structuredClone(after)});
 Object.assign(a,after);if(before.contactId!==a.contactId)a.roleAtCall='unknown';
 // Keep linked observation metadata consistent without re-running sales outcomes.
 for(const e of s.intelligence?.events||[]){if(!e.activityIds.includes(a.id))continue;
  if(before.contactId!==a.contactId)e.contactRole='unknown';
  const calls=s.activities.filter(x=>e.activityIds.includes(x.id)&&x.type==='Call');
  if(calls.some(x=>x.durationMins!==undefined))e.minutes=calls.reduce((n,x)=>n+(x.durationMins||0),0);else delete e.minutes;
 }
 return a;
}
function source(s:State,id:string){
 const a=s.activities.find(a=>a.id===id),l=s.leads.find(l=>l.id===a?.leadId);
 if(!a||!l)throw Error('Conversation or prospect is unavailable.');
 return {a,l,c:activityContact(s,a)};
}
export function followUpEligibility(s:State,id:string,now:Date){
 const {a,l,c}=source(s,id);
 if(a.type!=='Call'||!CONVERSATION_OUTCOMES.includes(a.outcome))return 'Follow-up suggestions require a recorded meaningful conversation, callback request or meeting booking.';
 const restriction=leadRestriction(s,l,now);if(restriction)return restriction;
 if(!c)return 'No contact was recorded. Correct the contact association in the activity first.';
 if(!contactAllowed(s,l,c))return 'This contact is suppressed, inactive or not responsible.';
 return channel(s,l,'email',c.id)?'':'No usable email is recorded for this contact. Find or add one first.';
}
export function createFollowUpEmail(s:State,id:string,opt:{date:string;objective:string;context:string;agreed:boolean},now:Date):Task{
 const {a,l,c}=source(s,id),reason=followUpEligibility(s,id,now);if(reason)throw Error(reason);
 if(!validDate(opt.date)||opt.date<localDate(now)||!opt.objective.trim())throw Error('Choose the follow-up date and commercial objective.');
 const timing=s.intelligence?.timing[l.id];if(timing&&(timing.notBefore&&opt.date<timing.notBefore||timing.notAfter&&opt.date>timing.notAfter))throw Error('Choose a date within the recorded contact constraints.');
 const route=channel(s,l,'email',c!.id)!;
 const linked=s.tasks.find(t=>t.type==='email'&&t.leadId===l.id&&t.sourceActivityIds?.includes(a.id)&&t.status!=='cancelled');if(linked){if(linked.contactId!==c!.id)throw Error('The existing follow-up uses the originally recorded contact. Review it before changing the recipient.');return linked;}
 // Reuse an open post-call email for this person, never a different promised task.
 const open=s.tasks.find(t=>t.type==='email'&&t.origin==='post_call'&&t.status==='pending'&&t.leadId===l.id&&t.contactId===c!.id);
 if(open){open.sourceActivityIds=[...new Set([...(open.sourceActivityIds||[]),a.id])];open.description+='\n\nAdditional conversation ('+a.at+'): '+opt.context.trim();const wasPromised=open.isCommitment;if(opt.agreed)open.isCommitment=true;if(!wasPromised&&opt.date<open.dueAt){open.dueAt=opt.date;open.dueTime='';}return open;}
 const task=core.addTask(s,l,'email','Follow up our conversation · '+l.company,opt.date,{origin:'post_call',contactId:c!.id,methodId:route.method.id,description:opt.context.trim(),objective:opt.objective.trim(),successCriteria:'Send the agreed or relevant information manually and record any buyer response separately',isCommitment:opt.agreed,dedupeKey:'post_call:'+a.id+':email'}) as Task|null;
 if(!task)throw Error('The email task is blocked by current sales safeguards.');
 task.sourceActivityIds=[a.id];return task;
}
export function schedulePostCall(s:State,id:string,opt:{kind:'callback'|'meeting';date:string;time:string;reason:string},now:Date):Task{
 const {a,l,c}=source(s,id),restriction=leadRestriction(s,l,now);
 if(restriction)throw Error(restriction);
 if(!c||!contactAllowed(s,l,c))throw Error('A permitted active contact must be recorded first.');
 if(!validDate(opt.date)||opt.date<localDate(now)||opt.time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(opt.time)||!opt.reason.trim())throw Error('Record the agreed date, a valid optional time and the purpose.');
 const timing=s.intelligence?.timing[l.id];if(timing&&(timing.notBefore&&opt.date<timing.notBefore||timing.notAfter&&opt.date>timing.notAfter))throw Error('Choose a date within the recorded contact constraints.');
 const same=s.tasks.find(t=>t.leadId===l.id&&t.status==='pending'&&t.isCommitment&&t.contactId===c.id&&t.dueAt===opt.date&&t.dueTime===opt.time&&(opt.kind==='callback'?t.type==='callback':t.type==='meeting'||t.dedupeKey===`stage:${l.id}:Meeting Booked`));
 if(same){same.sourceActivityIds=[...new Set([...(same.sourceActivityIds||[]),a.id])];return same;}
 let t:Task|null;
 if(opt.kind==='callback'){
  if(!channel(s,l,'callback',c.id))throw Error('A usable telephone number is needed for this callback.');
  t=core.scheduleCallback(s,l,opt.date,opt.time,opt.reason,c.id);
 }else if(core.STAGES.indexOf(l.stage)<core.STAGES.indexOf('Meeting Booked')){
  core.advanceStage(s,l,'Meeting Booked',opt.reason,opt.date,opt.time);
  t=s.tasks.find(t=>t.leadId===l.id&&t.status==='pending'&&t.dedupeKey==='stage:'+l.id+':Meeting Booked')||null;if(t)t.contactId=c.id;
 }else t=core.addTask(s,l,'meeting','Agreed meeting · '+l.company,opt.date,{origin:'commitment',contactId:c.id,dueTime:opt.time,isCommitment:true,description:opt.reason,dedupeKey:`meeting:${l.id}:${opt.date}:${opt.time}:${c.id}`});
 if(!t)throw Error('The commitment could not be scheduled.');t.sourceActivityIds=[...new Set([...(t.sourceActivityIds||[]),a.id])];return t;
}
export function saveContactDetails(s:State,leadId:string,contactId:string,data:{name:string;title:string;roleStatus:string;notes:string;kind:MethodKind;value:string}){
 const l=s.leads.find(l=>l.id===leadId),c=l?.contacts.find(c=>c.id===contactId);if(!l||!c)throw Error('Associated contact is unavailable.');
 if(!['email','mobile','phone','linkedin'].includes(data.kind))throw Error('Choose a supported method type.');
 if(!['unknown','decision_maker','not_responsible','left_company'].includes(data.roleStatus))throw Error('Choose a supported contact role.');
 if(data.value.trim()&&!usableMethod({id:'draft',kind:data.kind,value:data.value,status:'unverified'}))throw Error('Enter a usable contact method.');
 c.name=data.name.trim();c.title=data.title.trim();c.roleStatus=data.roleStatus;c.notes=data.notes.trim();
 if(c.roleStatus==='left_company')c.active=false;
 if(data.value.trim()){const method=core.addMethod(s,l,c,data.kind,data.value);if(method?.duplicate)throw Error('That method is already recorded; its validity or block status has not been changed.');}
 // Existing methods, opt-outs, inactivity and invalid/blocked flags are retained.
}
export function assertPendingAction(s:State,t:Task|undefined,now:Date){
 if(!t||t.status!=='pending')throw Error('This is a historical task, not a new activity to complete.');
 if(!core.isEligibleTask(s,t))throw Error('This task is no longer permitted.');
 if(t.contactId&&['call','callback','email','linkedin_connect','linkedin_message'].includes(t.type)){const l=s.leads.find(l=>l.id===t.leadId);if(!l||!channel(s,l,t.type,t.contactId,t.methodId))throw Error('The associated contact route is no longer permitted.');}
 if(t.origin==='post_call'){const l=s.leads.find(l=>l.id===t.leadId);if(!l)throw Error('Prospect missing.');const reason=leadRestriction(s,l,now);if(reason)throw Error(reason);const timing=s.intelligence?.timing[l.id];if(timing&&(timing.notBefore&&localDate(now)<timing.notBefore||timing.notAfter&&localDate(now)>timing.notAfter))throw Error('Outside the explicitly recorded contact date constraints.');if(!channel(s,l,'email',t.contactId,t.methodId))throw Error('The recorded email route is no longer permitted.');}
}

export function addRecordedContact(s:State,leadId:string,data:Parameters<typeof saveContactDetails>[3]){
 const l=s.leads.find(l=>l.id===leadId);if(!l)throw Error('Prospect unavailable.');
 if(!data.name.trim()&&!data.value.trim())throw Error('Record a name or usable contact method.');
 if(!['unknown','decision_maker','not_responsible','left_company'].includes(data.roleStatus)||!['email','mobile','phone','linkedin'].includes(data.kind))throw Error('Choose a supported role and contact method.');
 if(data.value.trim()&&!usableMethod({id:'draft',kind:data.kind,value:data.value,status:'unverified'}))throw Error('Enter a usable contact method.');
 const c=core.addContact(s,l,{name:data.name.trim(),title:data.title.trim(),roleStatus:data.roleStatus,notes:data.notes.trim(),active:data.roleStatus!=='left_company',methods:data.value.trim()?[core.method(data.kind,data.value.trim())]:[]});
 if(!c||c.duplicate)throw Error('Contact already exists; review the existing record.');return c as Contact;
}
