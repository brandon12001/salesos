const assert=require('node:assert/strict'),fixture=require('../hmrc_fixture.cjs');
module.exports=async({a,saved,state,restore,nav,core})=>{
 const s=core.newState(),now=new Date().toISOString();
 core.createLead(s,{company:'Fictional Protected Calling Ltd',contact:'Fictional CFO',mobile:'07700900111',crmClearance:'cleared',crmCheckedAt:core.today(),readiness:1});
 s.meta.leadFactory={version:1,candidates:[],cursors:{goods:6,recruitment:3},lastRunAt:''};
 const item=i=>({company:'Fictional HMRC Equipment '+i+' Limited',companyNumber:String(18000000+i),sector:'goods',sicCodes:['46620'],incorporated:'2016-01-01',sourceUrl:'https://find-and-update.company-information.service.gov.uk/company/'+String(18000000+i),priority:25,reason:'Fictional HMRC-first registry match; FX unknown.',foundAt:now,researchMethod:'registry-only',researchConfidence:'Low',registryCheck:{checkedAt:now,risk:'ok',flags:[],companyStatus:'active',statusDetail:'',accountsType:'small',accountsOverdue:false,confirmationOverdue:false,sicCodes:['46620'],companyType:'ltd',incorporated:'2016-01-01',postalCode:'SW1A 1AA'}});
 const qualified={...item(1),companyContext:fixture(item(1).company)},unknown={...item(2),companyContext:fixture(item(2).company)};unknown.companyContext.hmrc.status='unknown';unknown.companyContext.hmrc.summary='Fictional HMRC match remains unknown; not disqualified.';
 await restore(a,s);const before=await state(a);await nav(a,'Lead Research');await a.getByLabel('Research sector').selectOption('goods');
 let calls=0;await a.route('**/api/lead-research',async route=>{if(['budget-status','lusha-status'].includes(route.request().postDataJSON()?.mode))return route.fallback();const body=route.request().postDataJSON();calls++;assert.equal(body.mode,'hmrc-discover');assert.equal(body.profile,'goods');assert.equal(body.cursor,calls===1?0:1);
  if(calls>1)return route.fulfill({status:502,contentType:'application/json',body:JSON.stringify({error:'Fictional HMRC outage; no batch saved.'})});
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[qualified,unknown],nextCursor:1,resultsScanned:4,tradeQualified:1,unmatched:2,knownSkipped:0,webSearches:0})});
 });
 await a.getByRole('button',{name:'Find HMRC traders (no Brave)',exact:true}).click();await a.getByRole('status').filter({hasText:'HMRC-first scan:'}).waitFor();await saved(a);
 await a.getByText(qualified.company,{exact:true}).waitFor();assert.equal(await a.getByText(unknown.company,{exact:true}).count(),0,'unmatched record not promoted to clearance queue');assert.equal(await a.getByRole('button',{name:'Available — checked',exact:true}).isDisabled(),true);
 let result=await state(a);for(const key of ['leads','tasks','activities','settings','readinessHistory'])assert.deepEqual(result[key],before[key]);assert.deepEqual(result.meta.leadFactory.cursors,{goods:6,recruitment:3,'hmrc-goods':1});
 await a.getByLabel('Lead research queue').selectOption('research');await a.getByText(unknown.company,{exact:true}).waitFor();assert.equal((await state(a)).meta.leadFactory.candidates.find(c=>c.companyNumber===unknown.companyNumber).status,'unchecked');
 await a.getByLabel('Lead research queue').selectOption('ready');
 await a.getByLabel(/I personally checked Salesforce/).check();await a.getByRole('button',{name:'Available — checked',exact:true}).click();await saved(a);
 await a.getByLabel('Lead research queue').selectOption('cleared');a.once('dialog',d=>d.accept());await a.getByRole('button',{name:'Move all 1 eligible cleared',exact:true}).click();await saved(a);
 result=await state(a);const lead=result.leads.find(l=>l.companyNumber===qualified.companyNumber);assert.ok(lead);assert.equal(lead.leadPool,'reserve');assert.equal(lead.crmClearance,'cleared');assert.equal(lead.readiness,1);assert.equal(lead.stage,'Prospecting');assert.ok(!result.tasks.some(t=>t.leadId===lead.id));assert.deepEqual(result.leads.find(l=>l.id===before.leads[0].id),before.leads[0]);assert.deepEqual(result.tasks,before.tasks);assert.ok(!result.activities.some(x=>x.type==='Call'));
 const savedResult=await state(a);await a.getByRole('button',{name:'Find HMRC traders (no Brave)',exact:true}).click();await a.getByRole('alert').filter({hasText:'Fictional HMRC outage'}).waitFor();assert.deepEqual(await state(a),savedResult,'failed discovery neither advances cursor nor changes workspace');
 await a.reload();await saved(a);assert.equal((await state(a)).meta.leadFactory.cursors['hmrc-goods'],1);assert.ok((await state(a)).leads.some(l=>l.id===lead.id));await a.unroute('**/api/lead-research');
 // Bulk discovery checkpoints completed pages, stops at the first provider failure.
 await restore(a,s);await nav(a,'Lead Research');await a.getByLabel('Research sector').selectOption('goods');
 const bulkBefore=await state(a),bulkCalls=[];await a.route('**/api/lead-research',async route=>{
  const body=route.request().postDataJSON();if(['budget-status','lusha-status'].includes(body?.mode))return route.fallback();
  assert.equal(body.mode,'hmrc-discover');assert.equal(body.cursor,bulkCalls.length);bulkCalls.push(body.cursor);
  if(body.cursor===2)return route.fulfill({status:429,contentType:'application/json',body:JSON.stringify({error:'Fictional HMRC cooldown'})});
  const row=item(body.cursor+10);row.companyContext=fixture(row.company);
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[row],nextCursor:body.cursor+1,resultsScanned:4,tradeQualified:1,unmatched:3,knownSkipped:0,sourceExhausted:false})});
 });
 await a.getByLabel('Bulk scan size').selectOption('10');await a.getByRole('button',{name:'Scan up to 40 HMRC traders',exact:true}).click();
 await a.getByRole('alert').filter({hasText:'Fictional HMRC cooldown'}).waitFor();await saved(a);
 let bulkResult=await state(a);assert.deepEqual(bulkCalls,[0,1,2]);assert.equal(bulkResult.meta.leadFactory.cursors['hmrc-goods'],2);assert.equal(bulkResult.meta.leadFactory.candidates.length,2);
 for(const key of ['leads','tasks','activities','settings','readinessHistory'])assert.deepEqual(bulkResult[key],bulkBefore[key]);
 await a.unroute('**/api/lead-research');
 // Resumes exactly at the failed page and stops at end of source, not at the maximum.
 await a.route('**/api/lead-research',async route=>{const body=route.request().postDataJSON();if(['budget-status','lusha-status'].includes(body?.mode))return route.fallback();assert.equal(body.cursor,2);return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[],nextCursor:3,resultsScanned:0,tradeQualified:0,unmatched:0,knownSkipped:0,sourceExhausted:true})})});
 await a.getByRole('button',{name:'Scan up to 40 HMRC traders',exact:true}).click();await a.getByRole('status').filter({hasText:'End of this source scan'}).waitFor();await saved(a);assert.equal((await state(a)).meta.leadFactory.cursors['hmrc-goods'],3);await a.unroute('**/api/lead-research');
 console.log('PASS: bulk HMRC discovery retains completed pages, respects provider cooldown, resumes at saved cursor and stops at source exhaustion.');
 console.log('PASS: HMRC-first discovery UI, unknown research retention, manual clearance/reserve transfer without Brave/outreach, independent source cursor, provider failure and reload.');
};
