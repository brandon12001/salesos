const assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const at='2026-11-23T10:00:00Z';
class FixedDate extends Date{constructor(...args){super(...(args.length?args:[at]))}static now(){return Date.parse(at)}}
let idx=0;const sandbox={module:{exports:{}},console,Date:FixedDate,crypto:{randomUUID:()=>`fiction-${++idx}`}};
vm.runInNewContext(fs.readFileSync('public/legacy/core.js','utf8'),sandbox);
const core=sandbox.module.exports;global.window={SalesCore:core};
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'salesos-kpi-first-'));
const compiled=cp.spawnSync(process.execPath,['node_modules/typescript/bin/tsc','--target','es2022','--module','commonjs','--strict','--skipLibCheck','--outDir',dir,'--rootDir','src','src/lib/kpiFirst.ts','src/lib/workQueues.ts'],{encoding:'utf8'});
if(compiled.status)throw Error(compiled.stdout||compiled.stderr);
const k=require(path.join(dir,'lib/kpiFirst.js')),q=require(path.join(dir,'lib/workQueues.js'));
const now=new Date(at),today='2026-11-23',clone=v=>JSON.parse(JSON.stringify(v));
function base(){
 const s=core.newState();s.settings.kpiFirstMode=1;s.settings.intelligenceMode=2;s.settings.coldCallMode=1;s.settings.reserveAutoActivate=0;return s;
}
function company(s,name='Fictional Active Ltd',extra={}){
 return core.createLead(s,{company:name,contact:'Fictional Decision Maker',title:'Finance Director',mobile:'07700900123',email:'fictional@example.invalid',crmClearance:'cleared',crmCheckedAt:today,opportunityScore:75,researchRationale:'Sourced overseas activity being qualified',researchDate:today,researchSources:'https://fictional.example',readiness:1,...extra});
}
function dial(s,i,date=today){s.activities.push({id:'call-'+date+'-'+i,taskId:'logged-task-'+date+'-'+i,leadId:s.leads[0]?.id||null,type:'Call',callOutcome:'no_answer',outcome:'No answer',at:date+'T09:00:00Z',xp:2,notes:''})}
try{
 const s=base(),l=company(s);assert.equal(k.outboundCallsToday(s,now),0);
 const c=l.contacts[0],email=c.methods.find(m=>m.kind==='email'),call=s.tasks.find(t=>t.type==='call');
 assert.ok(call);
 const routine=core.addTask(s,l,'email','Routine company introduction',today,{origin:'manual',contactId:c.id,methodId:email.id});
 const promise=core.addTask(s,l,'email','Agreed urgent introduction',today,{origin:'commitment',isCommitment:true,contactId:c.id,methodId:email.id});
 assert.equal(k.restrictedRoutineEmail(s,routine,now),true);
 assert.equal(k.restrictedRoutineEmail(s,promise,now),false,'explicit commitments are protected');
 assert.equal(q.legacyWorkTasks(s,now).some(t=>t.id===routine.id),false,'routine emails hidden until 100');
 assert.equal(q.legacyWorkTasks(s,now).some(t=>t.id===promise.id),true,'promised email remains visible');
 assert.equal(q.legacyWorkTasks(s,now).some(t=>t.id===call.id),true);
 for(let i=0;i<99;i++)dial(s,i);
 s.activities.push({id:'fake-preview',type:'Task',at:at,outcome:'Copied number',taskId:'preview'});
 s.activities.push({id:'inbound',type:'Call',at:at,outcome:'Incoming call'});
 assert.equal(k.outboundCallsToday(s,now),99,'views and inbound entries do not count');
 assert.equal(k.callKpi(s,now).remainingMinutes,1);
 assert.equal(k.restrictedRoutineEmail(s,routine,now),true);
 dial(s,99);
 assert.equal(k.callKpi(s,now).calls,100);
 assert.equal(k.callKpi(s,now).active,false);
 assert.equal(k.restrictedRoutineEmail(s,routine,now),false);
 assert.equal(q.legacyWorkTasks(s,now).some(t=>t.id===routine.id),true,'full queue resumes after 100 minutes');
 assert.equal(k.callKpi(s,new Date('2026-11-24T10:00:00Z')).remainingMinutes,100,'counter resets on next local day');
 const classic=clone(s);classic.settings.kpiFirstMode=0;classic.settings.coldCallMode=0;assert.equal(k.callKpi(classic,now).enabled,false);assert.equal(q.legacyWorkTasks(classic,now).some(t=>t.id===routine.id),true);
 const minutesOnly=base(),minutesLead=company(minutesOnly,'Fictional Short Call Day Ltd');
 const minutesContact=minutesLead.contacts[0],minutesEmail=minutesContact.methods.find(m=>m.kind==='email');
 const earlyEmail=core.addTask(minutesOnly,minutesLead,'email','Routine follow-up',today,{origin:'manual',contactId:minutesContact.id,methodId:minutesEmail.id});
 for(let i=0;i<40;i++){dial(minutesOnly,i);minutesOnly.activities[minutesOnly.activities.length-1].durationMins=1.5}
 assert.equal(k.callKpi(minutesOnly,now).calls,40);
 assert.equal(k.callKpi(minutesOnly,now).minutes,100);
 assert.equal(k.callKpi(minutesOnly,now).active,false,'40 calls plus 60 recorded minutes achieve the KPI');
 assert.equal(k.restrictedRoutineEmail(minutesOnly,earlyEmail,now),false,'emails unlock at 100 minutes even below 100 calls');
 assert.equal(q.legacyWorkTasks(minutesOnly,now).some(t=>t.id===earlyEmail.id),true);
 assert.equal(k.reserveCallCandidates(minutesOnly,now).length,0);
 const near=base();company(near,'Fictional Nearly Done Ltd');for(let i=0;i<39;i++){dial(near,i);near.activities[near.activities.length-1].durationMins=1.5}
 assert.equal(k.callKpi(near,now).minutes,97.5);
 assert.equal(k.callKpi(near,now).dialsForMinutes,3,'round up minimum additional dials when no more talk time');
 assert.equal(k.callKpi(near,now).active,true);
 console.log('PASS: 100-minute gate, 40-call completion, dynamic dial estimates, daily reset, protected commitments and legacy mode');
 const reserve=base(),a=company(reserve,'Fictional First Active Ltd');
 const ready=company(reserve,'Fictional Reserve Callable Ltd',{leadPool:'reserve',opportunityScore:85});
 const held=company(reserve,'Fictional Salesforce Held Ltd',{leadPool:'reserve',crmClearance:'hold'});
 const stale=company(reserve,'Fictional Stale Clearance Ltd',{leadPool:'reserve',crmCheckedAt:'2026-09-10'});
 const unscored=company(reserve,'Fictional Unscored Ltd',{leadPool:'reserve',opportunityScore:null});
 const emailOnly=company(reserve,'Fictional Email Only Ltd',{leadPool:'reserve'});
 emailOnly.contacts[0].methods=emailOnly.contacts[0].methods.filter(m=>m.kind==='email');
 const optedOut=company(reserve,'Fictional Contact Opted Out Ltd',{leadPool:'reserve'});
 optedOut.contacts[0].optedOut=true;
 const candidates=k.reserveCallCandidates(reserve,now);
 assert.equal(JSON.stringify(candidates.map(l=>l.company)),JSON.stringify(['Fictional Reserve Callable Ltd']));
 const before=clone(reserve),out=k.replenishCallSupply(reserve,now,true);
 assert.equal(out.activated,1);
 assert.equal(ready.leadPool,'active');
 assert.equal(held.leadPool,'reserve');assert.equal(stale.leadPool,'reserve');assert.equal(unscored.leadPool,'reserve');assert.equal(emailOnly.leadPool,'reserve');assert.equal(optedOut.leadPool,'reserve');
 assert.equal(k.reserveCallCandidates(reserve,now).length,0);
 assert.equal(k.replenishCallSupply(reserve,now,true).activated,0,'same reserve lead cannot be activated twice');
 assert.ok(k.callableDueTasks(reserve,now).some(t=>t.leadId===ready.id),'activation creates a callable task');
 assert.equal(k.outboundCallsToday(reserve,now),0,'reserve activation is not a dial');
 assert.equal(reserve.activities.filter(a=>a.type==='Call').length,0);
 assert.equal(held.crmClearance,before.leads.find(l=>l.id===held.id).crmClearance);
 assert.equal(reserve.settings.reserveAutoActivate,0,'no unrelated auto-replenishment setting change');
 const capped=base();capped.settings.reserveActiveCap=1;company(capped,'Fictional Cap Active Ltd');const capReserve=company(capped,'Fictional Cap Reserve Ltd',{leadPool:'reserve',opportunityScore:90});assert.equal(k.replenishCallSupply(capped,now,true).activated,0,'existing active-prospect cap cannot be bypassed');assert.equal(capReserve.leadPool,'reserve');
 console.log('PASS: bounded reserve refill; holds, stale clearance, unscored, email-only and opt-outs remain excluded; no invented dials');
 const full=base();company(full,'Fictional Complete Ltd');const high=company(full,'Fictional Waiting Reserve Ltd',{leadPool:'reserve',opportunityScore:90});for(let i=0;i<100;i++)dial(full,i);assert.equal(k.replenishCallSupply(full,now,true).activated,0,'no KPI supply activation after target');assert.equal(high.leadPool,'reserve');
 console.log('PASS: completion stops KPI replenishment and preserves acquisition states');
}catch(error){console.error(error);process.exitCode=1}
