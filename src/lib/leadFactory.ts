import type {State,Lead} from '../types';
import {core} from './core';

export type ResearchSector='recruitment'|'goods';
export type Discovery={company:string;companyNumber:string;sector:ResearchSector;sicCodes:string[];incorporated:string;sourceUrl:string;priority:number;reason:string;foundAt:string};
export type ClearanceStatus='unchecked'|'cleared'|'held'|'moved'|'dismissed';
export type Candidate=Discovery&{id:string;status:ClearanceStatus;checkedAt?:string;crmOwner?:string;crmNote?:string;crmLastActivityAt?:string;linkedLeadId?:string};
type Registry={version:1;candidates:Candidate[];cursors:Record<string,number>;lastRunAt:string};
const MAX=600;
export const researchProfiles=[{id:'recruitment',label:'Recruitment & contractor payroll'},{id:'goods',label:'Machinery & equipment distribution'}] as const;
export function leadFactory(s:State):Registry{
 const raw=s.meta.leadFactory as Registry|undefined;
 if(raw&&raw.version===1&&Array.isArray(raw.candidates)&&raw.cursors&&typeof raw.cursors==='object')return raw;
 return {version:1,candidates:[],cursors:{},lastRunAt:''};
}
const nameKey=(v:string)=>String(core.companyKey(v)||'');
const reg=(v:string)=>String(v||'').replace(/\s+/g,'').toUpperCase();
const isDate=(v:string)=>/^\d{4}-\d\d-\d\d$/.test(v)&&!Number.isNaN(Date.parse(v+'T12:00:00Z'));
function ensureValid(d:Discovery){
 if(!d||!String(d.company||'').trim()||!/^([A-Z]{2}\d{6}|\d{8}|R\d{7})$/.test(reg(d.companyNumber)))throw Error('Research contained a company with an invalid legal identity.');
 if(!['recruitment','goods'].includes(d.sector)||!Array.isArray(d.sicCodes)||!d.sicCodes.every(x=>/^\d{5}$/.test(x)))throw Error('Invalid research industry evidence.');
 if(!Number.isInteger(d.priority)||d.priority<0||d.priority>65)throw Error('Companies House screening priority cannot exceed 65 without independent commercial evidence.');
 if(d.sourceUrl!==`https://find-and-update.company-information.service.gov.uk/company/${reg(d.companyNumber)}`)throw Error('Research source must be the official Companies House legal-entity record.');
 if(!isDate(d.foundAt.slice(0,10))||!d.reason?.trim())throw Error('Research lacks an evidence date or explanation.');
}
function inExisting(s:State,d:Discovery){
 const n=nameKey(d.company),r=reg(d.companyNumber);
 return s.leads.some(l=>reg(l.companyNumber)===r||(nameKey(l.company)===n&&(reg(l.companyNumber)===''||reg(l.companyNumber)===r)));
}
function save(s:State,r:Registry){s.meta={...s.meta,leadFactory:r}}
export function addDiscoveries(s:State,rows:Discovery[],profile:ResearchSector,nextCursor:number){
 if(!['recruitment','goods'].includes(profile)||!Array.isArray(rows)||rows.length>100||!Number.isSafeInteger(nextCursor)||nextCursor<0||nextCursor>10000)throw Error('Invalid research batch.');
 rows.forEach(ensureValid);
 const current=leadFactory(s),records=current.candidates.slice(),seen=new Set(records.map(c=>reg(c.companyNumber))),batch=new Set<string>();
 let added=0,existing=0;
 for(const row of rows){
  const companyNumber=reg(row.companyNumber);
  if(seen.has(companyNumber)||batch.has(companyNumber)||inExisting(s,row)){existing++;continue}
  if(records.length>=MAX)throw Error('Lead Research queue is full (600). Process or dismiss existing companies before scanning again.');
  batch.add(companyNumber);records.push({...row,company:row.company.trim(),companyNumber,id:'ch:'+companyNumber,status:'unchecked'});added++;
 }
 save(s,{version:1,candidates:records,cursors:{...current.cursors,[profile]:nextCursor},lastRunAt:new Date().toISOString()});
 return {added,existing};
}
export function markAvailable(s:State,id:string){
 const r=leadFactory(s),c=r.candidates.find(x=>x.id===id);
 if(!c||c.status!=='unchecked')throw Error('Only unchecked research candidates can be cleared.');
 if(inExisting(s,c))throw Error('This company already exists in SalesOS; review it rather than clearing another copy.');
 c.status='cleared';c.checkedAt=core.today();c.crmNote='Manually checked Salesforce duplicate search; no matching owned company found.';
 save(s,r);
}
function reserveData(c:Candidate,clearance:'cleared'|'hold',extra:Record<string,unknown>={}){
 return {company:c.company,companyNumber:c.companyNumber,sector:c.sector==='recruitment'?'Recruitment':'Machinery & Equipment Distribution',
 businessDescription:'Registered business classified under SIC '+c.sicCodes.join(', ')+'. Cross-border payments unverified.',
 standardisedIndustry:c.sector==='recruitment'?'Recruitment':'Machinery & Equipment Distribution',
 leadPool:'reserve',reservedAt:new Date().toISOString(),opportunityScore:c.priority,
 researchDate:c.foundAt.slice(0,10),researchRationale:c.reason+' No foreign currency volumes, overseas payment flows or treasury autonomy confirmed.',
 researchSources:c.sourceUrl,researchConfidence:'Low — Companies House registry screening only',researchHypothesis:'Potential FX requirement not independently verified; qualify before prioritising outreach.',
 crmClearance:clearance,crmCheckedAt:c.checkedAt||core.today(),crmNote:c.crmNote||'Manual Salesforce duplicate check recorded',readiness:1,
 readinessEvidence:'Unaware default for newly discovered company, not a verified buyer statement',
 nextMilestone:core.NEXT_MILESTONES[0],notes:'Lead Factory · sourced from Companies House. No contact or FX volume invented.',...extra};
}
function alreadyInLeads(s:State,c:Candidate){
 return s.leads.find(l=>reg(l.companyNumber)===reg(c.companyNumber)||nameKey(l.company)===nameKey(c.company));
}
export function markOwned(s:State,id:string,owner:string,lastActivityAt=''){
 const r=leadFactory(s),c=r.candidates.find(x=>x.id===id);
 if(!c||c.status!=='unchecked')throw Error('Only unchecked candidates can be marked as owned.');
 if(!owner.trim()||owner.trim().length>120)throw Error('Record the Salesforce owner name.');
 if(lastActivityAt&&(!isDate(lastActivityAt)||lastActivityAt>core.today()))throw Error('Last qualifying activity date must be a valid past date, or left blank.');
 if(alreadyInLeads(s,c))throw Error('Company already exists in SalesOS. Review its Salesforce ownership there.');
 c.checkedAt=core.today();c.crmOwner=owner.trim();c.crmLastActivityAt=lastActivityAt;c.crmNote='Salesforce duplicate confirmed. Owner: '+owner.trim()+'. Manual check on '+core.today()+'. Activity '+(lastActivityAt||'unknown')+'.';
 const lead=core.createLead(s,reserveData(c,'hold',{crmLastActivityAt:lastActivityAt,crmReclaimStatus:'waiting',crmOwner:owner.trim()})) as Lead&{duplicate?:Lead};
 if(!lead||lead.duplicate)throw Error('Could not bank held duplicate; company exists.');
 c.status='held';c.linkedLeadId=lead.id;save(s,r);return lead;
}
export function moveCleared(s:State,ids:string[]){
 if(!Array.isArray(ids)||!ids.length||ids.length>600||new Set(ids).size!==ids.length)throw Error('Choose one or more unique cleared companies.');
 const r=leadFactory(s),records=ids.map(id=>r.candidates.find(c=>c.id===id));
 if(records.some(c=>!c||c.status!=='cleared'||!c.checkedAt||inExisting(s,c)))throw Error('A selected company is not cleared or is already in SalesOS. Refresh the clearance queue.');
 let moved=0;
 for(const c of records as Candidate[]){
  const lead=core.createLead(s,reserveData(c,'cleared')) as Lead&{duplicate?:Lead};
  if(!lead||lead.duplicate)throw Error('Could not add '+c.company+' to the Lead Reserve.');
  c.status='moved';c.linkedLeadId=lead.id;moved++;
 }
 save(s,r);return moved;
}
export function dismissCandidate(s:State,id:string){
 const r=leadFactory(s),c=r.candidates.find(c=>c.id===id);
 if(!c||c.status!=='unchecked')throw Error('Only unchecked candidates may be dismissed.');
 c.status='dismissed';save(s,r);
}
