import {recordQueueEvidence,setWorkQueue} from './lib/workQueues';
import {replenishCallSupply,restrictedRoutineEmail} from './lib/kpiFirst';
import {WorkQueueReview} from './components/WorkQueues';
import {applyCallPreparation} from './lib/callPreparation';
import type {User} from '@supabase/supabase-js';
import {cloud} from './lib/cloud';
import {useCloudWorkspace} from './hooks/useCloudWorkspace';
import {CloudSignIn,CloudGate,CloudPanel,SyncIndicator,useCloudAuth} from './components/CloudWorkspace';
import {useCallback,useEffect,useRef,useState} from 'react';
import {core} from './lib/core';
import {setIndustryFocus,setLeadIndustry,addIndustryCategory} from './lib/industryFocus';
import {restoreLocal,persistLocal} from './lib/storage';
import {importLusha,type ImportStats} from './lib/importer';
import {applyCompanyEnrichment,saveManualBusinessDescription,type EnrichmentPlan} from './lib/companyEnrichment';
import type {Activity,Lead,State,Task} from './types';
import {Focus} from './components/Focus';
import {saveWebsite,type SaveWebsite} from './lib/companyResearch';
import {executionFeedback,type ExecutionFeedback as Feedback} from './lib/executionFeedback';
import {ExecutionFeedback} from './components/ExecutionFeedback';
import {SalesforceContacts,SalesforceQuickAdd,type SetContactStatus,type SaveContactCopy} from './components/SalesforceContacts';
import {saveQuickAddDetails,setSalesforceStatuses,statusStamp,type ContactRef} from './lib/salesforceContacts';
import {FXQuickDialog} from './components/FXQuickDialog';
import {Prospects} from './components/Prospects';
import {LeadReserve} from './components/Reserve';
import {DupeQueue} from './components/DupeQueue';
import {Insights,ValueDashboard,Pipeline,TaskQueue} from './components/Dashboards';
import {Settings} from './components/Settings';
import {ConfirmReadiness,TaskDialog,SnoozeDialog,type TaskForm} from './components/Dialogs';
import {Icon} from './components/UI';
import {ActivityHistory,emptyHistoryFilters} from './components/ActivityHistory';
import {ContactDetailsDialog,FollowUpEmailDialog,SchedulePostCallDialog,WorkflowDialog,type PostAction} from './components/PostCall';
import {addRecordedContact,activityForTask,activityStamp,assertPendingAction,createFollowUpEmail,saveActivityDetails,saveContactDetails,schedulePostCall,type ActivityFields} from './lib/activityWorkflow';
import {emptyTrail,finishVisit,nextVisit,previousVisit,visit,visitForActivity,type FocusVisit} from './lib/focusTrail';
import {CommercialEvidenceDialog} from './components/Intelligence';
import {prepareAction,recordActiveClearance,recordDecision,rejectRecommendation,saveCommercial} from './lib/intelligence/actions';
import {endSession,startSession} from './lib/intelligence/session';
import type {Recommendation} from './lib/intelligence/types';
type Tab='focus'|'prospects'|'reserve'|'dupes'|'pipeline'|'tasks'|'resolution'|'insights'|'value'|'settings'|'history'|'salesforceContacts';
type Modal={task:Task;preset:string;recommendation?:Recommendation}|null;
const NAV:[Tab,string,string][]=[['focus','Focus Mode','bolt'],['prospects','Prospects','users'],['reserve','Lead Reserve','target'],['dupes','Dupe Queue','archive'],['salesforceContacts','Salesforce Lead Queue','users'],['pipeline','Pipeline','chart'],['tasks','Task Queue','list'],['history','Activity History','archive'],['resolution','Contact Resolution','search'],['insights','Buyer Intelligence','target'],['value','Pipeline Value','chart'],['settings','Settings','settings']];
export default function App(){
 const auth=useCloudAuth();
 if(cloud&&(auth.loading||!auth.session))return <CloudSignIn loading={auth.loading}/>;
 return <Workspace key={auth.session?.user.id||'browser'} user={auth.session?.user}/>;
}
function Workspace({user}:{user?:User}){
 const workspace=useCloudWorkspace(user?.id),engine=workspace?.engine;
 const [localState,setState]=useState<State>(restoreLocal);
 const state=workspace?.snapshot.document||localState,stateRef=useRef(state);
 stateRef.current=state;
 const [tab,setTab]=useState<Tab>('focus'),[menu,setMenu]=useState(false),[modal,setModal]=useState<Modal>(null),[snooze,setSnooze]=useState<Task|null>(null),[readinessLead,setReadinessLead]=useState<Lead|null>(null),[fxLead,setFxLead]=useState<Lead|null>(null),[toast,setToast]=useState(''),[focusLead,setFocusLead]=useState('');
 const [feedback,setFeedback]=useState<(Feedback&{confirmed?:boolean})|null>(null);
 useEffect(()=>{if(!feedback)return;const timer=setTimeout(()=>setFeedback(null),5000);return()=>clearTimeout(timer)},[feedback?.id]);
 const syncStatus=workspace?.snapshot.status;
 useEffect(()=>{setFeedback(event=>{if(!event)return event;if(syncStatus==='saved'&&!event.confirmed)return {...event,confirmed:true};if(syncStatus&&['error','conflict','locked'].includes(syncStatus)&&!event.confirmed)return null;return event})},[syncStatus,feedback?.id]);
 const feedbackStatus=feedback?.confirmed?(engine?'saved':'local'):syncStatus||'local';
 const [queueLead,setQueueLead]=useState<string|null>(null);
 const [sfContact,setSFContact]=useState<ContactRef|null>(null);
 const [trail,setTrail]=useState(emptyTrail),[historyFilters,setHistoryFilters]=useState(emptyHistoryFilters),[prospectFilters,setProspectFilters]=useState(emptyHistoryFilters);
 const [historyScope,setHistoryScope]=useState<string|undefined>(undefined),[postModal,setPostModal]=useState<{kind:PostAction;leadId:string;contactId:string|null;activityId?:string}|null>(null);
 const recommendedViewed=useCallback((task:Task)=>setTrail(t=>t.following?visit(t,{task:structuredClone(task)},true):t),[]);
 const currentRecommended=useCallback(()=>setTrail(t=>({...t,following:true})),[]);
 const showActivity=useCallback((activity:Activity)=>{setTrail(t=>visit(t,visitForActivity(stateRef.current,activity)));setHistoryScope(undefined);setTab('focus');setMenu(false)},[]);
 const showTask=useCallback((task:Task)=>setTrail(t=>visit(t,{task:structuredClone(task)})),[]);
 const completeView=useCallback((original:Task,result:FocusVisit,stay:boolean)=>{setTrail(t=>finishVisit(t,original.id,result,stay));setTab('focus');setMenu(false)},[]);
 const message=useCallback((x:string)=>setToast(x),[]);
 const [evidenceLead,setEvidenceLead]=useState<Lead|null>(null);
 const snoozeRecommendation=useRef<Recommendation|undefined>(undefined);
 useEffect(()=>{if(!toast)return;const id=setTimeout(()=>setToast(''),4000);return()=>clearTimeout(id)},[toast]);
 const commit=useCallback(<T,>(action:(draft:State)=>T,options:{replenish?:boolean;feedback?:boolean}={}):T=>{
   if(options.feedback)setFeedback(null);
   const before=engine?engine.getSnapshot().document:stateRef.current;const draft=structuredClone(before);const result=action(draft);
   if(result&&typeof result==='object'&&'error' in result&&result.error)throw new Error(String(result.error));
   // Opt-in replenishment runs only after a saved user action. New CSV imports stay
   // passive by default; no auto-activation happens until the user enables it.
   if(options.replenish!==false)core.autoReplenishReserve(draft);const violations=core.checkInvariants(draft) as string[];
   if(violations.length){throw new Error('Safety rule blocked save: '+violations.join('; '))}
   const event=options.feedback?executionFeedback(before,draft,new Date()):null;
   if(engine)engine.change(draft);else persistLocal(draft);stateRef.current=draft;setState(draft);if(event)setFeedback(event);return result;
 },[engine]);
 const onSaveDescription=(id:string,value:string,expected:string):string|void=>{try{commit(s=>saveManualBusinessDescription(s,id,value,expected),{replenish:false});message('Business description saved. Check cloud sync before closing the browser.')}catch(e){return (e as Error).message}};
 const onSaveWebsite:SaveWebsite=(id,value,expected)=>{try{commit(s=>saveWebsite(s,id,value,expected),{replenish:false});message('Verified website saved on this device; cloud status is shown above.')}catch(e){return (e as Error).message}};
 const setSFStatus:SetContactStatus=(ref,status,note,expected)=>{try{const [contact]=commit(s=>setSalesforceStatuses(s,[ref],status,note,{[ref.leadId+':'+ref.contactId]:expected},new Date()),{replenish:false});return {contact}}catch(e){return {error:(e as Error).message}}};
 const saveSFCopy:SaveContactCopy=(ref,fields,expected)=>{try{return {contact:commit(s=>saveQuickAddDetails(s,ref,fields,expected),{replenish:false})}}catch(e){return {error:(e as Error).message}}};
 const updateState=useCallback((updated:State)=>{const parsed=core.normalize(updated);if(!parsed)throw new Error('Incompatible backup');if(engine)engine.change(parsed);else persistLocal(parsed);stateRef.current=parsed;setState(parsed);setFeedback(null);setTrail(emptyTrail());setPostModal(null);setSFContact(null);setQueueLead(null);setHistoryScope(undefined);setTab('focus');message('SalesOS database restored.')},[message,engine]);
 const copy=useCallback(async(value:string)=>{try{await navigator.clipboard.writeText(value);message('Copied — paste into Teams, Outlook or your browser.')}catch{message('Clipboard not available here. Select and copy manually.')}},[message]);
 const doTask=useCallback((t:Task,preset='complete',recommendation?:Recommendation)=>{
   if(restrictedRoutineEmail(stateRef.current,t,new Date())&&preset!=='snooze'){message('KPI-first: complete 100 logged outbound calls before sending routine emails. Agreed commitments are protected.');return;}
   if(preset==='snooze'){
    // A virtual recommendation has no scheduled task to snooze yet. Feedback defers it without manufacturing activity.
    if(recommendation?.generated){try{commit(s=>rejectRecommendation(s,recommendation,'Wrong time',new Date()));message('Recommendation deferred for 24 hours.')}catch(e){message((e as Error).message)}return}
    snoozeRecommendation.current=recommendation;setSnooze(t);return;
   }
   if(preset==='no_answer'||preset==='bad_number'){
     try{const saved=commit(s=>{const before=structuredClone(s),task=recommendation?prepareAction(s,recommendation,new Date()):core.getTask(s,t.id);assertPendingAction(s,task,new Date());const r=core.logCall(s,task,{outcome:preset});if(!r.error&&recommendation)recordDecision(s,before,recommendation,task,new Date());if(!r.error)replenishCallSupply(s,new Date());return {...r,task:structuredClone(task),activityId:activityForTask(s,task)?.id}},{feedback:true});completeView(t,saved,false);message('');}catch(err){message((err as Error).message)}return;
   }
   if(preset==='complete'&&!['call','callback','deal','meeting','research'].includes(t.type)){
     try{const saved=commit(s=>{const before=structuredClone(s),task=recommendation?prepareAction(s,recommendation,new Date()):core.getTask(s,t.id);assertPendingAction(s,task,new Date());const r=core.completeTask(s,task,{outcome:t.type==='email'?'Email sent (manually confirmed)':'Completed (manually confirmed)'});if(!r.error&&recommendation)recordDecision(s,before,recommendation,task,new Date());return {...r,task:structuredClone(task),activityId:activityForTask(s,task)?.id}},{feedback:true});completeView(t,saved,t.origin==='post_call');message('');}catch(err){message((err as Error).message)}return;
   }
   setModal({task:t,preset:preset==='complete'&&['call','callback'].includes(t.type)?'connected':preset,recommendation});
 },[commit,message,completeView]);
 const submitTask=(f:TaskForm,disposition:'stay'|'next'):string|void=>{
  if(!modal)return 'Task missing.';let response:any;
  try{response=commit(s=>{
    const before=structuredClone(s),t=modal.recommendation?prepareAction(s,modal.recommendation,new Date()):core.getTask(s,modal.task.id);if(!t)return {error:'Task was already completed.'};if(restrictedRoutineEmail(s,t,new Date()))return {error:'Complete 100 outbound calls before sending routine emails.'};assertPendingAction(s,t,new Date());
    let result;
    if(['call','callback'].includes(t.type))result=core.logCall(s,t,{outcome:f.outcome,notes:f.notes,reason:f.reason,readiness:f.readiness?Number(f.readiness):undefined,evidence:f.evidence||undefined,barrier:f.barrier,nextMilestone:f.nextMilestone,decisionMakerConfirmed:f.decisionMaker,callbackDate:f.date,callbackTime:f.time,referredName:f.referral,optoutScope:f.scope,minutes:f.minutes});
    else if(t.type==='research')result=core.resolveContact(s,t,{mode:f.repairMode,contactId:t.contactId,kind:'mobile',value:f.repairPhone,name:f.repairName,title:f.repairTitle,email:f.repairEmail,nextDate:f.date,notes:f.notes});
    else result=core.completeTask(s,t,{notes:f.notes,newStage:f.newStage,nextDate:f.date,nextTime:f.time});
    if(!result.error&&modal.recommendation)recordDecision(s,before,modal.recommendation,t,new Date());if(!result.error&&['call','callback'].includes(t.type))replenishCallSupply(s,new Date());return {...result,task:structuredClone(t),activityId:activityForTask(s,t)?.id};
  },{feedback:true});}catch(e){return (e as Error).message}
  if(response?.error)return response.error;completeView(modal.task,response,disposition==='stay');setModal(null);message('');
 };
 const editActivity=useCallback((id:string,patch:ActivityFields,expected:string):string|void=>{try{commit(s=>saveActivityDetails(s,id,patch,expected,new Date()),{replenish:false});message('Activity updated · no new call or XP.')}catch(e){return (e as Error).message}},[commit,message]);
 const submitReadiness=(level:number,evidence:string,barrier:string,milestone:string):string|void=>{
  if(!readinessLead)return 'No prospect';let result:any;
  try{result=commit(s=>core.setReadiness(s,core.getLead(s,readinessLead.id),level,evidence,{barrier,nextMilestone:milestone}),{feedback:true});}catch(e){return (e as Error).message}
  if(result?.error)return result.error;setReadinessLead(null);message('Buyer Readiness updated with evidence.');
 };
 const addLead=(data:any)=>{try{const r=commit(s=>core.createLead(s,data));if(r?.duplicate){message('Company already exists. Add a contact instead.');return false}if(!r){message('Enter a company name.');return false}message('Prospect created and sequence started.');return true}catch(e){message((e as Error).message);return false}};
 const stage=(l:Lead,newStage:string,evidence:string):string|void=>{
  if(newStage===l.stage){message('Acquisition stage is unchanged.');return}
  if(!evidence.trim())return 'Evidence is required for a stage change.';
  try{commit(s=>core.advanceStage(s,core.getLead(s,l.id),newStage,evidence),{feedback:true});message('Acquisition stage updated.')}catch(e){return (e as Error).message}
 };
 const status=(l:Lead,newStatus:string,reason:string,scope:string):string|void=>{
  if(newStatus===l.status){message('Status unchanged.');return}if(!reason.trim())return 'Record the reason for the change.';
  try{const r=commit(s=>{const lead=core.getLead(s,l.id);return core.changeStatus(s,lead,newStatus,reason,{scope,contact:core.preferredContact(lead,'call')||lead.contacts[0]})});if(!r)return 'Status change blocked by suppression rules.';message('Status saved.')}catch(e){return (e as Error).message}
 };
 const updateFX=(l:Lead,fx:any)=>{try{commit(s=>core.updateFX(s,core.getLead(s,l.id),fx));message('FX discovery saved.');return true}catch(e){message((e as Error).message);return false}};
 const openTab=(t:Tab)=>{setTab(t);setMenu(false)};
 const handleImport=(text:string):ImportStats|null=>{try{const report=commit(s=>importLusha(s,text));message(`${report.created} companies added to reserve · ${report.scored} scored · ${report.merged} contact updates.`);return report}catch(e){message((e as Error).message);return null}};
 const handleEnrichment=(plan:EnrichmentPlan):boolean=>{try{const count=commit(s=>applyCompanyEnrichment(s,plan),{replenish:false});message(count+' company profiles enriched. Check the cloud Saved indicator before closing.');return true}catch(e){message((e as Error).message);return false}};
 const demo=()=>{try{commit(s=>{
   const make=(data:any)=>core.createLead(s,data);
   const a=make({company:'Northstar Talent Partners Ltd',sector:'International recruitment',contact:'Alex Morgan',title:'Finance Director',mobile:'07700900201',email:'alex@northstar.example',readiness:1,fit:5});
   const b=make({company:'Meridian Machinery UK Ltd',sector:'Industrial equipment',contact:'Jordan Taylor',title:'CFO',mobile:'07700900202',email:'jordan@meridian.example',readiness:1,fit:4});
   if(a&&!a.duplicate){core.setReadiness(s,a,4,'FD acknowledged currency volatility affected margins',{barrier:'Has not quantified impact',nextMilestone:'Establish impact and urgency'});core.advanceStage(s,a,'Discovery Complete','Cross-border fee receipts and FX requirements established');core.updateFX(s,a,{provider:'HSBC',products:['Spot','Forwards'],flows:[{id:core.uid(),pair:'GBP/EUR',direction:'buy',amount:250000,currency:'GBP',period:'monthly',confidence:'confirmed',addressablePct:70,marginBps:40}]})}
   if(b&&!b.duplicate){core.setReadiness(s,b,3,'CFO asked to see how the service works',{barrier:'FX pricing yet to be reviewed'})}
  });message('Fictional demo companies added.')}catch(e){message((e as Error).message)}};
 const openProspect=(id:string)=>{setFocusLead(id);openTab('prospects')};
 const currentTab=tab==='resolution'?'tasks':tab;
 if(workspace&&(!workspace.snapshot.ready||workspace.snapshot.status==='conflict'))return <CloudGate engine={workspace.engine} snapshot={workspace.snapshot}/>;
 const syncIndicator=workspace?<SyncIndicator snapshot={workspace.snapshot} onOpen={()=>openTab('settings')}/>:undefined;
 return <div className={`shell ${tab==='focus'?'is-focus':''} ${!menu?'is-collapsed':''}`}>
  {feedback&&<ExecutionFeedback event={feedback} status={feedbackStatus} celebrate={state.settings.celebrationEffects!==0}/>}
  <aside className={`sidebar ${menu?'visible':''}`} aria-label="Main navigation" inert={!menu}><div className="sidebar-heading"><div className="brand-mark">ϟ</div><div><strong>Sales<span>OS</span></strong><small>PROGRESSION FIRST</small></div><button className="icon-btn sidebar-close" aria-label="Close navigation" onClick={()=>setMenu(false)}><Icon name="x"/></button></div><nav>{NAV.map(([id,label,icon])=><button className={tab===id?'active':''} onClick={()=>openTab(id)} key={id}><Icon name={icon}/>{label}{id==='resolution'&&core.pending(state).filter((t:Task)=>t.type==='research').length>0&&<span className="nav-counter">{core.pending(state).filter((t:Task)=>t.type==='research').length}</span>}{id==='reserve'&&state.leads.filter(l=>l.leadPool==='reserve'&&l.crmClearance!=='hold'&&core.reserveReviewDue(l)<=core.today()).length>0&&<span className="nav-counter">{state.leads.filter(l=>l.leadPool==='reserve'&&l.crmClearance!=='hold'&&core.reserveReviewDue(l)<=core.today()).length}</span>}{id==='dupes'&&core.dupeQueue(state).some((l:Lead)=>core.dupeState(l)==='review-due')&&<span className="nav-counter">{core.dupeQueue(state).filter((l:Lead)=>core.dupeState(l)==='review-due').length}</span>}</button>)}</nav><div className="sidebar-footer"><strong>{user?'PRIVATE WORKSPACE':'BROWSER STORAGE'}</strong><span>Only fictional or approved data</span></div></aside>
  {menu&&<div className="sidebar-veil" onClick={()=>setMenu(false)} />}
  <main className="main-app">{tab==='focus'?<Focus onQueueReview={lead=>setQueueLead(lead.id)} onWorkQueue={q=>{try{commit(s=>setWorkQueue(s,q),{replenish:false});currentRecommended()}catch(e){message((e as Error).message)}}} onSaveDescription={onSaveDescription} onSaveWebsite={onSaveWebsite} onRefillCalls={()=>{try{const r=commit(s=>replenishCallSupply(s,new Date(),true),{replenish:false});message(r.activated?`${r.activated} callable reserve companies activated. Continue with your next eligible call.`:'No eligible reserve calls could be activated. Review Lead Reserve for contact or clearance gaps.');currentRecommended()}catch(e){message((e as Error).message)}}} feedback={feedback} feedbackStatus={feedbackStatus} syncStatus={syncStatus||'local'} onSalesforceQuickAdd={(lead,contact)=>setSFContact({leadId:lead.id,contactId:contact.id})} onSalesforceQueue={(lead,contact)=>{const r=setSFStatus({leadId:lead.id,contactId:contact.id},'needs_adding',contact.salesforceVerificationNote||'',statusStamp(contact));message(r.error||'Contact added to Salesforce queue · current task unchanged.')}} trail={trail} onRecommendedViewed={recommendedViewed} onPrevious={()=>setTrail(previousVisit)} onNext={candidate=>setTrail(t=>nextVisit(t,candidate))} onReturnRecommended={currentRecommended} onRecent={index=>setTrail(t=>({...t,index,following:false}))} onViewTask={showTask} onSaveActivity={editActivity} onTaskNote={(task,notes)=>{try{commit(s=>{const saved=core.getTask(s,task.id);if(!saved||saved.status==='pending')throw Error('Choose a historical task.');saved.reviewNotes=notes},{replenish:false});message('Review notes saved.')}catch(e){return (e as Error).message}}} onReadiness={setReadinessLead} onHistory={lead=>{setProspectFilters(emptyHistoryFilters());setHistoryScope(lead.id)}} onPostAction={(kind,lead,contact,activity)=>setPostModal({kind,leadId:lead.id,contactId:contact?.id||null,activityId:activity?.id})} draftScope={user?.id} onIndustryChange={(enabled,category)=>{try{commit(s=>setIndustryFocus(s,{enabled,category}),{replenish:false});message(enabled?'Industry Focus updated. Due promises remain visible.':'Industry Focus off · all industries available.')}catch(e){message((e as Error).message)}}} onIndustryReserve={()=>openTab('reserve')} onColdCallMode={enabled=>{try{commit(s=>{s.settings.coldCallMode=enabled?1:0},{replenish:false})}catch(e){message((e as Error).message)}}} syncIndicator={syncIndicator} state={state} onFX={setFxLead} copy={copy} onAction={doTask} onToggleMenu={()=>setMenu(v=>!v)} onTab={t=>openTab(t as Tab)} onEvidence={setEvidenceLead} onFeedback={(r,reason)=>{try{commit(s=>rejectRecommendation(s,r,reason,new Date()));message('Feedback saved; recommendation deferred.');return true}catch(e){message((e as Error).message);return false}}} onStartSession={duration=>{try{commit(s=>startSession(s,duration,new Date()));message('Suggested work session started.')}catch(e){message((e as Error).message)}}} onEndSession={()=>{try{commit(endSession);message('Session ended.')}catch(e){message((e as Error).message)}}}/>:
  <><div className="manage-toolbar"><button className="icon-btn" title="Show navigation" onClick={()=>setMenu(v=>!v)}><Icon name="menu"/></button><span className="brand-small">ϟ Sales<span>OS</span></span><small>MANAGEMENT</small>{syncIndicator}<span className="toolbar-spacer"/><button className="btn secondary small" onClick={()=>openTab('focus')}><Icon name="bolt"/> Back to Focus</button></div>
   {currentTab==='prospects'&&<Prospects onQueueReview={lead=>setQueueLead(lead.id)} onSaveDescription={onSaveDescription} onIndustryCategory={(id,category)=>{try{commit(s=>setLeadIndustry(s,id,category),{replenish:false});message('Company industry classification saved.')}catch(e){message((e as Error).message)}}} onAddIndustryCategory={label=>{try{const id=commit(s=>addIndustryCategory(s,label),{replenish:false});message('Industry category added.');return id}catch(e){message((e as Error).message);return null}}} onSaveWebsite={onSaveWebsite} onSalesforceCreate={(lead,contact)=>setSFContact({leadId:lead.id,contactId:contact.id})} state={state} openLeadId={focusLead} editReadiness={setReadinessLead} onUpdateFX={updateFX} onStage={stage} onStatus={status} onAddLead={addLead} onAddContact={(l,data)=>{try{const result=commit(s=>core.addContact(s,core.getLead(s,l.id),data));if(!result||result.duplicate){message(result?.duplicate?'Contact already exists.':'Enter a name or contact method.');return false}message('Contact saved.');return true}catch(e){message((e as Error).message);return false}}} onAddMethod={(l,id,kind,value)=>{try{const result=commit(s=>core.addMethod(s,core.getLead(s,l.id),core.getContact(core.getLead(s,l.id),id),kind,value));if(!result||result.duplicate){message(result?.duplicate?'Contact method already exists.':'Enter a contact method.');return false}message('Contact method saved.');return true}catch(e){message((e as Error).message);return false}}} onImport={()=>openTab('settings')}/>}
   {currentTab==='reserve'&&<LeadReserve state={state} onActivate={ids=>{try{const result=commit(s=>core.activateReserve(s,ids,{minScore:s.settings.reserveMinScore??60}));message(`${result.activated} prospects activated · ${result.skipped} skipped.`)}catch(e){message((e as Error).message)}}} onSettings={settings=>{try{commit(s=>{s.settings={...s.settings,...settings}});message('Reserve rules saved.')}catch(e){message((e as Error).message)}}} onImport={()=>openTab('settings')} onDupeQueue={()=>openTab('dupes')} onReviewCRM={(id,clearance,note,lastActivityAt)=>{try{const result=commit(draft=>core.reviewReserveCRM(draft,id,clearance,note,{lastActivityAt}));if(result.error){message(result.error);return false}message('Salesforce check recorded.');return true}catch(e){message((e as Error).message);return false}}}/>}
   {currentTab==='dupes'&&<DupeQueue state={state} onReserve={()=>openTab('reserve')} onCRMCheck={(id,note,lastActivityAt)=>{try{const result=commit(s=>core.reviewReserveCRM(s,id,'hold',note,{lastActivityAt}));if(result.error){message(result.error);return false}message('CRM activity checked; reclaim date updated.');return true}catch(e){message((e as Error).message);return false}}} onRequest={(id,note)=>{try{const result=commit(s=>core.logReclaimRequest(s,id,note));if(result.error){message(result.error);return false}message('Reclaim request logged; still on hold until approved.');return true}catch(e){message((e as Error).message);return false}}} onDecision={(id,decision,note)=>{try{const result=commit(s=>core.recordReclaimDecision(s,id,decision,note));if(result.error){message(result.error);return false}message(decision==='approved'?'Approval recorded; company returned to available reserve.':'Decline recorded; company remains on hold.');return true}catch(e){message((e as Error).message);return false}}}/>}
   {currentTab==='salesforceContacts'&&<SalesforceContacts onSaveWebsite={onSaveWebsite} state={state} onStatus={setSFStatus} onSave={saveSFCopy} onBulk={(refs,status,note,expected)=>{try{commit(s=>setSalesforceStatuses(s,refs,status,note.trim()?note:undefined,expected,new Date(),true),{replenish:false})}catch(e){return (e as Error).message}}}/>}
   {currentTab==='history'&&<ActivityHistory state={state} filters={historyFilters} onFilters={setHistoryFilters} onOpen={showActivity}/>}
   {currentTab==='pipeline'&&<Pipeline state={state} onProspect={openProspect}/>}
   {currentTab==='tasks'&&<TaskQueue state={tab==='resolution'?{...state,tasks:state.tasks.filter(t=>t.type==='research')}:state} onTask={t=>{if(['call','callback','deal','meeting','research'].includes(t.type))doTask(t,t.type==='call'?'connected':'complete');else {showTask(t);openTab('focus')}}}/>}
   {currentTab==='insights'&&<Insights state={state} onProspect={openProspect}/>}
   {currentTab==='value'&&<ValueDashboard state={state} onProspect={openProspect}/>}
   {currentTab==='settings'&&<Settings onApplyCallPrep={plan=>{try{commit(s=>applyCallPreparation(s,plan,new Date()),{replenish:false})}catch(e){return (e as Error).message}}} onEvidence={setEvidenceLead} cloudPanel={workspace&&user?<CloudPanel user={user} engine={workspace.engine} snapshot={workspace.snapshot}/>:undefined} state={state} onRestore={updateState} onImport={handleImport} onEnrichmentImport={handleEnrichment} onDemo={demo} onTargets={targets=>{try{commit(s=>{s.settings={...s.settings,...targets}},{replenish:false});message('Settings saved.')}catch(e){message((e as Error).message)}}} onSequence={sequence=>{try{commit(s=>{s.sequence=sequence});message('New sequence template saved.')}catch(e){message((e as Error).message)}}} notify={message}/>}
  </>}
  </main>
  {sfContact&&<SalesforceQuickAdd onSaveWebsite={onSaveWebsite} key={sfContact.leadId+':'+sfContact.contactId} state={state} contactRef={sfContact} onClose={()=>setSFContact(null)} onStatus={setSFStatus} onSave={saveSFCopy}/>}
  {historyScope!==undefined&&<WorkflowDialog label="Activity History" onClose={()=>setHistoryScope(undefined)}><div className="dialog-content"><ActivityHistory embedded state={state} filters={prospectFilters} onFilters={setProspectFilters} leadId={historyScope} onOpen={showActivity}/></div></WorkflowDialog>}
  {postModal&&(()=>{const l=core.getLead(state,postModal.leadId) as Lead|undefined,c=l?.contacts.find(c=>c.id===postModal.contactId)||null,a=state.activities.find(a=>a.id===postModal.activityId);if(!l)return null;
   if(postModal.kind==='contact')return <ContactDetailsDialog lead={l} contact={c} onClose={()=>setPostModal(null)} onSave={data=>{try{commit(s=>{if(c)saveContactDetails(s,l.id,c.id,data);else {const added=addRecordedContact(s,l.id,data);if(a){const activity=s.activities.find(x=>x.id===a.id)!;saveActivityDetails(s,a.id,{notes:activity.notes,durationMins:activity.durationMins,followUpNotes:activity.followUpNotes,contactId:added.id},activityStamp(activity),new Date())}}},{replenish:false});message('Contact details saved.')}catch(e){return (e as Error).message}}}/>;
   if(!a)return null;
   if(postModal.kind==='email')return <FollowUpEmailDialog activity={a} lead={l} contact={c} onClose={()=>setPostModal(null)} onSave={data=>{try{const t=commit(s=>createFollowUpEmail(s,a.id,data,new Date()),{replenish:false});showTask(t);message(t.status==='completed'?'This follow-up was already completed.':'Follow-up email task ready; send it manually.')}catch(e){return (e as Error).message}}}/>;
   return <SchedulePostCallDialog kind={postModal.kind} lead={l} onClose={()=>setPostModal(null)} onSave={data=>{try{commit(s=>schedulePostCall(s,a.id,data,new Date()),{replenish:false,feedback:true});message('Agreed '+data.kind+' saved.')}catch(e){return (e as Error).message}}}/>;
  })()}
  {evidenceLead&&<CommercialEvidenceDialog key={evidenceLead.id} state={state} lead={core.getLead(state,evidenceLead.id)||evidenceLead} onClose={()=>setEvidenceLead(null)} onSave={(facts,timing,crmNote)=>{try{commit(s=>{saveCommercial(s,evidenceLead.id,facts,timing,new Date());if(crmNote)recordActiveClearance(s,core.getLead(s,evidenceLead.id),crmNote,new Date())});message('Commercial evidence saved.')}catch(e){return (e as Error).message}}}/>}
  {modal&&<TaskDialog key={modal.task.id+'-'+modal.preset} task={modal.task} lead={modal.task.leadId?core.getLead(state,modal.task.leadId):null} preset={modal.preset} onClose={()=>setModal(null)} onSubmit={submitTask}/>}
  {snooze&&<SnoozeDialog task={snooze} onClose={()=>setSnooze(null)} onSubmit={(date,time)=>{try{commit(s=>{const before=structuredClone(s),task=core.getTask(s,snooze.id);if(date)core.snoozeTask(s,task,date,time);else core.skipTask(s,task);if(snoozeRecommendation.current)recordDecision(s,before,snoozeRecommendation.current,task,new Date())});setSnooze(null);message('Task rescheduled.')}catch(e){message((e as Error).message)}}}/>}
  {fxLead&&<FXQuickDialog draftScope={user?.id} lead={core.getLead(state,fxLead.id)||fxLead} onClose={()=>setFxLead(null)} onSave={fx=>{const saved=updateFX(fxLead,fx);if(saved)setFxLead(null);return saved}}/>}
  {queueLead&&state.leads.some(l=>l.id===queueLead)&&<WorkQueueReview key={queueLead} state={state} lead={state.leads.find(l=>l.id===queueLead)!} onClose={()=>setQueueLead(null)} onSave={(value,expected)=>{try{commit(s=>recordQueueEvidence(s,queueLead,value,expected,new Date()),{replenish:false});setQueueLead(null);message('Queue evidence saved · readiness and schedules unchanged.')}catch(e){return (e as Error).message}}}/>}
  {readinessLead&&<ConfirmReadiness lead={core.getLead(state,readinessLead.id)||readinessLead} onClose={()=>setReadinessLead(null)} onSubmit={submitReadiness}/>}
  {toast&&<div className="toast" role="status">{toast}</div>}
 </div>;
}
