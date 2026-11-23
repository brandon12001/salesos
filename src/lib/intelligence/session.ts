import type {State} from '../../types';
import type {Recommendation} from './types';
import {evaluate} from './engine';
import {intelligenceData,protectedTask,scheduledAt} from './evidence';
import {taskRestriction} from './eligibility';
import {focusDecision,queueClassifications} from '../workQueues';

export type SessionPlan={actions:Array<{recommendation:Recommendation;startsAt:string;endsAt:string}>;remainingMinutes:number;unusedMinutes:number;warnings:string[]};
export function planSession(s:State,now:Date,endsAt:Date):SessionPlan{
 const end=+endsAt,remainingMinutes=Math.max(0,Math.floor((end-+now)/60000)),warnings:string[]=[];
 const result:SessionPlan={actions:[],remainingMinutes,unusedMinutes:remainingMinutes,warnings};if(!remainingMinutes)return result;
 // Only known commitments reserve time. No external calendar or calling-window assumptions.
 const future=s.tasks.filter(t=>t.status==='pending'&&protectedTask(t)&&+scheduledAt(t)>+now&&+scheduledAt(t)<=end).sort((a,b)=>+scheduledAt(a)-+scheduledAt(b));
 const classes=queueClassifications(s,now),ready=focusDecision(s,evaluate(s,now),now,classes).recommendations,used=new Set<string>(),companies=new Set<string>();
 let cursor=+now,lastType='';
 while(cursor<end){
  const nextPromise=future.find(t=>!used.has(t.id));
  const available=ready.filter(r=>{
   if(used.has(r.task.id)||!r.protected&&companies.has(r.leadId||r.id)||taskRestriction(s,r.task,new Date(cursor)))return false;
   if(!r.protected&&['call','email','linkedin_connect','linkedin_message'].includes(r.task.type)){
    const close=new Date(cursor);close.setHours(0,0,0,0);close.setMinutes(s.settings.intelligenceWorkEnd??1050);
    if(cursor+r.effortMinutes*60000>+close)return false;
   }
   return true;
  });
  let r=available.find(r=>r.protected);
  if(!r&&nextPromise&&+scheduledAt(nextPromise)<=cursor){
   r=evaluate(s,new Date(cursor)).recommendations.find(r=>r.task.id===nextPromise.id);
   if(!r){used.add(nextPromise.id);warnings.push('A scheduled commitment needs a safety/contact review.');continue;}
  }
  if(!r){
   const boundary=Math.min(end,nextPromise?+scheduledAt(nextPromise):end);
   const fitting=available.filter(r=>cursor+r.effortMinutes*60000<=boundary);
   // Group only similarly ranked non-urgent actions; never move a promise or jump a large score gap.
   r=fitting.find(r=>r.task.type===lastType&&classes.get(r.leadId||'')?.category===classes.get(fitting[0]?.leadId||'')?.category&&r.priority>=(fitting[0]?.priority||0)-5)||fitting[0];
   if(!r){if(nextPromise){cursor=+scheduledAt(nextPromise);continue}break;}
  }
  if(cursor+r.effortMinutes*60000>end){warnings.push(`The agreed action “${r.task.title}” needs more time than remains. It stays due in Focus.`);used.add(r.task.id);if(r.protected)break;continue;}
  if(r.protected&&nextPromise&&nextPromise.id!==r.task.id&&cursor+r.effortMinutes*60000>+scheduledAt(nextPromise))warnings.push('Known commitments overlap the estimated work time. Review their schedule; both promises remain protected.');
  result.actions.push({recommendation:r,startsAt:new Date(cursor).toISOString(),endsAt:new Date(cursor+r.effortMinutes*60000).toISOString()});
  used.add(r.task.id);companies.add(r.leadId||r.id);lastType=r.task.type;cursor+=r.effortMinutes*60000;
 }
 const usedMinutes=result.actions.reduce((n,a)=>n+a.recommendation.effortMinutes,0);result.unusedMinutes=Math.max(0,remainingMinutes-usedMinutes);
 if(!result.actions.length&&!warnings.length)warnings.push('Insufficient eligible work for this session. Review contact/clearance gaps or the reserve; no tasks will be invented to fill time.');
 return result;
}
export function startSession(s:State,duration:30|45|60,now:Date){
 if(![30,45,60].includes(duration))throw Error('Choose 30, 45 or 60 minutes.');
 if(s.settings.intelligenceMode!==1)throw Error('Enable Intelligence before starting a work session.');
 const data=s.intelligence??=structuredClone(intelligenceData(s));data.session={duration,startedAt:now.toISOString(),endsAt:new Date(+now+duration*60000).toISOString()};
}
export function endSession(s:State){if(s.intelligence)delete s.intelligence.session}
