import type {Lead,State,Task} from '../types';
import {contactFor,phoneMethodFor} from './helpers';
import {core} from './core';

// Existing generic retry tasks are recognised read-only through their original
// callback lineage. Dates, history, Buyer Readiness and stage are never changed.
export function callbackRetryContext(state:State,lead:Lead,task:Task){
 if(task.type!=='call'||task.status!=='pending'||(!task.dedupeKey?.startsWith('retry:')&&!task.sourceActivityIds?.length))return null;
 const source=typeof core.callbackSource==='function'?core.callbackSource(state,task) as Task|null:null;
 if(!source||source.id===task.id||source.leadId!==lead.id)return null;
 const contact=contactFor(lead,task);if(!contact||!task.contactId||source.contactId&&source.contactId!==contact.id)return null;
 const repair=repairCallContext(state,lead,task),context=source.description?.trim()||'',when=source.dueAt+(source.dueTime?' '+source.dueTime:'');
 return {title:'Retry requested callback',rule:'callback-retry',reason:`A callback with ${contact.name} was recorded for ${when}, but the call did not reach the requested conversation.${context?' Recorded context: '+context.slice(0,280):''} The next retry date is suggested; no new appointment has been agreed.${repair?' '+repair.reason:''}`,objective:`Reconnect with ${contact.name} about the recorded callback${context?': '+context.slice(0,180):''}. ${repair?'Confirm who answers on this alternative number. ':''}Confirm the next step if reached.`,success:'Record the actual outcome and agree the next action if the contact is reached',callbackTaskId:source.id,originalDate:source.dueAt,originalTime:source.dueTime,originalContext:context};
}

// Display-only context for number repair. Never changes selection, scheduling or stored history.
export function repairCallContext(state:State,lead:Lead,task:Task){
 if(task.type!=='call'||task.origin!=='repair_followup'||task.isCommitment||task.status!=='pending')return null;
 const contact=contactFor(lead,task),method=phoneMethodFor(contact,task);
 if(!contact||!method||(task.methodId&&method.id!==task.methodId))return null;
 const previousBadNumber=state.activities.some(a=>a.leadId===lead.id&&a.type==='Call'&&(a.callOutcome==='bad_number'||a.outcome==='Bad or invalid number'));
 const route=method.kind==='mobile'?'mobile':'phone';
 return {
  title:'Try alternative contact number',
  reason:(previousBadNumber?'A previous number at this company was marked invalid. ': 'This task checks another recorded contact number. ')+`Use this ${route} number for ${contact.name||'the selected contact'}. `+(method.status==='unverified'?'This number is unverified; confirm who answers.':'Confirm who answers before discussing FX.'),
  objective:`Confirm you have reached ${contact.name||'the selected contact'} and whether they handle the company’s FX decisions.`,
  success:'Record the actual call outcome. No answer schedules a retry; Bad number checks for another number or creates contact research.'
 };
}
