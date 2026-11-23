import type {Contact,Lead,Method,State,Task} from '../../types';
import {dateAge,intelligenceData,isDue,localDate,protectedTask} from './evidence';

const key=(v:string)=>v.trim().toLowerCase().replace(/\s+/g,' ');
const phone=(v:string)=>{let p=v.replace(/[^\d+]/g,'');if(p.startsWith('00'))p='+'+p.slice(2);if(p.startsWith('0'))p='+44'+p.slice(1);if(/^44\d/.test(p))p='+'+p;return p};
export function usableMethod(m:Method){
 if(!m.value||!['valid','unverified'].includes(m.status))return false;
 if(['phone','mobile'].includes(m.kind))return /^\+?[1-9]\d{7,14}$/.test(phone(m.value));
 if(m.kind==='email')return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.value);
 return /^https:\/\/(www\.)?linkedin\.com\/in\/[^\s/]+\/?$/i.test(m.value);
}
export function suppressed(s:State,l:Lead,c?:Contact|null){
 if(l.status==='Take Me Off the List'||c?.optedOut)return true;
 return s.suppression.some(raw=>{const x=raw as {scope:string;company:string;contact?:string;email?:string;phone?:string};
  if(x.scope==='company')return x.company===key(l.company);
  return x.scope==='contact'&&!!c&&((x.company===key(l.company)&&!!x.contact&&x.contact===key(c.name))||!!x.email&&c.methods.some(m=>m.kind==='email'&&key(m.value)===key(x.email!))||!!x.phone&&c.methods.some(m=>['phone','mobile'].includes(m.kind)&&phone(m.value)===phone(x.phone!)));
 });
}
export function contactAllowed(s:State,l:Lead,c:Contact){return c.active&&!['left_company','not_responsible'].includes(c.roleStatus)&&!suppressed(s,l,c)}
export function channel(s:State,l:Lead,type:Task['type'],contactId?:string|null,methodId?:string|null){
 const kinds=type==='call'||type==='callback'?['mobile','phone']:type==='email'?['email']:type.startsWith('linkedin')?['linkedin']:[];
 const cs=l.contacts.filter(c=>contactAllowed(s,l,c)&&(!contactId||c.id===contactId)).sort((a,b)=>Number(b.roleStatus==='decision_maker')-Number(a.roleStatus==='decision_maker')||Number(b.id===l.primaryContactId)-Number(a.id===l.primaryContactId)||a.id.localeCompare(b.id));
 for(const c of cs){if(type==='linkedin_message'&&!c.linkedinConnected||type==='linkedin_connect'&&c.linkedinConnected)continue;
  const m=c.methods.find(m=>kinds.includes(m.kind)&&usableMethod(m)&&(!methodId||m.id===methodId));if(m)return {contact:c,method:m};
 }
 return null;
}
export function leadRestriction(s:State,l:Lead,now:Date,task?:Task){
 if(l.leadPool==='reserve')return 'Lead Reserve is outside active work.';
 if(suppressed(s,l))return 'Company is suppressed.';
 if(l.stage==='First Trade')return 'Acquisition is complete.';
 if(l.status!=='Active'&&!(l.status==='Negative Nurture'&&task&&(task.type==='review'||task.type==='callback'&&task.isCommitment)))return `Status restricts outreach: ${l.status}.`;
 if(l.crmClearance==='hold')return 'Salesforce ownership hold: explicit reassignment approval is required.';
 const age=dateAge(l.crmCheckedAt,now);
 if(l.crmClearance!=='cleared'||age===null||age<0||age>30)return 'Record a verified Salesforce clearance from the last 30 days before using Intelligence.';
 return '';
}
export function taskRestriction(s:State,t:Task,now:Date,includeFuture=false,respectWorkingHours=true){
 if(t.status!=='pending')return 'Task is no longer pending.';
 if(!includeFuture&&!isDue(t,now))return 'The action is scheduled for later.';
 if(!t.leadId)return '';
 const l=s.leads.find(l=>l.id===t.leadId);if(!l)return 'Prospect not found.';
 const restriction=leadRestriction(s,l,now,t);if(restriction)return restriction;
 if(t.contactId){const c=l.contacts.find(c=>c.id===t.contactId);if(!c||suppressed(s,l,c))return 'Contact is missing or suppressed.';
  if(t.type!=='research'&&!contactAllowed(s,l,c))return 'Contact is inactive or is not responsible.';
 }
 const outreach=['call','callback','email','linkedin_connect','linkedin_message'].includes(t.type);
 if(outreach&&!channel(s,l,t.type,t.contactId,t.methodId))return 'The required contact channel is unavailable or invalid.';
 const timing=intelligenceData(s).timing[l.id];
 if(outreach&&timing&&(timing.notBefore&&localDate(now)<timing.notBefore||timing.notAfter&&localDate(now)>timing.notAfter))return 'Outside the explicitly recorded contact date constraints.';
 // A promise is not moved by generic working-hour preferences.
 if(outreach&&respectWorkingHours&&!protectedTask(t)){
  const mins=now.getHours()*60+now.getMinutes(),start=s.settings.intelligenceWorkStart??540,end=s.settings.intelligenceWorkEnd??1050;
  if(!((s.settings.intelligenceWorkDays??62)&(1<<now.getDay()))||mins<start||mins>=end)return 'Outside configured working hours (browser local time).';
 }
 return '';
}
