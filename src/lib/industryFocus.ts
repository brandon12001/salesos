import type {Lead,State,Task} from '../types';
import type {Decision} from './intelligence/types';
import {core} from './core';

// Classification is deliberately conservative: sector text is evidence of an industry,
// not evidence of buyer interest or FX exposure. Original imported sector is preserved.
export const INDUSTRY_OPTIONS = [
 {id:'recruitment',label:'Recruitment & Staffing'},
 {id:'machinery',label:'Industrial Machinery & Equipment'},
 {id:'manufacturing',label:'Manufacturing'},
 {id:'other',label:'Other Industries'},
 {id:'unclassified',label:'Unclassified'}
] as const;
export type IndustryOption={id:string;label:string};
export type IndustryFocusConfig={enabled:boolean;category:string;customCategories:string[]};

function validLabel(value:unknown):value is string {
 return typeof value==='string'&&value.trim().length>=2&&value.trim().length<=48&&/^[\p{L}\p{N}][\p{L}\p{N} &/()'.-]*$/u.test(value.trim());
}
function customId(value:string){return 'custom:'+value.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'')}
export function industryOptions(s:State):IndustryOption[]{
 const config=industryFocusConfig(s);
 return [...INDUSTRY_OPTIONS,...config.customCategories.map(label=>({id:customId(label),label}))];
}
export function industryFocusConfig(s:State):IndustryFocusConfig {
 const raw=s.meta?.industryFocus;
 const v=(raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{}) as Record<string,unknown>;
 const customCategories=Array.isArray(v.customCategories)?[...new Set(v.customCategories.filter(validLabel).map(x=>x.trim()))].slice(0,30):[];
 const ids=new Set<string>([...INDUSTRY_OPTIONS.map(x=>x.id),...customCategories.map(customId)]);
 return {enabled:v.enabled===true,category:typeof v.category==='string'&&ids.has(v.category)?v.category:'recruitment',customCategories};
}
export function setIndustryFocus(s:State,change:Partial<Pick<IndustryFocusConfig,'enabled'|'category'>>){
 const c=industryFocusConfig(s);
 const next={...c,...change};
 if(!industryOptions(s).some(o=>o.id===next.category))throw Error('Choose an available industry.');
 s.meta={...s.meta,industryFocus:next};
 return next;
}
export function addIndustryCategory(s:State,label:string){
 if(!validLabel(label))throw Error('Use a short industry name (2–48 characters).');
 const c=industryFocusConfig(s),name=label.trim(),id=customId(name);
 if(!id||industryOptions(s).some(o=>o.id===id))throw Error('Industry category already exists.');
 if(c.customCategories.length>=30)throw Error('Maximum 30 custom industry categories.');
 s.meta={...s.meta,industryFocus:{...c,customCategories:[...c.customCategories,name]}};
 return id;
}
export function inferredIndustry(sector:string):string {
 const value=(sector||'').trim().toLowerCase();
 if(!value)return 'unclassified';
 if(/\b(recruit(?:ment|ing|er|ers)?|staffing|staff(?:ing)? agencies|executive search|headhunt(?:ing|ers?)?|employment agencies|employment placement|personnel recruitment)\b/i.test(value))return 'recruitment';
 if(/\b(machinery|machine tools?|industrial equipment|agricultural equipment|construction equipment|heavy equipment|plant machinery|equipment distribution|equipment importers?)\b/i.test(value))return 'machinery';
 if(/\b(manufactur(?:e|er|ers|ing)|fabricat(?:e|ion|or|ors|ing)|metalworking|precision engineering)\b/i.test(value))return 'manufacturing';
 // Only clearly named alternative sectors enter Other; broad/ambiguous labels remain unclassified.
 if(/\b(logistics|freight|transportation|transport services|banking|insurance|financial services|consulting|real estate|property services|software|it services|education|hospitality|hotel|healthcare|pharmaceutical|retail|advertising|marketing|legal services|accounting|utilities|agriculture|tourism|travel services|charities|not-for-profit)\b/i.test(value))return 'other';
 return 'unclassified';
}
export function industryForLead(s:State,l:Lead):string {
 const override=l.industryCategory;
 if(override&&industryOptions(s).some(x=>x.id===override))return override;
 return inferredIndustry(l.sector);
}
export function industryLabel(s:State,category:string){
 return industryOptions(s).find(o=>o.id===category)?.label||'Unclassified';
}
export function setLeadIndustry(s:State,leadId:string,category:string){
 const l=s.leads.find(x=>x.id===leadId);
 if(!l)throw Error('Prospect no longer exists.');
 if(category!==''&&!industryOptions(s).some(o=>o.id===category))throw Error('Choose an available industry.');
 // Explicit blank returns to deterministic sector classification. All other choices are manual overrides.
 l.industryCategory=category||undefined;
 return l;
}
export function isProtectedIndustryTask(t:Task){
 return t.isCommitment||t.type==='callback'||t.type==='meeting';
}
export function industryAllowsTask(s:State,t:Task){
 const c=industryFocusConfig(s);
 if(!c.enabled||isProtectedIndustryTask(t))return true;
 // A generic lead-generation/admin suggestion has no attributable industry. It must not silently break a focused prospecting session.
 if(!t.leadId)return false;
 const lead=s.leads.find(l=>l.id===t.leadId);
 return !!lead&&industryForLead(s,lead)===c.category;
}
export function filteredIndustryTasks(s:State,tasks:Task[]):Task[]{
 return industryFocusConfig(s).enabled?tasks.filter(t=>industryAllowsTask(s,t)):tasks;
}
export function industryLegacyNext(s:State,callBlock:boolean):Task|null {
 if(!industryFocusConfig(s).enabled)return core.nextTask(s,{callBlock}) as Task|null;
 const due=filteredIndustryTasks(s,core.due(s) as Task[]);
 if(due[0]&&isProtectedIndustryTask(due[0]))return due[0];
 return (callBlock?due.find(t=>['call','callback'].includes(t.type)):due[0])||null;
}
export function filterIndustryDecision(s:State,d:Decision):Decision {
 if(!industryFocusConfig(s).enabled)return d;
 return {...d,recommendations:d.recommendations.filter(r=>industryAllowsTask(s,r.task))};
}
export function isCallable(s:State,l:Lead){
 return l.contacts.some(c=>core.canContact(c)&&!core.isSuppressed(s,l,c)&&!!core.anyPhone(c));
}
export function industrySupply(s:State,category:string){
 const active=s.leads.filter(l=>l.leadPool!=='reserve'&&l.status==='Active'&&l.stage!=='First Trade'&&industryForLead(s,l)===category);
 const reserve=s.leads.filter(l=>l.leadPool==='reserve'&&industryForLead(s,l)===category);
 const eligible=reserve.filter(l=>!core.reserveEligibility(s,l,s.settings.reserveMinScore??60));
 const due=(core.due(s) as Task[]).filter(t=>t.leadId&&active.some(l=>l.id===t.leadId)&&['call','callback'].includes(t.type)&&isCallable(s,active.find(l=>l.id===t.leadId)!));
 return {active:active.length,callable:active.filter(l=>isCallable(s,l)).length,dueCalls:due.length,reserve:reserve.length,eligible:eligible.length,eligibleCallable:eligible.filter(l=>isCallable(s,l)).length,researchNeeded:reserve.filter(l=>l.opportunityScore===null||!l.researchRationale).length};
}
