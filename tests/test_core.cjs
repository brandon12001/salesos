const C=require('./core.cjs');const assert=require('assert');
const state=C.newState();
function one(x){if(x?.duplicate)throw Error('duplicate unexpected');return x}
const A=one(C.createLead(state,{company:'FICTIONAL Alpha Recruitment Ltd',contact:'Test CFO',title:'CFO',mobile:'07700900123',email:'cfo@alpha.example',fit:5}));
assert.equal(A.stage,'Prospecting');assert.equal(A.readiness,null);assert.equal(C.pending(state).filter(t=>t.leadId===A.id).length,1);
let t=C.pending(state).find(t=>t.leadId===A.id);assert.equal(t.type,'call');
assert(C.logCall(state,t,{outcome:'no_answer'}).ok);let email=C.pending(state).find(t=>t.leadId===A.id);assert(email);assert.equal(email.type,'email');assert.equal(email.dueAt,C.businessAdd(C.today(),1));assert.equal(A.readiness,null);
C.completeTask(state,email);const lc=C.pending(state).find(t=>t.leadId===A.id);assert(lc);assert.equal(lc.type,'call','LinkedIn connection skipped when no profile is available');
const B=one(C.createLead(state,{company:'FICTIONAL Beta FX LLC',contact:'Test FD',mobile:'07700900201',email:'fd@beta.example',fit:4}));
let bCall=C.pending(state).find(x=>x.leadId===B.id);assert.equal(bCall.type,'call');C.logCall(state,bCall,{outcome:'callback',callbackDate:C.businessAdd(C.today(),2),callbackTime:'10:15',notes:'Requested Tuesday callback'});
let promise=C.pending(state).find(x=>x.leadId===B.id&&x.isCommitment);assert(promise);assert.equal(promise.dueTime,'10:15');
C.advanceStage(state,B,'Discovery Complete','Explicit buyer discussion');assert.equal(B.stage,'Discovery Complete');assert(C.getTask(state,promise.id).status==='pending','stage change preserves promised callback');
assert.equal(B.readiness,null);assert(C.setReadiness(state,B,4,'Buyer confirmed hedging gap',{barrier:'Impact still unquantified'}).changed);
assert.equal(B.stage,'Discovery Complete','Buyer readiness independent from pipeline');assert.equal(B.readiness,4);
assert(C.setReadiness(state,B,3,'Lost urgency; project deferred').changed);assert.equal(B.readiness,3,'regression supported');
assert.equal(C.setReadiness(state,B,6,'').changed,false,'No readiness advancement without evidence');
const rewarded=C.advanceStage(state,B,'Meeting Booked','Meeting booked');assert.equal(rewarded.xp,100);C.advanceStage(state,B,'Discovery Complete','Reopened discovery');assert.equal(C.advanceStage(state,B,'Meeting Booked','Booked again').xp,0,'duplicate milestone XP denied');
const D=one(C.createLead(state,{company:'FICTIONAL Data Ltd',contact:'Wrong contact',mobile:'07700900301',email:'wrong@data.example'}));
let dcall=C.pending(state).find(x=>x.leadId===D.id);C.logCall(state,dcall,{outcome:'wrong_person',referredName:'Right CFO'});assert.equal(D.contacts[0].roleStatus,'not_responsible');assert(C.pending(state).some(t=>t.leadId===D.id&&t.type==='research'));
let repair=C.pending(state).find(x=>x.leadId===D.id&&x.type==='research');assert(C.resolveContact(state,repair,{mode:'new_contact',name:'New CFO',title:'CFO',value:'07700900309'}).ok);assert.equal(D.contacts.length,2);assert(C.pending(state).some(t=>t.leadId===D.id&&t.type==='call'));
const E=one(C.createLead(state,{company:'FICTIONAL Bad Number Ltd',contact:'Test Person',mobile:'07700900401'}));let ecall=C.pending(state).find(t=>t.leadId===E.id);C.logCall(state,ecall,{outcome:'bad_number'});assert.equal(C.anyPhone(E.contacts[0]),null);assert(C.pending(state).some(t=>t.leadId===E.id&&t.type==='research'));assert(!C.pending(state).some(t=>t.leadId===E.id&&t.type==='call'));
const F=one(C.createLead(state,{company:'FICTIONAL Optout Ltd',contact:'Test Contact',mobile:'07700900501'}));C.changeStatus(state,F,'Take Me Off the List','Stop calling',{scope:'company',contact:F.contacts[0]});assert.equal(F.status,'Take Me Off the List');assert(!C.pending(state).some(t=>t.leadId===F.id));let f2=C.createLead(state,{company:'FICTIONAL Optout Ltd',contact:'Different Person',mobile:'07700900502'},{allowDuplicate:true});assert.equal(f2.status,'Take Me Off the List');assert.equal(C.pending(state).filter(t=>t.leadId===f2.id).length,0);
const G=one(C.createLead(state,{company:'FICTIONAL Opportunity Ltd',contact:'CFO',mobile:'07700900601',stage:'Successful Meeting',fit:5}));
C.updateFX(state,G,{provider:'Bank',products:['Spot','Forwards'],flows:[{id:C.uid(),pair:'GBP/EUR',currency:'GBP',amount:2000000,period:'annual',confidence:'confirmed',addressablePct:50,marginBps:40},{id:C.uid(),pair:'EUR/USD',currency:'EUR',amount:3000000,period:'annual',confidence:'estimate',addressablePct:'',marginBps:''}]});const pv=C.pipelineValue(state);assert(pv.revenue>=4000);assert(pv.qualified>=1000000);assert(pv.unconverted>=1);assert.equal(C.potentialForLead(G,state.settings).revenue,4000);
const exportJSON=JSON.stringify(state);assert.equal(C.normalize(JSON.parse(exportJSON)).leads.length,state.leads.length);
const v2={version:2,leads:[{id:'old1',company:'OLD Test Company',contact:'Jane Test',title:'FD',mobile:'07700900888',stage:'Prospecting',status:'Active'}],tasks:[{id:'oldTask',leadId:'old1',type:'call',title:'Call Jane',dueAt:C.today(),status:'pending',origin:'sequence',stepIndex:0}],activities:[],sequence:[{type:'call',label:'Call',delay:0}],suppression:[]};let migrated=C.normalize(v2);assert.equal(migrated.version,3);assert.equal(migrated.leads[0].readiness,null);assert.equal(migrated.tasks[0].id,'oldTask');assert.equal(migrated.tasks[0].contactId,migrated.leads[0].contacts[0].id);assert.equal(C.checkInvariants(state).length,0);
console.log('CORE PASS: sequences, protected commitments, readiness evidence/regression, XP dedupe, resolution, optouts, FX, migration.');

