import type {Activity,Lead,State,Task} from '../../types';
import type {Commercial,Fact,IntelligenceData,Momentum} from './types';

export const DAY=86400000;
export function localDate(now:Date){return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`}
export function validDate(date:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;const d=new Date(date+'T12:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===date}
export function ageDays(date:string,now:Date){return date&&Number.isFinite(Date.parse(date))?Math.floor((+now-Date.parse(date))/DAY):null}
export function dateAge(date:string,now:Date){return validDate(date)?Math.round((Date.parse(localDate(now)+'T12:00:00Z')-Date.parse(date+'T12:00:00Z'))/DAY):null}
export function scheduledAt(t:Task){return new Date(`${t.dueAt}T${t.dueTime||'00:00'}:00`)}
export function isDue(t:Task,now:Date){return t.status==='pending'&&validDate(t.dueAt)&&Number.isFinite(+scheduledAt(t))&&+scheduledAt(t)<=+now}
export function protectedTask(t:Task){return t.isCommitment||t.type==='callback'||t.type==='meeting'}
export function emptyCommercial():Commercial{const f=():Fact=>({status:'unknown',value:'',at:''});return {problem:f(),impact:f(),timing:f(),barrier:f()}}
export function intelligenceData(s:State):IntelligenceData{return s.intelligence||{version:1,commercial:{},timing:{},events:[]}}
export function commercialFor(s:State,l:Lead):Commercial{
 const saved=intelligenceData(s).commercial[l.id],out=emptyCommercial();
 for(const key of Object.keys(out) as Array<keyof Commercial>){const f=saved?.[key];if(f&&['confirmed','hypothesised'].includes(f.status)&&f.value?.trim())out[key]={...f};}
 return out;
}
export function attemptsSinceEngagement(s:State,l:Lead,now:Date):Activity[]{
 const facts=commercialFor(s,l),signals=[l.lastMeaningfulAt,l.lastProgressEvidence?l.lastProgressAt:'',...['problem','impact'].map(k=>{const f=facts[k as keyof Commercial];return f.status==='confirmed'&&validDate(f.observedAt||'')?f.observedAt+'T00:00:00':''})];
 const cutoff=Math.max(0,...signals.map(v=>Date.parse(v)).filter(v=>Number.isFinite(v)&&v<=+now));
 return s.activities.filter(a=>a.leadId===l.id&&a.type==='Call'&&['No answer','Gatekeeper','Answered — No Conversation'].includes(a.outcome)&&Date.parse(a.at)>cutoff&&(ageDays(a.at,now)??Infinity)>=0&&(ageDays(a.at,now)??Infinity)<=30);
}
export function momentumFor(s:State,l:Lead,now:Date):Momentum{
 const promises=s.tasks.filter(t=>t.leadId===l.id&&protectedTask(t)&&isDue(t,now));
 if(promises.some(t=>t.dueTime?+now-+scheduledAt(t)>30*60000:t.dueAt<localDate(now)))return {state:'At risk',reasons:['An agreed action is overdue with no completion recorded.']};
 const attempts=attemptsSinceEngagement(s,l,now).length;
 if(attempts>=5)return {state:'At risk',reasons:[`${attempts} attempts without meaningful conversation in 30 days without later meaningful engagement.`]};
 if(attempts>=3)return {state:'Stalling',reasons:[`${attempts} attempts without later meaningful engagement; activity is not buyer progress.`]};
 const facts=commercialFor(s,l);
 if([facts.problem,facts.impact].some(f=>f.status==='confirmed'&&(dateAge(f.observedAt||'',now)??-1)>=0&&(dateAge(f.observedAt||'',now)??Infinity)<=14))return {state:'Progressing',reasons:['An explicitly dated buyer confirmation of an FX problem or impact is within 14 days; readiness remains independent.']};
 const progress=ageDays(l.lastProgressAt,now);
 if(progress!==null&&progress>=0&&progress<=14&&l.lastProgressEvidence.trim())return {state:'Progressing',reasons:['Buyer progression was explicitly recorded within the last 14 days.',l.lastProgressEvidence]};
 const meaningful=ageDays(l.lastMeaningfulAt,now);
 if(meaningful!==null&&meaningful>=0){
  if(meaningful>14)return {state:'Stalling',reasons:[`${meaningful} days since recorded engagement; review the agreed next step, without assuming interest.`]};
  return {state:'Stable',reasons:['Recent meaningful engagement is recorded; no newer buyer progression is established.']};
 }
 return {state:'Insufficient evidence',reasons:['No reliable progression or engagement evidence yet. Research and call volume do not establish momentum.']};
}
export function evidenceFor(s:State,l:Lead){
 const f=commercialFor(s,l),known:string[]=[],missing:string[]=[];
 for(const [key,label] of [['problem','FX problem'],['impact','Commercial impact'],['timing','Payment / decision timing'],['barrier','Decision barrier']] as const){
  const fact=f[key];if(fact.status!=='unknown')known.push(`${label} (${fact.status}): ${fact.value}`);
  if(fact.status!=='confirmed')missing.push(`Confirm ${label.toLowerCase()}`);
 }
 const annual=l.fx.flows.some(x=>x.confidence==='confirmed'&&x.amount>0&&['annual','quarterly','monthly','weekly'].includes(x.period));
 if(annual)known.push('Recurring FX volume recorded as confirmed; currencies and periods remain separate.');else missing.push('Qualify recurring FX volume and denomination');
 if(l.fx.provider)known.push(`Recorded provider: ${l.fx.provider}`);else missing.push('Establish incumbent provider');
 if(l.fx.paymentTiming)known.push(`Recorded payment timing: ${l.fx.paymentTiming}`);
 if(l.barrier)known.push(`Recorded buyer barrier: ${l.barrier}`);
 if(l.readinessEvidence)known.push(`Readiness evidence: ${l.readinessEvidence}`);
 if(l.researchHypothesis)known.push(`Research hypothesis (unconfirmed): ${l.researchHypothesis}`);
 return {facts:f,known,missing,annual};
}
