const assert=require('node:assert/strict');
const {jwt,sql}=require('./stack.cjs');
module.exports=async({a,saved,state,restore,nav,core})=>{
 const s=core.newState(),now=new Date(),month=now.getUTCFullYear()*100+now.getUTCMonth()+1;
 const row=(i)=>({id:'ch:'+String(19000000+i),company:'Fictional Ranked Equipment '+i+' Ltd',companyNumber:String(19000000+i),sector:'goods',sicCodes:['46620'],incorporated:'2016-01-01',status:'unchecked',sourceUrl:'https://find-and-update.company-information.service.gov.uk/company/'+String(19000000+i),priority:25,reason:'Fictional trade evidence; FX unknown.',foundAt:now.toISOString(),registryCheck:{risk:'ok',checkedAt:now.toISOString(),flags:[],companyType:'ltd',companyStatus:'active',accountsType:'small',incorporated:'2016-01-01',sicCodes:['46620'],postalCode:'SW1A 1AA'}});
 const rows=[row(1),row(2)];for(const [i,c] of rows.entries()){
  c.companyContext=require('../hmrc_fixture.cjs')(c.company);const h=c.companyContext.hmrc,qs=new URL(h.sourceUrl).searchParams,from=Number(qs.get('$filter').match(/ge (\d{6})/)[1]);
  h.activity={from,to:month,months:i?[month,Math.floor(from/100)*100+from%100]:[month],checkedAt:now.toISOString(),sourceUrl:'https://api.uktradeinfo.com/Trade?'+new URLSearchParams({'$apply':`filter(TraderId eq 123 and MonthId ge ${from} and MonthId le ${month})/groupby((TraderId,MonthId,TradeTypeId))`})};
 }
 s.meta.leadFactory={version:1,candidates:rows,cursors:{},lastRunAt:now.toISOString()};await restore(a,s);const before=await state(a);
 const owner=await a.evaluate(()=>{const key=Object.keys(localStorage).find(k=>k.startsWith('sb-')&&k.endsWith('-auth-token'));return JSON.parse(localStorage.getItem(key)).user.id});assert.match(owner,/^[a-f0-9-]{36}$/);
 sql(`insert into salesos_research_private.search_budget(owner_id) values('${owner}');`);
 let paid=0,failBudget=false;
 await a.route('**/api/lead-research',async route=>{
  const b=route.request().postDataJSON();
  if(b.mode?.startsWith('budget-')){
   if(failBudget)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Fictional budget unavailable; paid research paused.'})});
   const payload={action:b.mode==='budget-status'?'status':'configure',amount:b.remaining||0,stop_date:b.stopOn||null,expected_revision:b.revision??null};
   const r=await fetch('http://127.0.0.1:55421/rest/v1/rpc/salesos_search_budget',{method:'POST',headers:{Authorization:route.request().headers().authorization,apikey:jwt('anon'),'Content-Type':'application/json'},body:JSON.stringify(payload)});
   const value=await r.json();return route.fulfill({status:r.status,contentType:'application/json',body:JSON.stringify(r.ok?{budget:value}:{error:value.message})});
  }
  assert.equal(b.mode,'web-enrich');paid++;assert.deepEqual(b.candidates.map(c=>c.companyNumber),[rows[1].companyNumber,rows[0].companyNumber],'regular trade ranks ahead at same recency');
  // Fixture deliberately sends no real Brave request; reserve using real local DB.
  sql(`begin;set local role authenticated;select set_config('request.jwt.claim.sub','${owner}',true);select public.salesos_search_budget('reserve',2);commit;`);
  await route.fulfill({status:502,contentType:'application/json',body:JSON.stringify({error:'Fictional provider timeout. Reservation retained.'})});
 });
 try{
  await nav(a,'Lead Research');await a.getByLabel('Research sector',{exact:true}).selectOption('goods');
  const button=a.getByRole('button',{name:'Research saved companies on web (2 next)',exact:true});assert.equal(await button.isDisabled(),true,'initial zero allowance pauses paid action');
  assert.equal(await a.getByRole('button',{name:'Find HMRC traders (no Brave)',exact:true}).isEnabled(),true);
  const budget=a.locator('details').filter({has:a.locator('summary').filter({hasText:'Search budget'})});await budget.locator('summary').click();
  const stop=new Date(Date.now()+86400000*3).toISOString().slice(0,10);
  await a.getByLabel('Confirmed remaining Brave allowance').fill('2');await a.getByLabel('Stop searches on').fill(stop);
  const confirm=a.getByRole('checkbox',{name:'I checked my current Brave allowance and reset date.'});const save=a.getByRole('button',{name:'Set confirmed allowance',exact:true});assert.equal(await save.isDisabled(),true);await confirm.check();await save.click();
  await budget.locator('summary').filter({hasText:'2 searches remaining'}).waitFor();assert.equal(await button.isEnabled(),true);
  await button.click();await a.getByRole('alert').filter({hasText:'Fictional provider timeout'}).waitFor();await budget.locator('summary').filter({hasText:'paid research paused'}).waitFor();assert.equal(await button.isDisabled(),true);assert.equal(paid,1);
  await a.getByRole('button',{name:'Refresh search budget',exact:true}).click();await budget.getByText(/0 remaining · 2 allocated/).waitFor();
  await a.getByLabel('Confirmed remaining Brave allowance').fill('10');await confirm.check();
  // A competing confirmation changes the revision before this form is submitted.
  sql(`begin;set local role authenticated;select set_config('request.jwt.claim.sub','${owner}',true);select public.salesos_search_budget('configure',4,'${stop}',2);commit;`);
  await save.click();await a.getByRole('alert').filter({hasText:'Budget changed'}).waitFor();assert.equal(await button.isDisabled(),true);
  await a.getByRole('button',{name:'Refresh search budget',exact:true}).click();await budget.locator('summary').filter({hasText:'4 searches remaining'}).waitFor();
  failBudget=true;await a.getByRole('button',{name:'Refresh search budget',exact:true}).click();await a.getByRole('alert').filter({hasText:'Fictional budget unavailable'}).waitFor();assert.equal(await button.isDisabled(),true);
  await a.setViewportSize({width:390,height:844});assert.ok(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await a.setViewportSize({width:1440,height:1000});
  const after=await state(a);for(const key of ['leads','tasks','activities','settings','readinessHistory','meta'])assert.deepEqual(after[key],before[key],key+' preserved by budget configuration/research failure');
  console.log('PASS: real local budget RPC, initial pause/free scans, explicit allowance, ranked shortlist, failed-reservation retention, conflicting confirmation, outage/mobile and workspace preservation.');
 }finally{await a.unroute('**/api/lead-research');sql('delete from salesos_research_private.search_budget;')}
};
