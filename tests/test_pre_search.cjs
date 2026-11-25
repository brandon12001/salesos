// Fictional registry and provider fixtures only: no real Brave allowance used.
const assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'salesos-pre-search-'));
const build=cp.spawnSync(process.execPath,['node_modules/typescript/bin/tsc','--target','es2022','--module','commonjs','--strict','--skipLibCheck','--outDir',dir,'--rootDir','.','api/lead-research.ts'],{encoding:'utf8'});
if(build.status)throw Error(build.stdout||build.stderr);
const handler=require(path.join(dir,'api/lead-research.js')).default;
const {preSearchScreen,needsRegistryRefresh}=require(path.join(dir,'src/lib/researchScreen.js'));
const now='2026-11-25T12:00:00Z',check={risk:'ok',checkedAt:now,accountsType:'micro-entity',companyType:'ltd',incorporated:'2024-11-25',sicCodes:['78200']};
assert.equal(preSearchScreen('recruitment',check,now).eligible,true,'exact two-year boundary and micro accounts allowed; size not guessed');
for(const override of [{incorporated:'2024-11-26'},{incorporated:'2020-02-30'},{incorporated:''},{incorporated:'2027-01-01'},{companyType:'llp'},{sicCodes:['78109']},{sicCodes:['78200','64209']},{sicCodes:['78200','99999']},{accountsType:'dormant'},{accountsType:''},{risk:'review'},{risk:'excluded'},{risk:'unverified'},{checkedAt:'2026-01-01'}]){
 assert.equal(preSearchScreen('recruitment',{...check,...override},now).eligible,false,JSON.stringify(override));
}
assert.equal(preSearchScreen('goods',{...check,sicCodes:['46620']},now).eligible,true);
assert.equal(preSearchScreen('goods',check,now).eligible,false,'sectors do not cross-match');
assert.equal(preSearchScreen('recruitment',{...check,sicCodes:['78109','78300']},now).eligible,true,'one target SIC is sufficient');
assert.equal(needsRegistryRefresh(undefined),true);
assert.equal(needsRegistryRefresh({...check,checkedAt:new Date().toISOString()}),false);
process.env.VITE_SUPABASE_URL='https://fixture.supabase.co';process.env.VITE_SUPABASE_PUBLISHABLE_KEY='fake-public';process.env.COMPANIES_HOUSE_API_KEY='fake-ch';process.env.BRAVE_SEARCH_API_KEY='fake-brave';
const candidate=(i,sector='recruitment')=>({company:'Fictional Trading '+i+' Ltd',companyNumber:String(12000000+i),sector,sicCodes:[sector==='goods'?'46620':'78200'],incorporated:'2016-01-01',status:'unchecked'});
const profile=c=>({company_name:c.company,company_number:c.companyNumber,company_status:'active',type:'ltd',sic_codes:c.sicCodes,date_of_creation:c.incorporated,accounts:{last_accounts:{type:'small'},next_accounts:{overdue:false}},confirmation_statement:{overdue:false}});
let candidates=[],leads=[],overrides={},calls=[],brave=0,unavailable=false,providerStatus=200;
const original=global.fetch;
global.fetch=async(url,options)=>{
 const u=new URL(url);calls.push({url:u,options});
 if(u.pathname==='/auth/v1/user')return {ok:true,json:async()=>({id:'fixture-user'})};
 if(u.pathname==='/rest/v1/salesos_workspaces'){
  assert.equal(u.searchParams.get('user_id'),'eq.fixture-user');assert.equal(options.headers.Authorization,'Bearer fixture-token');
  return {ok:!unavailable,json:async()=>[{leads,factory:{candidates}}]};
 }
 if(u.pathname.startsWith('/company/')){const c=candidates.find(c=>c.companyNumber===u.pathname.split('/').pop());return {ok:true,json:async()=>({...profile(c),...overrides[c.companyNumber]})}}
 if(u.pathname==='/advanced-search/companies')return {ok:true,status:200,json:async()=>({items:candidates.map(c=>({company_name:c.company,company_number:c.companyNumber,company_status:'active',company_type:'ltd',sic_codes:c.sicCodes,date_of_creation:c.incorporated}))})};
 if(u.hostname==='api.search.brave.com'){
  brave++;assert.equal(options.headers.Authorization,undefined,'never forward account JWT to provider');
  return {ok:providerStatus===200,status:providerStatus,json:async()=>({web:{results:[]}})};
 }
 throw Error('Unexpected fixture URL');
};
async function invoke(body){const r={statusCode:200,setHeader(){},end(s){this.body=JSON.parse(s)}};await handler({method:'POST',headers:{authorization:'Bearer fixture-token'},body},r);return r}
async function saved(rows){return invoke({mode:'web-enrich',candidates:rows})}
(async()=>{try{
 candidates=[candidate(1)];
 // Fresh official facts override optimistic browser SIC/age fields.
 for(const patch of [{sic_codes:['78109']},{date_of_creation:new Date().toISOString().slice(0,10)},{type:'llp'},{sic_codes:[]},{accounts:{last_accounts:{type:'dormant'}}},{accounts:{last_accounts:{type:'small'},next_accounts:{overdue:true}}},{company_status:'dissolved'},{company_status_detail:'active-proposal-to-strike-off'},{sic_codes:['78200','70100']}]){
  overrides={[candidates[0].companyNumber]:patch};const before=brave,r=await saved(candidates);
  assert.equal(r.statusCode,200);assert.equal(brave,before,'held company spends zero requests: '+JSON.stringify(patch));
  assert.equal(r.body.preSearchHeld,1);assert.equal(r.body.webCompleted,0);assert.match(r.body.updates[0].reason,/Pre-search:/);
 }
 overrides={};leads=[{company:candidates[0].company,companyNumber:'',status:'Take Me Off the List'}];
 let before=brave,r=await saved(candidates);assert.equal(r.statusCode,200);assert.equal(brave,before,'all existing leads blocked, including opt-outs');assert.equal(r.body.knownSkipped,1);
 leads=[];candidates[0].webCheckedAt=now;
 r=await saved(candidates);assert.equal(r.statusCode,409);assert.equal(brave,before,'already researched saved name is blocked server-side');delete candidates[0].webCheckedAt;
 candidates[0].status='held';r=await saved(candidates);assert.equal(r.statusCode,409);assert.equal(brave,before);candidates[0].status='unchecked';
 r=await saved([candidates[0],candidates[0]]);assert.equal(r.statusCode,409);assert.equal(brave,before,'duplicate batch costs zero');
 unavailable=true;r=await saved(candidates);assert.equal(r.statusCode,503);assert.equal(brave,before,'cloud screening outage fails closed');unavailable=false;
 candidates=Array.from({length:4},(_,i)=>candidate(i+1,i%2?'goods':'recruitment'));r=await saved(candidates);
 assert.equal(r.statusCode,200);assert.equal(brave-before,8,'four eligible companies, mixed sectors, at most eight requests');assert.equal(r.body.webCompleted,4);
 before=brave;providerStatus=429;r=await saved(candidates);assert.equal(r.statusCode,429);assert.ok(brave-before<=2,'in-flight pair stops later sectors/batches on rate limit');providerStatus=200;
 // Discovery must not spend again on names already banked, dismissed or researched.
 candidates=Array.from({length:4},(_,i)=>candidate(i+1));
 before=brave;r=await invoke({profile:'recruitment',cursor:0});assert.equal(r.statusCode,200);assert.equal(brave,before);assert.equal(r.body.knownSkipped,4);
 // Discover twelve genuinely new names, only four of which meet the free gates.
 const newly=Array.from({length:12},(_,i)=>candidate(i+20));
 const previousFetch=global.fetch;global.fetch=async(url,opts)=>{
  const u=new URL(url);
  if(u.pathname==='/advanced-search/companies')return {ok:true,status:200,json:async()=>({items:newly.map(c=>({company_name:c.company,company_number:c.companyNumber,company_status:'active',company_type:'ltd',sic_codes:['78200'],date_of_creation:'2016-01-01'}))})};
  if(u.pathname.startsWith('/company/')){const i=newly.findIndex(c=>c.companyNumber===u.pathname.split('/').pop());return {ok:true,json:async()=>({...profile(newly[i]),...(i>=4?{sic_codes:['78109']}:{})})}}
  return previousFetch(url,opts);
 };
 before=brave;r=await invoke({profile:'recruitment',cursor:0});assert.equal(r.statusCode,200);assert.equal(r.body.preSearchHeld,8);assert.equal(r.body.preSearchPassed,4);assert.equal(brave-before,8);
 assert.ok(r.body.items.every(c=>c.priority<=35),'registry fit does not prove cross-border exposure');
 assert.ok(!JSON.stringify(r.body).includes('fake-brave'));
 console.log('PASS: free fit gates, authoritative registry facts, zero-credit holds/duplicates, account-scoped fail-closed screening, batch caps and discovery gates.');
}catch(e){console.error(e);process.exitCode=1}finally{global.fetch=original}})();
