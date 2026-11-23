import type {State,Task} from '../types';
import {core} from './core';
import {channel,taskRestriction} from './intelligence/eligibility';
import {isDue,protectedTask} from './intelligence/evidence';
import {minuteKpi} from './callLogImport';

export const DAILY_KPI_MINUTES_TARGET=100;
export const CALL_SUPPLY_FLOOR=120;
export const RESERVE_REFILL_BATCH=25;

// A call is counted once after the outbound attempt is actually logged.
// Copying the number, viewing a task or editing a previous activity is not a dial.
export function outboundCallsToday(s:State,now:Date){return minuteKpi(s,now).calls;}
export function kpiFirstEnabled(s:State){return s.settings.kpiFirstMode===1}
export function callKpi(s:State,now:Date){
 const value=minuteKpi(s,now),target=DAILY_KPI_MINUTES_TARGET;
 const enabled=kpiFirstEnabled(s),remainingSeconds=Math.max(0,target*60-value.totalSeconds);
 return {enabled,calls:value.calls,target,minutes:value.totalMinutes,remainingSeconds,remainingMinutes:remainingSeconds/60,dialsForMinutes:Math.ceil(remainingSeconds/60),active:enabled&&remainingSeconds>0,complete:remainingSeconds===0};
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
export function reserveActivationSlots(s:State){
 const cap=Math.min(2000,Math.max(1,s.settings.reserveActiveCap??150));
 const active=s.leads.filter(l=>l.leadPool!=='reserve'&&l.status==='Active'&&l.stage!=='First Trade').length;
 return Math.max(0,cap-active);
}
// Only qualified, callable, recent-Salesforce-cleared leads can be activated.
// Supply replenishment stops when the 100-minute target is met; there is no dial-count gate.
// This is bounded and invoked only on a confirmed outbound outcome or explicit
// operator click. Do not refill for screen visits, settings or research edits.
export function replenishCallSupply(s:State,now:Date,explicit=false):CallRefill{
 const available=callableDueTasks(s,now).length;
 const candidates=reserveCallCandidates(s,now);
 const remainingReserve=candidates.length;
 const minutesLeft=Math.ceil(callKpi(s,now).remainingMinutes);
 const floor=Math.min(CALL_SUPPLY_FLOOR,minutesLeft+15);
 const needed=Math.max(0,floor-available);
 const slots=reserveActivationSlots(s);
 const amount=Math.min(RESERVE_REFILL_BATCH,candidates.length,slots,explicit?Math.max(needed,1):needed);
 if(!amount)return {activated:0,skipped:0,names:[],available,remainingReserve};
 const result=core.activateReserve(s,candidates.slice(0,amount).map(l=>l.id),{minScore:60}) as {activated:number;skipped:number;names:string[]};
 return {...result,available,remainingReserve};
}
