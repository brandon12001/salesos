import type {State} from '../../types';
import {intelligenceData} from './evidence';
export const MIN_SAMPLE=20;
type Rate={label:string;attempts:number;connections:number;rate:number|null};
// A relationship in the activity sequence is not causal attribution.
export function observedResults(s:State){
 const groups=new Map<string,Rate>(),seen=new Set<string>(),channels=new Map<string,{channel:string;completed:number;progressions:number}>();
 let conversations=0,meetings=0,progressions=0,firstTrades=0;
 for(const e of intelligenceData(s).events){
  if(!e.followed)continue;
  const activities=e.activityIds.map(id=>s.activities.find(a=>a.id===id)).filter(a=>a!==undefined);
  if(!activities.length)continue;
  const channel=channels.get(e.channel)||{channel:e.channel,completed:0,progressions:0};channel.completed++;channel.progressions+=Number(e.progress==='confirmed');channels.set(e.channel,channel);
  const call=activities.find(a=>a.type==='Call');
  if(call&&!seen.has(call.id)){
   seen.add(call.id);const connected=['Meaningful conversation','Callback requested','Meeting booked'].includes(call.outcome);if(connected)conversations++;
   const at=new Date(call.at);if(!Number.isFinite(+at))continue;
   const hour=at.getHours(),labels=[`Channel: ${e.channel}`,`Role: ${e.contactRole}`,`Day: ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][at.getDay()]}`,`Time: ${hour<12?'before 12:00':hour<15?'12:00–15:00':'15:00 onwards'}`];
   for(const label of labels){const g=groups.get(label)||{label,attempts:0,connections:0,rate:null};g.attempts++;g.connections+=Number(connected);groups.set(label,g)}
  }
  if(e.progress==='confirmed')progressions++;
  if(e.stageChange?.to==='Meeting Booked')meetings++;
  if(e.stageChange?.to==='First Trade')firstTrades++;
 }
 return {conversations,meetings,progressions,firstTrades,channels:[...channels.values()].sort((a,b)=>a.channel.localeCompare(b.channel)),groups:[...groups.values()].map(g=>({...g,rate:g.attempts>=MIN_SAMPLE?Math.round(100*g.connections/g.attempts):null})).sort((a,b)=>a.label.localeCompare(b.label))};
}
