const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),os=require('node:os'),path=require('node:path');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'salesos-factory-api-'));
const p=cp.spawnSync(process.execPath,['node_modules/typescript/bin/tsc','--target','es2022','--module','commonjs','--strict','--skipLibCheck','--outDir',dir,'--rootDir','.','api/lead-research.ts'],{encoding:'utf8'});
if(p.status)throw Error(p.stdout||p.stderr);
const handler=require(path.join(dir,'api/lead-research.js')).default;
process.env.VITE_SUPABASE_URL='https://example.supabase.co';process.env.VITE_SUPABASE_PUBLISHABLE_KEY='fake-public-key';delete process.env.COMPANIES_HOUSE_API_KEY;
function request(body,token='Bearer fake-user-jwt'){return {method:'POST',headers:{authorization:token},body};}
async function invoke(req){
 const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},end(value){this.body=JSON.parse(value)}};
 await handler(req,res);return res;
}
let calls=[];
const original=global.fetch;
global.fetch=async(url,options)=>{
 calls.push({url:String(url),options});
 if(String(url).includes('/auth/v1/user'))return {ok:true,json:async()=>({id:'authorized-user'})};
 return {ok:true,status:200,json:async()=>({hits:2,items:[
  {company_name:'Fictional International Staffing Ltd',company_number:'12000123',company_status:'active',company_type:'ltd',sic_codes:['78200'],date_of_creation:'2018-01-01'},
  {company_name:'Dissolved Agency Ltd',company_number:'12000999',company_status:'dissolved',company_type:'ltd',sic_codes:['78200'],date_of_creation:'2018-01-01'},
  {company_name:'Active LLP',company_number:'SC123456',company_status:'active',company_type:'llp',sic_codes:['78200'],date_of_creation:'2018-01-01'}
 ]})};
};
(async()=>{
 try{
  let r=await invoke(request({profile:'recruitment',cursor:0}));
  assert.equal(r.statusCode,503,'no key returns clear setup error');assert.match(r.body.error,/COMPANIES_HOUSE_API_KEY/);
  assert.equal(calls.filter(c=>c.url.includes('api.company-information')).length,0,'no unauthed source requests');
  process.env.COMPANIES_HOUSE_API_KEY='fake-secret-key';
  r=await invoke(request({profile:'recruitment',cursor:0}));
  assert.equal(r.statusCode,200);
  assert.equal(r.body.items.length,1,'only active limited companies accepted');
  assert.equal(r.body.items[0].companyNumber,'12000123');
  assert.equal(r.body.items[0].sector,'recruitment');
  assert.ok(r.body.items[0].priority<=65,'CH screening cannot claim a high-confidence FX opportunity');
  assert.equal(r.body.items[0].sourceUrl,'https://find-and-update.company-information.service.gov.uk/company/12000123');
  assert.match(r.body.items[0].reason,/unverified/i);
  assert.equal(r.body.nextCursor,1,'cursor advances for next discovery batch');
  assert.equal(r.body.sourceSic,'78200');
  assert.ok(!JSON.stringify(r.body).includes('fake-secret-key'),'API key never returned');
  const ch=calls.find(x=>x.url.includes('api.company-information'));
  assert.ok(ch.url.includes('sic_codes=78200'));assert.ok(ch.url.includes('company_status=active'));
  assert.equal(ch.options.headers.Authorization,'Basic '+Buffer.from('fake-secret-key:').toString('base64'));
  const before=calls.length;r=await invoke(request({profile:'recruitment',cursor:0},''));
  assert.equal(r.statusCode,401);assert.equal(calls.length,before,'unauthorized callers cannot hit register');
  r=await invoke(request({profile:'recruitment',cursor:-1}));assert.equal(r.statusCode,400);
  console.log('PASS: authenticated free-register scanner, server-only key, source-backed SIC screening, safe filtering, no-key and invalid-request responses.');
 }catch(error){console.error(error);process.exitCode=1}finally{global.fetch=original}
})();
