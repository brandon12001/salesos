const assert=require('node:assert/strict');
module.exports=async({a,saved,state,restore,nav,core})=>{
 const s=core.newState(),now=new Date().toISOString();
 core.createLead(s,{company:'Fictional Existing Protected Ltd',leadPool:'reserve',crmClearance:'hold',crmOwner:'Fictional colleague'});
 const c={id:'ch:16000001',company:'Fictional Context Machinery Ltd',companyNumber:'16000001',sector:'goods',sicCodes:['46620'],incorporated:'2016-01-01',sourceUrl:'https://find-and-update.company-information.service.gov.uk/company/16000001',priority:25,reason:'Fictional registry; FX unverified.',foundAt:now,status:'unchecked',registryCheck:{checkedAt:now,risk:'ok',flags:[],companyStatus:'active',statusDetail:'',accountsType:'small',accountsOverdue:false,confirmationOverdue:false,sicCodes:['46620'],incorporated:'2016-01-01',companyType:'ltd',postalCode:'SW1A 1AA'}};
 s.meta.leadFactory={version:1,candidates:[c],cursors:{},lastRunAt:''};
 await restore(a,s);const before=await state(a);await nav(a,'Lead Research');await a.getByLabel('Research sector').selectOption('goods');
 await a.getByText('Annual turnover target · £3m–£30m',{exact:true}).click();await a.getByLabel('Minimum (£m)',{exact:true}).fill('5');await a.getByLabel('Maximum (£m)',{exact:true}).fill('20');await a.getByRole('button',{name:'Save turnover target',exact:true}).click();await saved(a);
 assert.deepEqual((await state(a)).meta.leadFactory.turnoverTarget,{min:5e6,max:20e6});
 await a.getByLabel('Lead research queue').selectOption('research');
 async function evidence(amount,scope){
  const details=a.locator('details').filter({has:a.getByText(/^(Record|Edit) published annual turnover$/)});
  if(!(await details.getAttribute('open')!==null))await details.locator('summary').click();
  await details.getByLabel('Annual turnover (£m)',{exact:true}).fill(String(amount));
  await details.getByLabel('Financial year ended',{exact:true}).fill(String(Number(now.slice(0,4))-1)+'-12-31');
  await details.getByLabel('Figure applies to',{exact:true}).selectOption(scope);
  await details.getByLabel('Published accounts source URL',{exact:true}).fill('https://fictional.example/annual-accounts');
  await details.getByRole('button',{name:'Save turnover evidence',exact:true}).click();await saved(a);
 }
 await evidence(40,'entity');assert.equal(await a.getByRole('button',{name:'Research saved companies on web (0 next)',exact:true}).isDisabled(),true);
 await evidence(40,'group');assert.equal(await a.getByRole('button',{name:'Research saved companies on web (0 next)',exact:true}).isDisabled(),true,'group figure is unknown but goods still needs HMRC proof');assert.equal(await a.getByRole('button',{name:'Free trade & ownership checks (1 next)',exact:true}).isEnabled(),true);
 await evidence(10,'entity');
 let calls=0;const fixture=require('../hmrc_fixture.cjs')(c.company,c.registryCheck.postalCode);const context={...fixture,checkedAt:now,gleif:{status:'matched',sourceUrl:'https://www.gleif.org/en/lei-data/gleif-api',summary:'Fictional reported parent; treasury authority unverified.',parents:[{kind:'direct',name:'Fictional Parent Inc',lei:'12345678901234567890',country:'US',sourceUrl:'https://api.gleif.org/api/v1/lei-records/12345678901234567890'}]}};
 await a.route('**/api/lead-research',async route=>{if(['budget-status','lusha-status'].includes(route.request().postDataJSON()?.mode))return route.fallback();calls++;assert.equal(route.request().postDataJSON().mode,'free-context');await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({updates:[{id:c.id,expectedCheckedAt:'',registryCheck:c.registryCheck,companyContext:context}],providerErrors:0,braveSearches:0})})});
 await a.getByRole('button',{name:'Free trade & ownership checks (1 next)',exact:true}).click();await a.getByRole('status').filter({hasText:'Free context saved'}).waitFor();await saved(a);assert.equal(calls,1);
 assert.equal(await a.getByRole('button',{name:'Available — checked',exact:true}).isDisabled(),true,'HMRC research fit never bypasses manual ownership');
 await a.getByText(/Trade & ownership context · checked/).click();await a.getByText(/Direct accounting parent: Fictional Parent Inc/).waitFor();
 const after=await state(a);for(const key of ['leads','tasks','activities','settings','readinessHistory'])assert.deepEqual(after[key],before[key],key+' preserved');
 assert.deepEqual(after.meta.leadFactory.candidates[0].companyContext,context);assert.equal(after.meta.leadFactory.candidates[0].turnover.amount,10e6);
 await a.reload();await saved(a);await nav(a,'Lead Research');await a.getByLabel('Research sector').selectOption('goods');assert.equal(await a.getByRole('button',{name:'Free trade & ownership checks (0 next)',exact:true}).isDisabled(),true);
 await a.getByText('Annual turnover target · £5m–£20m',{exact:true}).waitFor();
 await a.setViewportSize({width:390,height:844});assert.ok(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await a.setViewportSize({width:1440,height:1000});
 await a.unroute('**/api/lead-research');console.log('PASS: adjustable turnover range, entity/group evidence, free source cards, cache/reload/mobile and untouched prospect/history/settings in fictional browser.');
};
