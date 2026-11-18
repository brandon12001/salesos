import type {State} from '../types';
export type ExecutionFeedback={id:string;message:string;kind:'task'|'commercial'|'calls';major:boolean;callMessage?:string};
const THRESHOLDS=[25,50,100,200];
function localDay(at:Date){return `${at.getFullYear()}-${String(at.getMonth()+1).padStart(2,'0')}-${String(at.getDate()).padStart(2,'0')}`}
function calls(state:State,day:string){return state.activities.filter(a=>a.type==='Call'&&a.at.startsWith(day)).length}
// Called ONLY inside explicit execution/progression transactions, never on render,
// restore, reconciliation, history edits, navigation or import. Mutates only feedback receipts.
export function executionFeedback(before:State,after:State,now:Date):ExecutionFeedback|null{
 const priorActivities=new Set(before.activities.map(a=>a.id));
 const added=after.activities.filter(a=>!priorActivities.has(a.id));
 const day=localDay(now),hasLiveCall=added.some(a=>a.type==='Call'&&Math.abs(now.getTime()-Date.parse(a.at))<60000);
 let callMessage='';
 if(hasLiveCall){
  const low=calls(before,day),high=calls(after,day);
  const raw=after.meta.callFeedbackReceipts;
  const receipts=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw as Record<string,number[]>:{};
  const seen=Array.isArray(receipts[day])?receipts[day]:[];
  const crossed=THRESHOLDS.filter(n=>low<n&&high>=n&&!seen.includes(n));
  if(crossed.length){after.meta.callFeedbackReceipts={...Object.fromEntries(Object.entries(receipts).filter(([d])=>d>=localDay(new Date(now.getTime()-30*86400000)))),[day]:[...new Set([...seen,...crossed])]};if(after.settings.callMilestoneFeedback===1)callMessage=`${Math.max(...crossed)} calls recorded today`;}
 }
 const oldMilestones=new Set(before.milestoneHistory.map(m=>(m as {id?:string})?.id));
 const milestones=after.milestoneHistory.filter(m=>m&&typeof m==='object'&&!oldMilestones.has((m as {id?:string}).id)) as {id:string;leadId:string;key:string;evidence:string}[];
 let commercial:ExecutionFeedback|null=null;
 for(const m of milestones){
  const lead=after.leads.find(l=>l.id===m.leadId),previous=before.leads.find(l=>l.id===m.leadId);if(!lead||!previous||!m.evidence?.trim())continue;
  if(m.key==='stage:'+lead.stage&&lead.stage!==previous.stage){
   const names:Record<string,string>={'Discovery Complete':'Discovery complete','Meeting Booked':'Meeting booked','Successful Meeting':'Successful meeting recorded','Onboarding':'Onboarding started','Account Open':'Account opened','First Trade':'First Trade recorded'};
   if(names[lead.stage])commercial={id:m.id,message:names[lead.stage],kind:'commercial',major:['Account Open','First Trade'].includes(lead.stage)};
  }else if(m.key==='readiness:'+lead.readiness&&previous.readiness!==null&&lead.readiness!==null&&lead.readiness>previous.readiness&&after.readinessHistory.some(r=>r.leadId===lead.id&&r.to===lead.readiness&&r.evidence.trim()&&!before.readinessHistory.some(p=>p.id===r.id))){
   if(!commercial)commercial={id:m.id,message:`Buyer Readiness advanced to ${lead.readiness}`,kind:'commercial',major:false};
  }
 }
 if(commercial)return {...commercial,...(callMessage?{callMessage}:{})};
 if(callMessage)return {id:added.find(a=>a.type==='Call')!.id,message:callMessage,kind:'calls',major:false};
 const oldTasks=new Map(before.tasks.map(t=>[t.id,t]));
 const done=after.tasks.find(t=>t.status==='completed'&&oldTasks.get(t.id)?.status!=='completed'&&added.some(a=>a.taskId===t.id));
 return done?{id:done.id,message:'Task completed',kind:'task',major:false}:null;
}
