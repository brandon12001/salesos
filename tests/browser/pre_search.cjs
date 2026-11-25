// UI/backup/queue coverage with fictional registry facts and a local API fixture.
const assert=require('node:assert/strict');
const {jwt}=require('./stack.cjs');
module.exports=async({a,saved,state,restore,nav,core})=>{
 const s=core.newState(),now=new Date().toISOString();
 const row=(i,sector='recruitment',sic='78200',incorporated='2016-01-01')=>({
  id:'ch:'+String(14000000+i),company:'Fictional Screen '+i+' Ltd',companyNumber:String(14000000+i),sector,sicCodes:[sic],incorporated,
  sourceUrl:'https://find-and-update.company-information.service.gov.uk/company/'+String(14000000+i),
  priority:23,reason:'Fictional registry fixture; FX unverified.',foundAt:now,status:'unchecked',researchMethod:'registry-only',researchConfidence:'Low',
  registryCheck:{risk:'ok',checkedAt:now,flags:[],companyStatus:'active',statusDetail:'',accountsType:'small',accountsOverdue:false,confirmationOverdue:false,companyType:'ltd',sicCodes:[sic],incorporated}
 });
 const rows=[row(1),row(2,'recruitment','78109'),row(3,'recruitment','78200',now.slice(0,10)),row(4,'goods','46620'),row(5),row(6)];
 delete rows[4].registryCheck.companyType; // Old saved records need a free refresh first.
 core.createLead(s,{company:rows[5].company,companyNumber:rows[5].companyNumber,leadPool:'reserve',crmClearance:'hold',crmOwner:'Fictional owner'});
 s.meta.leadFactory={version:1,candidates:rows,cursors:{recruitment:1},lastRunAt:now};
 await restore(a,s);const before=await state(a);await nav(a,'Lead Research');
 const projection=await a.evaluate(async publicKey=>{
  const key=Object.keys(localStorage).find(k=>k.startsWith('sb-')&&k.endsWith('-auth-token'));
  const session=JSON.parse(localStorage.getItem(key));
  const query=new URLSearchParams({select:'leads:payload->leads,factory:payload->meta->leadFactory',user_id:'eq.'+session.user.id,limit:'1'});
  const r=await fetch('http://127.0.0.1:55421/rest/v1/salesos_workspaces?'+query,{headers:{Authorization:'Bearer '+session.access_token,apikey:publicKey}});
  return {status:r.status,rows:await r.json()};
 },jwt('anon'));
 assert.equal(projection.status,200,'real localhost PostgREST supports the account-scoped research projection');
 assert.equal(projection.rows[0].factory.candidates.length,6);assert.equal(projection.rows[0].leads.length,1);
 await a.getByRole('heading',{name:'Lead Research & Clearance'}).waitFor();
 const research=a.getByRole('button',{name:'Research saved companies on web (1 next)',exact:true});assert.equal(await research.isEnabled(),true);
 await a.getByRole('button',{name:'Review pre-search holds (4)',exact:true}).click();
 await a.getByText(/Generic placement alone is too broad/).waitFor();await a.getByText(/Under two years old:/).waitFor();
 await a.getByText(/Already tracked in SalesOS; no search credits will be spent/).waitFor();
 let requests=0;
 await a.route('**/api/lead-research',async route=>{
  requests++;const body=route.request().postDataJSON();assert.equal(body.mode,'web-enrich');
  assert.deepEqual(body.candidates.map(c=>c.companyNumber),[rows[0].companyNumber],'only selected-sector eligible company submitted');
  // Official recheck finds it newly overdue: no search performed; keep it for review.
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({webSearches:0,webErrors:0,webCompleted:0,preSearchHeld:1,knownSkipped:0,updates:[{
   id:rows[0].id,registryCheck:{...rows[0].registryCheck,risk:'review',accountsOverdue:true,flags:['Accounts overdue.']},priority:15,reason:'Pre-search: Accounts overdue. No Brave requests spent.',
   researchMethod:'registry-only',researchConfidence:'Low',evidence:[],webCheckedAt:'',webQueries:0,fxHypothesis:'No currency flow confirmed.',discoveryQuestion:'Does this company pay overseas suppliers?'
  }]})});
 });
 await research.click();await saved(a);await a.getByRole('status').filter({hasText:'using 0 Brave requests'}).waitFor();
 assert.equal(requests,1);assert.equal(await a.getByRole('button',{name:'Research saved companies on web (0 next)',exact:true}).isDisabled(),true);
 let after=await state(a);for(const key of ['leads','tasks','activities','settings','readinessHistory'])assert.deepEqual(after[key],before[key],key+' preserved');
 assert.equal(after.meta.leadFactory.candidates.length,6);assert.equal(after.meta.leadFactory.candidates[0].registryCheck.risk,'review');
 await a.reload();await saved(a);await nav(a,'Lead Research');assert.equal(await a.getByRole('button',{name:'Research saved companies on web (0 next)',exact:true}).isDisabled(),true);
 await a.getByLabel('Research sector',{exact:true}).selectOption('goods');assert.equal(await a.getByRole('button',{name:'Research saved companies on web (1 next)',exact:true}).isEnabled(),true);
 await a.setViewportSize({width:390,height:844});assert.ok(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'research controls fit mobile width');
 await a.setViewportSize({width:1440,height:1000});await a.unroute('**/api/lead-research');
 console.log('PASS: pre-search holds/reasons, sector queue, zero-search refresh downgrade, reload and prospect/history preservation in fictional browser.');
};
