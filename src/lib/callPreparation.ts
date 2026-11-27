import type {Lead,State,Task} from '../types';
import {core} from './core';
import {callbackRetryContext} from './callTaskContext';
import {parseCSV} from './importer';
import {companyDomainKey,matchExistingCompany} from './companyEnrichment';

// Optional metadata survives older v3 clients/JSON normalisation without replacing scoring evidence.
export type CallPreparation={fxClue:string;question:string;hypothesis:string;internationalEvidence:string;sources:string;sourceDate:string;importedAt?:string};
type Registry={version:1;companies:Record<string,CallPreparation>};
const columns=[['Research Rationale','fxClue',2000],['Original Call Objective','question',1000],['Original Research Hypothesis','hypothesis',1500],['International Activity Evidence','internationalEvidence',1200],['Research Sources','sources',15000],['Research Date','sourceDate',30]] as const;
function requireSupportedRegistry(s:State){
 const existing=s.meta.callPreparation as Partial<Registry>|undefined;
 if(existing!==undefined&&(!existing||existing.version!==1||!existing.companies||typeof existing.companies!=='object'||Array.isArray(existing.companies)))throw Error('The saved call-preparation format is not recognised. Keep a backup before changing it.');
}
function registry(s:State):Registry{
 const raw=s.meta.callPreparation as Partial<Registry>|undefined;
 if(raw?.version!==1||!raw.companies||typeof raw.companies!=='object'||Array.isArray(raw.companies))return {version:1,companies:{}};
 return raw as Registry;
}
export function callPreparation(s:State,l:Lead):CallPreparation|null{
 const item=registry(s).companies[l.id];
 return item&&columns.every(([,key])=>typeof item[key]==='string')?item:null;
}
export function coldPreparation(s:State,l:Lead,t:Task){
 return t.type==='call'&&!t.isCommitment&&l.stage==='Prospecting'&&(l.readiness||1)<=2&&['sequence','followup','intelligence'].includes(t.origin)&&!callbackRetryContext(s,l,t)?callPreparation(s,l):null;
}
const stamp=(s:State,l:Lead)=>JSON.stringify([l.id,l.company,l.companyNumber,l.companyDomain,registry(s).companies[l.id]??null]);
const comparable=(item:CallPreparation|null)=>item?JSON.stringify(columns.map(([,key])=>item[key])):'';
export type CallPrepPlan={totalRows:number;companies:number;matched:number;changed:number;unchanged:number;unmatched:number;ambiguous:number;conflicts:number;coalescedDomains:number;updates:Array<{id:string;expected:string;value:CallPreparation}>;issues:Array<{company:string;reason:string}>;samples:Array<{company:string;fxClue:string;question:string}>};
export function planCallPreparation(s:State,text:string):CallPrepPlan{
 requireSupportedRegistry(s);
 if(text.length>12*1024*1024)throw Error('Choose a CSV smaller than 12 MB.');
 const rows=parseCSV(text);if(rows.length<2||rows.length>10001)throw Error('Choose a CSV with 1–10,000 data rows.');
 const key=(v:string)=>v.toLowerCase().replace(/[^a-z0-9]/g,''),heads=rows[0].map(key),col=(name:string)=>heads.indexOf(key(name));
 if(['Company Name','Research Rationale','Original Call Objective'].some(h=>col(h)<0))throw Error('Use the SalesOS Leads CSV with Company Name, Research Rationale and Original Call Objective columns.');
 const pick=(r:string[],h:string)=>String(r[col(h)]||'').trim();
 const groups=new Map<string,{name:string;number:string;domains:Set<string>;hadEmptyDomain:boolean;value:CallPreparation;conflict:boolean}>();
 let totalRows=0;
 for(const row of rows.slice(1)){
  const name=pick(row,'Company Name');if(!name)continue;totalRows++;
  const number=pick(row,'Company Number').replace(/\s/g,'').toUpperCase(),url=pick(row,'Company Domain');
  if(url&&!companyDomainKey(url))throw Error('Company '+name+': invalid supporting company domain.');
  const value={} as CallPreparation;
  for(const [header,field,max] of columns){const v=pick(row,header);if(v.length>max)throw Error('Company '+name+': '+header+' is too long.');value[field]=v;}
  if(!value.question)throw Error('Company '+name+': a call question is required.');
  const groupKey=number?'reg:'+number:'name:'+core.companyKey(name),previous=groups.get(groupKey),host=companyDomainKey(url);
  if(previous){
   if(core.companyKey(previous.name)!==core.companyKey(name)||comparable(previous.value)!==comparable(value))previous.conflict=true;
   if(host)previous.domains.add(host);else previous.hadEmptyDomain=true;
  }else groups.set(groupKey,{name,number,domains:new Set(host?[host]:[]),hadEmptyDomain:!host,value,conflict:false});
 }
 const plan:CallPrepPlan={totalRows,companies:groups.size,matched:0,changed:0,unchanged:0,unmatched:0,ambiguous:0,conflicts:0,coalescedDomains:0,updates:[],issues:[],samples:[]};
 for(const item of groups.values()){
  if(item.conflict||item.domains.size>1){plan.conflicts++;plan.issues.push({company:item.name,reason:'Conflicting call preparation or company identities across rows'});continue;}
  const result=matchExistingCompany(s,{...item,domain:[...item.domains][0]||''});
  if('kind' in result){plan[result.kind]++;plan.issues.push({company:item.name,reason:result.reason});continue;}
  if(item.hadEmptyDomain&&item.domains.size===1)plan.coalescedDomains++;
  plan.matched++;const lead=result.lead;
  if(comparable(callPreparation(s,lead))===comparable(item.value)){plan.unchanged++;continue;}
  plan.changed++;plan.updates.push({id:lead.id,expected:stamp(s,lead),value:item.value});
  if(plan.samples.length<5)plan.samples.push({company:lead.company,fxClue:item.value.fxClue,question:item.value.question});
 }
 return plan;
}
export function applyCallPreparation(s:State,plan:CallPrepPlan,now:Date){
 requireSupportedRegistry(s);
 for(const update of plan.updates){const l=s.leads.find(l=>l.id===update.id);if(!l||stamp(s,l)!==update.expected)throw Error('A company or its call preparation changed since preview. Refresh the preview.');if(!update.value.question||columns.some(([,key,max])=>typeof update.value[key]!=='string'||update.value[key].length>max))throw Error('Invalid call preparation.');}
 if(new Set(plan.updates.map(u=>u.id)).size!==plan.updates.length)throw Error('Duplicate call-preparation targets.');
 if(!plan.updates.length)return 0;
 const current=registry(s),companies={...current.companies};
 for(const update of plan.updates)companies[update.id]={...Object.fromEntries(columns.map(([,key])=>[key,update.value[key]])),importedAt:now.toISOString()} as CallPreparation;
 s.meta={...s.meta,callPreparation:{...current,version:1,companies}};
 return plan.updates.length;
}
