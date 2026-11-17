/* SalesOS v3 — deterministic, offline-first sales engine. No external dependencies. */
(function (root, make) {
  const api = make();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SalesCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const KEY = 'salesos.personal.v3';
  const OLD_KEY = 'salesos.personal.v2';
  const STAGES = ['Prospecting','Discovery Complete','Meeting Booked','Successful Meeting','Onboarding','Account Open','First Trade'];
  const READINESS = ['Unaware','Aware','Interested','Problem Recognised','Motivated to Change','Considering Us','Ready to Commit','Switched'];
  const STATUSES = ['Active','Negative Nurture','Disqualified','Closed Lost','Take Me Off the List'];
  const STEPS = [
    {type:'call',title:'First discovery call',delay:0},
    {type:'email',title:'Send relevant introductory email',delay:1},
    {type:'linkedin_connect',title:'Send personalised LinkedIn connection',delay:2},
    {type:'call',title:'Second call — try a different time',delay:2},
    {type:'email',title:'Send a different FX angle',delay:2},
    {type:'linkedin_message',title:'LinkedIn follow-up if connected',delay:3},
    {type:'call',title:'Final call in this sequence',delay:3}
  ];
  const DEFAULT_SETTINGS = {callGoal:200, taskGoal:65,meetingGoal:3,supplyDays:5,dailyCapacity:65,reviewAfterSequence:14,stalledAfterDays:14,defaultMarginBps:40,annualTarget:150000,reserveAutoActivate:0,reserveSupplyFloor:20,reserveActivationBatch:5,reserveMinScore:60,reserveActiveCap:150};
  const NEXT_MILESTONES = [
    'Establish that the prospect recognises us',
    'Establish relevance and genuine interest',
    'Identify a meaningful FX problem or improvement',
    'Establish the business impact and urgency',
    'Agree to evaluate an appropriate solution',
    'Resolve decision barriers and obtain commitment',
    'Complete onboarding and secure the first transaction',
    'Acquisition complete — manage the customer relationship'
  ];
  const OBJECTIVES = {call:'Contact the relevant decision-maker',callback:'Honour the agreed callback and progress the conversation',email:'Deliver a relevant message and earn engagement',linkedin_connect:'Establish a professional connection',linkedin_message:'Re-engage with a relevant discussion',deal:'Remove the barrier to the next milestone',meeting:'Prepare for the meeting and agree a clear next step',research:'Make this company contactable by the right person',review:'Decide whether this opportunity deserves renewed attention',leadgen:'Replenish the supply of qualified companies',manual:'Complete the agreed action'};
  const STAGE_TASK = {
    'Discovery Complete':['Book a meeting based on discovery',1],
    'Meeting Booked':['Prepare for and attend the meeting',0],
    'Successful Meeting':['Complete agreed commercial next steps',1],
    'Onboarding':['Resolve outstanding onboarding requirements',2],
    'Account Open':['Confirm the next FX payment and secure first trade',1]
  };
  const stageIndex = s => STAGES.indexOf(s);
  const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'id_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,10));
  const copy = v => JSON.parse(JSON.stringify(v));
  const num = (v, fallback=0) => v === '' || v === null || v === undefined ? fallback : Number.isFinite(Number(v)) ? Number(v) : fallback;
  const clamp = (v, low, high) => Math.min(high,Math.max(low,num(v)));
  function today(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function dateFrom(s){let d=new Date(`${s||today()}T12:00:00`);return Number.isNaN(d.getTime())?new Date(`${today()}T12:00:00`):d}
  function addDays(s,n){let d=dateFrom(s);d.setDate(d.getDate()+n);return today(d)}
  function businessAdd(s,n){let d=dateFrom(s),left=Math.max(0,Math.round(n));if(!left){while([0,6].includes(d.getDay()))d.setDate(d.getDate()+1);return today(d)}while(left>0){d.setDate(d.getDate()+1);if(d.getDay()!==0&&d.getDay()!==6)left--}return today(d)}
  function daysBetween(later,earlier){return Math.round((dateFrom(later)-dateFrom(earlier))/86400000)}
  function phoneDial(raw){let v=String(raw||'').trim().replace(/[^\d+]/g,'');if(v.startsWith('00'))v='+'+v.slice(2);if(v.startsWith('0'))v='+44'+v.slice(1);if(/^44\d/.test(v))v='+'+v;return v}
  const companyKey = v => String(v||'').trim().toLowerCase().replace(/\s+/g,' ');
  const contactKey = c => String(c?.name||'').trim().toLowerCase();
  function newState(){return {version:3,leads:[],tasks:[],activities:[],readinessHistory:[],milestoneHistory:[],suppression:[],sequence:copy(STEPS),settings:{...DEFAULT_SETTINGS},meta:{createdAt:new Date().toISOString(),source:'v3',demo:false},supplySnoozeUntil:''}}
  const getLead=(s,id)=>s.leads.find(x=>x.id===id);
  const getTask=(s,id)=>s.tasks.find(x=>x.id===id);
  const getContact=(l,id)=>l?.contacts?.find(c=>c.id===id) || null;
  const methods=(c,kind)=>c?.methods?.filter(m=>!kind||m.kind===kind)||[];
  const usable=(m)=>m&&m.value&&m.status!=='invalid'&&m.status!=='blocked';
  const bestMethod=(c,kind)=>methods(c,kind).find(usable)||null;
  const anyPhone=c=>bestMethod(c,'mobile')||bestMethod(c,'phone');
  const canContact=c=>c&&c.active!==false&&c.roleStatus!=='left_company'&&c.roleStatus!=='not_responsible'&&!c.optedOut;
  function preferredContact(l,kind){const cs=(l?.contacts||[]).filter(canContact);const ranked=[...cs].sort((a,b)=>(b.id===l.primaryContactId?1:0)-(a.id===l.primaryContactId?1:0)+(b.roleStatus==='decision_maker'?0.5:0)-(a.roleStatus==='decision_maker'?0.5:0));return ranked.find(c=>kind==='call'?!!anyPhone(c):kind==='email'?!!bestMethod(c,'email'):kind==='linkedin_connect'||kind==='linkedin_message'?!!bestMethod(c,'linkedin'):true)||null}
  function method(kind,value,status='unverified'){return {id:uid(),kind,value:String(value||'').trim(),status,updatedAt:new Date().toISOString()}}
  function buildContact(data={}){let out={id:data.id||uid(),name:String(data.name||data.contact||'').trim(),title:String(data.title||'').trim(),roleStatus:data.roleStatus||'unknown',active:data.active!==false,optedOut:!!data.optedOut,linkedinConnected:!!data.linkedinConnected,methods:[],notes:String(data.notes||'').trim()};
    if(Array.isArray(data.methods)){out.methods=data.methods.filter(x=>x&&x.value&&['mobile','phone','email','linkedin'].includes(x.kind)).map(x=>({...x,id:x.id||uid(),status:x.status||'unverified'}))}
    else for(let kind of ['mobile','phone','email','linkedin']) if(data[kind])out.methods.push(method(kind,data[kind]));
    return out;
  }
  const defaultFX=()=>({provider:'',products:[],currentPricing:'',hedgePct:'',hedgeTenor:'',paymentTiming:'',budgetRate:'',notes:'',flows:[],updatedAt:''});
  function buildLead(data={}){
    const l={id:data.id||uid(),company:String(data.company||'').trim(),sector:String(data.sector||'').trim(),stage:STAGES.includes(data.stage)?data.stage:'Prospecting',status:STATUSES.includes(data.status)?data.status:'Active',statusReason:data.statusReason||'',leadPool:data.leadPool==='reserve'?'reserve':'active',opportunityScore:Number.isFinite(data.opportunityScore)&&data.opportunityScore>=0&&data.opportunityScore<=100?data.opportunityScore:null,researchDate:data.researchDate||'',researchRationale:data.researchRationale||'',researchSources:data.researchSources||'',researchConfidence:data.researchConfidence||'',companyNumber:data.companyNumber||'',companyDomain:data.companyDomain||'',crmClearance:['cleared','hold'].includes(data.crmClearance)?data.crmClearance:'unknown',crmCheckedAt:data.crmCheckedAt||'',crmNote:data.crmNote||'',reservedAt:data.reservedAt||'',activatedAt:data.activatedAt||'',notes:String(data.notes||''),fit:clamp(data.fit??3,1,5),contacts:[],primaryContactId:null,readiness:data.readiness>=1&&data.readiness<=8?Math.round(data.readiness):null,readinessEvidence:data.readinessEvidence||'',readinessUpdatedAt:data.readinessUpdatedAt||'',lastMeaningfulAt:data.lastMeaningfulAt||'',barrier:data.barrier||'',nextMilestone:data.nextMilestone||'',lastProgressEvidence:data.lastProgressEvidence||'',lastProgressAt:data.lastProgressAt||'',fx:{...defaultFX(),...(data.fx||{})},sequenceState:data.sequenceState||'none',sequenceIndex:num(data.sequenceIndex,-1),reachedStages:Array.isArray(data.reachedStages)?[...new Set(data.reachedStages)]:['Prospecting'],awardedMilestones:Array.isArray(data.awardedMilestones)?data.awardedMilestones:[],createdAt:data.createdAt||new Date().toISOString(),estimatedRevenue:num(data.estimatedRevenue,0)};
    if(!Array.isArray(l.fx.flows))l.fx.flows=[];
    l.contacts=Array.isArray(data.contacts)?data.contacts.map(buildContact):[];
    if(!l.contacts.length && (data.contact||data.mobile||data.phone||data.email||data.linkedin)) l.contacts.push(buildContact({name:data.contact,title:data.title,mobile:data.mobile,phone:data.phone,email:data.email,linkedin:data.linkedin,linkedinConnected:data.linkedinConnected}));
    l.primaryContactId=data.primaryContactId&&l.contacts.some(c=>c.id===data.primaryContactId)?data.primaryContactId:l.contacts[0]?.id||null;
    if(l.readiness&&!l.nextMilestone)l.nextMilestone=NEXT_MILESTONES[l.readiness-1];
    return l;
  }
  function isSuppressed(s,l,c=null){if(l.status==='Take Me Off the List')return true;if(c?.optedOut)return true;return s.suppression.some(x=>{
    if(x.scope==='company')return x.company===companyKey(l.company);
    if(x.scope!=='contact')return false;
    if(c){let email=bestMethod(c,'email')?.value?.toLowerCase()||'';let phone=methods(c).filter(m=>['mobile','phone'].includes(m.kind)).map(m=>phoneDial(m.value));return Boolean((x.email&&x.email===email)||(x.phone&&phone.includes(x.phone))||(x.company===companyKey(l.company)&&x.contact===contactKey(c)))}
    return false;
  })}
  function log(s,l,type,outcome,notes='',xp=0,extra={}){let a={id:uid(),leadId:l?.id||null,at:new Date().toISOString(),type,outcome,notes:String(notes||''),xp:num(xp),...extra};s.activities.push(a);return a}
  function reward(s,l,key,xp,why){if(!l||l.awardedMilestones.includes(key))return 0;l.awardedMilestones.push(key);s.milestoneHistory.push({id:uid(),leadId:l.id,key,at:new Date().toISOString(),xp,evidence:why||''});return xp}
  function cancelTasks(s,l,predicate,reason='Superseded'){let n=0;for(let t of s.tasks){if(t.leadId===l.id&&t.status==='pending'&&predicate(t)){t.status='cancelled';t.cancelledAt=new Date().toISOString();t.cancelReason=reason;n++}}return n}
  function active(l){return l&&l.status==='Active'&&l.stage!=='First Trade'&&l.leadPool!=='reserve'}
  function addTask(s,l,type,title,dueAt=today(),opt={}){
    if(l&&l.leadPool==='reserve')return null;
     if(l&&(!active(l)&&!(l.status==='Negative Nurture'&&(type==='review'||(type==='callback'&&opt.isCommitment)))))return null;
    if(l&&isSuppressed(s,l,opt.contactId?getContact(l,opt.contactId):null))return null;
    const key=opt.dedupeKey||'';
    if(key){let existing=s.tasks.find(t=>t.status==='pending'&&t.leadId===(l?.id||null)&&t.dedupeKey===key);if(existing)return existing}
    const t={id:uid(),leadId:l?.id||null,contactId:opt.contactId||null,methodId:opt.methodId||null,type,title,description:opt.description||'',dueAt:dueAt||today(),dueTime:opt.dueTime||'',status:'pending',origin:opt.origin||'manual',stepIndex:opt.stepIndex??null,objective:opt.objective||OBJECTIVES[type]||'',successCriteria:opt.successCriteria||'',isCommitment:!!opt.isCommitment,dedupeKey:key,createdAt:new Date().toISOString()};
    s.tasks.push(t);return t;
  }
  function addRepair(s,l,problem='Find correct contact information',due=today(),contactId=null){return addTask(s,l,'research','Resolve contact details · '+l.company,due,{origin:'repair',contactId,description:problem,objective:'Find a verified usable channel to the FX decision-maker',successCriteria:'A relevant active contact with a usable phone or permitted email',dedupeKey:`repair:${l.id}`})}
  function createSequenceStep(s,l,i,due=today()){
    if(!active(l))return null;
    for(let j=i;j<s.sequence.length;j++){
      let step=s.sequence[j]; if(!step||!step.type)continue;
      let c=preferredContact(l,step.type==='call'?'call':step.type);
      if(step.type==='linkedin_message' && (!c||!c.linkedinConnected)){due=businessAdd(due,num(step.delay,2));continue}
      if(step.type==='linkedin_connect' && (!c||c.linkedinConnected)){due=businessAdd(due,num(step.delay,2));continue}
      if(!c){l.sequenceState='blocked';l.sequenceIndex=j;return addRepair(s,l,`No usable contact method for planned ${step.type.replace('_',' ')} step. Find an alternative or choose to skip this channel.`,due)}
      let m=step.type==='call'?anyPhone(c):bestMethod(c,step.type==='email'?'email':'linkedin');
      if(!m){l.sequenceState='blocked';l.sequenceIndex=j;return addRepair(s,l,`Find an appropriate contact method for ${step.type}.`,due,c.id)}
      l.sequenceState='active';l.sequenceIndex=j;
      return addTask(s,l,step.type,step.title||'Sequence step',due,{origin:'sequence',stepIndex:j,contactId:c.id,methodId:m.id,description:'Standard outreach sequence; adapt if buyer engagement changes.',dedupeKey:`sequence:${l.id}:${j}`});
    }
    l.sequenceState='complete';l.sequenceIndex=s.sequence.length;
    return addTask(s,l,'review','Review completed outreach sequence',businessAdd(due,s.settings.reviewAfterSequence),{origin:'sequence_review',description:'No meaningful engagement. Decide whether a further approach is justified.',dedupeKey:`sequence_review:${l.id}`});
  }
  function startSequence(s,l,due=today()){
    if(!active(l))return null;
    cancelTasks(s,l,t=>t.origin==='sequence'||t.origin==='sequence_review'||t.origin==='repair','New sequence started');
    l.sequenceState='active';l.sequenceIndex=-1;
    return createSequenceStep(s,l,0,due);
  }
  function nextSequence(s,l,finished){
    const i=(finished.stepIndex??l.sequenceIndex??-1)+1;
    const delay=i<s.sequence.length?num(s.sequence[i].delay):s.settings.reviewAfterSequence;
    return createSequenceStep(s,l,i,businessAdd(today(),delay));
  }
  function stageTask(s,l,due='',time=''){
    if(!active(l)||!STAGE_TASK[l.stage])return null;
    let [name,days]=STAGE_TASK[l.stage];
    return addTask(s,l,'deal',name,due||businessAdd(today(),days),{origin:'stage',dueTime:time,isCommitment:!!due,description:`Pipeline stage: ${l.stage}. ${l.barrier?'Barrier: '+l.barrier:''}`,objective:l.nextMilestone||OBJECTIVES.deal,successCriteria:'A documented commercial commitment or verified stage milestone',dedupeKey:`stage:${l.id}:${l.stage}`});
  }
  function advanceStage(s,l,newStage,evidence='',due='',time=''){
    if(!STAGES.includes(newStage)||!l||l.status!=='Active'||isSuppressed(s,l))return {changed:false,xp:0};
    const previous=l.stage;
    if(previous===newStage)return {changed:false,xp:0};
    l.stage=newStage;l.status='Active';l.reachedStages=[...new Set([...l.reachedStages,newStage])];l.sequenceState='paused';
    cancelTasks(s,l,t=>!t.isCommitment&&['sequence','stage','sequence_review','repair','insight'].includes(t.origin),'Pipeline stage changed');
    const xpMap={'Discovery Complete':50,'Meeting Booked':100,'Successful Meeting':150,'Onboarding':200,'Account Open':250,'First Trade':500};
    const xp=stageIndex(newStage)>stageIndex(previous)?reward(s,l,`stage:${newStage}`,xpMap[newStage]||0,evidence):0;
    l.lastProgressAt=new Date().toISOString();l.lastProgressEvidence=evidence||`Confirmed stage: ${newStage}`;
    log(s,l,'Pipeline',`${previous} → ${newStage}`,evidence,xp,{oldStage:previous,newStage});
    if(newStage!=='First Trade')stageTask(s,l,due,time);
    return {changed:true,xp};
  }
  function setReadiness(s,l,newLevel,evidence,options={}){
    let lev=Number(newLevel);if(!Number.isInteger(lev)||lev<1||lev>8)return {changed:false,error:'Choose a valid readiness level.'};
    if(!String(evidence||'').trim())return {changed:false,error:'Evidence is required for a readiness change.'};
    if(l.readiness===lev)return {changed:false,error:'Readiness is unchanged.'};
    let old=l.readiness;
    l.readiness=lev;l.readinessEvidence=String(evidence).trim();l.readinessUpdatedAt=new Date().toISOString();
    if(options.barrier!==undefined)l.barrier=String(options.barrier||'').trim();
    l.nextMilestone=String(options.nextMilestone||'').trim()||NEXT_MILESTONES[lev-1];
    if(old===null||lev>old){l.lastProgressAt=l.readinessUpdatedAt;l.lastProgressEvidence=evidence}
    const ev={id:uid(),leadId:l.id,at:l.readinessUpdatedAt,from:old,to:lev,evidence:String(evidence).trim(),barrier:l.barrier,nextMilestone:l.nextMilestone};
    s.readinessHistory.push(ev);
    const readinessXP=(old===null||lev>old)?reward(s,l,`readiness:${lev}`,({2:10,3:30,4:50,5:65,6:90,7:110,8:0})[lev]||0,evidence):0;
    log(s,l,'Buyer Readiness',`${old?old+' · '+READINESS[old-1]:'Unassessed'} → ${lev} · ${READINESS[lev-1]}`,evidence,readinessXP);
    return {changed:true,event:ev};
  }
  function addSuppression(s,l,c=null,scope='contact',notes=''){
    let emails=methods(c,'email');let phones=[...methods(c,'mobile'),...methods(c,'phone')];
    let item={id:uid(),scope,company:companyKey(l.company),contact:contactKey(c),email:emails[0]?.value?.toLowerCase()||'',phone:phones[0]?phoneDial(phones[0].value):'',at:new Date().toISOString(),notes};
    if(!s.suppression.some(x=>x.scope===item.scope&&x.company===item.company&&(scope==='company'||(x.contact===item.contact&&x.contact))))s.suppression.push(item);
    if(scope==='contact'&&c)c.optedOut=true;
    if(scope==='company'){for(const other of s.leads.filter(x=>companyKey(x.company)===companyKey(l.company))){other.status='Take Me Off the List';other.statusReason=notes||'Company opt-out';cancelTasks(s,other,()=>true,'Company-wide opt-out')}}
    else {cancelTasks(s,l,t=>!c||t.contactId===c.id,'Contact opt-out');if(!l.contacts.some(x=>canContact(x)&&!isSuppressed(s,l,x))){l.status='Take Me Off the List';l.statusReason=notes||'Contact opt-out';cancelTasks(s,l,()=>true,'No permitted active contacts')}}
    log(s,l,'Status','Take Me Off the List',notes,0,{scope,contactId:c?.id||null});return item;
  }
  function changeStatus(s,l,status,reason='',opts={}){
    if(!STATUSES.includes(status))return false;
    if(status==='Take Me Off the List'){addSuppression(s,l,opts.contact||null,opts.scope||'contact',reason);return true}
    if(status==='Active'){if(isSuppressed(s,l))return false;l.status='Active';l.statusReason='';stageTask(s,l);if(l.stage==='Prospecting')startSequence(s,l);log(s,l,'Status','Reactivated',reason,0);return true}
    l.status=status;l.statusReason=reason;
    cancelTasks(s,l,t=>status==='Negative Nurture'?!t.isCommitment:true,'Status changed to '+status);
    l.sequenceState='paused';
    if(status==='Negative Nurture'){let due=opts.due||businessAdd(today(),60);l.nurtureUntil=due;addTask(s,l,'review','Review negative nurture prospect',due,{origin:'nurture',description:reason||'Previously not receptive. Review before any further contact.',dedupeKey:`nurture:${l.id}`})}
    log(s,l,'Status',status,reason,0);return true;
  }
  function createLead(s,data={},opts={}){
    let l=buildLead(data);if(!l.company)return null;
    let duplicate=s.leads.find(x=>companyKey(x.company)===companyKey(l.company));
    if(duplicate&&!opts.allowDuplicate)return {duplicate};
    s.leads.push(l);
    if(s.suppression.some(x=>x.scope==='company'&&x.company===companyKey(l.company))){l.status='Take Me Off the List';l.statusReason='Company is suppressed'}
    else {for(let c of l.contacts){if(isSuppressed(s,l,c))c.optedOut=true}if(l.contacts.length&&l.contacts.every(c=>c.optedOut)){l.status='Take Me Off the List';l.statusReason='Existing individual opt-out'}}
    if(l.status==='Active'){
      if(l.stage==='Prospecting')startSequence(s,l);
      else if(l.stage!=='First Trade')stageTask(s,l);
    }else if(l.status==='Negative Nurture')addTask(s,l,'review','Review negative nurture prospect',businessAdd(today(),60),{origin:'nurture',dedupeKey:`nurture:${l.id}`});
    log(s,l,'Company','Prospect created',l.notes,0);
    return l;
  }
  function addContact(s,l,data){
    if(!l||!data)return null;
    let c=buildContact(data);
    if(!c.name&&!c.methods.length)return null;
    let duplicate=l.contacts.find(x=>c.name&&contactKey(x)===contactKey(c));
    if(duplicate)return {duplicate};
    l.contacts.push(c);if(!l.primaryContactId)l.primaryContactId=c.id;
    if(isSuppressed(s,l,c))c.optedOut=true;
    log(s,l,'Contact','Contact added',c.name+' '+c.title,0,{contactId:c.id});
    return c;
  }
  function addMethod(s,l,c,kind,value,status='unverified'){
    if(!['mobile','phone','email','linkedin'].includes(kind)||!String(value||'').trim())return null;
    let norm=kind==='mobile'||kind==='phone'?phoneDial(value):String(value).trim().toLowerCase();
    if(c.methods.some(m=>m.kind===kind&&(kind==='mobile'||kind==='phone'?phoneDial(m.value):m.value.toLowerCase())===norm))return {duplicate:true};
    const m=method(kind,value,status);c.methods.push(m);log(s,l,'Contact','New contact method',`${kind}: ${value}`,0,{contactId:c.id,methodId:m.id});return m;
  }
  function invalidateMethod(s,l,c,methodId,reason='Bad number'){
    const m=c?.methods.find(x=>x.id===methodId);if(!m)return false;
    m.status='invalid';m.updatedAt=new Date().toISOString();
    cancelTasks(s,l,t=>t.status==='pending'&&t.methodId===m.id,'Invalid contact method');
    log(s,l,'Contact','Invalid '+m.kind,reason,0,{contactId:c.id,methodId:m.id});
    return true;
  }
  function markCompleted(s,t,kind,outcome,notes='',xp=0,extra={}){
    if(!t||t.status!=='pending')return false;
    t.status='completed';t.completedAt=new Date().toISOString();
    log(s,getLead(s,t.leadId),kind,outcome,notes,xp,{taskId:t.id,contactId:t.contactId,...extra});return true;
  }
  function scheduleCallback(s,l,date,time='',reason='',contactId=null){
    if(!date)return null;
    const c=getContact(l,contactId)||preferredContact(l,'call')||preferredContact(l,'email');
    return addTask(s,l,'callback','Promised follow-up · '+l.company,date,{origin:'commitment',dueTime:time,contactId:c?.id||null,description:reason,objective:'Complete the agreed follow-up and establish the next milestone',successCriteria:'Follow-up action delivered as agreed',isCommitment:true,dedupeKey:`commitment:${l.id}:${date}:${time}:${c?.id||'none'}`});
  }
  function logCall(s,t,opts={}){
    const l=getLead(s,t?.leadId);if(!l||!t||t.status!=='pending')return {error:'Task no longer pending.'};
    let c=getContact(l,opts.contactId||t.contactId)||preferredContact(l,'call')||l.contacts[0]||null;
    const outcome=String(opts.outcome||'no_answer');
    if(outcome==='callback'&&!opts.callbackDate)return {error:'Choose the promised callback date.'};
    if(['negative_nurture','disqualified','closed_lost','optout'].includes(outcome)&&!String(opts.reason||'').trim())return {error:'Please record the reason.'};
    if(opts.readiness!==undefined&&opts.readiness!==null&&opts.readiness!==''&&Number(opts.readiness)!==l.readiness&&!String(opts.evidence||'').trim())return {error:'Readiness changes need supporting evidence.'};
    const names={no_answer:'No answer',gatekeeper:'Gatekeeper',connected:'Meaningful conversation',callback:'Callback requested',meeting_booked:'Meeting booked',wrong_person:'Wrong person / not responsible',bad_number:'Bad or invalid number',left_company:'Contact left company',negative_nurture:'Negative nurture',disqualified:'Disqualified',closed_lost:'Closed lost',optout:'Take Me Off the List'};
    const connected=['connected','callback','meeting_booked','negative_nurture','closed_lost','disqualified'].includes(outcome);
    const xp=outcome==='meeting_booked'?20:connected?15:outcome==='no_answer'||outcome==='gatekeeper'?2:0;
    markCompleted(s,t,'Call',names[outcome]||outcome,opts.notes||'',xp,{durationMins:clamp(opts.minutes??0,0,240)});
    if(connected){l.lastMeaningfulAt=new Date().toISOString();if(c)c.lastMeaningfulAt=l.lastMeaningfulAt}
    if(connected&&opts.decisionMakerConfirmed&&c){c.roleStatus='decision_maker';const milestoneXP=reward(s,l,'decision-maker-engaged',40,'Decision-maker engagement confirmed during a call');if(milestoneXP)log(s,l,'Milestone','Decision-maker engaged',opts.notes||'Confirmed decision-maker',milestoneXP)}
    if(opts.readiness!==undefined&&opts.readiness!==null&&opts.readiness!==''&&Number(opts.readiness)!==l.readiness){setReadiness(s,l,Number(opts.readiness),opts.evidence,{barrier:opts.barrier,nextMilestone:opts.nextMilestone})}
    else if(connected){if(opts.barrier!==undefined)l.barrier=String(opts.barrier||'');if(opts.nextMilestone)l.nextMilestone=String(opts.nextMilestone)}
    if(outcome==='no_answer'||outcome==='gatekeeper'){
      if(t.origin==='sequence')nextSequence(s,l,t);
      else if(active(l))addTask(s,l,'call','Retry contact — vary call time',businessAdd(today(),2),{origin:'followup',contactId:c?.id||null,objective:'Establish contact',dedupeKey:`retry:${l.id}:${t.id}`});
    }else if(outcome==='wrong_person'||outcome==='left_company'){
      if(c){c.roleStatus=outcome==='left_company'?'left_company':'not_responsible';if(outcome==='left_company')c.active=false}
      cancelTasks(s,l,x=>x.origin==='sequence'&&x.contactId===c?.id,'Contact not relevant');
      l.sequenceState='blocked';addRepair(s,l,opts.referredName?`Referred to ${opts.referredName}. Find their details and confirm FX responsibility.`:'Identify the person responsible for corporate FX and find a usable number.',today(),c?.id);
    }else if(outcome==='bad_number'){
      if(c){const m=c.methods.find(x=>x.id===(opts.methodId||t.methodId))||anyPhone(c);if(m)invalidateMethod(s,l,c,m.id,'Failed call: bad or incorrect number')}
      l.sequenceState='blocked';const alternative=preferredContact(l,'call');
      if(alternative){let m=anyPhone(alternative);addTask(s,l,'call','Try alternative verified contact number',today(),{origin:'repair_followup',contactId:alternative.id,methodId:m?.id,dedupeKey:`repair_call:${l.id}`})}
      else addRepair(s,l,'Find a new valid number, email-only route, or a different finance decision-maker.',today(),c?.id);
    }else if(outcome==='callback'){
      l.sequenceState='paused';cancelTasks(s,l,x=>x.origin==='sequence'||x.origin==='followup','Agreed callback supersedes sequence');scheduleCallback(s,l,opts.callbackDate,opts.callbackTime||'',opts.notes,c?.id);
    }else if(outcome==='meeting_booked'){
      l.sequenceState='paused';
      if(stageIndex(l.stage)<stageIndex('Meeting Booked'))advanceStage(s,l,'Meeting Booked',opts.notes||'Meeting booked',opts.callbackDate||'',opts.callbackTime||'');
      else if(opts.callbackDate)addTask(s,l,'meeting','Attend follow-up meeting',opts.callbackDate,{origin:'commitment',dueTime:opts.callbackTime||'',isCommitment:true,description:opts.notes||'',dedupeKey:`meeting:${l.id}:${opts.callbackDate}:${opts.callbackTime||''}`});
    }else if(outcome==='connected'){
      l.sequenceState='paused';cancelTasks(s,l,x=>x.origin==='sequence'||x.origin==='followup','Meaningful conversation');
      if(opts.callbackDate)scheduleCallback(s,l,opts.callbackDate,opts.callbackTime||'',opts.notes,c?.id);
      if(active(l)&&!s.tasks.some(x=>x.leadId===l.id&&x.status==='pending'&&(x.isCommitment||x.origin==='stage'))){
        let due=opts.callbackDate||businessAdd(today(),2);
        addTask(s,l,'deal','Progress agreed buyer milestone',due,{origin:'progression',contactId:c?.id||null,description:opts.notes||'',objective:l.nextMilestone||NEXT_MILESTONES[(l.readiness||1)-1],successCriteria:'Obtain evidence that the stated buyer barrier has changed',dedupeKey:`progression:${l.id}`});
      }
    }else if(outcome==='negative_nurture'){changeStatus(s,l,'Negative Nurture',opts.reason,{due:opts.callbackDate||businessAdd(today(),60)})}
    else if(outcome==='disqualified'){changeStatus(s,l,'Disqualified',opts.reason)}
    else if(outcome==='closed_lost'){changeStatus(s,l,'Closed Lost',opts.reason)}
    else if(outcome==='optout'){changeStatus(s,l,'Take Me Off the List',opts.reason,{scope:opts.optoutScope||'contact',contact:c})}
    return {ok:true,outcome};
  }
  function completeTask(s,t,opts={}){
    const l=getLead(s,t?.leadId);if(!t||t.status!=='pending')return {error:'Task no longer pending.'};
    if(t.type==='call'||t.type==='callback')return logCall(s,t,opts);
    if(t.type==='deal'||t.type==='meeting'){
      const result=markCompleted(s,t,'Task',opts.outcome||'Deal action completed',opts.notes||'',5);
      const stageChanged=!!(opts.newStage&&l&&opts.newStage!==l.stage);
      if(stageChanged)advanceStage(s,l,opts.newStage,opts.notes||'',opts.nextDate||'',opts.nextTime||'');
      else if(l&&opts.nextDate)scheduleCallback(s,l,opts.nextDate,opts.nextTime||'',opts.notes||'',t.contactId);
      else if(l&&active(l)&&!s.tasks.some(x=>x.status==='pending'&&x.leadId===l.id&&(x.isCommitment||x.origin==='stage'||x.origin==='progression'))){addTask(s,l,'deal','Continue work towards next milestone',businessAdd(today(),2),{origin:'progression',objective:l.nextMilestone||OBJECTIVES.deal,successCriteria:'New evidence or agreed buyer action',dedupeKey:`progression:${l.id}`})}
      return {ok:result};
    }
    const earned={email:5,linkedin_connect:3,linkedin_message:4,research:8,review:3,leadgen:10,manual:5}[t.type]||4;
    markCompleted(s,t,'Task',opts.outcome||'Completed',opts.notes||'',earned);
    if(l&&t.origin==='sequence'&&active(l))nextSequence(s,l,t);
    else if(l&&t.type==='review'&&l.status==='Negative Nurture'){
      addTask(s,l,'review','Review whether nurture is appropriate',opts.nextDate||businessAdd(today(),60),{origin:'nurture',dedupeKey:`nurture:${l.id}`});
    }
    if(l&&opts.nextDate&&active(l))scheduleCallback(s,l,opts.nextDate,opts.nextTime||'',opts.notes||'',t.contactId);
    return {ok:true};
  }
  function snoozeTask(s,t,due,time=''){if(!t||t.status!=='pending'||!due)return false;t.dueAt=due;t.dueTime=time;log(s,getLead(s,t.leadId),'Task','Snoozed',`Rescheduled to ${due} ${time}`,0,{taskId:t.id});return true}
  function skipTask(s,t){if(!t||t.status!=='pending')return false;t.skippedAt=new Date().toISOString();t.dueAt=businessAdd(today(),1);t.dueTime='';log(s,getLead(s,t.leadId),'Task','Skipped to next working day','',0,{taskId:t.id});return true}
  function resolveContact(s,t,opts={}){
    const l=getLead(s,t?.leadId);if(!l||!t||t.status!=='pending')return {error:'Resolution task unavailable.'};
    const mode=opts.mode;let c=getContact(l,opts.contactId)||getContact(l,t.contactId)||l.contacts[0];
    if(mode==='new_number'){
      if(!opts.value)return {error:'Enter the replacement number.'};if(!c)return {error:'Add a contact first.'};
      if(c.roleStatus==='not_responsible'||c.roleStatus==='left_company')return {error:'This contact is not the FX decision-maker. Add the correct person instead.'};
      addMethod(s,l,c,opts.kind==='phone'?'phone':'mobile',opts.value,'unverified');c.active=true;
    } else if(mode==='new_contact'){
      if(!opts.name)return {error:'Enter the new contact name.'};c=addContact(s,l,{name:opts.name,title:opts.title||'',mobile:opts.value||'',email:opts.email||'',roleStatus:'unknown'});
      if(c?.duplicate)return {error:'Contact already exists.'};if(!c)return {error:'Could not add contact.'};
      l.primaryContactId=c.id;
    } else if(mode==='email'){
      if(!c||!bestMethod(c,'email'))return {error:'This contact has no usable email address.'};
    } else if(mode==='review'){
      return snoozeTask(s,t,opts.nextDate||businessAdd(today(),5))?{ok:true}:{error:'Select a review date.'};
    } else return {error:'Choose how to resolve contact information.'};
    markCompleted(s,t,'Contact Resolution','Resolved: '+mode,opts.notes||'',10);
    l.sequenceState='paused';
    if(mode==='email')addTask(s,l,'email','Email to identify or reach the FX decision-maker',today(),{origin:'repair_followup',contactId:c.id,methodId:bestMethod(c,'email').id,dedupeKey:`repair_email:${l.id}`});
    else if(c&&anyPhone(c))addTask(s,l,'call','Call updated FX contact',today(),{origin:'repair_followup',contactId:c.id,methodId:anyPhone(c).id,dedupeKey:`repair_call:${l.id}`});
    else if(c&&bestMethod(c,'email'))addTask(s,l,'email','Email new contact',today(),{origin:'repair_followup',contactId:c.id,methodId:bestMethod(c,'email').id,dedupeKey:`repair_email:${l.id}`});
    else addRepair(s,l,'New contact still needs a usable phone or email',businessAdd(today(),2),c?.id);
    return {ok:true};
  }
  function isDue(t,now=new Date()){
    if(t.status!=='pending')return false;
    const d=today(now);if(t.dueAt>d)return false;if(t.dueAt<d||!t.dueTime)return true;
    const [h,m]=String(t.dueTime).split(':').map(Number);return now.getHours()*60+now.getMinutes() >= h*60+m;
  }
  function potentialForLead(l,settings=DEFAULT_SETTINGS){
    let discovered=0,qualified=0,revenue=0,unconverted=0,flows=0,assumedMargin=0;
    for(const f of (l.fx?.flows||[])){
      let amount=Math.max(0,num(f.amount));if(!amount)continue;
      let factor=f.period==='monthly'?12:f.period==='quarterly'?4:f.period==='weekly'?52:1;
      let annual=amount*factor,gbp=f.currency==='GBP'?annual:num(f.gbpAnnualEquivalent,0);
      flows++;
      if(!gbp){unconverted++;continue}
      discovered+=gbp;
      const confirmed=f.confidence==='confirmed';
      const pct=f.addressablePct===''||f.addressablePct===null||f.addressablePct===undefined?null:clamp(f.addressablePct,0,100);
      if(confirmed&&pct!==null&&stageIndex(l.stage)>=1&&l.status==='Active'){
        let adr=gbp*pct/100;qualified+=adr;
        let bps=(f.marginBps===''||f.marginBps===null||f.marginBps===undefined)?num(settings.defaultMarginBps):num(f.marginBps);
        if(f.marginBps===''||f.marginBps===null||f.marginBps===undefined)assumedMargin++;
        revenue+=adr*bps/10000;
      }
    }
    return {discovered,qualified,revenue,unconverted,flows,assumedMargin};
  }
  const STAGE_PROB={'Prospecting':0.05,'Discovery Complete':0.12,'Meeting Booked':0.22,'Successful Meeting':0.4,'Onboarding':0.7,'Account Open':0.85,'First Trade':1};
  function pipelineValue(s){let data={discovered:0,qualified:0,revenue:0,weighted:0,unconverted:0,assumedMargin:0,byStage:{},rows:[]};
    for(let l of s.leads){if(l.status!=='Active'||l.stage==='First Trade'||l.leadPool==='reserve')continue;let p=potentialForLead(l,s.settings);data.discovered+=p.discovered;data.qualified+=p.qualified;data.revenue+=p.revenue;data.unconverted+=p.unconverted;data.assumedMargin+=p.assumedMargin;data.weighted+=p.revenue*(STAGE_PROB[l.stage]||0);data.byStage[l.stage]=(data.byStage[l.stage]||0)+p.revenue;data.rows.push({...p,id:l.id,company:l.company,stage:l.stage,readiness:l.readiness,probability:STAGE_PROB[l.stage]||0})}
    data.rows.sort((a,b)=>b.revenue-a.revenue);return data;
  }
  function isEligibleTask(s,t){if(t.status!=='pending')return false;if(!t.leadId)return true;
    const l=getLead(s,t.leadId);if(!l||l.leadPool==='reserve'||isSuppressed(s,l))return false;
    if(l.status==='Negative Nurture')return t.type==='review'||t.isCommitment;if(!active(l))return false;
    let c=t.contactId?getContact(l,t.contactId):null;
    if(c&&(isSuppressed(s,l,c)||c.active===false||c.roleStatus==='left_company'||(c.roleStatus==='not_responsible'&&['call','callback','email','linkedin_connect','linkedin_message'].includes(t.type))))return false;
    if(['call','callback'].includes(t.type)&&!(c?anyPhone(c):preferredContact(l,'call')))return false;
    if(t.type==='email'&&!((c&&bestMethod(c,'email'))||preferredContact(l,'email')))return false;
    if(t.type==='linkedin_connect'&&!((c&&bestMethod(c,'linkedin'))||preferredContact(l,'linkedin_connect')))return false;
    if(t.type==='linkedin_message'&&!((c?.linkedinConnected&&bestMethod(c,'linkedin'))||preferredContact(l,'linkedin_message')?.linkedinConnected))return false;
    return true;
  }
  function taskTier(t){if(t.isCommitment||t.type==='callback')return 5;if(t.type==='meeting')return 5;if(t.type==='deal')return 4;if(t.type==='research')return 2;if(['call','callback','email','linkedin_connect','linkedin_message'].includes(t.type))return 2;return 1}
  function taskScore(s,t){const l=getLead(s,t.leadId);if(!l)return t.type==='leadgen'?20:0;
    const p=potentialForLead(l,s.settings);
    const age=clamp(daysBetween(today(),t.dueAt),0,25);
    const meaningful=l.lastMeaningfulAt?clamp(daysBetween(today(),l.lastMeaningfulAt.slice(0,10)),0,30):0;
    const money=clamp(Math.log10(Math.max(1,p.revenue)+1)*4,0,22);
    const fit=clamp(l.fit,1,5)*3;
    const readiness=l.readiness?l.readiness*1.25:0;
     const quality=Number.isFinite(l.opportunityScore)?l.opportunityScore/15:0;
    const barrierBonus=(t.type==='deal'&&l.barrier)?8:0;
    return Math.round(age*1.3+meaningful*.25+money+fit+readiness+quality+barrierBonus+(t.isCommitment?30:0));
  }
  function pending(s){return s.tasks.filter(t=>t.status==='pending'&&isEligibleTask(s,t))}
  function due(s,now=new Date()){return pending(s).filter(t=>isDue(t,now)).sort((a,b)=>taskTier(b)-taskTier(a)||taskScore(s,b)-taskScore(s,a)||a.dueAt.localeCompare(b.dueAt)||(a.dueTime||'').localeCompare(b.dueTime||''))}
  function nextTask(s,options={}){const d=due(s);if(options.callBlock){let calls=d.filter(t=>['call','callback'].includes(t.type)||t.isCommitment);return calls[0]||d[0]||null}return d[0]||null}
  function xpStats(s){let total=s.activities.reduce((sum,a)=>sum+num(a.xp),0);return {total,level:Math.floor(total/1000)+1,progress:total%1000}}
  // Rescheduling is audit history, not completed work. Preserve old backup formats.
  const isCompletionActivity=a=>a.taskId&&!['Snoozed','Skipped to next working day'].includes(a.outcome);
  function activityToday(s){const activities=s.activities.filter(a=>a.at.startsWith(today()));return {calls:activities.filter(a=>a.type==='Call').length,tasks:activities.filter(isCompletionActivity).length,meetings:activities.filter(a=>a.type==='Pipeline'&&a.newStage==='Meeting Booked').length,minutes:activities.filter(a=>a.type==='Call').reduce((x,a)=>x+num(a.durationMins),0),xp:activities.reduce((x,a)=>x+num(a.xp),0)}}
  function insights(s){const ls=s.leads.filter(x=>x.status==='Active'&&x.stage!=='First Trade'&&x.leadPool!=='reserve');const assessed=ls.filter(x=>x.readiness!==null);const counts=Array(8).fill(0);assessed.forEach(x=>counts[x.readiness-1]++);
    const cutoff=clamp(s.settings.stalledAfterDays,3,90);
    const stalled=ls.filter(l=>l.readiness&&l.readiness<8&&daysBetween(today(),(l.lastProgressAt||l.readinessUpdatedAt||l.createdAt).slice(0,10))>=cutoff);
    const noNext=ls.filter(l=>l.stage!=='First Trade'&&!s.tasks.some(t=>t.leadId===l.id&&t.status==='pending'&&isEligibleTask(s,t)));
    const issues={};for(let l of stalled){const name=l.barrier||'Barrier not recorded';issues[name]=(issues[name]||0)+1}
    let thisWeek=addDays(today(),-7);
    const moved=[...new Set(s.readinessHistory.filter(x=>x.at.slice(0,10)>=thisWeek&&(x.from===null||x.to>x.from)).map(x=>x.leadId).concat(s.activities.filter(x=>x.at.slice(0,10)>=thisWeek&&x.type==='Pipeline'&&stageIndex(x.newStage)>stageIndex(x.oldStage)).map(x=>x.leadId)))].length;
    const advances=s.readinessHistory.filter(x=>x.at.slice(0,10)>=thisWeek&&(x.from===null||x.to>x.from)).length;
    const meetings=s.activities.filter(x=>x.at.slice(0,10)>=thisWeek&&x.type==='Pipeline'&&x.newStage==='Meeting Booked').length;
    const firstTrades=s.activities.filter(x=>x.at.slice(0,10)>=thisWeek&&x.type==='Pipeline'&&x.newStage==='First Trade').length;
    const stages=STAGES.map(st=>ls.filter(l=>l.stage===st).length);
    const progressedLeads=s.leads.filter(l=>l.leadPool!=='reserve');
     const transitions=STAGES.slice(1).map((st,i)=>({label:`${STAGES[i]} → ${st}`,reached:progressedLeads.filter(l=>l.reachedStages.includes(st)).length,base:progressedLeads.filter(l=>l.reachedStages.includes(STAGES[i])).length}));
    return {active:ls.length,assessed:assessed.length,unassessed:ls.length-assessed.length,counts,stalled,noNext,issues:Object.entries(issues).sort((a,b)=>b[1]-a[1]),moved,advances,meetings,firstTrades,stages,transitions,cutoff};
  }
  function leadSupply(s){const days=clamp(s.settings.supplyDays,2,20),end=businessAdd(today(),days-1), tasks=pending(s),ready=tasks.filter(t=>t.dueAt<=today()).length,upcoming=tasks.filter(t=>t.dueAt>today()&&t.dueAt<=end).length;
    const prev=addDays(today(),-14),completed=s.activities.filter(a=>isCompletionActivity(a)&&a.at.slice(0,10)>=prev).length,pace=completed?Math.max(1,Math.round(completed/10)):num(s.settings.dailyCapacity);
    const capacity=pace*days,coverage=capacity?((ready+upcoming)/capacity):0;
    return {ready,upcoming,pace,capacity,coverage,days,end,label:coverage<0.7?'Low supply':coverage>1.5?'Heavy backlog':'Watch supply',gap:Math.max(0,capacity-ready-upcoming)};
  }
  // The reserve is a supply of researched prospects, not part of the acquisition
  // pipeline or Buyer Readiness. Unknown scores cannot be activated automatically.
  function reserveEligibility(s,l,minScore=0){
    if(!l||l.leadPool!=='reserve')return 'Already active';
    if(l.status!=='Active'||l.stage==='First Trade'||isSuppressed(s,l))return 'Not contactable due to status or suppression';
    if(!Number.isFinite(l.opportunityScore))return 'Research score needed';
    if(l.crmClearance==='hold')return 'Salesforce ownership hold';
    if(l.crmClearance!=='cleared'||!l.crmCheckedAt)return 'Salesforce clearance required';
    if(daysBetween(today(),l.crmCheckedAt)>30)return 'Salesforce clearance is older than 30 days';
    if(l.opportunityScore<minScore)return 'Below minimum score';
    const c=l.contacts.some(c=>canContact(c)&&!isSuppressed(s,l,c)&&(anyPhone(c)||bestMethod(c,'email')));
    return c?'':'Valid telephone or email contact needed';
  }
  function reserveRank(s){
    return s.leads.filter(l=>l.leadPool==='reserve').sort((a,b)=>
      (Number.isFinite(b.opportunityScore)?b.opportunityScore:-1)-(Number.isFinite(a.opportunityScore)?a.opportunityScore:-1)
      ||String(a.reservedAt||a.createdAt||'').localeCompare(String(b.reservedAt||b.createdAt||''))
      ||a.company.localeCompare(b.company));
  }
  function reserveReviewDue(l){
    const start=String(l.reservedAt||l.createdAt||'').slice(0,10)||today();
    return businessAdd(start,l.opportunityScore>=80?5:15);
  }
  function reviewReserveCRM(s,id,clearance,note=''){
    const l=getLead(s,id);
    if(!l||l.leadPool!=='reserve')return {error:'Company is not in the reserve.'};
    if(!['cleared','hold','unknown'].includes(clearance))return {error:'Invalid Salesforce clearance status.'};
    if(!String(note).trim())return {error:'Record what you checked in Salesforce and the ownership result.'};
    l.crmClearance=clearance;l.crmCheckedAt=today();l.crmNote=String(note).trim();
    log(s,l,'CRM','Salesforce clearance reviewed',clearance+': '+l.crmNote,0);
    return {ok:true};
  }
  function activateReserve(s,ids,options={}){
    const result={activated:0,skipped:0,names:[]};
    for(const id of ids){
      const l=getLead(s,id);
      if(reserveEligibility(s,l,num(options.minScore,0))){result.skipped++;continue}
      l.leadPool='active';l.activatedAt=new Date().toISOString();
      startSequence(s,l);log(s,l,'Reserve','Activated from researched reserve',l.researchRationale||'',0);
      result.activated++;result.names.push(l.company);
    }
    return result;
  }
  function autoReplenishReserve(s){
    if(!s.settings.reserveAutoActivate)return {activated:0,skipped:0,names:[]};
    const floor=clamp(s.settings.reserveSupplyFloor,1,200);
    const horizon=businessAdd(today(),clamp(s.settings.supplyDays,2,20)-1);
    const supplied=pending(s).filter(t=>t.dueAt<=horizon).length;
    const cap=clamp(s.settings.reserveActiveCap,1,2000);
    const activeCount=s.leads.filter(l=>l.leadPool!=='reserve'&&l.status==='Active'&&l.stage!=='First Trade').length;
    const slots=Math.min(clamp(s.settings.reserveActivationBatch,1,25),floor-supplied,cap-activeCount);
    if(slots<=0)return {activated:0,skipped:0,names:[]};
    const minimum=clamp(s.settings.reserveMinScore,0,100);
    const ids=reserveRank(s).filter(l=>!reserveEligibility(s,l,minimum)).slice(0,slots).map(l=>l.id);
    return activateReserve(s,ids,{minScore:minimum});
  }
  function updateFX(s,l,data){if(!l||!data)return;let fx={...defaultFX(),...l.fx,...data};fx.products=Array.isArray(fx.products)?fx.products:[];fx.flows=Array.isArray(fx.flows)?fx.flows.filter(f=>num(f.amount)>0&&f.currency).map(f=>({...f,id:f.id||uid(),currency:String(f.currency).toUpperCase(),confidence:f.confidence==='confirmed'?'confirmed':'estimate'})):[];fx.updatedAt=new Date().toISOString();l.fx=fx;log(s,l,'Discovery','FX qualification updated',`${fx.flows.length} currency flow(s) saved`,0)}
  function migrateV2(old){const s=newState();s.meta={createdAt:new Date().toISOString(),source:'migrated-v2',demo:!!old?.meta?.demo,migratedAt:new Date().toISOString()};
    if(!old||!Array.isArray(old.leads))return s;
    s.settings={...s.settings,...old.settings};
    if(Array.isArray(old.sequence)&&old.sequence.length)s.sequence=old.sequence.map(x=>({type:x.type,title:x.title||x.label,delay:num(x.delay)}));
    let map=new Map();
    for(let x of old.leads){let l=buildLead({...x,readiness:null,contacts:undefined,primaryContactId:null,fx:defaultFX(),estimatedRevenue:num(x.estimatedRevenue),reachedStages:x.reachedStages||['Prospecting']});s.leads.push(l);map.set(x.id,l.contacts[0]?.id||null)}
    s.tasks=(old.tasks||[]).filter(t=>t&&t.id).map(t=>({...t,contactId:map.get(t.leadId)||null,methodId:null,objective:OBJECTIVES[t.type]||'',successCriteria:'',isCommitment:t.type==='callback',dedupeKey:t.dedupeKey||'',origin:t.origin||'migration',description:t.description||''}));
    s.activities=(old.activities||[]).map(a=>({...a,notes:a.notes??a.note??''}));
    s.suppression=(old.suppression||[]).map(x=>({...x,phone:phoneDial(x.phone||x.mobile),company:companyKey(x.company),contact:String(x.contact||'').toLowerCase()}));
    s.supplySnoozeUntil=old.supplySnoozeUntil||'';
    return s;
  }
  function normalize(v){if(v?.version===2)return migrateV2(v);if(!v||v.version!==3||!Array.isArray(v.leads))return null;let s=newState();s={...s,...v,version:3,settings:{...DEFAULT_SETTINGS,...v.settings},sequence:Array.isArray(v.sequence)&&v.sequence.length?v.sequence:copy(STEPS),leads:v.leads.map(buildLead),tasks:Array.isArray(v.tasks)?v.tasks:[],activities:Array.isArray(v.activities)?v.activities:[],readinessHistory:Array.isArray(v.readinessHistory)?v.readinessHistory:[],milestoneHistory:Array.isArray(v.milestoneHistory)?v.milestoneHistory:[],suppression:Array.isArray(v.suppression)?v.suppression:[]};return s}
  function checkInvariants(s){const errors=[];for(const l of s.leads){if(!STAGES.includes(l.stage))errors.push('Invalid pipeline stage');if(!STATUSES.includes(l.status))errors.push('Invalid outcome status');if(l.readiness!==null&&(!Number.isInteger(l.readiness)||l.readiness<1||l.readiness>8))errors.push('Invalid Buyer Readiness');if(l.leadPool==='reserve'&&s.tasks.some(t=>t.leadId===l.id&&t.status==='pending'))errors.push('Reserved prospect has pending sales tasks');if(l.status==='Take Me Off the List'&&pending(s).some(t=>t.leadId===l.id))errors.push('Suppressed lead has actionable tasks')}return errors}
  return {KEY,OLD_KEY,STAGES,READINESS,STATUSES,STEPS,DEFAULT_SETTINGS,NEXT_MILESTONES,OBJECTIVES,STAGE_TASK,STAGE_PROB,uid,today,addDays,businessAdd,daysBetween,phoneDial,companyKey,num,clamp,newState,buildLead,buildContact,method,getLead,getTask,getContact,methods,bestMethod,anyPhone,canContact,preferredContact,isSuppressed,log,reward,cancelTasks,active,addTask,addRepair,createSequenceStep,startSequence,nextSequence,stageTask,advanceStage,setReadiness,addSuppression,changeStatus,createLead,addContact,addMethod,invalidateMethod,markCompleted,scheduleCallback,logCall,completeTask,snoozeTask,skipTask,resolveContact,isDue,potentialForLead,pipelineValue,isEligibleTask,taskTier,taskScore,pending,due,nextTask,xpStats,activityToday,insights,leadSupply,reserveEligibility,reserveRank,reserveReviewDue,reviewReserveCRM,activateReserve,autoReplenishReserve,updateFX,migrateV2,normalize,checkInvariants};
});
