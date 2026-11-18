import type {Activity,State} from '../../types';
import {intelligenceData} from './evidence';
export const MIN_SAMPLE=20;
type Rate={label:string;attempts:number;connections:number;rate:number|null;answered:number;classified:number;answerRate:number|null};
export function phoneAnswered(a:Activity):boolean|null{
 if(typeof a.answered==='boolean')return a.answered;
 if(a.outcome==='No answer')return false;
 return ['Meaningful conversation','Callback requested','Meeting booked','Gatekeeper','Answered — No Conversation'].includes(a.outcome)?true:null;
}
// Observations are not causal attribution. Unknown historical roles stay unknown.
export function observedResults(s:State){
 const groups=new Map<string,Rate>(),seen=new Set<string>(),channels=new Map<string,{channel:string;completed:number;progressions:number}>();
 const activities=new Map(s.activities.map(a=>[a.id,a])),tasks=new Map(s.tasks.map(t=>[t.id,t])),roles=new Map<string,string>();
 let conversations=0,meetings=0,progressions=0,firstTrades=0;
 for(const e of intelligenceData(s).events){
  if(!e.followed)continue;
  const linked=e.activityIds.map(id=>activities.get(id)).filter(a=>a!==undefined);if(!linked.length)continue;
  const ch=channels.get(e.channel)||{channel:e.channel,completed:0,progressions:0};ch.completed++;ch.progressions+=Number(e.progress==='confirmed');channels.set(e.channel,ch);
  for(const a of linked)if(a.type==='Call')roles.set(a.id,e.contactRole);
  if(e.progress==='confirmed')progressions++;
  if(e.stageChange?.to==='Meeting Booked')meetings++;
  if(e.stageChange?.to==='First Trade')firstTrades++;
 }
 for(const call of s.activities){
  if(call.type!=='Call'||seen.has(call.id))continue;seen.add(call.id);
  const at=new Date(call.at);if(!Number.isFinite(+at))continue;
  const connected=['Meaningful conversation','Callback requested','Meeting booked'].includes(call.outcome);if(connected)conversations++;
  const answered=phoneAnswered(call),hour=at.getHours(),channel=tasks.get(call.taskId||'')?.type==='callback'?'callback':'call';
  const labels=[`Channel: ${channel}`,`Role: ${call.roleAtCall||roles.get(call.id)||'unknown'}`,`Day: ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][at.getDay()]}`,`Time: ${hour<12?'before 12:00':hour<15?'12:00–15:00':'15:00 onwards'}`];
  for(const label of labels){const g=groups.get(label)||{label,attempts:0,connections:0,rate:null,answered:0,classified:0,answerRate:null};g.attempts++;g.connections+=Number(connected);if(answered!==null){g.classified++;g.answered+=Number(answered)}groups.set(label,g)}
 }
 return {conversations,meetings,progressions,firstTrades,channels:[...channels.values()].sort((a,b)=>a.channel.localeCompare(b.channel)),groups:[...groups.values()].map(g=>({...g,rate:g.attempts>=MIN_SAMPLE?Math.round(100*g.connections/g.attempts):null,answerRate:g.classified>=MIN_SAMPLE?Math.round(100*g.answered/g.classified):null})).sort((a,b)=>a.label.localeCompare(b.label))};
}
