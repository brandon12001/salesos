import type {State} from '../types';
import {core} from './core';
import {saveActivityDetails,fieldsFor,activityStamp} from './activityWorkflow';

export const KPI_MINUTES_TARGET=100;
export type PhoneCallRow={key:string;date:string;time:string;number:string;durationSeconds:number;hasDuration:boolean};
export type ImportedPhoneCall={key:string;date:string;time:string;number:string;durationSeconds:number;hasDuration:boolean;activityId?:string;leadId?:string;contactId?:string;importedAt:string};
type Registry={version:1;records:ImportedPhoneCall[]};
export type PhoneMatch={leadId:string;contactId:string;company:string;name:string};
export type ActivityCandidate={activityId:string;label:string;gapMinutes:number};
export type PhoneMatchOptions={contacts:PhoneMatch[];activities:ActivityCandidate[]};
export type ImportSelection=Record<string,string>; // activity ID, "unlogged", "skip" or "review"

export function registry(s:State):Registry{
 const v=s.meta.callLogImports as Partial<Registry>|undefined;
 return v?.version===1&&Array.isArray(v.records)?v as Registry:{version:1,records:[]};
}
export function canonicalPhone(number:string){return core.phoneDial(number);}
export function secondsLabel(seconds:number){
 const h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),sec=seconds%60;
 return [h?h+'h':'',m?m+'m':'',sec+'s'].filter(Boolean).join(' ');
}
function durationFrom(block:string):{seconds:number;hasDuration:boolean}{
 const hms=block.match(/(?:^|\s)(\d{1,2}):(\d{2}):(\d{2})(?:\s|$)/);
 if(hms)return {seconds:Number(hms[1])*3600+Number(hms[2])*60+Number(hms[3]),hasDuration:true};
 // Explicit duration tags, never confuse "13:31" (time of day) with minutes.
 const mins=block.match(/\b(\d+)\s*m(?:in(?:ute)?s?)?\b/i);
 const secs=block.match(/\b(\d+)\s*s(?:ec(?:ond)?s?)?\b/i);
 const hours=block.match(/\b(\d+)\s*h(?:our)?s?\b/i);
 if(hours||mins||secs)return {seconds:Number(hours?.[1]||0)*3600+Number(mins?.[1]||0)*60+Number(secs?.[1]||0),hasDuration:true};
 // Standalone 00:21 durations only AFTER the clock line, if separately provided.
 const clockless=block.trim().match(/^(\d{1,3}):(\d{2})$/);
 if(clockless)return {seconds:Number(clockless[1])*60+Number(clockless[2]),hasDuration:true};
 return {seconds:0,hasDuration:false};
}
export function parsePhoneHistory(text:string,date:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(+new Date(date+'T12:00:00Z')))throw Error('Choose a valid call date.');
 if(text.length>400000)throw Error('Paste up to 400 KB of call history at once.');
 const lines=text.replace(/\r/g,'').split('\n').map(v=>v.trim());
 const rows:PhoneCallRow[]=[],warnings:string[]=[];
 let section:string[]=[],incoming=0,other=0;
 const flush=()=>{
  if(!section.length)return;
  const number=canonicalPhone(section[0]);const info=section.slice(1).join(' ');
  if(/\b(?:incoming|missed|received)\b/i.test(info)){incoming++;return}
  if(!/\boutgoing\b/i.test(info)){other++;return}
  const clock=info.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if(!clock){warnings.push('An outgoing call has no recognisable time: '+number);return}
  const time=clock[1].padStart(2,'0')+':'+clock[2];
  const clockPosition=info.indexOf(clock[0]);const remainder=info.slice(clockPosition+clock[0].length);
  const duration=durationFrom(remainder);
  if(duration.seconds>86400){warnings.push('Call duration is unusually long for '+number+' at '+time);return}
  rows.push({number,date,time,key:[date,time,number].join('|'),durationSeconds:duration.seconds,hasDuration:duration.hasDuration});
 };
 for(const line of lines){
  const cleaned=line.replace(/[()\s-]/g,'');
  if(/^\+?\d{9,15}$/.test(cleaned)){flush();section=[line]}
  else if(section.length)section.push(line);
 }
 flush();
 const unique=new Set<string>();
 const distinct=rows.filter(row=>{if(unique.has(row.key)){warnings.push('Repeated number within the same minute at '+row.time+' to '+row.number+' was skipped to avoid double-counting; review separate genuine calls manually.');return false}unique.add(row.key);return true});
 return {rows:distinct,incoming,other,warnings};
}
function localParts(at:string){
 const d=new Date(at);if(!Number.isFinite(+d))return null;
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d);
 const part=(name:string)=>parts.find(p=>p.type===name)?.value||'';
 return {date:[part('year'),part('month'),part('day')].join('-'),minutes:Number(part('hour'))*60+Number(part('minute'))};
}
const minutesOf=(time:string)=>Number(time.slice(0,2))*60+Number(time.slice(3,5));
export function matchingOptions(s:State,row:PhoneCallRow):PhoneMatchOptions{
 const contacts:PhoneMatch[]=[];
 for(const l of s.leads)for(const c of l.contacts){
  if(c.methods.some(m=>['mobile','phone'].includes(m.kind)&&canonicalPhone(m.value)===row.number))
   contacts.push({leadId:l.id,contactId:c.id,company:l.company,name:c.name});
 }
 const ids=new Set(contacts.map(c=>c.leadId+'|'+c.contactId));
 const activities=s.activities.filter(a=>{
  if(a.type!=='Call'||!a.taskId||!a.callOutcome)return false;
  const p=localParts(a.at);
  return !!p&&p.date===row.date&&(a.contactId?ids.has(a.leadId+'|'+a.contactId):contacts.some(c=>c.leadId===a.leadId));
 }).map(a=>{
   const p=localParts(a.at)!;
   // People often log calls AFTER finishing them; use the expected end time.
   const gap=Math.abs(p.minutes-(minutesOf(row.time)+Math.ceil(row.durationSeconds/60)));
   const c=contacts.find(c=>c.leadId===a.leadId&&(!a.contactId||c.contactId===a.contactId));
   return {activityId:a.id,label:(c?.company||'Prospect')+' · '+(c?.name||'Contact')+' · logged '+new Date(a.at).toLocaleTimeString('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit'}),gapMinutes:gap};
 }).filter(c=>c.gapMinutes<=20).sort((a,b)=>a.gapMinutes-b.gapMinutes);
 return {contacts,activities};
}
export function defaultSelections(s:State,rows:PhoneCallRow[]):ImportSelection{
 const old=new Set(registry(s).records.map(r=>r.key)),used=new Set<string>();
 const out:ImportSelection={};
 for(const row of rows){
  if(old.has(row.key)){out[row.key]='skip';continue}
  const opts=matchingOptions(s,row);
  const open=opts.activities.filter(c=>!used.has(c.activityId)&&!registry(s).records.some(r=>r.activityId===c.activityId));
  if(opts.contacts.length===1&&open.length===1){out[row.key]=open[0].activityId;used.add(open[0].activityId)}
  else out[row.key]='review'; // Explicitly classify unlogged calls rather than guessing.
 }
 return out;
}
export function importPhoneLog(s:State,rows:PhoneCallRow[],selections:ImportSelection,now:Date){
 const old=registry(s),existing=new Set(old.records.map(r=>r.key)),used=new Set(old.records.map(r=>r.activityId).filter(Boolean));
 const incoming=new Set<string>();let linked=0,unlogged=0,skipped=0;
 const entries:ImportedPhoneCall[]=[];
 for(const row of rows){
  if(existing.has(row.key)){skipped++;continue}
  if(incoming.has(row.key))throw Error('Duplicate call rows in the selected import.');
  incoming.add(row.key);
  const choice=selections[row.key]||'review';
  if(choice==='skip'){skipped++;continue}
  if(choice==='review')throw Error('Review unresolved call at '+row.time+' to '+row.number+' before applying.');
  const matches=matchingOptions(s,row);
  const base:ImportedPhoneCall={...row,importedAt:now.toISOString()};
  if(choice==='unlogged'){
    if(matches.contacts.length===1){base.leadId=matches.contacts[0].leadId;base.contactId=matches.contacts[0].contactId}
    entries.push(base);unlogged++;continue;
  }
  if(used.has(choice))throw Error('Two imported calls cannot update the same recorded activity.');
  if(!matches.activities.some(a=>a.activityId===choice))throw Error('The matching activity changed for '+row.number+' at '+row.time+'. Reopen the preview.');
  const a=s.activities.find(a=>a.id===choice)!;
  // Preserve the call outcome, buyer readiness, notes, follow-ups, and task history.
  if(row.hasDuration)saveActivityDetails(s,a.id,{...fieldsFor(a),durationMins:row.durationSeconds/60},activityStamp(a),now);
  a.phoneCallLocalTime=row.date+' '+row.time;
  base.activityId=a.id;base.leadId=a.leadId||undefined;base.contactId=a.contactId||undefined;
  used.add(choice);entries.push(base);linked++;
 }
 if(entries.length)s.meta={...s.meta,callLogImports:{version:1,records:[...old.records,...entries]}};
 return {linked,unlogged,skipped,added:entries.length};
}
export function minuteKpi(s:State,now:Date){
 const todayParts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const field=(name:string)=>todayParts.find(p=>p.type===name)?.value||'';
 const day=[field('year'),field('month'),field('day')].join('-');
 const imports=registry(s).records.filter(r=>r.date===day);
 const manual=s.activities.filter(a=>a.type==='Call'&&a.taskId&&a.callOutcome&&localParts(a.at)?.date===day);
 const unique=new Map(manual.map(a=>[a.id,a]));
 const matchedIds=new Set(imports.map(r=>r.activityId).filter(Boolean));
 const unlogged=imports.filter(r=>!r.activityId);
 const calls=unique.size+unlogged.length;
 const importedByActivity=new Map(imports.filter(r=>r.activityId).map(r=>[r.activityId,r]));
 const recordedSeconds=[...unique.values()].reduce((sum,a)=>sum+(importedByActivity.get(a.id)?.hasDuration?importedByActivity.get(a.id)!.durationSeconds:Math.round((a.durationMins||0)*60)),0)
   +unlogged.reduce((sum,r)=>sum+r.durationSeconds,0);
 const dialCreditSeconds=calls*60,totalSeconds=dialCreditSeconds+recordedSeconds;
 const remainingSeconds=Math.max(0,KPI_MINUTES_TARGET*60-totalSeconds);
 const dialTargetRemaining=Math.max(0,100-calls);
 const dialsForMinutes=Math.ceil(remainingSeconds/60);
 return {calls,manualCalls:unique.size,importedUnlogged:unlogged.length,recordedSeconds,dialCreditSeconds,totalSeconds,totalMinutes:totalSeconds/60,minutesRemaining:remainingSeconds/60,dialsForMinutes,dialTargetRemaining,dialsForBoth:Math.max(dialsForMinutes,dialTargetRemaining),remainingSeconds,matchedImported:matchedIds.size};
}
