import type {State,Lead,Task} from '../types';
import {core} from './core';
import {classifyWork,queueEvents,queueStamp,recordQueueEvidence} from './workQueues';
import {contactAllowed,channel,leadRestriction,taskRestriction} from './intelligence/eligibility';
import {isDue,localDate,protectedTask,validDate} from './intelligence/evidence';
type Plan={nextStep:string;barrier:string;updatedAt:string};
type Plans={version:1;records:Record<string,Plan>};
export type OpportunityInput={contactId:string;evidence:string;observedAt:string;nextStep:string;barrier:string;date:string;time:string;kind:'call'|'email'|'deal'};
function plans(s:State):Plans{const p=s.meta.opportunities as Plans|undefined;return p?.version===1&&p.records&&typeof p.records==='object'&&!Array.isArray(p.records)?p:{version:1,records:{}};}
export function opportunityPlan(s:State,id:string):Plan{
 const p=plans(s).records[id];if(p&&typeof p.nextStep==='string'&&typeof p.barrier==='string'&&typeof p.updatedAt==='string')return p;
 const l=s.leads.find(l=>l.id===id),milestone=l?.nextMilestone||'';
 return {nextStep:milestone&&!(core.NEXT_MILESTONES as string[]).includes(milestone)?milestone:'',barrier:l?.barrier||'',updatedAt:''};
}
export function opportunityEvidence(s:State,l:Lead,now:Date){
 const c=classifyWork(s,l,now);if(c.category==='opportunity')return {evidence:c.evidence,at:c.at,contactId:c.contactId};
 // Preserve historical interest when a contact later leaves/is suppressed. These
 // rows remain visible with restrictions; history never grants outreach clearance.
 const calls=s.activities.filter(a=>a.leadId===l.id&&a.type==='Call'&&['Meaningful conversation','Callback requested','Meeting booked'].includes(a.outcome)&&Number.isFinite(Date.parse(a.at))&&Date.parse(a.at)<=+now&&l.contacts.some(c=>c.id===a.contactId&&c.name.trim())).sort((a,b)=>b.at.localeCompare(a.at));
 const meeting=calls.find(a=>a.outcome==='Meeting booked');
 const history=s.readinessHistory.find(h=>h.leadId===l.id&&h.to===l.readiness&&h.to>=3&&h.evidence===l.readinessEvidence&&h.at===l.readinessUpdatedAt&&h.evidence.trim()&&Number.isFinite(Date.parse(h.at))&&Date.parse(h.at)<=+now);
 const candidates=[...(meeting?[{evidence:meeting.notes||'Buyer agreed to a meeting (recorded call).',at:meeting.at,contactId:meeting.contactId||''}]:[]),...(history&&calls[0]?[{evidence:history.evidence,at:history.at,contactId:calls[0].contactId||''}]:[])].sort((a,b)=>b.at.localeCompare(a.at));
 const source=candidates[0],correction=queueEvents(s,l.id)[0];
 if(source&&(!correction||Date.parse(correction.at)<Date.parse(source.at)))return source;
 return null;
}
export function opportunityStamp(s:State,l:Lead){return JSON.stringify([queueStamp(s,l),opportunityPlan(s,l.id),l.barrier,l.nextMilestone,s.tasks.filter(t=>t.leadId===l.id&&t.status==='pending')]);}
export function opportunityRows(s:State,now:Date){
 return s.leads.flatMap(l=>{
  const evidence=opportunityEvidence(s,l,now);if(!evidence)return [];
  const pending=s.tasks.filter(t=>t.leadId===l.id&&t.status==='pending').sort((a,b)=>Number(isDue(b,now)&&protectedTask(b))-Number(isDue(a,now)&&protectedTask(a))||Number(isDue(b,now))-Number(isDue(a,now))||a.dueAt.localeCompare(b.dueAt)||(a.dueTime||'23:59').localeCompare(b.dueTime||'23:59')||Number(protectedTask(b))-Number(protectedTask(a)));
  const next=pending[0]||null,commitment=pending.find(protectedTask)||null,plan=opportunityPlan(s,l.id),contact=l.contacts.find(c=>c.id===evidence.contactId),closed=l.stage==='First Trade'||['Disqualified','Closed Lost','Take Me Off the List'].includes(l.status);
  const gaps:string[]=[];if(!plan.nextStep&&!pending.some(protectedTask))gaps.push('Confirm the next agreed step');if(!next)gaps.push('Schedule a next action');if(!contact||!contactAllowed(s,l,contact))gaps.push('Review the contact');
  const restriction=leadRestriction(s,l,now,next||undefined);if(!closed&&restriction)gaps.push(restriction);
  const engagement=s.activities.filter(a=>a.leadId===l.id&&a.type==='Call'&&['Meaningful conversation','Callback requested','Meeting booked'].includes(a.outcome)&&Number.isFinite(Date.parse(a.at))&&Date.parse(a.at)<=+now).sort((a,b)=>b.at.localeCompare(a.at))[0];
  const actionRestriction=next?taskRestriction(s,next,now,false,s.settings.intelligenceMode===1):'';if(!closed&&next&&isDue(next,now)&&actionRestriction&&!gaps.includes(actionRestriction))gaps.push(actionRestriction);
  const routeContact=next?.contactId||contact?.id,routeContactName=l.contacts.find(c=>c.id===routeContact)?.name||'',phone=!restriction?channel(s,l,'call',routeContact,next&&['call','callback'].includes(next.type)?next.methodId:null)?.method.value||'':'';
  return [{lead:l,evidence,contact,next,commitment,plan,closed,gaps,phone,routeContactName,lastContact:engagement?.at||'',due:!!next&&isDue(next,now),canWork:!!next&&!closed&&!actionRestriction}];
 }).sort((a,b)=>Number(a.closed)-Number(b.closed)||Number(b.due)-Number(a.due)||Number(!b.next)-Number(!a.next)||(a.next?.dueAt||'9999').localeCompare(b.next?.dueAt||'9999')||a.lead.company.localeCompare(b.lead.company));
}
function writable(s:State){const raw=s.meta.opportunities as {version?:unknown}|undefined;if(raw&&raw.version!==1)throw Error('Opportunity notes version is not supported.');}
function validatePlan(input:OpportunityInput,now:Date){
 if([input.nextStep,input.barrier].some(v=>typeof v!=='string'||v.length>2000))throw Error('Keep next step and blocker within 2,000 characters.');
 if(!['call','email','deal'].includes(input.kind))throw Error('Choose the next action type.');
 if(input.date&&(!validDate(input.date)||input.date<localDate(now))||input.time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)||input.time&&!input.date)throw Error('Use today or a future follow-up date and a valid time.');
 if(input.date&&!input.nextStep.trim())throw Error('Describe the next step before scheduling it.');
}
export function saveOpportunity(s:State,id:string,input:OpportunityInput,expected:string,now:Date,positive=false){
 writable(s);const l=s.leads.find(l=>l.id===id);if(!l)throw Error('Prospect missing.');if(opportunityStamp(s,l)!==expected)throw Error('Opportunity changed. Reopen it before saving.');validatePlan(input,now);
 if(positive){
  if(!['Active','Negative Nurture'].includes(l.status)||l.stage==='First Trade')throw Error('Review the closed or suppressed prospect before recording a new opportunity.');
  const contact=l.contacts.find(c=>c.id===input.contactId);if(!contact||!contact.name.trim()||!contactAllowed(s,l,contact))throw Error('Choose a named, permitted contact.');
  if(typeof input.evidence!=='string'||!input.evidence.trim()||input.evidence.length>2000||!validDate(input.observedAt)||input.observedAt>localDate(now))throw Error('Record the actual positive response and a non-future evidence date.');
 }else if(!opportunityEvidence(s,l,now))throw Error('Record a positive response before updating an opportunity.');
 const pending=s.tasks.filter(t=>t.leadId===id&&t.status==='pending'),promise=pending.find(protectedTask);
 if(input.date&&promise&&(promise.dueAt!==input.date||(promise.dueTime||'')!==input.time))throw Error('A promised action already exists. Reschedule that action explicitly instead of creating a competing follow-up.');
 let route:ReturnType<typeof channel>=null;
 if(input.date&&!promise){
  const restriction=leadRestriction(s,l,now);if(restriction)throw Error(restriction);
  const contact=l.contacts.find(c=>c.id===input.contactId);if(input.contactId&&(!contact||!contactAllowed(s,l,contact)))throw Error('Choose a permitted contact, or clear the contact for an internal review.');
  route=input.kind==='deal'?null:channel(s,l,input.kind,input.contactId||null);if(input.kind!=='deal'&&!route)throw Error('No permitted contact method for that action. Review the contact or choose an internal review.');
 }
 if(positive)recordQueueEvidence(s,id,{category:'opportunity',contactId:input.contactId,evidence:input.evidence,observedAt:input.observedAt,attested:true},queueStamp(s,l),now);
 if(input.date&&!promise){
  const owned=pending.find(t=>t.origin==='opportunity'&&t.dedupeKey==='opportunity-next:'+id)||pending.find(t=>t.type==='deal'&&t.origin==='progression'&&t.dedupeKey==='progression:'+id&&!protectedTask(t));
  if(owned){
   if(owned.dueAt!==input.date||owned.dueTime!==input.time)core.snoozeTask(s,owned,input.date,input.time);
   Object.assign(owned,{type:input.kind,title:input.nextStep.trim(),description:input.nextStep.trim(),objective:input.nextStep.trim(),contactId:route?.contact.id||input.contactId||null,methodId:route?.method.id||null});
  }else core.addTask(s,l,input.kind,input.nextStep.trim(),input.date,{origin:'opportunity',dueTime:input.time,contactId:route?.contact.id||input.contactId||null,methodId:route?.method.id||null,description:input.nextStep.trim(),objective:input.nextStep.trim(),dedupeKey:'opportunity-next:'+id});
 }
 if(positive){l.sequenceState='paused';core.cancelTasks(s,l,(t:Task)=>!protectedTask(t)&&['sequence','followup'].includes(t.origin),'Positive response recorded; progress the opportunity');}
 const old=plans(s);s.meta={...s.meta,opportunities:{...old,records:{...old.records,[id]:{nextStep:input.nextStep.trim(),barrier:input.barrier.trim(),updatedAt:now.toISOString()}}}};
 if(input.nextStep.trim())l.nextMilestone=input.nextStep.trim();l.barrier=input.barrier.trim();
 core.log(s,l,'Opportunity',positive?'Positive response recorded':'Next step updated',positive?input.evidence:input.nextStep,0,{contactId:input.contactId||null});
}
// Call outcome and opportunity capture share the existing atomic workspace commit.
export function captureCallOpportunity(s:State,t:Task,evidence:string,nextStep:string,now:Date){
 const l=s.leads.find(l=>l.id===t.leadId);if(!l)throw Error('Prospect missing.');
 saveOpportunity(s,l.id,{contactId:s.activities.slice().reverse().find(a=>a.taskId===t.id&&a.type==='Call')?.contactId||t.contactId||'',evidence,observedAt:localDate(now),nextStep:nextStep||opportunityPlan(s,l.id).nextStep,barrier:l.barrier||'',date:'',time:'',kind:'deal'},opportunityStamp(s,l),now,true);
}
