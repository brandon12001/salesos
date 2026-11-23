import type {State,Task} from '../types';
import {core} from './core';
import {channel,taskRestriction} from './intelligence/eligibility';
import {isDue,localDate,protectedTask} from './intelligence/evidence';

export const DAILY_CALL_TARGET=100;
export const CALL_SUPPLY_FLOOR=120;
export const RESERVE_REFILL_BATCH=25;

// A call is counted once after the outbound attempt is actually logged.
// Copying the number, viewing a task or editing a previous activity is not a dial.
export function outboundCallsToday(s:State,now:Date){
 const day=localDate(now);
 const seen=new Set<string>();
 return s.activities.filter(a=>{
  if(a.type!=='Call'||!a.taskId||!a.callOutcome||seen.has(a.id))return false;
  const at=new Date(a.at);
  if(!Number.isFinite(+at)||localDate(at)!==day)return false;
  seen.add(a.id);return true;
 }).length;
}
export function kpiFirstEnabled(s:State){return s.settings.kpiFirstMode===1}
export function callKpi(s:State,now:Date){
 const calls=outboundCallsToday(s,now),target=DAILY_CALL_TARGET;
 return {enabled:kpiFirstEnabled(s),calls,target,remaining:Math.max(0,target-calls),active:kpiFirstEnabled(s)&&calls<target,complete:calls>=target};
}
export function restrictedRoutineEmail(s:State,t:Task,now:Date){
 return t.type==='email'&&!protectedTask(t)&&callKpi(s,now).active;
}
export function callableDueTasks(s:State,now:Date){
 return s.tasks.filter(t=>['call','callback'].includes(t.type)&&isDue(t,now)&&core.isEligibleTask(s,t)&&!taskRestriction(s,t,now,false,s.settings.intelligenceMode===1));
}
export function reserveCallCandidates(s:State,now:Date,minimum=60){
 if(!callKpi(s,now).active)return [];
 return (core.reserveRank(s) as import('../types').Lead[]).filter(l=>
  !core.reserveEligibility(s,l,minimum)&&!!channel(s,l,'call'));
}
export type CallRefill={activated:number;skipped:number;names:string[];available:number;remainingReserve:number};
// Only qualified, callable, recent-Salesforce-cleared leads can be activated.
// This is bounded and invoked only on a confirmed outbound outcome or explicit
// operator click. Do not refill for screen visits, settings or research edits.
export function replenishCallSupply(s:State,now:Date,explicit=false):CallRefill{
 const available=callableDueTasks(s,now).length;
 const candidates=reserveCallCandidates(s,now);
 const remainingReserve=candidates.length;
 const floor=CALL_SUPPLY_FLOOR;
 const needed=Math.max(0,floor-available);
 const cap=Math.min(2000,Math.max(1,s.settings.reserveActiveCap??150));
 const active=s.leads.filter(l=>l.leadPool!=='reserve'&&l.status==='Active'&&l.stage!=='First Trade').length;
 const slots=Math.max(0,cap-active);
 const amount=Math.min(RESERVE_REFILL_BATCH,candidates.length,slots,explicit?Math.max(needed,1):needed);
 if(!amount)return {activated:0,skipped:0,names:[],available,remainingReserve};
 const result=core.activateReserve(s,candidates.slice(0,amount).map(l=>l.id),{minScore:60}) as {activated:number;skipped:number;names:string[]};
 return {...result,available,remainingReserve};
}
