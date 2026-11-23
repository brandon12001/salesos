import {coldPreparation} from '../callPreparation';
// Pure decision functions: no clock reads, storage, network, IDs or mutations.
import type {Lead,State,Task} from '../../types';
import type {Decision,Recommendation} from './types';
import {RULE_VERSION} from './types';
import {ageDays,attemptsSinceEngagement,commercialFor,dateAge,evidenceFor,intelligenceData,isDue,localDate,momentumFor,protectedTask} from './evidence';
import {channel,leadRestriction,taskRestriction} from './eligibility';

const bound=(x:number,min=0,max=100)=>Math.min(max,Math.max(min,Number.isFinite(x)?x:min));
export function weights(s:State){
 const raw=[s.settings.intelligenceUrgency??30,s.settings.intelligenceImpact??35,s.settings.intelligenceConfidence??20,s.settings.intelligenceEfficiency??15].map(x=>bound(x));
 const total=raw.reduce((a,b)=>a+b,0);return total?raw.map(x=>x/total):[.30,.35,.20,.15];
}
function effort(t:Task){return t.type==='meeting'?30:t.type==='deal'?12:t.type==='research'?10:t.type==='review'?5:t.type==='email'?6:t.type.startsWith('linkedin')?4:5}
function purpose(s:State,l:Lead,t:Task,now:Date){
 const e=evidenceFor(s,l),attempts=attemptsSinceEngagement(s,l,now).length;
 if(protectedTask(t))return {rule:'promise',title:t.title,objective:t.objective||'Deliver the agreed action before proposing another step',success:t.successCriteria||'The promise is delivered and the buyer confirms the next step',reason:'This agreed action is due; its schedule takes precedence over every speculative opportunity.'};
 if(t.origin==='repair'||t.type==='research')return {rule:'contact-repair',title:t.title,objective:'Identify the relevant finance decision-maker and verify a permitted channel',success:'A usable channel and the correct responsibility are established',reason:'Contact information needs repair before further outreach.'};
 if(['manual','progression','commitment','post_call'].includes(t.origin)&&(t.objective||t.description))return {rule:'recorded-next-step',title:t.title,objective:t.objective||t.description,success:t.successCriteria||'Deliver the recorded step and confirm the next buyer milestone',reason:'A specific next step is already recorded; it takes precedence over a generic approach.'};
 if(l.stage==='Account Open')return {rule:'first-trade',title:'Identify the next payment and secure the first trade',objective:'Confirm a real upcoming payment, currency pair, value date and remaining execution requirements',success:'An actionable payment and an agreed next step towards execution are documented',reason:'The account is open; the next commercial milestone is an actual first transaction.'};
 if(l.stage==='Onboarding')return {rule:'onboarding',title:'Resolve the next onboarding obstacle',objective:e.facts.barrier.status==='confirmed'?e.facts.barrier.value:l.barrier||'Identify the outstanding requirement, owner and agreed completion date',success:'A specific onboarding obstacle is resolved or an owner and deadline are agreed',reason:'The recorded onboarding stage calls for removing an operational barrier.'};
 if(l.stage==='Meeting Booked')return {rule:'meeting-preparation',title:'Prepare for the agreed meeting',objective:'Confirm the meeting details, decision-makers and the commercial decision the meeting should enable',success:'The agreed meeting is prepared and its intended buyer outcome is clear',reason:'A meeting is recorded as booked; preparation takes precedence over a generic cold approach.'};
 if(t.type==='review')return {rule:'review-stalled',title:'Review whether another approach is justified',objective:'Review evidence and contact preferences; choose a justified next step or a deliberate pause',success:'A documented decision to continue, repair or pause; no inferred interest or automatic nurture',reason:'Repeated attempts have not established progress. More activity alone will not resolve that.'};
 if(attempts>=3&&['call','email','linkedin_connect','linkedin_message'].includes(t.type))return {rule:'vary-approach',title:t.type==='call'?'Try a different calling time':t.title,objective:'Vary the approach within recorded preferences; establish whether a conversation is welcome',success:'Reach the relevant person or record a reason to change or pause the approach',reason:`${attempts} attempts without meaningful conversation are recorded without later meaningful engagement; no successful calling window is established.`};
 if((l.readiness||0)>=4&&e.facts.problem.status==='confirmed'&&e.facts.impact.status!=='confirmed')return {rule:'quantify-impact',title:'Quantify the impact of the confirmed FX problem',objective:'Establish the financial or operational impact, its evidence and urgency',success:'The buyer confirms a quantified impact or a specific operational consequence',reason:'An FX problem is confirmed, but its commercial impact remains unconfirmed.'};
 if((l.readiness||0)>=6&&(e.facts.barrier.status==='confirmed'||l.barrier))return {rule:'resolve-barrier',title:'Resolve the recorded switching barrier',objective:e.facts.barrier.status==='confirmed'?e.facts.barrier.value:l.barrier,success:'The buyer confirms what resolves the barrier and agrees the next decision milestone',reason:'The buyer has recorded evaluation readiness and a specific barrier remains.'};
 if(e.facts.problem.status==='confirmed'&&e.facts.impact.status==='confirmed'&&e.annual&&l.fx.products.includes('Forwards')&&l.fx.currentPricing)return {rule:'hedging-criteria',title:'Explore hedging needs and comparison criteria',objective:'Establish forward requirements, hedged share, tenor and the criteria for evaluating an alternative',success:'Confirmed hedging needs and buyer-agreed comparison criteria, without assuming product suitability',reason:'Recorded forwards use, pricing and a confirmed FX problem support a specific discovery discussion.'};
 if(l.stage==='Discovery Complete')return {rule:'book-discovery',title:'Agree the next commercial discovery meeting',objective:'Use established discovery to agree a relevant meeting and the decision it should enable',success:'A mutually agreed meeting or a clear reason to defer is recorded',reason:'Discovery is recorded as complete; a relevant meeting is the next acquisition milestone.'};
 if((l.readiness||0)>=3&&!e.annual)return {rule:'qualify-volume',title:'Qualify the recurring FX exposure',objective:'Establish volume, denomination, payment frequency and locally addressable exposure without guessing',success:'A confirmed FX flow or a clear qualification gap is recorded',reason:'Interest is recorded but recurring FX volume is still unconfirmed.'};
 if((l.readiness||0)>=3&&e.facts.problem.status!=='confirmed')return {rule:'discover-problem',title:'Discover whether an FX problem warrants change',objective:'Ask which FX issue matters and distinguish a hypothesis from a buyer-confirmed problem',success:'A confirmed problem or evidence that there is no meaningful issue',reason:'Recorded interest and FX context do not yet establish a problem worth solving.'};
 if(l.stage==='Successful Meeting')return {rule:'commercial-next-step',title:'Progress the agreed commercial next step',objective:l.nextMilestone||'Confirm the agreed evaluation step and decision owner',success:'The agreed step is delivered and the buyer confirms the next milestone',reason:'A successful meeting is recorded; follow the agreed buyer objective.'};
 return {rule:'establish-relevance',title:t.title,objective:coldPreparation(s,l,t)?.question||l.callObjective||'Reach the relevant finance decision-maker and establish whether an FX discussion is useful',success:'Confirm responsibility and relevance, then agree an appropriate next step; a dial alone is not progression',reason:'There is no recorded buyer engagement supporting a later-stage sales assumption.'};
}
function recommend(s:State,l:Lead|null,t:Task,now:Date,generated=false,sourceTaskId:string|null=t.id):Recommendation{
 const p=l?purpose(s,l,t,now):{rule:'existing-work',title:t.title,objective:t.objective,success:t.successCriteria,reason:'An eligible existing task is due.'};
 const e=l?evidenceFor(s,l):{known:[],missing:[]},momentum=l?momentumFor(s,l,now):{state:'Insufficient evidence' as const,reasons:['No prospect attached.']};
 const protectedAction=protectedTask(t),minutes=effort(t),days=bound(dateAge(t.dueAt,now)||0,0,15),recent=l?ageDays(l.lastMeaningfulAt,now):null;
 const evidencedReadiness=!!l?.readinessEvidence;
 const impact=l?bound(20+(evidencedReadiness?Math.min(24,(l.readiness||1)*4):0)+(recent!==null&&recent>=0&&recent<=30?22:0)+(l.stage==='Account Open'?30:l.stage==='Onboarding'?24:l.stage!=='Prospecting'?12:0)+(commercialFor(s,l).problem.status==='confirmed'?10:0)+Math.min(4,(l.opportunityScore||0)/25)-(p.rule==='review-stalled'?5:0)):20;
 const confidence=l?bound(30+(l.readinessEvidence?20:0)+(l.lastProgressEvidence?10:0)+(l.fx.flows.some(f=>f.confidence==='confirmed')?10:0)+(l.researchRationale&&['high','medium'].includes(l.researchConfidence.toLowerCase())?10:0)+(protectedAction?20:0)):60;
 const components={urgency:protectedAction?100:bound(40+days+(recent!==null&&recent>=0&&recent<=14?10:0)+(['Stalling','At risk'].includes(momentum.state)&&l?.lastMeaningfulAt?8:0)),impact:bound(impact+(momentum.state==='Progressing'?5:0)),confidence,efficiency:bound(100-minutes*3)};
 const w=weights(s),priority=Math.round(components.urgency*w[0]+components.impact*w[1]+components.confidence*w[2]+components.efficiency*w[3]);
 const route=l?channel(s,l,t.type,t.contactId,t.methodId):null;
 return {id:`nba:${l?.id||'global'}:${p.rule}:${t.type}:${sourceTaskId||'new'}`,ruleVersion:RULE_VERSION,leadId:l?.id||null,company:l?.company||'Workspace',task:{...t,...(route?{contactId:route.contact.id,methodId:route.method.id}:{}),title:p.title,objective:p.objective,successCriteria:p.success},sourceTaskId,generated,rule:p.rule,reasons:[p.reason,...(protectedAction?[]:[`Estimated effort: ${minutes} minutes. Research score is separate from buyer intent.`])],known:e.known,missing:e.missing,momentum,opportunityScore:l?.opportunityScore??null,effortMinutes:minutes,protected:protectedAction,priority,components};
}
function virtualTask(s:State,l:Lead,type:Task['type'],now:Date,source?:Task):Task{
 const ch=channel(s,l,type),id=`intelligence:${l.id}:${type}:${source?.id||'new'}`;
 return {id,leadId:l.id,contactId:ch?.contact.id||null,methodId:ch?.method.id||null,type,title:type==='research'?'Find the correct FX decision-maker':type==='review'?'Review the next commercial step':type==='email'?'Send a relevant introductory email':type==='call'?'Call the finance decision-maker':'Progress the next buyer milestone',description:'Suggested by transparent Intelligence v1 rules. No communication is sent automatically.',dueAt:source?.dueAt||localDate(now),dueTime:source?.dueTime||'',status:'pending',origin:'intelligence',stepIndex:null,objective:'',successCriteria:'',isCommitment:false,dedupeKey:id,createdAt:now.toISOString()};
}
export function compareRecommendations(a:Recommendation,b:Recommendation){
 if(a.protected!==b.protected)return a.protected?-1:1;
 if(a.protected){const date=a.task.dueAt.localeCompare(b.task.dueAt)||(a.task.dueTime||'23:59').localeCompare(b.task.dueTime||'23:59');if(date)return date;}
 return b.priority-a.priority||a.task.dueAt.localeCompare(b.task.dueAt)||a.id.localeCompare(b.id);
}
export function evaluate(s:State,now:Date):Decision{
 const recommendations:Recommendation[]=[],blocked:Decision['blocked']=[],tasksByLead=new Map<string,Task[]>();
 for(const t of s.tasks){if(t.status!=='pending')continue;if(t.leadId){const ts=tasksByLead.get(t.leadId)||[];ts.push(t);tasksByLead.set(t.leadId,ts)}else if(!taskRestriction(s,t,now))recommendations.push(recommend(s,null,t,now));}
 for(const l of s.leads){
  const pending=tasksByLead.get(l.id)||[],reason=leadRestriction(s,l,now,pending.find(t=>t.isCommitment&&t.type==='callback')||pending.find(t=>t.type==='review'));
  if(reason){blocked.push({leadId:l.id,reason});continue}
  const due=pending.filter(t=>isDue(t,now));
  for(const t of due){
   if(pending.some(protectedTask)&&!protectedTask(t)&&['sequence','followup'].includes(t.origin)){blocked.push({leadId:l.id,reason:'A recorded promise already defines the next contact; generic outreach waits.'});continue;}
   const r=taskRestriction(s,t,now);if(!r)recommendations.push(recommend(s,l,t,now));else blocked.push({leadId:l.id,reason:r});
  }
  const broken=due.find(t=>['call','callback','email','linkedin_connect','linkedin_message'].includes(t.type)&&!channel(s,l,t.type,t.contactId,t.methodId));
  if(l.status==='Active'&&broken&&!pending.some(t=>t.type==='research')){
   const t=virtualTask(s,l,'research',now);const r=recommend(s,l,t,now,true,protectedTask(broken)?null:broken.id);
   recommendations.push({...r,reasons:['A due action has no permitted usable contact route. Repair it without removing any promise.']});
  }
  // Pending schedules/promises are authoritative. No speculative extra work around a future task.
  if(l.status!=='Active')continue;
  if(pending.some(protectedTask))continue;
  const outreach=due.find(t=>['sequence','followup'].includes(t.origin)&&!taskRestriction(s,t,now));
  if(outreach&&attemptsSinceEngagement(s,l,now).length>=3){
   const alternative=outreach.type==='email'?'call':'email';
   if(!pending.some(t=>t.type===alternative)&&channel(s,l,alternative)){
    const t=virtualTask(s,l,alternative,now,outreach);if(!taskRestriction(s,t,now))recommendations.push(recommend(s,l,t,now,true,outreach.id));
   }
  }
  if(pending.length)continue;
  const attempts=attemptsSinceEngagement(s,l,now).length;
  const type:Task['type']=attempts>=5?'review':l.stage==='Onboarding'||l.stage==='Account Open'||l.stage==='Successful Meeting'?'deal':channel(s,l,'call')?'call':channel(s,l,'email')?'email':channel(s,l,'linkedin_connect')?'linkedin_connect':'research';
  const t=virtualTask(s,l,type,now);if(!taskRestriction(s,t,now))recommendations.push(recommend(s,l,t,now,true,null));else blocked.push({leadId:l.id,reason:taskRestriction(s,t,now)});
 }
 const events=intelligenceData(s).events;
 const seen=new Set<string>();
 return {blocked,recommendations:recommendations.filter(r=>{
  if(seen.has(r.id))return false;seen.add(r.id);
  return r.protected||!events.some(e=>!e.followed&&e.recommendationId===r.id&&e.deferredUntil&&e.deferredUntil>now.toISOString());
 }).sort(compareRecommendations)};
}
export function selectRecommendation(d:Decision,{callBlock=false,preferredId=''}={}){
 if(d.recommendations[0]?.protected)return d.recommendations[0];
 const candidates=callBlock?d.recommendations.filter(r=>['call','callback'].includes(r.task.type)):d.recommendations;
 return candidates.find(r=>r.id===preferredId)||candidates[0]||null;
}
