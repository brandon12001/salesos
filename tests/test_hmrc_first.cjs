// End-to-end handler/provider contracts with fictional traders and registries.
const assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const core=require('./core.cjs');global.window={SalesCore:core};
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'salesos-hmrc-first-'));
const compile=cp.spawnSync(process.execPath,['node_modules/typescript/bin/tsc','--target','es2022','--module','commonjs','--strict','--skipLibCheck','--outDir',dir,'--rootDir','.','api/lead-research.ts','src/lib/leadFactory.ts'],{encoding:'utf8'});if(compile.status)throw Error(compile.stdout||compile.stderr);
const handler=require(path.join(dir,'api/lead-research.js')).default,f=require(path.join(dir,'src/lib/leadFactory.js')),lib=require(path.join(dir,'src/lib/companyContext.js'));
const fixture=require('./hmrc_fixture.cjs'),now=new Date(),month=now.getUTCFullYear()*100+now.getUTCMonth()+1;
const c={company:'Fictional HMRC Equipment Limited',companyNumber:'17000001',sector:'goods',sicCodes:['46620'],incorporated:'2016-01-01'};
const profile={company_name:c.company,company_number:c.companyNumber,type:'ltd',company_status:'active',date_of_creation:c.incorporated,sic_codes:c.sicCodes,registered_office_address:{postal_code:'SW1A 1AA'},accounts:{last_accounts:{type:'small'}}};
process.env.VITE_SUPABASE_URL='https://fixture.supabase.co';process.env.VITE_SUPABASE_PUBLISHABLE_KEY='fake-public';process.env.COMPANIES_HOUSE_API_KEY='fake-ch';process.env.BRAVE_SEARCH_API_KEY='fake-brave';
let saved=[],leads=[],requests=[],profilePatch={},postalMismatch=false,ambiguous=false,outage=false,limited=false,brave=0;
// HTTP fixtures test provider contracts; the separate fake-clock suite tests real pacing.
require(path.join(dir,'server/hmrcProvider.js')).hmrcGate.enter=async()=>{};
require(path.join(dir,'server/hmrcProvider.js')).hmrcGate.coolDown=()=>{};
const original=global.fetch;
global.fetch=async(url,options={})=>{
 const u=new URL(url);requests.push({url:u,options});
 if(u.pathname==='/rest/v1/rpc/salesos_search_budget')return require('./budget_fixture.cjs')(options);
 if(u.pathname==='/auth/v1/user')return {ok:true,json:async()=>({id:'fictional-user'})};
 if(u.pathname==='/rest/v1/salesos_workspaces')return {ok:true,json:async()=>[{leads,factory:{candidates:saved}}]};
 if(u.hostname==='api.uktradeinfo.com'){
  assert.equal(options.headers.Authorization,undefined);assert.equal(options.redirect,'error');
  if(outage)throw Error('Fictional provider unavailable');
  if(limited)return {ok:false,status:429};
  if(u.searchParams.get('$apply')?.includes('MonthId,TradeTypeId'))return {ok:true,json:async()=>({value:[{TraderId:123,MonthId:month,TradeTypeId:2}]})};
  if(u.searchParams.has('$apply')){assert.match(u.searchParams.get('$apply'),/groupby\(\(TraderId\)\)/);assert.equal(u.searchParams.get('$top'),'4');return {ok:true,json:async()=>({value:[{TraderId:123}]})}}
  if(u.pathname==='/Trader(123)')return {ok:true,json:async()=>({TraderId:123,CompanyName:c.company,PostCode:'SW1A 1AA'})};
  assert.equal(u.pathname,'/Trade');return {ok:true,json:async()=>({value:[{TraderId:123,MonthId:month,TradeTypeId:2,Commodity:{Hs2Description:'Machinery'}}]})};
 }
 if(u.hostname==='api.company-information.service.gov.uk'){
  assert.match(options.headers.Authorization,/^Basic /);
  if(u.pathname==='/search/companies')return {ok:true,json:async()=>({items:Array.from({length:ambiguous?2:1},(_,i)=>({title:c.company,company_number:i?'17000002':c.companyNumber,company_status:'active',address:{postal_code:postalMismatch?'ZZ1 1ZZ':'SW1A 1AA'}}))})};
  assert.equal(u.pathname,'/company/'+c.companyNumber);return {ok:true,json:async()=>({...profile,...profilePatch})};
 }
 if(u.hostname==='api.search.brave.com'){brave++;return {ok:true,status:200,json:async()=>({web:{results:[]}})}}
 throw Error('Unexpected provider '+u.hostname);
};
async function invoke(body){const r={statusCode:200,setHeader(){},end(s){this.body=JSON.parse(s)}};await handler({method:'POST',headers:{authorization:'Bearer fictional-token'},body},r);return r}
(async()=>{try{
 let r=await invoke({mode:'hmrc-discover',profile:'goods',cursor:0});assert.equal(r.statusCode,200);assert.equal(r.body.tradeQualified,1);assert.equal(r.body.items.length,1);assert.equal(r.body.webSearches,0);assert.equal(brave,0);assert.equal(r.body.nextCursor,1);
 const row=r.body.items[0],context=row.companyContext;assert.equal(lib.hmrcQualified(row),true);assert.equal(f.qualityTier(row),'ready');assert.equal(row.researchConfidence,'Low','trade is not FX confidence');
 const sourceIndex=requests.findIndex(r=>r.url.hostname==='api.uktradeinfo.com'&&r.url.searchParams.has('$apply')),chIndex=requests.findIndex(r=>r.url.hostname==='api.company-information.service.gov.uk');assert.ok(sourceIndex<chIndex,'recorded HMRC traders are the discovery source, not a registry-first sample');
 for(const change of [{hmrc:{...context.hmrc,status:'unknown'}},{hmrc:{...context.hmrc,matchedName:'Fictional HMRC Equipment PLC'}},{hmrc:{...context.hmrc,matchedPostcode:'ZZ1 1ZZ'}},{hmrc:{...context.hmrc,checkedAt:'2020-01-01T00:00:00Z'}},{hmrc:{...context.hmrc,sourceUrl:'https://www.uktradeinfo.com/search/traders/'}},{hmrc:{...context.hmrc,months:[202001]}}])assert.equal(lib.hmrcQualified({...row,companyContext:{...context,...change}}),false);
 assert.equal(lib.hmrcQualified({...row,sector:'recruitment'}),false,'goods evidence never qualifies services');
 const s=core.newState();f.addDiscoveries(s,[row],'goods',1,'hmrc-goods');assert.equal(f.leadFactory(s).cursors['hmrc-goods'],1);assert.equal(f.leadFactory(s).cursors.goods,undefined,'independent source cursor');assert.equal(s.leads.length,0);assert.equal(s.activities.length,0);assert.equal(s.tasks.length,0);
 const candidate=f.leadFactory(s).candidates[0];f.markAvailable(s,candidate.id);assert.equal(candidate.status,'cleared');
 // Fresh source refresh remains possible after manual clearance; it cannot alter that decision.
 f.applyCompanyContext(s,[{id:candidate.id,expectedCheckedAt:context.checkedAt,registryCheck:candidate.registryCheck,companyContext:{...context,checkedAt:new Date(Date.now()+1).toISOString()}}]);assert.equal(candidate.status,'cleared');
 f.moveCleared(s,[candidate.id]);assert.equal(s.leads[0].leadPool,'reserve');assert.equal(s.leads[0].readiness,1);assert.equal(s.leads[0].stage,'Prospecting');assert.equal(s.tasks.length,0);assert.match(s.leads[0].researchSources,/api.uktradeinfo.com/);
 leads=[{company:c.company,companyNumber:c.companyNumber,crmClearance:'hold'}];requests=[];r=await invoke({mode:'hmrc-discover',profile:'goods',cursor:1});assert.equal(r.body.items.length,0);assert.equal(r.body.knownSkipped,1);assert.ok(!requests.some(r=>r.url.hostname==='api.company-information.service.gov.uk'),'known/held names skipped before registry calls');leads=[];
 postalMismatch=true;r=await invoke({mode:'hmrc-discover',profile:'goods',cursor:0});assert.equal(r.body.items.length,0);assert.equal(r.body.unmatched,1);postalMismatch=false;
 ambiguous=true;r=await invoke({mode:'hmrc-discover',profile:'goods',cursor:0});assert.equal(r.body.items.length,0);ambiguous=false;
 profilePatch={company_status:'dissolved'};r=await invoke({mode:'hmrc-discover',profile:'goods',cursor:0});assert.equal(r.body.tradeQualified,0);assert.equal(f.qualityTier(r.body.items[0]),'excluded');profilePatch={};
 profilePatch={sic_codes:['62012']};requests=[];r=await invoke({mode:'hmrc-discover',profile:'goods',cursor:0});assert.equal(r.statusCode,200);assert.equal(r.body.tradeQualified,0);assert.equal(requests.filter(x=>x.url.hostname==='api.uktradeinfo.com'&&x.url.pathname==='/Trade').length,1,'out-of-sector profiles do not fetch detailed trade/activity');assert.equal(r.body.items[0].companyContext.hmrc.status,'unknown');profilePatch={};
 limited=true;r=await invoke({mode:'hmrc-discover',profile:'goods',cursor:2});assert.equal(r.statusCode,429);assert.equal(r.body.nextCursor,undefined);assert.match(r.body.error,/Wait at least a minute/);limited=false;
 outage=true;r=await invoke({mode:'hmrc-discover',profile:'goods',cursor:2});assert.equal(r.statusCode,502);assert.equal(r.body.nextCursor,undefined,'provider failure never advances a scan');outage=false;
 saved=[{...c,status:'unchecked'}];r=await invoke({mode:'web-enrich',candidates:[c]});assert.equal(r.statusCode,200);assert.equal(r.body.webSearches,0,'missing HMRC proof spends zero Brave requests');
 saved=[{...c,status:'unchecked',companyContext:fixture(c.company)}];r=await invoke({mode:'web-enrich',candidates:[c]});assert.equal(r.statusCode,200);assert.equal(r.body.webSearches,2,'optional deeper research permitted after HMRC fit');
 r=await invoke({mode:'hmrc-discover',profile:'recruitment',cursor:0});assert.equal(r.statusCode,400);
 // A no-query hold must never erase independent research previously recorded.
 const archive=core.newState();f.addDiscoveries(archive,[{...row,companyContext:undefined,researchMethod:'web-rule-screen',evidence:[{label:'Fictional independent clue',sourceUrl:'https://fictional.example/source',excerpt:'Fictional source retained',strength:'strong'}]}],'goods',1);
 const old=structuredClone(f.leadFactory(archive).candidates[0]);f.applyWebResearch(archive,[{id:old.id,registryCheck:old.registryCheck,priority:25,reason:'HMRC check pending',researchMethod:'registry-only',researchConfidence:'Low',evidence:[],webCheckedAt:'',webQueries:0,fxHypothesis:'Unknown',discoveryQuestion:'Unknown'}]);assert.deepEqual(f.leadFactory(archive).candidates[0],old);
 console.log('PASS: HMRC-first source discovery, strict trade proof, zero-Brave research qualification, safe legal matching, independent cursors, ownership/reserve/readiness guards, failures and archive preservation.');
}catch(e){console.error(e);process.exitCode=1}finally{global.fetch=original}})();
