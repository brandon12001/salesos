import {useCallback,useEffect,useRef,useState} from 'react';
import {core} from './lib/core';
import {restoreLocal,persistLocal} from './lib/storage';
import {importLusha} from './lib/importer';
import type {Lead,State,Task} from './types';
import {Focus} from './components/Focus';
import {FXQuickDialog} from './components/FXQuickDialog';
import {Prospects} from './components/Prospects';
import {Insights,ValueDashboard,Pipeline,TaskQueue} from './components/Dashboards';
import {Settings} from './components/Settings';
import {ConfirmReadiness,TaskDialog,SnoozeDialog,type TaskForm} from './components/Dialogs';
import {Icon} from './components/UI';
type Tab='focus'|'prospects'|'pipeline'|'tasks'|'resolution'|'insights'|'value'|'settings';
type Modal={task:Task;preset:string}|null;
const NAV:[Tab,string,string][]=[['focus','Focus Mode','bolt'],['prospects','Prospects','users'],['pipeline','Pipeline','chart'],['tasks','Task Queue','list'],['resolution','Contact Resolution','search'],['insights','Buyer Intelligence','target'],['value','Pipeline Value','chart'],['settings','Settings','settings']];
export default function App(){
 const [state,setState]=useState<State>(restoreLocal),stateRef=useRef(state),[tab,setTab]=useState<Tab>('focus'),[menu,setMenu]=useState(false),[modal,setModal]=useState<Modal>(null),[snooze,setSnooze]=useState<Task|null>(null),[readinessLead,setReadinessLead]=useState<Lead|null>(null),[fxLead,setFxLead]=useState<Lead|null>(null),[toast,setToast]=useState(''),[focusLead,setFocusLead]=useState('');
 const message=useCallback((x:string)=>setToast(x),[]);
 useEffect(()=>{if(!toast)return;const id=setTimeout(()=>setToast(''),4000);return()=>clearTimeout(id)},[toast]);
 const commit=useCallback(<T,>(action:(draft:State)=>T):T=>{
   const draft=structuredClone(stateRef.current);const result=action(draft);const violations=core.checkInvariants(draft) as string[];
   if(violations.length){throw new Error('Safety rule blocked save: '+violations.join('; '))}
   persistLocal(draft);stateRef.current=draft;setState(draft);return result;
 },[]);
 const updateState=useCallback((updated:State)=>{const parsed=core.normalize(updated);if(!parsed)throw new Error('Incompatible backup');persistLocal(parsed);stateRef.current=parsed;setState(parsed);setTab('focus');message('SalesOS database restored.')},[message]);
 const copy=useCallback(async(value:string)=>{try{await navigator.clipboard.writeText(value);message('Copied — paste into Teams, Outlook or your browser.')}catch{message('Clipboard not available here. Select and copy manually.')}},[message]);
 const doTask=useCallback((t:Task,preset='complete')=>{
   if(preset==='snooze'){setSnooze(t);return}
   if(preset==='no_answer'||preset==='bad_number'){
     try{const r=commit(s=>core.logCall(s,core.getTask(s,t.id),{outcome:preset}));if(r.error){message(r.error);return}message(preset==='no_answer'?'No answer logged · next action scheduled':'Invalid number flagged · contact repair created');}catch(err){message((err as Error).message)}return;
   }
   if(preset==='complete'&&!['call','callback','deal','meeting','research'].includes(t.type)){
     try{const r=commit(s=>core.completeTask(s,core.getTask(s,t.id),{outcome:t.type==='email'?'Email sent (manually confirmed)':'Completed (manually confirmed)'}));if(r.error){message(r.error);return}message('Task completed · next task ready');}catch(err){message((err as Error).message)}return;
   }
   setModal({task:t,preset:preset==='complete'&&['call','callback'].includes(t.type)?'connected':preset});
 },[commit,message]);
 const submitTask=(f:TaskForm):string|void=>{
  if(!modal)return 'Task missing.';let response:any;
  try{response=commit(s=>{
    const t=core.getTask(s,modal.task.id);if(!t)return {error:'Task was already completed.'};
    if(['call','callback'].includes(t.type))return core.logCall(s,t,{outcome:f.outcome,notes:f.notes,reason:f.reason,readiness:f.readiness?Number(f.readiness):undefined,evidence:f.evidence||undefined,barrier:f.barrier,nextMilestone:f.nextMilestone,decisionMakerConfirmed:f.decisionMaker,callbackDate:f.date,callbackTime:f.time,referredName:f.referral,optoutScope:f.scope,minutes:f.minutes});
    if(t.type==='research')return core.resolveContact(s,t,{mode:f.repairMode,contactId:t.contactId,kind:'mobile',value:f.repairPhone,name:f.repairName,title:f.repairTitle,email:f.repairEmail,nextDate:f.date,notes:f.notes});
    return core.completeTask(s,t,{notes:f.notes,newStage:f.newStage,nextDate:f.date,nextTime:f.time});
  });}catch(e){return (e as Error).message}
  if(response?.error)return response.error;setModal(null);message('Saved · the next task is ready.');
 };
 const submitReadiness=(level:number,evidence:string,barrier:string,milestone:string):string|void=>{
  if(!readinessLead)return 'No prospect';let result:any;
  try{result=commit(s=>core.setReadiness(s,core.getLead(s,readinessLead.id),level,evidence,{barrier,nextMilestone:milestone}));}catch(e){return (e as Error).message}
  if(result?.error)return result.error;setReadinessLead(null);message('Buyer Readiness updated with evidence.');
 };
 const addLead=(data:any)=>{try{const r=commit(s=>core.createLead(s,data));if(r?.duplicate)message('Company already exists. Add a contact instead.');else message('Prospect created and sequence started.')}catch(e){message((e as Error).message)}};
 const stage=(l:Lead,newStage:string,evidence:string):string|void=>{
  if(newStage===l.stage){message('Acquisition stage is unchanged.');return}
  if(!evidence.trim())return 'Evidence is required for a stage change.';
  try{commit(s=>core.advanceStage(s,core.getLead(s,l.id),newStage,evidence));message('Acquisition stage updated.')}catch(e){return (e as Error).message}
 };
 const status=(l:Lead,newStatus:string,reason:string,scope:string):string|void=>{
  if(newStatus===l.status){message('Status unchanged.');return}if(!reason.trim())return 'Record the reason for the change.';
  try{const r=commit(s=>{const lead=core.getLead(s,l.id);return core.changeStatus(s,lead,newStatus,reason,{scope,contact:core.preferredContact(lead,'call')||lead.contacts[0]})});if(!r)return 'Status change blocked by suppression rules.';message('Status saved.')}catch(e){return (e as Error).message}
 };
 const updateFX=(l:Lead,fx:any)=>{try{commit(s=>core.updateFX(s,core.getLead(s,l.id),fx));message('FX discovery saved.')}catch(e){message((e as Error).message)}};
 const openTab=(t:Tab)=>{setTab(t);setMenu(false)};
 const handleImport=(text:string)=>{try{const report=commit(s=>importLusha(s,text));message(`${report.created} companies added · ${report.merged} contact records updated · ${report.duplicates} duplicates.`)}catch(e){message((e as Error).message)}};
 const demo=()=>{try{commit(s=>{
   const make=(data:any)=>core.createLead(s,data);
   const a=make({company:'Northstar Talent Partners Ltd',sector:'International recruitment',contact:'Alex Morgan',title:'Finance Director',mobile:'07700900201',email:'alex@northstar.example',readiness:1,fit:5});
   const b=make({company:'Meridian Machinery UK Ltd',sector:'Industrial equipment',contact:'Jordan Taylor',title:'CFO',mobile:'07700900202',email:'jordan@meridian.example',readiness:1,fit:4});
   if(a&&!a.duplicate){core.setReadiness(s,a,4,'FD acknowledged currency volatility affected margins',{barrier:'Has not quantified impact',nextMilestone:'Establish impact and urgency'});core.advanceStage(s,a,'Discovery Complete','Cross-border fee receipts and FX requirements established');core.updateFX(s,a,{provider:'HSBC',products:['Spot','Forwards'],flows:[{id:core.uid(),pair:'GBP/EUR',direction:'buy',amount:250000,currency:'GBP',period:'monthly',confidence:'confirmed',addressablePct:70,marginBps:40}]})}
   if(b&&!b.duplicate){core.setReadiness(s,b,3,'CFO asked to see how the service works',{barrier:'FX pricing yet to be reviewed'})}
  });message('Fictional demo companies added.')}catch(e){message((e as Error).message)}};
 const openProspect=(id:string)=>{setFocusLead(id);openTab('prospects')};
 const currentTab=tab==='resolution'?'tasks':tab;
 return <div className={`shell ${tab==='focus'?'is-focus':''} ${!menu?'is-collapsed':''}`}>
  <aside className={`sidebar ${menu?'visible':''}`} aria-label="Main navigation"><div className="sidebar-heading"><div className="brand-mark">ϟ</div><div><strong>Sales<span>OS</span></strong><small>PROGRESSION FIRST</small></div><button className="icon-btn sidebar-close" aria-label="Close navigation" onClick={()=>setMenu(false)}><Icon name="x"/></button></div><nav>{NAV.map(([id,label,icon])=><button className={tab===id?'active':''} onClick={()=>openTab(id)} key={id}><Icon name={icon}/>{label}{id==='resolution'&&core.pending(state).filter((t:Task)=>t.type==='research').length>0&&<span className="nav-counter">{core.pending(state).filter((t:Task)=>t.type==='research').length}</span>}</button>)}</nav><div className="sidebar-footer"><strong>LOCAL PROTOTYPE</strong><span>Only fictional or approved data</span></div></aside>
  {menu&&<div className="sidebar-veil" onClick={()=>setMenu(false)} />}
  <main className="main-app">{tab==='focus'?<Focus state={state} onFX={setFxLead} copy={copy} onAction={doTask} onToggleMenu={()=>setMenu(v=>!v)} onTab={t=>openTab(t as Tab)}/>:
  <><div className="manage-toolbar"><button className="icon-btn" title="Show navigation" onClick={()=>setMenu(v=>!v)}><Icon name="menu"/></button><span className="brand-small">ϟ Sales<span>OS</span></span><small>MANAGEMENT</small><span className="toolbar-spacer"/><button className="btn secondary small" onClick={()=>openTab('focus')}><Icon name="bolt"/> Back to Focus</button></div>
   {currentTab==='prospects'&&<Prospects state={state} openLeadId={focusLead} editReadiness={setReadinessLead} onUpdateFX={updateFX} onStage={stage} onStatus={status} onAddLead={addLead} onAddContact={(l,data)=>{commit(s=>core.addContact(s,core.getLead(s,l.id),data));message('Contact saved.')}} onAddMethod={(l,id,kind,value)=>{try{commit(s=>core.addMethod(s,core.getLead(s,l.id),core.getContact(core.getLead(s,l.id),id),kind,value));message('Contact method saved.')}catch(e){message((e as Error).message)}}} onImport={()=>openTab('settings')}/>}
   {currentTab==='pipeline'&&<Pipeline state={state} onProspect={openProspect}/>}
   {currentTab==='tasks'&&<TaskQueue state={tab==='resolution'?{...state,tasks:state.tasks.filter(t=>t.type==='research')}:state} onTask={t=>doTask(t,t.type==='call'?'connected':'complete')}/>}
   {currentTab==='insights'&&<Insights state={state} onProspect={openProspect}/>}
   {currentTab==='value'&&<ValueDashboard state={state} onProspect={openProspect}/>}
   {currentTab==='settings'&&<Settings state={state} onRestore={updateState} onImport={handleImport} onDemo={demo} onTargets={targets=>{commit(s=>{s.settings={...s.settings,...targets}});message('Settings saved.')}} onSequence={sequence=>{commit(s=>{s.sequence=sequence});message('New sequence template saved.')}} notify={message}/>}
  </>}
  </main>
  {modal&&<TaskDialog key={modal.task.id+'-'+modal.preset} task={modal.task} lead={modal.task.leadId?core.getLead(state,modal.task.leadId):null} preset={modal.preset} onClose={()=>setModal(null)} onSubmit={submitTask}/>}
  {snooze&&<SnoozeDialog task={snooze} onClose={()=>setSnooze(null)} onSubmit={(date,time)=>{try{if(date)commit(s=>core.snoozeTask(s,core.getTask(s,snooze.id),date,time));else commit(s=>core.skipTask(s,core.getTask(s,snooze.id)));setSnooze(null);message('Task rescheduled.')}catch(e){message((e as Error).message)}}}/>}
  {fxLead&&<FXQuickDialog lead={core.getLead(state,fxLead.id)||fxLead} onClose={()=>setFxLead(null)} onSave={fx=>{updateFX(fxLead,fx);setFxLead(null)}}/>}
  {readinessLead&&<ConfirmReadiness lead={core.getLead(state,readinessLead.id)||readinessLead} onClose={()=>setReadinessLead(null)} onSubmit={submitReadiness}/>}
  {toast&&<div className="toast" role="status">{toast}</div>}
 </div>;
}
