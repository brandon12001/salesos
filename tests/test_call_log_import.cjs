const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const at='2026-11-23T14:00:00Z';
class FixedDate extends Date{constructor(...args){super(...(args.length?args:[at]))}static now(){return Date.parse(at)}}
let id=0;const box={module:{exports:{}},console,Date:FixedDate,crypto:{randomUUID:()=>`fiction-${++id}`}};
vm.runInNewContext(fs.readFileSync('public/legacy/core.js','utf8'),box);
const core=box.module.exports;global.window={SalesCore:core};
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'salesos-phonehistory-'));
const run=cp.spawnSync(process.execPath,['node_modules/typescript/bin/tsc','--target','es2022','--module','commonjs','--strict','--skipLibCheck','--outDir',dir,'--rootDir','src','src/lib/callLogImport.ts','src/lib/kpiFirst.ts','src/lib/workQueues.ts'],{encoding:'utf8'});
if(run.status)throw Error(run.stdout||run.stderr);
const imp=require(path.join(dir,'lib/callLogImport.js')),k=require(path.join(dir,'lib/kpiFirst.js'));
const now=new Date(at),date='2026-11-23',clone=x=>JSON.parse(JSON.stringify(x));
const s=core.newState();s.settings.kpiFirstMode=1;s.settings.intelligenceMode=2;s.settings.reserveAutoActivate=0;
const a=core.createLead(s,{company:'Fictional EU Staffing Ltd',contact:'Fictional Director One',mobile:'07700900123',crmClearance:'cleared',crmCheckedAt:date});
const b=core.createLead(s,{company:'Fictional Machinery Ltd',contact:'Fictional Director Two',mobile:'07700900124',crmClearance:'cleared',crmCheckedAt:date});
const t=s.tasks.find(t=>t.leadId===a.id);
const act={id:'logged-call-1',leadId:a.id,taskId:t.id,contactId:a.contacts[0].id,type:'Call',outcome:'No answer',callOutcome:'no_answer',at:'2026-11-23T13:34:00Z',durationMins:0,notes:'Already logged in Focus Mode',xp:2};
s.activities.push(act);
const input=`History
All
+44 7700 900123
Outgoing
13:31
2m 40s
+44 7700 900124
Outgoing
13:29
21s
+44 7700 900125
Outgoing
13:28
+44 7700 900126
Missed incoming
13:16
20s
`;
try{
 const parsed=imp.parsePhoneHistory(input,date);assert.equal(parsed.rows.length,3);assert.equal(parsed.incoming,1);assert.equal(parsed.rows[0].durationSeconds,160);assert.equal(parsed.rows[1].durationSeconds,21);assert.equal(parsed.rows[2].durationSeconds,0);assert.equal(parsed.rows[2].hasDuration,false);
 assert.equal(imp.canonicalPhone('07700 900123'),imp.canonicalPhone('+44 7700 900123'));
 assert.equal(imp.matchingOptions(s,parsed.rows[0]).contacts[0].company,a.company);
 const matches=imp.defaultSelections(s,parsed.rows);assert.equal(matches[parsed.rows[0].key],act.id);assert.equal(matches[parsed.rows[1].key],'review');
 assert.throws(()=>imp.importPhoneLog(s,parsed.rows,matches,now),/Review unresolved/);
 // No double write during a failed import: match plans are validated separately below.
 // Use selected first call, only the second outgoing as confirmed KPI-only, third excluded.
 const clean=core.newState();clean.settings.kpiFirstMode=1;clean.settings.intelligenceMode=2;clean.settings.reserveAutoActivate=0;
 const lead=core.createLead(clean,{company:'Fictional EU Staffing Ltd',contact:'Fictional Director One',mobile:'07700900123',crmClearance:'cleared',crmCheckedAt:date});
 const second=core.createLead(clean,{company:'Fictional Machinery Ltd',contact:'Fictional Director Two',mobile:'07700900124',crmClearance:'cleared',crmCheckedAt:date});
 const task=clean.tasks.find(t=>t.leadId===lead.id);
 clean.activities.push({...act,leadId:lead.id,contactId:lead.contacts[0].id,taskId:task.id});
 const choices={[parsed.rows[0].key]:act.id,[parsed.rows[1].key]:'unlogged',[parsed.rows[2].key]:'skip'};
 const before=clone(clean),r=imp.importPhoneLog(clean,parsed.rows,choices,now);
 assert.deepEqual({...r},{linked:1,unlogged:1,skipped:1,added:2});
 assert.equal(clean.activities.length,before.activities.length,'matched updates do not create new sales activities');
 const importedActivity=clean.activities.find(a=>a.id===act.id);
 assert.equal(importedActivity.durationMins,160/60);assert.equal(importedActivity.phoneCallLocalTime,'2026-11-23 13:31');
 assert.equal(importedActivity.outcome,'No answer');assert.equal(importedActivity.notes,'Already logged in Focus Mode');
 assert.equal(importedActivity.editHistory.length,1,'time edit is audited');
 assert.equal(clean.leads[0].readiness,before.leads[0].readiness);assert.equal(clean.leads[0].stage,before.leads[0].stage);
 assert.equal(JSON.stringify(clean.tasks),JSON.stringify(before.tasks));assert.equal(JSON.stringify(clean.leads),JSON.stringify(before.leads));
 const minutes=imp.minuteKpi(clean,now);
 assert.equal(minutes.calls,2,'matched call counted once, new unlogged counted once');
 assert.equal(minutes.recordedSeconds,181);
 assert.equal(minutes.totalSeconds,301);
 assert.equal(minutes.dialsForMinutes,95);
  assert.equal(k.callKpi(clean,now).calls,2);
 assert.equal(imp.importPhoneLog(clean,parsed.rows,choices,now).added,0,'repeat paste is idempotent');
 assert.equal(imp.minuteKpi(clean,now).calls,2,'same paste never adds extra dials');
 const round=core.normalize(clone(clean));assert.equal(imp.minuteKpi(round,now).totalSeconds,301,'JSON/cloud normalize preserves imports');
 assert.equal(imp.minuteKpi(clean,new Date('2026-11-24T10:00:00Z')).calls,0,'next day resets both KPIs');
 console.log('PASS: phone format, incoming exclusion, exact matching, decimal minutes, no duplicate call, audit, cloud persistence and daily reset');
 const noDuration=core.newState();noDuration.settings.kpiFirstMode=1;const special=core.createLead(noDuration,{company:'Fictional Duration Ltd',contact:'Fictional Owner',mobile:'07700900125'});
 const st=noDuration.tasks.find(t=>t.leadId===special.id);
 noDuration.activities.push({id:'existing',taskId:st.id,leadId:special.id,contactId:special.contacts[0].id,type:'Call',outcome:'No answer',callOutcome:'no_answer',at:'2026-11-23T13:30:00Z',notes:'',durationMins:1.5,xp:2});
 const row=parsed.rows[2];assert.equal(imp.importPhoneLog(noDuration,[row],{[row.key]:'existing'},now).linked,1);
 assert.equal(noDuration.activities.find(a=>a.id==='existing').durationMins,1.5,'missing phone duration never wipes known manual time');
 assert.equal(imp.minuteKpi(noDuration,now).recordedSeconds,90);
 const fake=core.newState();fake.settings.kpiFirstMode=1;
 for(let i=0;i<40;i++)fake.activities.push({id:'manual-'+i,taskId:'t'+i,type:'Call',callOutcome:'no_answer',outcome:'No answer',at:'2026-11-23T09:00:00Z',durationMins:1.5});
 const f=imp.minuteKpi(fake,now);assert.equal(f.calls,40);assert.equal(f.totalMinutes,100);assert.equal(f.dialsForMinutes,0);assert.equal(k.callKpi(fake,now).complete,true,'100 minutes unlocks regardless of call count');
 console.log('PASS: no-duration preservation and single 100-minute target independent of call count');
}catch(err){console.error(err);process.exitCode=1}
