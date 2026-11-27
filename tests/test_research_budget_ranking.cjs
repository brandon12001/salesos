const assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'salesos-budget-rank-'));
const build=cp.spawnSync(process.execPath,['node_modules/typescript/bin/tsc','--target','es2022','--module','commonjs','--strict','--skipLibCheck','--outDir',dir,'--rootDir','.','api/lead-research.ts'],{encoding:'utf8'});if(build.status)throw Error(build.stdout||build.stderr);
const handler=require(path.join(dir,'api/lead-research.js')).default,lib=require(path.join(dir,'src/lib/companyContext.js')),free=require(path.join(dir,'server/freeCompanyContext.js'));
const now=new Date('2026-11-25T12:00:00Z'),w=lib.hmrcWindow(now),company='Fictional Regular Trader Ltd',postcode='SW1A 1AA';
const c={company,sector:'goods',registryCheck:{postalCode:postcode},companyContext:require('./hmrc_fixture.cjs')(company)};
c.companyContext.checkedAt=now.toISOString();Object.assign(c.companyContext.hmrc,{checkedAt:now.toISOString(),months:[w.to],sourceUrl:'https://api.uktradeinfo.com/Trade?'+new URLSearchParams({'$filter':`TraderId eq 123 and MonthId ge ${w.from} and MonthId le ${w.to}`})});
const activity={...w,months:[202611,202610,202609],checkedAt:now.toISOString(),sourceUrl:'https://api.uktradeinfo.com/Trade?'+free.hmrcActivityQuery(123,now)};
c.companyContext.hmrc.activity=activity;
assert.deepEqual(lib.tradeActivity(c,now.getTime()),{months:3,latest:202611,age:0});
const rank=lib.tradeActivityRank(c,now.getTime());c.companyContext.hmrc.activity={...activity,months:[202611]};assert.ok(rank>lib.tradeActivityRank(c,now.getTime()),'more recorded months wins at same recency');
const single=lib.tradeActivityRank(c,now.getTime());c.companyContext.hmrc.activity={...activity,months:[202610,202609]};assert.ok(lib.tradeActivityRank(c,now.getTime())>single,'recurring trade beats a single recent month');
for(const change of [{months:[202611,202611]},{months:[202613]},{from:202001},{checkedAt:'2020-01-01'},{sourceUrl:activity.sourceUrl.replace('123','999')},{sourceUrl:'https://untrusted.example/Trade'}]){
 c.companyContext.hmrc.activity={...activity,...change};assert.equal(lib.tradeActivity(c,now.getTime()),null,'invalid/incomplete activity cannot rank');assert.equal(lib.hmrcQualified(c,now.getTime()),true,'research fit remains independent');
}
c.companyContext.hmrc.activity=activity;assert.equal(lib.needsCompanyContext({...c.companyContext,checkedAt:now.toISOString(),hmrc:{...c.companyContext.hmrc,checkedAt:'2026-11-01T00:00:00Z'}},now.getTime()),true,'fresh ownership lookup cannot hide expired HMRC proof');
const retained=lib.retainContextOnFailure(c.companyContext,{...c.companyContext,hmrc:{...c.companyContext.hmrc,activity:undefined}});assert.deepEqual(retained.hmrc.activity,activity,'optional coverage failure retains the original source-dated monthly facts');
let mode='okay',brave=0,reservations=0,remaining=2;
process.env.VITE_SUPABASE_URL='https://fixture.supabase.co';process.env.VITE_SUPABASE_PUBLISHABLE_KEY='fake';process.env.COMPANIES_HOUSE_API_KEY='fake';process.env.BRAVE_SEARCH_API_KEY='fake';
const candidate={company:'Fictional Staffing Budget Ltd',companyNumber:'18000001',sector:'recruitment',sicCodes:['78200'],incorporated:'2016-01-01',status:'unchecked'};
// HTTP fixtures test provider contracts; the separate fake-clock suite tests real pacing.
require(path.join(dir,'server/hmrcProvider.js')).hmrcGate.enter=async()=>{};
require(path.join(dir,'server/hmrcProvider.js')).hmrcGate.coolDown=()=>{};
const original=global.fetch;
global.fetch=async(url,options={})=>{
 const u=new URL(url);
 if(u.pathname==='/auth/v1/user')return {ok:true,json:async()=>({id:'fictional-owner'})};
 if(u.pathname==='/rest/v1/salesos_workspaces')return {ok:true,json:async()=>[{leads:[],factory:{candidates:[candidate]}}]};
 if(u.pathname.startsWith('/company/'))return {ok:true,json:async()=>({company_name:candidate.company,company_number:candidate.companyNumber,type:'ltd',company_status:'active',date_of_creation:'2016-01-01',sic_codes:['78200'],accounts:{last_accounts:{type:'small'}}})};
 if(u.pathname==='/rest/v1/rpc/salesos_search_budget'){
  assert.equal(options.headers.Authorization,'Bearer fictional-token');const body=JSON.parse(options.body);assert.equal('owner_id' in body,false);
  if(mode==='lost-response'){remaining=0;throw Error('Fictional lost response after reservation')}
  if(mode==='outage')throw Error('Fictional unavailable');if(mode==='conflict')return {ok:false,status:409};
  let granted=0;if(body.action==='reserve'){reservations++;granted=Math.min(body.amount,remaining);remaining-=granted;}
  return {ok:true,json:async()=>({configured:true,remaining,allocated:2-remaining,revision:1,stopOn:'2099-01-01',expired:false,granted})};
 }
 if(u.hostname==='api.search.brave.com'){brave++;if(mode==='provider-failure')throw Error('Fictional timeout');return {ok:true,status:200,json:async()=>({web:{results:[]}})}}
 if(u.hostname==='api.uktradeinfo.com'){
  assert.equal(u.searchParams.get('$top'),'25');
  const rows=[{TraderId:123,MonthId:w.to,TradeTypeId:1},{TraderId:123,MonthId:w.to,TradeTypeId:2},{TraderId:123,MonthId:202610,TradeTypeId:1}];
  return {ok:true,json:async()=>mode==='truncated'?{value:rows,'@odata.nextLink':'https://api.uktradeinfo.com/next'}:mode==='malformed'?{value:[{TraderId:999,MonthId:w.to,TradeTypeId:1}]}:{value:rows}};
 }
 throw Error('Unexpected fictional URL');
};
async function invoke(body){const r={statusCode:200,setHeader(){},end(s){this.body=JSON.parse(s)}};await handler({method:'POST',headers:{authorization:'Bearer fictional-token'},body},r);return r}
(async()=>{try{
 assert.deepEqual((await free.hmrcActivity(123,now)).months,[202611,202610],'grouped months are deduplicated across import/export directions');
 for(mode of ['truncated','malformed'])assert.equal(await free.hmrcActivity(123,now),undefined,'incomplete coverage is unknown');
 mode='okay';let r=await invoke({mode:'web-enrich',candidates:[candidate]});assert.equal(r.statusCode,200);assert.equal(brave,2);assert.equal(reservations,1);assert.equal(r.body.budget.remaining,0);
 r=await invoke({mode:'web-enrich',candidates:[candidate]});assert.equal(r.statusCode,429);assert.equal(brave,2,'exhaustion blocks legacy/old-client calls too');
 mode='outage';r=await invoke({mode:'web-enrich',candidates:[candidate]});assert.equal(r.statusCode,503);assert.equal(brave,2,'ledger outage fails closed');
 remaining=2;mode='lost-response';r=await invoke({mode:'web-enrich',candidates:[candidate]});assert.equal(r.statusCode,503);assert.equal(remaining,0);assert.equal(brave,2,'ambiguous reservation response never sends a paid request or refunds');
 mode='conflict';r=await invoke({mode:'budget-config',remaining:50,stopOn:'2026-12-01',revision:0,confirmed:true});assert.equal(r.statusCode,409);
 r=await invoke({mode:'budget-config',remaining:1001,stopOn:'2026-12-01',revision:0,confirmed:true});assert.equal(r.statusCode,400);
 remaining=2;mode='provider-failure';r=await invoke({mode:'web-enrich',candidates:[candidate]});assert.equal(r.statusCode,502);assert.equal(remaining,0,'failed provider attempts are not refunded');
 console.log('PASS: complete monthly coverage/ranking, invalid/partial evidence, budget-before-provider ordering, exhaustion, RPC failure, stale confirmation and conservative failed-attempt accounting.');
}catch(e){console.error(e);process.exitCode=1}finally{global.fetch=original}})();
