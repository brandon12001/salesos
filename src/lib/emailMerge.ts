import type {Activity,State,Task} from '../types';
import {core} from './core';
import {classifyWork} from './workQueues';
import {channel} from './intelligence/eligibility';
import {isDue,localDate,protectedTask} from './intelligence/evidence';
import {assertPendingAction} from './activityWorkflow';
import {restrictedRoutineEmail} from './kpiFirst';

export const EMAIL_BATCH_LIMIT=50;
export const CHECKED_COPY_VERSION='2026-11-27.2';
export const CHECKED_SUBJECT='International payments';
export type CopyMode='checked'|'custom';
export type MergeRow={taskId:string;leadId:string;contactId:string;methodId:string;email:string;name:string;company:string;body:string;stamp:string;status:'pending'|'sent'|'skipped';activityId?:string};
export type EmailBatch={id:string;date:string;subject:string;sender:string;rows:MergeRow[];createdAt:string;exportedAt:string;closedAt:string;copyMode?:CopyMode;copyVersion?:string};
type MergeData={version:1;sender:string;subject:string;batches:EmailBatch[]};
const empty=():MergeData=>({version:1,sender:'Brandon',subject:'International payments',batches:[]});
// Postgres JSONB and imported backups can reorder object keys. Persisted source
// stamps must compare values rather than insertion order across reload/devices.
const stable=(value:unknown)=>JSON.stringify(value,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a<b?-1:a>b?1:0)):v);
export function emailMergeData(s:State):MergeData{const raw=s.meta.emailMerge as MergeData|undefined;return raw?.version===1&&typeof raw.sender==='string'&&typeof raw.subject==='string'&&Array.isArray(raw.batches)&&raw.batches.every(b=>b&&typeof b.id==='string'&&typeof b.date==='string'&&typeof b.subject==='string'&&typeof b.sender==='string'&&typeof b.createdAt==='string'&&typeof b.exportedAt==='string'&&typeof b.closedAt==='string'&&Array.isArray(b.rows)&&b.rows.every(r=>r&&['taskId','leadId','contactId','methodId','email','name','company','body','stamp'].every(k=>typeof r[k as keyof MergeRow]==='string')&&['pending','sent','skipped'].includes(r.status)))?raw:empty()}
function supported(s:State){if(s.meta.emailMerge!==undefined&&emailMergeData(s)!==s.meta.emailMerge)throw Error('Email batch format is not supported. Keep a backup before editing.');}
export function activeEmailBatch(s:State,now:Date){return emailMergeData(s).batches.find(b=>!b.closedAt)||emailMergeData(s).batches.find(b=>b.date===localDate(now))||null}
export function batchStamp(batch:EmailBatch){return stable(batch)}
const sentEmail=(s:State,a:Activity)=>{if(a.emailRecipient)return a.emailRecipient;const t=s.tasks.find(t=>t.id===a.taskId&&t.type==='email'&&t.status==='completed'),l=s.leads.find(l=>l.id===t?.leadId);return t&&l?channel(s,l,'email',t.contactId,t.methodId)?.method.value||'':''};
export function routineEmailRows(s:State,now:Date,includeDuplicates=false){
 const sent=new Set(s.activities.filter(a=>a.taskId&&localDate(new Date(a.at))===localDate(now)).map(a=>sentEmail(s,a).toLowerCase()).filter(Boolean)),seen=new Set<string>(),classes=new Map<string,string>();
 return s.tasks.filter(t=>t.type==='email'&&t.status==='pending'&&isDue(t,now)&&!protectedTask(t)&&!t.dueTime&&['sequence','followup'].includes(t.origin)).slice().sort((a,b)=>a.dueAt.localeCompare(b.dueAt)||a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id)).flatMap(t=>{
  const l=s.leads.find(l=>l.id===t.leadId);if(!l||l.stage!=='Prospecting'||(l.readiness||1)>2||restrictedRoutineEmail(s,t,now))return [];
  try{assertPendingAction(s,t,now)}catch{return []}
  let category=classes.get(l.id);if(!category){category=classifyWork(s,l,now).category;classes.set(l.id,category)}if(!['standard','gold'].includes(category))return [];
  const route=channel(s,l,'email',t.contactId,t.methodId);if(!route||!route.contact.name.trim())return [];
  const address=route.method.value.trim().toLowerCase();if(!includeDuplicates&&(seen.has(address)||sent.has(address)))return [];seen.add(address);
  const stamp=stable([t,l.company,l.sector,l.industryCategory,l.status,l.stage,l.readiness,l.crmClearance,l.crmCheckedAt,l.leadPool,category,route.contact,route.method]);
  return [{taskId:t.id,leadId:l.id,contactId:route.contact.id,methodId:route.method.id,email:route.method.value.trim(),name:route.contact.name,company:l.company,body:'',stamp,status:'pending' as const}];
 });
}
const placeholder=(text:string)=>/^(unknown|not (recorded|provided|available|known|verified)|n\/?a|none|null|undefined|tbc|tbd|contact|first ?name|last ?name|company ?name)$/i.test(text.trim());
function givenName(value:string,explicit=false){
 if(!value||value.length>100||/[\r\n\d@<>{}«»]/.test(value)||placeholder(value))return '';
 const parts=value.trim().split(/\s+/);while(parts.length&&/^(mr|mrs|ms|miss|mx|dr|prof|sir|dame)\.?$/i.test(parts[0]))parts.shift();
 const result=explicit?parts.join(' '):parts[0]||'';
 return result.length>=2&&result.length<=40&&/^[\p{L}\p{M}][\p{L}\p{M}'’ -]*$/u.test(result)&&!placeholder(result)&&!['cfo','ceo','finance','accounts','team','not','no','na','tba'].includes(result.toLowerCase())?result:'';
}
export function checkedGreeting(name:string,firstName=''){
 const explicit=givenName(firstName,true),comma=name.split(','),inferred=givenName(comma.length===2?comma[1]:name);
 return explicit||inferred?`Hi ${explicit||inferred},`:'Hello,';
}
function sectorKind(value:string){return /recruit|staff|payroll/i.test(value)?'recruitment':/machin|equipment|goods|wholesale|manufactur/i.test(value)?'goods':''}
export function defaultMergeBody(s:State,row:MergeRow,sender:string){
 const l=s.leads.find(l=>l.id===row.leadId),contact=l?.contacts.find(c=>c.id===row.contactId),category=sectorKind(l?.industryCategory||''),sector=sectorKind(l?.sector||''),kind=category&&sector&&category!==sector?'':category||sector;
 const company=row.company.trim().replace(/\s+/g,' '),safeCompany=company.length<=120&&!/[\r\n<>{}«»@]|:\/\//.test(row.company)&&!placeholder(company)&&company;
 const opening=safeCompany?`I’m getting in touch about international payments at ${company}.`:'I’m getting in touch about international payments.';
 const relevance=kind==='recruitment'?'If you invoice overseas clients or pay contractors in other currencies, I can help you compare options for those payments.':kind==='goods'?'If you pay overseas suppliers in other currencies, I can help you compare options for those payments.':'If you make or receive payments in other currencies, I can help you compare options for those payments.';
 return `${checkedGreeting(row.name,contact?.firstName)}\n\n${opening}\n\n${relevance}\n\nWould comparing FX options be useful?\n\nBest regards, ${sender.trim()}`;
}
export function emailMergePlan(s:State,now:Date){
 const rows=routineEmailRows(s,now),batch=activeEmailBatch(s,now),pending=batch?.rows.filter(r=>r.status==='pending')||[];
 const summary:Task|null=batch?.closedAt||!rows.length?null:{id:'email-merge:'+(batch?.date||localDate(now)),leadId:null,contactId:null,methodId:null,type:'email',title:'Send daily email batch',description:`${batch?pending.length:Math.min(rows.length,EMAIL_BATCH_LIMIT)} routine emails · prepare Word document and recipient file, send manually, then confirm sent rows.`,dueAt:batch?.date||localDate(now),dueTime:'',status:'pending',origin:'email_merge',stepIndex:null,objective:'Send the reviewed routine email batch',successCriteria:'Only emails explicitly confirmed sent are completed',isCommitment:false,dedupeKey:'',createdAt:batch?.createdAt||now.toISOString()};
 return {rows,batch,summary,ids:new Set(routineEmailRows(s,now,true).map(r=>r.taskId)),stamp:stable([emailMergeData(s),rows.map(r=>r.stamp)])};
}
export function collapseEmailTasks(tasks:Task[],plan:ReturnType<typeof emailMergePlan>|null){
 if(!plan)return tasks;let inserted=false;return tasks.flatMap(t=>{if(!plan.ids.has(t.id))return [t];if(inserted||!plan.summary)return [];inserted=true;return [plan.summary]});
}
export function collapseEmailRecommendations<T extends {task:Task;leadId:string|null;company:string;generated:boolean;sourceTaskId:string|null}>(rows:T[],plan:ReturnType<typeof emailMergePlan>|null):T[]{
 if(!plan)return rows;let inserted=false;return rows.flatMap(r=>{if(!plan.ids.has(r.task.id))return [r];if(inserted||!plan.summary)return [];inserted=true;return [{...r,task:plan.summary,leadId:null,company:'Daily email batch',generated:false,sourceTaskId:null}]});
}
function validateCopy(subject:string,sender:string,rows:Array<Pick<MergeRow,'body'>>){
 if(!subject.trim()||subject.length>150||/[\r\n]|\{\{|\}\}/.test(subject)||!sender.trim()||sender.length>100||/[\r\n]/.test(sender))throw Error('Use a shared subject (up to 150 characters) and your sign-off name.');
 if(rows.some(r=>!r.body.trim()||r.body.length>3000||/\{\{|\}\}/.test(r.body)||r.body.split(/\n\s*\n/).length>10))throw Error('Review each message: up to 3,000 characters and ten paragraphs, with no unfilled template placeholders.');
}
export function prepareEmailBatch(s:State,subject:string,sender:string,chosen:Array<{taskId:string;body:string}>,expected:string,now:Date,mode:CopyMode='custom'){
 supported(s);const plan=emailMergePlan(s,now);if(plan.stamp!==expected)throw Error('Email tasks changed. Refresh the preview before preparing.');if(plan.batch)throw Error('Resume today’s existing batch; do not prepare duplicate recipients.');
 if(!['checked','custom'].includes(mode)||!chosen.length||chosen.length>EMAIL_BATCH_LIMIT||new Set(chosen.map(r=>r.taskId)).size!==chosen.length)throw Error('Choose 1–50 distinct email tasks.');
 if(mode==='checked'&&(!/^[\p{L}\p{M}][\p{L}\p{M}'’. -]{1,79}$/u.test(sender.trim())||placeholder(sender)))throw Error('Set your sign-off name once under Custom wording before preparing the standard pack.');
 const rows=chosen.map(input=>{const row=plan.rows.find(r=>r.taskId===input.taskId);if(!row)throw Error('A recipient is no longer eligible. Refresh the preview.');return {...row,body:mode==='checked'?defaultMergeBody(s,row,sender):input.body.trim()}});
 const finalSubject=mode==='checked'?CHECKED_SUBJECT:subject.trim();validateCopy(finalSubject,sender,rows);
 const batch:EmailBatch={id:core.uid(),date:localDate(now),subject:finalSubject,sender:sender.trim(),rows,createdAt:now.toISOString(),exportedAt:'',closedAt:'',copyMode:mode,...(mode==='checked'?{copyVersion:CHECKED_COPY_VERSION}:{})},data=emailMergeData(s);
 s.meta={...s.meta,emailMerge:{...data,sender:batch.sender,subject:batch.subject,batches:[...data.batches.filter(b=>!b.closedAt||b.date>=core.addDays(localDate(now),-30)),batch]}};s.settings.emailMergeMode=1;return batch;
}
function savedBatch(s:State,id:string,expected:string){supported(s);const b=emailMergeData(s).batches.find(b=>b.id===id);if(!b||batchStamp(b)!==expected)throw Error('Batch changed in another view. Refresh before continuing.');if(b.closedAt)throw Error('This batch is closed. It cannot be sent again.');return b}
export function rowIssue(s:State,row:MergeRow,now:Date){
 const live=routineEmailRows(s,now).find(r=>r.taskId===row.taskId);return !live||live.stamp!==row.stamp?'Task or recipient changed, became ineligible, or was already sent. Review it separately; do not resend from this pack.':'';
}
export function exportEmailBatch(s:State,id:string,expected:string,now:Date){
 const b=savedBatch(s,id,expected),rows=b.rows.filter(r=>r.status==='pending');if(!rows.length)throw Error('No unsent rows remain.');validateCopy(b.subject,b.sender,rows);const live=new Map(routineEmailRows(s,now).map(r=>[r.taskId,r]));
 if(rows.some(r=>live.get(r.taskId)?.stamp!==r.stamp))throw Error('A batch recipient or task changed. Skip affected unsent rows before exporting again.');b.exportedAt=now.toISOString();return b;
}
export function confirmEmailBatch(s:State,id:string,ids:string[],expected:string,now:Date,sent:boolean){
 const b=savedBatch(s,id,expected);if(!ids.length||new Set(ids).size!==ids.length)throw Error('Choose the rows you actually sent, or unsent rows to skip.');
 const rows=ids.map(id=>b.rows.find(r=>r.taskId===id));if(rows.some(r=>!r||r.status!=='pending'))throw Error('A selected row was already handled. Refresh before confirming.');
 if(sent){if(!b.exportedAt)throw Error('Prepare the recipient file and send the emails before confirming.');const live=new Map(routineEmailRows(s,now).map(r=>[r.taskId,r]));if(rows.some(r=>live.get(r!.taskId)?.stamp!==r!.stamp))throw Error('A selected task or recipient changed. No emails were marked sent. Review those records separately.');}
 for(const row of rows as MergeRow[]){
  if(sent){const t=core.getTask(s,row.taskId) as Task;assertPendingAction(s,t,now);t.contactId=row.contactId;t.methodId=row.methodId;const result=core.completeTask(s,t,{outcome:'Email sent (mail merge manually confirmed)',notes:`To: ${row.email}\nSubject: ${b.subject}\n\n${row.body}`});if(result.error)throw Error(result.error);const a=s.activities.slice().reverse().find(a=>a.taskId===t.id);if(a){a.emailRecipient=row.email;a.emailBatchId=b.id;a.emailSubject=b.subject;row.activityId=a.id}row.status='sent';
  }else row.status='skipped';
 }
 if(b.rows.every(r=>r.status!=='pending')){b.closedAt=now.toISOString();for(const row of b.rows){row.body='';row.stamp=''}}return rows.length;
}
