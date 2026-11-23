import type {Contact,Lead,State,Task} from '../types';
import type {Decision} from './intelligence/types';
import {core} from './core';
import {commercialFor,dateAge,isDue,protectedTask} from './intelligence/evidence';
import {contactAllowed,taskRestriction,usableMethod} from './intelligence/eligibility';
import {filteredIndustryTasks,filterIndustryDecision} from './industryFocus';
import {callPreparation} from './callPreparation';
import {callKpi} from './kpiFirst';

export const WORK_QUEUES=[{id:'opportunity',label:'Opportunities'},{id:'qualified',label:'Qualified'},{id:'gold',label:'Gold'},{id:'standard',label:'Standard'}] as const;
export type WorkCategory=typeof WORK_QUEUES[number]['id'];
export type QueueSelection=WorkCategory|'recommended';
export type QueueEvidence={category:WorkCategory;contactId:string;observedAt:string;evidence:string;attested:boolean};
type QueueRecord=QueueEvidence&{at:string;interestBaseline:string;fxBaseline:string;researchBaseline:string};
type QueueEvent=QueueRecord&{id:string;leadId:string;from:WorkCategory};
type QueueData={version:1;selected:QueueSelection;records:Record<string,QueueRecord>;events:QueueEvent[]};
export type WorkClassification={category:WorkCategory;reason:string;evidence:string;at:string;contactId:string;review:string};
const category=(v:unknown):v is WorkCategory=>WORK_QUEUES.some(q=>q.id===v);
export const queueLabel=(id:QueueSelection)=>id==='recommended'?'Recommended':WORK_QUEUES.find(q=>q.id===id)?.label||'Standard';
function data(s:State):QueueData{
 const v=s.meta.workQueues as Partial<QueueData>|undefined;
 return v?.version===1&&v.records&&typeof v.records==='object'&&!Array.isArray(v.records)&&Array.isArray(v.events)?v as QueueData:{version:1,selected:'recommended',records:{},events:[]};
}
function supported(s:State){if(s.meta.workQueues!==undefined&&data(s)!==s.meta.workQueues)throw Error('The saved work-queue format is not supported. Keep a backup before changing it.');}
export function selectedQueue(s:State):QueueSelection{const v=data(s).selected;return v==='recommended'||category(v)?v:'recommended';}
const interestStamp=(l:Lead)=>JSON.stringify([l.readiness,l.readinessEvidence,l.readinessUpdatedAt]);
const fxStamp=(s:State,l:Lead)=>{const f=commercialFor(s,l).impact;return JSON.stringify([l.fx.flows,f.status,f.value,f.observedAt]);};
function researchStamp(s:State,l:Lead){const p=callPreparation(s,l);return JSON.stringify([l.company,l.companyNumber,l.companyDomain,l.businessDescription,l.researchDate,l.researchRationale,l.researchSources,l.researchConfidence,l.callObjective,p]);}
export function queueStamp(s:State,l:Lead){return JSON.stringify([l.id,l.status,l.leadPool,interestStamp(l),fxStamp(s,l),researchStamp(s,l),l.contacts.map(c=>[c.id,c.name,c.roleStatus,c.active,c.optedOut,c.methods]),s.readinessHistory.filter(h=>h.leadId===l.id),s.activities.filter(a=>a.leadId===l.id&&a.type==='Call'&&['Meaningful conversation','Callback requested','Meeting booked'].includes(a.outcome)),data(s).records[l.id]??null]);}
function recordedAt(at:string,now:Date){const n=Date.parse(at);return Number.isFinite(n)&&n<=+now;}
function validRecord(record:QueueRecord|undefined,now:Date):record is QueueRecord{return !!record&&category(record.category)&&['evidence','contactId','interestBaseline','fxBaseline','researchBaseline','observedAt','at'].every(k=>typeof record[k as keyof QueueRecord]==='string')&&!!record.evidence.trim()&&recordedAt(record.at,now)&&(dateAge(record.observedAt,now)??-1)>=0&&(record.category==='standard'||record.attested===true);}
function relevantContact(s:State,l:Lead,c:Contact){return !!c.name.trim()&&contactAllowed(s,l,c)&&c.roleStatus==='decision_maker';}
function conversation(s:State,l:Lead,now:Date){
 return s.activities.filter(a=>a.leadId===l.id&&a.type==='Call'&&['Meaningful conversation','Callback requested','Meeting booked'].includes(a.outcome)&&recordedAt(a.at,now)&&l.contacts.some(c=>c.id===a.contactId&&relevantContact(s,l,c))).sort((a,b)=>b.at.localeCompare(a.at))[0];
}
export function goldGaps(s:State,l:Lead,now:Date){
 const gaps:string[]=[],age=dateAge(l.researchDate,now),prep=callPreparation(s,l);
 if(l.status!=='Active'||l.stage==='First Trade')gaps.push('The company must be an active acquisition prospect.');
 if(!l.businessDescription?.trim())gaps.push('Add a plain-English company description.');
 if(age===null||age<0||age>90)gaps.push('Review and date the research within the last 90 days.');
 if(!l.researchRationale.trim()||prep&&!prep.fxClue.trim())gaps.push('Record a specific sourced reason to investigate FX needs.');
 if(!/https?:\/\/[^\s]+/i.test(l.researchSources))gaps.push('Record at least one research source URL.');
 if(!(prep?.question||l.callObjective)?.trim())gaps.push('Add a relevant opening question.');
 if(!l.contacts.some(c=>c.name.trim()&&contactAllowed(s,l,c)&&c.methods.some(usableMethod)))gaps.push('Record a named contact with a usable route.');
 return gaps;
}
function signals(s:State,l:Lead,now:Date){
 const call=conversation(s,l,now);
 const readiness=s.readinessHistory.find(h=>h.leadId===l.id&&h.to===l.readiness&&h.evidence===l.readinessEvidence&&h.at===l.readinessUpdatedAt&&recordedAt(h.at,now));
 const interest=!!call&&!!readiness&&(l.readiness||0)>=3&&!!l.readinessEvidence.trim();
 const impact=commercialFor(s,l).impact;
 const qualified=!!call&&impact.status==='confirmed'&&!!impact.value.trim()&&(dateAge(impact.observedAt||'',now)??-1)>=0&&recordedAt(l.fx.updatedAt||'',now)&&l.fx.flows.some(f=>f.confidence==='confirmed'&&f.amount>0&&!!f.currency&&['annual','quarterly','monthly','weekly'].includes(f.period));
 return {call,interest,qualified};
}
export function classifyWork(s:State,l:Lead,now:Date):WorkClassification{
 const record=data(s).records[l.id],valid=validRecord(record,now),facts=signals(s,l,now);
 const result=(id:WorkCategory,reason:string,evidence='',at='',contactId='',review=''):WorkClassification=>({category:id,reason,evidence,at,contactId,review});
 // A correction acknowledges all existing signals; only NEW confirmed evidence can
 // promote it again. Failed dials, copying, schedules and free-text notes cannot.
 if(valid&&record.category==='opportunity')return result('opportunity','Buyer interest explicitly recorded',record.evidence,record.observedAt,record.contactId);
 if(facts.interest&&(!valid||record.interestBaseline!==interestStamp(l)))return result('opportunity','Buyer-confirmed interest and a relevant conversation',l.readinessEvidence,l.readinessUpdatedAt,facts.call!.contactId||'');
 if(valid&&record.category==='qualified')return result('qualified','Meaningful FX activity explicitly confirmed',record.evidence,record.observedAt,record.contactId);
 if(facts.qualified&&(!valid||record.fxBaseline!==fxStamp(s,l)))return result('qualified','Recurring FX activity and commercial impact confirmed',commercialFor(s,l).impact.value,l.fx.updatedAt||'',facts.call!.contactId||'');
 if(valid&&record.category==='gold'){
  const changed=record.researchBaseline!==researchStamp(s,l),gaps=goldGaps(s,l,now);
  if(!changed&&!gaps.length)return result('gold','Research reviewed and approved',record.evidence,record.at,record.contactId);
  return result('standard','Gold research needs review',record.evidence,record.at,record.contactId,changed?'Research changed since approval.':gaps[0]);
 }
 return valid?result('standard','Manual queue correction',record.evidence,record.observedAt,record.contactId):result('standard','No confirmed interest, qualification or Gold approval recorded');
}
export function setWorkQueue(s:State,selected:QueueSelection){
 supported(s);if(selected!=='recommended'&&!category(selected))throw Error('Choose an available work queue.');
 s.meta={...s.meta,workQueues:{...data(s),selected}};
}
export function recordQueueEvidence(s:State,leadId:string,input:QueueEvidence,expected:string,now:Date){
 supported(s);const l=s.leads.find(l=>l.id===leadId);if(!l)throw Error('Prospect missing.');
 if(queueStamp(s,l)!==expected)throw Error('This prospect or its evidence changed. Close and reopen the review.');
 if(!category(input.category))throw Error('Choose an available classification.');
 if(!input.evidence.trim()||input.evidence.length>2000)throw Error('Record supporting evidence or a correction reason (up to 2,000 characters).');
 const age=dateAge(input.observedAt,now);if(age===null||age<0)throw Error('Choose the actual non-future evidence date.');
 if(input.category!=='standard'){
  const c=l.contacts.find(c=>c.id===input.contactId);if(!c||!c.name.trim()||!contactAllowed(s,l,c))throw Error('Choose a named, permitted contact.');
  if(!input.attested)throw Error('Confirm the evidence meets this category before saving.');
  if(input.category==='gold'){const gaps=goldGaps(s,l,now);if(gaps.length)throw Error(gaps[0]);}
 }
 const previous=data(s),from=classifyWork(s,l,now).category;
 const record:QueueRecord={...input,evidence:input.evidence.trim(),at:now.toISOString(),interestBaseline:interestStamp(l),fxBaseline:fxStamp(s,l),researchBaseline:researchStamp(s,l)};
 s.meta={...s.meta,workQueues:{...previous,records:{...previous.records,[l.id]:record},events:[...previous.events,{...record,id:core.uid(),leadId,from}]}};
}
export function queueEvents(s:State,id:string){return data(s).events.filter(e=>e&&e.leadId===id&&category(e.category)&&category(e.from)&&typeof e.evidence==='string'&&typeof e.observedAt==='string').slice().reverse();}
export function queueClassifications(s:State,now:Date){return new Map(s.leads.map(l=>[l.id,classifyWork(s,l,now)]));}
export function commercialPurpose(s:State,l:Lead,t:Task,now:Date,classification=classifyWork(s,l,now)){
 if(protectedTask(t)||l.stage!=='Prospecting'||!['sequence','followup','intelligence'].includes(t.origin)||!['call','email','linkedin_connect','linkedin_message'].includes(t.type))return null;
 if(classification.category==='opportunity')return {rule:'progress-interest',title:t.title,objective:'Confirm the next step the buyer wants to evaluate and agree a specific buyer milestone.',success:'The buyer confirms a meaningful evaluation step, owner and next action; interest is not an agreement to switch.',reason:classification.evidence||'Genuine buyer interest is recorded; progress the discussion rather than restart cold qualification.'};
 if(classification.category==='qualified')return {rule:'develop-qualified',title:t.title,objective:'Explore the confirmed FX activity, current problems, timing and reasons to consider another provider.',success:'A buyer-confirmed problem, motivation or timing is established, or lack of interest is recorded without assuming a sale.',reason:classification.evidence||'Meaningful FX activity is confirmed; establish whether there is a reason to consider change.'};
 return null;
}
function rank(id:WorkCategory){return WORK_QUEUES.findIndex(q=>q.id===id);}
function viewTasks(s:State,tasks:Task[],classes:Map<string,WorkClassification>,now:Date){
 const selected=selectedQueue(s),seen=new Set<string>();
 const phase=callKpi(s,now),callsOnly=phase.enabled?phase.active:s.settings.coldCallMode===1;
 return filteredIndustryTasks(s,tasks).filter(t=>{
  if(seen.has(t.id))return false;seen.add(t.id);
  if(protectedTask(t))return true;
  return (!callsOnly||['call','callback'].includes(t.type))&&(selected==='recommended'||(classes.get(t.leadId||'')?.category||'standard')===selected);
 }).sort((a,b)=>Number(protectedTask(b))-Number(protectedTask(a))||(protectedTask(a)?a.dueAt.localeCompare(b.dueAt)||(a.dueTime||'23:59').localeCompare(b.dueTime||'23:59'):rank(classes.get(a.leadId||'')?.category||'standard')-rank(classes.get(b.leadId||'')?.category||'standard')));
}
export function legacyActionableTasks(s:State,now:Date){return (core.due(s,now) as Task[]).filter(t=>!taskRestriction(s,t,now,false,false));}
export function legacyWorkTasks(s:State,now:Date,classes=queueClassifications(s,now)){return viewTasks(s,legacyActionableTasks(s,now),classes,now);}
export function focusDecision(s:State,d:Decision,now:Date,classes=queueClassifications(s,now)):Decision{
 const industry=filterIndustryDecision(s,d),ids=viewTasks(s,industry.recommendations.map(r=>r.task),classes,now).map(t=>t.id),order=new Map(ids.map((id,i)=>[id,i]));
 return {...industry,recommendations:industry.recommendations.filter(r=>order.has(r.task.id)).sort((a,b)=>order.get(a.task.id)!-order.get(b.task.id)!)};
}
export function queueCounts(s:State,tasks:Task[],classes:Map<string,WorkClassification>,now:Date){
 const counts={opportunity:0,qualified:0,gold:0,standard:0},seen=new Set<string>();let commitments=0;
 for(const t of filteredIndustryTasks(s,tasks)){
  if(seen.has(t.id)||!isDue(t,now)||taskRestriction(s,t,now,false,s.settings.intelligenceMode===1))continue;seen.add(t.id);
  if(protectedTask(t)){commitments++;continue;}
  if((callKpi(s,now).enabled?callKpi(s,now).active:s.settings.coldCallMode===1)&&!['call','callback'].includes(t.type))continue;
  counts[classes.get(t.leadId||'')?.category||'standard']++;
 }
 return {counts,commitments,total:Object.values(counts).reduce((n,c)=>n+c,0)+commitments};
}
