const assert=require('node:assert/strict');
const cp=require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'salesos-import-'));
const tsc=path.join(root,'node_modules','typescript','bin','tsc');
if(!fs.existsSync(tsc)){console.log('Install dependencies with npm install first.');process.exit(1)}
const args=[tsc,'--target','es2022','--module','commonjs','--skipLibCheck','--outDir',tmp,'--rootDir',path.join(root,'src'),path.join(root,'src/lib/importer.ts'),path.join(root,'src/lib/core.ts'),path.join(root,'src/types.ts')];
try{
  const out=cp.spawnSync(process.execPath,args,{encoding:'utf8'});
  if(out.status!==0)throw new Error(out.stderr||out.stdout||'TypeScript import compilation failed.');
  const core=require(path.join(__dirname,'core.cjs'));
  global.window={SalesCore:core};
  const {importLusha}=require(path.join(tmp,'lib','importer.js'));
  // Match the user's enriched export headers using only fictional contacts.
  // The explicit Mobile Phone column supplies telephone compatibility; source
  // ownership labels and hypotheses never establish CRM clearance or FX facts.
  const fullHeaders=fs.readFileSync(path.join(__dirname,'fixtures','scored_full_headers.csv'),'utf8');
  const headerState=core.newState();
  const headerReport=importLusha(headerState,fullHeaders);
  assert.equal(headerReport.created,2);assert.equal(headerReport.scored,2);
  assert.equal(headerState.tasks.length,0);
  assert.ok(headerState.leads.every(l=>l.leadPool==='reserve'&&l.crmClearance==='unknown'&&l.readiness===1&&l.stage==='Prospecting'));
  const headerLead=headerState.leads[0];
  assert.equal(headerLead.contacts[0].methods.find(m=>m.kind==='mobile').value,'+447700900101');
  assert.equal(headerLead.callObjective,'Confirm who manages FX');
  assert.equal(headerLead.researchHypothesis,'Overseas placements may involve FX');
  assert.equal(headerLead.fx.flows.length,0);
  core.setReadiness(headerState,headerLead,4,'Fictional buyer acknowledged currency costs');
  core.advanceStage(headerState,headerLead,'Discovery Complete','Fictional completed discovery');
  core.reviewReserveCRM(headerState,headerLead.id,'hold','Synthetic ownership hold',{lastActivityAt:core.addDays(core.today(),-1)});
  core.changeStatus(headerState,headerLead,'Take Me Off the List','Synthetic opt-out',{scope:'company',contact:headerLead.contacts[0]});
  const preserved=JSON.stringify({tasks:headerState.tasks,activities:headerState.activities,suppression:headerState.suppression});
  importLusha(headerState,fullHeaders);
  assert.equal(headerState.leads.length,2);assert.equal(headerLead.contacts.length,1);
  assert.equal(headerLead.readiness,4);assert.equal(headerLead.stage,'Discovery Complete');
  assert.equal(headerLead.status,'Take Me Off the List');assert.equal(headerLead.crmClearance,'hold');
  assert.equal(JSON.stringify({tasks:headerState.tasks,activities:headerState.activities,suppression:headerState.suppression}),preserved);
  const state=core.newState();
  const csv='Company Name,First Name,Last Name,Job Title,Mobile Phone,Work Email\n"Example, Ltd",John,Smith,CFO,07700900123,john@example.example\n"Example, Ltd",Jane,Smith,FD,07700900124,jane@example.example\n';
  const first=importLusha(state,csv);
  assert.equal(first.created,1);assert.equal(first.merged,1);assert.equal(state.leads[0].readiness,1);assert.equal(state.leads[0].contacts.length,2);
  core.setReadiness(state,state.leads[0],4,'Buyer recognised a problem');
  importLusha(state,csv);assert.equal(state.leads[0].readiness,4);assert.equal(state.leads[0].contacts.length,2);
  core.changeStatus(state,state.leads[0],'Take Me Off the List','Explicit opt-out',{scope:'company',contact:state.leads[0].contacts[0]});
  importLusha(state,'Company Name,First Name,Last Name,Mobile Phone\n"Example, Ltd",Another,Person,07700900222\n');
  assert.equal(core.pending(state).filter(t=>t.leadId===state.leads[0].id).length,0);
  // A renamed person with a changed email but the same LinkedIn identity
  // must remain one contact; tracking query and trailing slash are irrelevant.
  const profileState=core.newState();
  const original='Company Name,Full Name,Work Email,LinkedIn URL,Mobile Phone\nProfile Example Ltd,Alex Morgan,alex.old@example.invalid,https://www.linkedin.com/in/alex-morgan-unique/,07700900231\n';
  importLusha(profileState,original);
  const tracked='Company Name,Full Name,Work Email,LinkedIn URL,Mobile Phone\nProfile Example Ltd,Alexandra Morgan,alex.new@example.invalid,https://linkedin.com/in/alex-morgan-unique?trk=lusha,07700900231\n';
  const trackedResult=importLusha(profileState,tracked);
  assert.equal(trackedResult.created,0);
  assert.equal(profileState.leads[0].contacts.length,1,'same LinkedIn profile should not duplicate contact');
  assert.equal(profileState.leads[0].contacts[0].methods.filter(m=>m.kind==='linkedin').length,1,'tracking params must not create duplicate LinkedIn methods');
  assert.equal(profileState.leads[0].contacts[0].methods.filter(m=>m.kind==='email').length,2,'retain historical contact email');
  const trackedAgain=importLusha(profileState,tracked);
  assert.equal(trackedAgain.duplicates,1);
  assert.equal(profileState.leads[0].contacts.length,1);
  const anotherProfile='Company Name,Full Name,LinkedIn URL\nProfile Example Ltd,Jamie Morgan,https://linkedin.com/in/jamie-morgan-unique\n';
  importLusha(profileState,anotherProfile);
  assert.equal(profileState.leads[0].contacts.length,2,'distinct LinkedIn identity stays separate');
  // Researched CSV: preserve the score as a company attribute, with proof/date,
  // keep new companies inactive, and preserve leading zeros in company numbers.
  const date=core.today(),prior=core.addDays(date,-1);
  const header='Company Name,Company Number,Full Name,Mobile Phone,Opportunity Score,Research Date,Research Rationale,Research Sources,Research Confidence,CRM Clearance,CRM Checked Date,CRM Note';
  const scored=header+'\n'+
    ['Researched Talent Ltd','00001234','Alex Example','07700900111','91',prior,'Cross-border contracting evidenced','https://research.example','Medium','Cleared',date,'Checked CRM owner and activity'].join(',')+'\n'+
    ['Researched Talent Ltd','00001234','Jules Example','07700900112','91',prior,'Cross-border contracting evidenced','https://research.example','Medium','Cleared',date,'Checked CRM owner and activity'].join(',')+'\n'+
    ['Unresearched Machinery Ltd','00005678','Morgan Example','07700900113','','','','','','Unknown','',''].join(',')+'\n';
  const researchedState=core.newState();
  const scoredReport=importLusha(researchedState,scored);
  assert.equal(scoredReport.created,2);
  assert.equal(scoredReport.scored,1);
  assert.equal(scoredReport.unscored,1);
  assert.equal(scoredReport.crmCleared,1);
  assert.equal(core.pending(researchedState).length,0);
  const talent=researchedState.leads.find(l=>l.company==='Researched Talent Ltd');
  assert.equal(talent.companyNumber,'00001234');
  assert.equal(talent.contacts.length,2);
  assert.equal(talent.opportunityScore,91);
  assert.equal(talent.researchDate,prior);
  assert.equal(talent.leadPool,'reserve');
  assert.equal(talent.crmClearance,'cleared');
  const briefState=core.newState();
  const brief=importLusha(briefState,['Company Name,Full Name,Mobile Phone,Call Objective,Research Hypothesis','Fictional Signal Ltd,Alex,07700900100,Confirm provider and annual FX flows,International activity could create cross-border payments',''].join(String.fromCharCode(10)));
  assert.equal(brief.created,1);
  assert.equal(briefState.leads[0].callObjective,'Confirm provider and annual FX flows');
  assert.equal(briefState.leads[0].researchHypothesis,'International activity could create cross-border payments');
  assert.equal(core.reserveEligibility(researchedState,talent),'');
  const machinery=researchedState.leads.find(l=>l.company==='Unresearched Machinery Ltd');
  assert.equal(machinery.opportunityScore,null);
  assert.match(core.reserveEligibility(researchedState,machinery),/score/i);
  core.setReadiness(researchedState,talent,4,'Buyer mentioned actual currency costs');
  talent.notes='Original discovery notes';
  const researchUpdate=header+'\n'+['Renamed Talent Holdings Ltd','00001234','Alex Example','07700900111','97',date,'More direct FX evidence discovered','https://new-research.example','High','Unknown','',''].join(',')+'\n';
  const refreshed=importLusha(researchedState,researchUpdate);
  assert.equal(refreshed.created,0,'same company number must identify the existing legal entity');
  assert.equal(researchedState.leads.length,2);
  assert.equal(talent.company,'Researched Talent Ltd','do not overwrite original company name from alias');
  assert.equal(talent.opportunityScore,97);
  assert.equal(talent.researchDate,date);
  assert.equal(talent.readiness,4);
  assert.equal(talent.notes,'Original discovery notes');
  assert.equal(talent.crmClearance,'cleared','omitted clearance must not downgrade verified status');
  importLusha(researchedState,scored);
  assert.equal(talent.opportunityScore,97,'older research must not overwrite newer research');
  assert.throws(()=>importLusha(structuredClone(researchedState),
    header+'\n'+['Researched Talent Ltd','99999999','New Person','07700900114','85',date,'Foreign operations','https://research.example','High','Unknown','',''].join(',')+'\n'),/conflicting company registration/i);
  assert.throws(()=>importLusha(structuredClone(researchedState),
    header+'\n'+['Another Co Ltd','00004444','New Person','07700900115','110',date,'Overseas customers','https://research.example','High','Unknown','',''].join(',')+'\n'),/between 0 and 100/);
  assert.throws(()=>importLusha(structuredClone(researchedState),
    header+'\n'+['Another Co Ltd','00004444','New Person','07700900115','65',date,'','https://research.example','High','Unknown','',''].join(',')+'\n'),/Research Rationale/);
  assert.throws(()=>importLusha(structuredClone(researchedState),
    header+'\n'+['Another Co Ltd','00004444','New Person','07700900115','65','2030-01-01','Overseas customers','https://research.example','High','Unknown','',''].join(',')+'\n'),/Research Date/);
  assert.throws(()=>importLusha(structuredClone(researchedState),
    header+'\n'+['Another Co Ltd','00004444','New Person','07700900115','65',date,'Overseas customers','https://research.example','High','Cleared','',''].join(',')+'\n'),/CRM Checked Date/);
  assert.throws(()=>importLusha(structuredClone(researchedState),
    header+'\n'+['Another Co Ltd','00004444','New Person','07700900115','65',date,'Overseas customers','https://research.example','High','Unknown','',''].join(',')+'\n'+
    ['Another Co Ltd','00004444','Another Person','07700900116','95',date,'Different inconsistent score','https://research.example','High','Unknown','',''].join(',')+'\n'),/conflicting research scores/i);

  const heldCSV=[header+',CRM Last Activity Date',
    ['CSV Banked Recruitment Ltd','00110099','Alex Example','07700900888','88',date,'International offices','https://research.example','Medium','Hold',date,'Owned by another rep',prior].join(','),''].join(String.fromCharCode(10));
  const holdState=core.newState();
  const bankResult=importLusha(holdState,heldCSV);
  assert.equal(bankResult.crmHeld,1);
  const banked=holdState.leads[0];
  assert.equal(banked.crmClearance,'hold');
  assert.equal(banked.crmLastActivityAt,prior);
  assert.equal(core.dupeQueue(holdState).length,1);
  const fakeRelease=[header+',CRM Last Activity Date',
    ['CSV Banked Recruitment Ltd','00110099','Alex Example','07700900888','88',date,'International offices','https://research.example','Medium','Cleared',date,'CSV says available',''].join(','),''].join(String.fromCharCode(10));
  importLusha(holdState,fakeRelease);
  assert.equal(banked.crmClearance,'hold','importing a cleared CSV can never bypass the reclaim workflow');
  assert.throws(()=>importLusha(structuredClone(holdState),
    [header+',CRM Last Activity Date',['Invalid Activity Date Ltd','00110100','Alex','07700900100','78',date,'Intl','https://research.example','Medium','Hold',date,'Assigned','2027-01-01'].join(','),''].join(String.fromCharCode(10))),/CRM Last Activity Date/);
  const later=core.today();
  const updatedActivity=later; // must be newer than prior activity to advance the CRM clock
  importLusha(holdState,[header+',CRM Last Activity Date',
    ['CSV Banked Recruitment Ltd','00110099','Alex Example','07700900888','88',date,'International offices','https://research.example','Medium','Hold',later,'Newer activity recorded',updatedActivity].join(','),''].join(String.fromCharCode(10)));
  assert.equal(banked.crmLastActivityAt,updatedActivity);
  assert.equal(banked.crmClearance,'hold');
  assert.deepEqual(Array.from(core.checkInvariants(researchedState)),[]);
  assert.equal(core.checkInvariants(profileState).length,0);
  assert.equal(core.checkInvariants(state).length,0);
  console.log('IMPORT PASS: Lusha CSV, company/contact merges, initial Unaware, preserved readiness and opt-outs');
}finally{fs.rmSync(tmp,{recursive:true,force:true})}