// Callback eligibility must respect the promised contact and its usable methods.
const isolated=C.newState();
const lead=C.createLead(isolated,{company:'FICTIONAL Callback Safety',contact:'Original CFO',mobile:'07700900701'});
const call=C.pending(isolated).find(t=>t.leadId===lead.id);
C.logCall(isolated,call,{outcome:'callback',callbackDate:C.today(),callbackTime:''});
const callback=C.pending(isolated).find(t=>t.type==='callback');
C.addContact(isolated,lead,{name:'Other contact',mobile:'07700900702'});
lead.contacts[0].methods[0].status='blocked';
assert(!C.pending(isolated).some(t=>t.id===callback.id),'Do not substitute another person for an uncallable promised contact');
lead.contacts[0].methods[0].status='unverified';
assert(C.pending(isolated).some(t=>t.id===callback.id));
lead.contacts[0].active=false;
assert(!C.pending(isolated).some(t=>t.id===callback.id),'Inactive contacts cannot receive callbacks');
console.log('CALLBACK PASS: blocked methods and inactive promised contacts excluded');

const committed=C.newState();
const promised=C.createLead(committed,{company:'FICTIONAL Meeting Commitment',contact:'CFO',mobile:'07700900801'});
C.advanceStage(committed,promised,'Meeting Booked','Agreed meeting',C.businessAdd(C.today(),2),'10:30');
const meeting=C.pending(committed).find(t=>t.isCommitment);
assert(meeting);
C.advanceStage(committed,promised,'Successful Meeting','Commercial next step agreed');
assert.equal(meeting.status,'pending','Stage-origin commitments survive stage changes');
console.log('COMMITMENT PASS: stage-origin promises preserved');

// Deferring work must never inflate completion totals or observed task pace.
const deferred=C.newState();
const deferredLead=C.createLead(deferred,{company:'FICTIONAL Deferred Work',contact:'Test CFO',mobile:'07700900901',email:'cfo@deferred.example'});
const deferredCall=C.pending(deferred).find(t=>t.leadId===deferredLead.id);
for(let i=0;i<20;i++){
  C.skipTask(deferred,deferredCall);
  C.snoozeTask(deferred,deferredCall,C.businessAdd(C.today(),2),'10:00');
}
assert.equal(deferredCall.status,'pending');
assert.equal(C.activityToday(deferred).tasks,0,'Skip/snooze are not task completions');
assert.equal(C.activityToday(deferred).calls,0);
assert.equal(C.xpStats(deferred).total,0);
assert.equal(C.leadSupply(deferred).pace,deferred.settings.dailyCapacity,'Deferrals must not become observed completion pace');
C.logCall(deferred,deferredCall,{outcome:'no_answer'});
assert.equal(C.activityToday(deferred).tasks,1,'An actual call counts once despite prior deferrals');
assert.equal(C.activityToday(deferred).calls,1);
assert.equal(C.leadSupply(deferred).pace,1);
const restoredDeferred=C.normalize(JSON.parse(JSON.stringify(deferred)));
assert.equal(C.activityToday(restoredDeferred).tasks,1,'Existing backups with deferral history use corrected counts');
assert.equal(C.leadSupply(restoredDeferred).pace,1);
console.log('METRICS PASS: skip/snooze excluded from completions and task pace, including restored history');

