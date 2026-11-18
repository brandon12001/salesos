// Explicit, transactional actions. Call only inside the existing workspace commit boundary.
import type {Lead,State,Task} from '../../types';
import {core} from '../core';
import type {Commercial,DecisionEvent,FeedbackReason,Recommendation} from './types';
import {evaluate} from './engine';
import {commercialFor,DAY,intelligenceData,localDate,validDate} from './evidence';

function writable(s:State){return s.intelligence??=(structuredClone(intelligenceData(s)))}
export function saveCommercial(s:State,leadId:string,commercial:Commercial,timing:{notBefore:string;notAfter:string},now:Date){
 if(!s.leads.some(l=>l.id===leadId))throw Error('Prospect missing.');
 for(const fact of Object.values(commercial)){
  if(!['confirmed','hypothesised','unknown'].includes(fact.status))throw Error('Choose a valid evidence status.');
  if(fact.status!=='unknown'&&!fact.value.trim())throw Error('Add evidence or leave the fact unknown.');
  if(fact.status==='confirmed'&&fact.observedAt&&(!validDate(fact.observedAt)||fact.observedAt>localDate(now)))throw Error('Use a valid non-future buyer confirmation date, or leave it unknown.');
 }
 if([timing.notBefore,timing.notAfter].some(v=>v&&!validDate(v))||timing.notBefore&&timing.notAfter&&timing.notAfter<timing.notBefore)throw Error('Use valid, ordered contact dates.');
 const previous=commercialFor(s,s.leads.find(l=>l.id===leadId)!),data=writable(s);
 data.commercial[leadId]=Object.fromEntries(Object.entries(commercial).map(([key,f])=>{const value=f.status==='unknown'?'':f.value.trim(),observedAt=f.status==='confirmed'?(f.observedAt||''):'',old=previous[key as keyof Commercial];return [key,{...f,value,observedAt,at:old.status===f.status&&old.value===value&&(old.observedAt||'')===observedAt?old.at:now.toISOString()}]})) as Commercial;
 data.timing[leadId]={...timing};
}
export function recordActiveClearance(s:State,l:Lead,note:string,now:Date){
 if(l.leadPool==='reserve'||l.crmClearance==='hold')throw Error('Use the existing Lead Reserve / Duplicate Queue approval workflow.');
 if(!note.trim())throw Error('Record the ownership and activity checks you performed.');
 l.crmClearance='cleared';l.crmCheckedAt=localDate(now);l.crmNote=note.trim();
 core.log(s,l,'CRM','Manual clearance verified',note.trim(),0);
}
export function prepareAction(s:State,recommendation:Recommendation,now:Date):Task{
 // Re-evaluate at the instant of the action: never execute a stale render through a safety gate.
 const fresh=evaluate(s,now).recommendations.find(r=>r.id===recommendation.id);
 if(!fresh)throw Error('This recommendation is no longer eligible. Review the next action.');
 if(fresh.task.contactId!==recommendation.task.contactId||fresh.task.methodId!==recommendation.task.methodId||fresh.task.type!==recommendation.task.type||fresh.task.dueAt!==recommendation.task.dueAt||fresh.task.dueTime!==recommendation.task.dueTime)throw Error('The contact route or schedule changed. Review the action before logging.');
 if(!fresh.generated){const task=core.getTask(s,fresh.task.id) as Task;task.contactId=fresh.task.contactId;task.methodId=fresh.task.methodId;return task}
 const l=core.getLead(s,fresh.leadId) as Lead;
 const existing=s.tasks.find(t=>t.dedupeKey===fresh.task.dedupeKey&&t.status==='pending');if(existing)return existing;
 const source=fresh.sourceTaskId?s.tasks.find(t=>t.id===fresh.sourceTaskId):null;
 if(source&&(source.isCommitment||source.type==='callback'||source.type==='meeting'))throw Error('An agreed commitment cannot be replaced.');
 if(source&&['sequence','followup'].includes(source.origin))core.cancelTasks(s,l,(t:Task)=>t.id===source.id,'User chose an alternative Intelligence action');
 return core.addTask(s,l,fresh.task.type,fresh.task.title,fresh.task.dueAt,{...fresh.task,id:undefined}) as Task;
}
export function recordDecision(s:State,before:State,r:Recommendation,t:Task,now:Date){
 const activities=s.activities.filter(a=>a.taskId===t.id&&!before.activities.some(b=>b.id===a.id));
 if(!activities.length)return;
 const data=writable(s);if(data.events.some(e=>e.followed&&activities.some(a=>e.activityIds.includes(a.id))))return;
 const old=before.leads.find(l=>l.id===r.leadId),next=s.leads.find(l=>l.id===r.leadId),progressEvidence:string[]=[];
 if(old&&next){
  if(core.STAGES.indexOf(next.stage)>core.STAGES.indexOf(old.stage))progressEvidence.push(`Confirmed acquisition milestone: ${old.stage} → ${next.stage}`);
  if((next.readiness||0)>(old.readiness||0)&&next.readinessEvidence)progressEvidence.push(`Confirmed readiness: ${old.readiness||'Unassessed'} → ${next.readiness}: ${next.readinessEvidence}`);
 }
 const followed=t.status==='completed',contact=old?.contacts.find(c=>c.id===t.contactId);
 const event:DecisionEvent={id:core.uid(),at:now.toISOString(),recommendationId:r.id,ruleVersion:r.ruleVersion,leadId:r.leadId,taskId:t.id,action:r.task.title,why:[...r.reasons],priority:r.priority,channel:t.type,contactRole:contact?.roleStatus||'unknown',followed,outcome:activities[0].outcome,activityIds:activities.map(a=>a.id),progress:progressEvidence.length?'confirmed':'not_recorded',progressEvidence};
 if(old&&next&&core.STAGES.indexOf(next.stage)>core.STAGES.indexOf(old.stage))event.stageChange={from:old.stage,to:next.stage};
 if(old&&next&&next.readiness&&(next.readiness||0)>(old.readiness||0)&&next.readinessEvidence)event.readinessChange={from:old.readiness,to:next.readiness};
 const minutes=activities.reduce((sum,a)=>sum+(a.durationMins||0),0);if(minutes>0)event.minutes=minutes;
 data.events.push(event);
}
export function rejectRecommendation(s:State,r:Recommendation,reason:FeedbackReason,now:Date){
 if(r.protected)throw Error('Use Skip / Snooze to explicitly reschedule a promise. It cannot be dismissed by feedback.');
 const days=reason==='Wrong person'||reason==='Irrelevant action'?7:1;
 const data=writable(s);
 data.events.push({id:core.uid(),at:now.toISOString(),recommendationId:r.id,ruleVersion:r.ruleVersion,leadId:r.leadId,taskId:r.sourceTaskId,action:r.task.title,why:[...r.reasons],priority:r.priority,channel:r.task.type,contactRole:'unknown',followed:false,outcome:'Recommendation deferred',reason,deferredUntil:new Date(+now+days*DAY).toISOString(),activityIds:[],progress:'not_recorded',progressEvidence:[]});
}
