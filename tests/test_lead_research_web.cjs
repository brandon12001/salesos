const assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'salesos-fx-web-'));
const build=cp.spawnSync(process.execPath,['node_modules/typescript/bin/tsc','--target','es2022','--module','commonjs','--strict','--skipLibCheck','--outDir',dir,'--rootDir','.','api/lead-research.ts'],{encoding:'utf8'});
if(build.status)throw Error(build.stdout||build.stderr);
const handler=require(path.join(dir,'api/lead-research.js')).default;
process.env.VITE_SUPABASE_URL='https://example.supabase.co';process.env.VITE_SUPABASE_PUBLISHABLE_KEY='fake-public-key';process.env.COMPANIES_HOUSE_API_KEY='fake-ch-key';process.env.BRAVE_SEARCH_API_KEY='fake-brave-key';
const name='Fictional Global Staffing Limited',num='12000123';
const company={company:name,companyNumber:num,sector:'recruitment',sicCodes:['78200'],incorporated:'2018-01-01'};
let braveCalls=0,braveReject=false,empty=false,requests=[];
const original=global.fetch;
global.fetch=async(url,options)=>{
 const u=String(url);requests.push(u);
 if(u.includes('/rest/v1/rpc/salesos_search_budget'))return require('./budget_fixture.cjs')(options);
 if(u.includes('/auth/v1/user'))return {ok:true,json:async()=>({id:'authorized-user'})};
 if(u.includes('/rest/v1/salesos_workspaces'))return {ok:true,json:async()=>[{leads:[],factory:{candidates:[{...company,status:'unchecked'}]}}]};
 if(u.includes('/company/'+num))return {ok:true,status:200,json:async()=>({company_name:name,company_number:num,company_status:'active',type:'ltd',sic_codes:['78200'],date_of_creation:'2018-01-01',accounts:{last_accounts:{type:'small'},next_accounts:{overdue:false}},confirmation_statement:{overdue:false}})};
 if(u.includes('api.search.brave.com')){
  braveCalls++;
  if(braveReject)return {ok:false,status:403};
  return {ok:true,status:200,json:async()=>({web:{results:empty?[]:[braveCalls%2===1?
   {title:'Fictional Global Staffing - International payroll services',description:'Fictional Global Staffing delivers international contractor payroll in 20 countries.',url:'https://company-one.example/payroll'}:
   {title:'Fictional Global Staffing - Cross border services',description:'Fictional Global Staffing provides cross-border contractor payments globally.',url:'https://company-two.example/payments'}]}})};
 }
 throw Error('Unexpected fetch '+u);
};
const request=(body)=>({method:'POST',headers:{authorization:'Bearer test-user'},body});
async function invoke(body){
 const res={statusCode:200,setHeader(){},end(s){this.body=JSON.parse(s)}};
 await handler(request(body),res);return res;
}
(async()=>{
 try{
  const out=await invoke({mode:'web-enrich',candidates:[company]});
  assert.equal(out.statusCode,200);
  assert.equal(out.body.webSearches,2,'two queries per company, with bounded provider credit');
  assert.equal(out.body.webCompleted,1);
  assert.equal(out.body.updates.length,1);
  const found=out.body.updates[0];
  assert.equal(found.id,'ch:'+num);
  assert.ok(found.priority>=80,'two independent strong sources justify research ranking');
  assert.equal(found.registryCheck.risk,'ok');
  assert.equal(found.webQueries,2);
  assert.equal(found.researchConfidence,'Medium');
  assert.equal(found.evidence.filter(x=>x.strength==='strong').length,2);
  assert.match(found.fxHypothesis,/contractor payroll/i);
  assert.match(found.discoveryQuestion,/UK company/i);
  assert.ok(!JSON.stringify(out.body).includes('fake-brave-key'),'never leak secret');
  empty=true;
  const noEvidence=await invoke({mode:'web-enrich',candidates:[company]});
  assert.equal(noEvidence.statusCode,200);
  assert.equal(noEvidence.body.updates[0].priority<=35,true);
  assert.equal(noEvidence.body.updates[0].webQueries,2);
  assert.equal(noEvidence.body.updates[0].evidence.length,0);
  braveReject=true;
  const fail=await invoke({mode:'web-enrich',candidates:[company]});
  assert.equal(fail.statusCode,502,'invalid Brave API key gets actionable error');
  assert.match(fail.body.error,/Brave rejected/i);
  const tooMany=await invoke({mode:'web-enrich',candidates:Array.from({length:5},()=>company)});
  assert.equal(tooMany.statusCode,400,'web calls limited to four companies');
  delete process.env.BRAVE_SEARCH_API_KEY;
  const missing=await invoke({mode:'web-enrich',candidates:[company]});
  assert.equal(missing.statusCode,503);
  console.log('PASS: saved-company FX research uses two budgeted Brave queries, merges independent sources, handles no evidence and invalid key, preserves server-side secrets.');
 }catch(error){console.error(error);process.exitCode=1}finally{global.fetch=original}
})();