// Hard schedules outrank commercial scores, including while call block is on.
const scheduled=C.newState();
const earlierLead=C.createLead(scheduled,{company:'Fictional Earlier Promise',contact:'Early',mobile:'07700900011',fit:1});
const laterLead=C.createLead(scheduled,{company:'Fictional Later Promise',contact:'Late',mobile:'07700900012',fit:5,readiness:8});
const earlierPromise=C.scheduleCallback(scheduled,earlierLead,C.addDays(C.today(),-2),'09:00','Earlier promise');
const laterPromise=C.scheduleCallback(scheduled,laterLead,C.addDays(C.today(),-1),'09:00','Later promise');
assert.equal(C.nextTask(scheduled).id,earlierPromise.id,'an overdue promise must outrank a higher scoring later callback');
earlierPromise.status='completed';laterPromise.status='completed';
const legacyMeeting=C.addTask(scheduled,earlierLead,'meeting','Legacy scheduled meeting',C.addDays(C.today(),-1),{dueTime:'09:00'});
assert.equal(C.nextTask(scheduled,{callBlock:true}).id,legacyMeeting.id,'call block must not hide a due meeting even in older backups');

// Nurture commitments still obey contact opt-outs, invalid phones and inactivity.
const nurtureSafety=C.newState();
const nurtureLead=C.createLead(nurtureSafety,{company:'Fictional Nurture Promise',contact:'Nurture CFO',mobile:'07700900013'});
const nurturePromise=C.scheduleCallback(nurtureSafety,nurtureLead,C.today(),'','Promised review');
C.changeStatus(nurtureSafety,nurtureLead,'Negative Nurture','Later timing');
assert.equal(C.isEligibleTask(nurtureSafety,nurturePromise),true);
nurtureLead.contacts[0].optedOut=true;
assert.equal(C.isEligibleTask(nurtureSafety,nurturePromise),false,'contact opt-out must suppress a nurture callback');
nurtureLead.contacts[0].optedOut=false;nurtureLead.contacts[0].active=false;
assert.equal(C.isEligibleTask(nurtureSafety,nurturePromise),false,'inactive nurture contact cannot be called');
nurtureLead.contacts[0].active=true;nurtureLead.contacts[0].methods[0].status='invalid';
assert.equal(C.isEligibleTask(nurtureSafety,nurturePromise),false,'nurture callback needs a usable number');
console.log('RELIABILITY PASS: hard schedules, call-block meetings and nurture-contact safety');

const repeatOutcome=C.newState();
const repeatedLead=C.createLead(repeatOutcome,{company:'Fictional Double Outcome',contact:'CFO',mobile:'07700900014',email:'test@fictional.example'});
const repeatedCall=C.nextTask(repeatOutcome);
assert.ok(C.logCall(repeatOutcome,repeatedCall,{outcome:'no_answer'}).ok);
const afterFirstOutcome=JSON.stringify(repeatOutcome);
assert.ok(C.logCall(repeatOutcome,repeatedCall,{outcome:'no_answer'}).error);
assert.equal(JSON.stringify(repeatOutcome),afterFirstOutcome,'replayed outcome must not duplicate activity, tasks or XP');

// Switching a conversation dialog to a non-conversation outcome must not apply
// hidden readiness fields left over from the earlier selection.
for(const outcome of ['no_answer','gatekeeper','wrong_person','bad_number','left_company']){
 const staleDialog=C.newState();const staleLead=C.createLead(staleDialog,{company:'Fictional Hidden Readiness '+outcome,contact:'CFO',mobile:'07700900015',readiness:1});
 C.logCall(staleDialog,C.nextTask(staleDialog),{outcome,readiness:5,evidence:'Stale hidden conversation evidence'});
 assert.equal(staleLead.readiness,1,outcome+' is not buyer progression');assert.equal(staleDialog.readinessHistory.length,0);
}
