import {ruleScore,type SearchHit} from './rule-score.js';
import {assessRegistry,screenedPriority,PROFILE_LIMIT,type CompanyProfile,type RegistryCheck} from './registry-quality.js';
import type {IncomingMessage,ServerResponse} from 'node:http';

type Request=IncomingMessage&{body?:unknown};
type Sector='recruitment'|'goods';
const SOURCES:{[K in Sector]:Array<{sic:string;label:string}>}={
 recruitment:[{sic:'78200',label:'Temporary employment agencies'},{sic:'78300',label:'Human resources provision'},{sic:'78109',label:'Employment placement agencies'}],
 goods:[{sic:'46690',label:'Other machinery wholesale'},{sic:'46620',label:'Machine tools wholesale'},{sic:'46610',label:'Agricultural machinery wholesale'},{sic:'46630',label:'Construction machinery wholesale'},{sic:'46520',label:'Electronic equipment wholesale'}]
};
type CHItem={company_name?:string;company_number?:string;company_status?:string;company_type?:string;sic_codes?:string[];date_of_creation?:string};
type ResearchItem={company:string;companyNumber:string;sector:Sector;sicCodes:string[];incorporated:string;sourceUrl:string;priority:number;reason:string;foundAt:string;registryCheck:RegistryCheck;researchMethod?:'registry-only'|'web-rule-screen';researchConfidence?:'Low'|'Medium';evidence?:Array<{label:string;sourceUrl:string;excerpt:string;strength:'strong'|'supporting'}>};
const validNumber=(v:unknown)=>typeof v==='string'&&/^(?:\d{8}|[A-Z]{2}\d{6}|R\d{7})$/.test(v.toUpperCase());
function respond(res:ServerResponse,status:number,body:unknown){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(body))}
async function bodyOf(req:Request){
 if(req.body!==undefined)return typeof req.body==='string'?JSON.parse(req.body):req.body;
 let total=0,text='';for await(const chunk of req){total+=chunk.length;if(total>6500)throw Error('Request too large.');text+=chunk.toString('utf8')}
 return text?JSON.parse(text):{};
}
async function batches<T,U>(items:T[],size:number,fn:(item:T)=>Promise<U>):Promise<U[]>{
 const results:U[]=[];for(let i=0;i<items.length;i+=size)results.push(...await Promise.all(items.slice(i,i+size).map(fn)));
 return results;
}
async function chGet(path:string,auth:string,timeout=4500):Promise<Response>{
 return fetch('https://api.company-information.service.gov.uk'+path,{headers:{Authorization:auth,Accept:'application/json'},signal:AbortSignal.timeout(timeout)});
}
async function screen(company:string,number:string,sector:Sector,sic:string,incorporated:string,auth:string,now:string){
 let profile:CompanyProfile|null=null;
 try{const r=await chGet('/company/'+encodeURIComponent(number),auth);if(r.ok)profile=await r.json() as CompanyProfile}catch{}
 const registryCheck=assessRegistry(company,number,profile,now);
 return {registryCheck,priority:screenedPriority(sector,sic,incorporated,registryCheck)};
}
async function enrichWeb(items:ResearchItem[],profile:Sector){
 const searchKey=process.env.BRAVE_SEARCH_API_KEY;
 if(!searchKey)return {webSearches:0,webErrors:0,webResearchEnabled:false};
 let webSearches=0,webErrors=0;
 const eligible=items.filter(x=>x.registryCheck.risk==='ok').slice().sort((a,b)=>b.priority-a.priority).slice(0,8);
 await batches(eligible,4,async c=>{
  try{
   const phrase=profile==='recruitment'?'international contractor payroll overseas payments employer of record':'imported machinery overseas supplier official distributor';
   const q='"'+c.company.replace(/"/g,'').slice(0,85)+'" '+phrase;
   const response=await fetch('https://api.search.brave.com/res/v1/web/search?'+new URLSearchParams({q,count:'7'}),{
    headers:{'X-Subscription-Token':searchKey,Accept:'application/json'},signal:AbortSignal.timeout(4500)});
   webSearches++;
   if(!response.ok){webErrors++;return}
   const found=await response.json() as {web?:{results?:SearchHit[]}};
   const result=ruleScore(c.company,profile,c.priority,found.web?.results||[]);
   c.priority=result.priority;c.reason+=' '+result.reason;
   c.researchMethod=result.researchMethod;c.researchConfidence=result.researchConfidence;c.evidence=result.signals;
  }catch{webErrors++}
 });
 return {webSearches,webErrors,webResearchEnabled:true};
}
export default async function handler(req:Request,res:ServerResponse){
 if(req.method!=='POST')return respond(res,405,{error:'Use POST.'});
 const url=process.env.VITE_SUPABASE_URL,publishable=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!publishable)return respond(res,503,{error:'Cloud authentication is not configured.'});
 const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 if(!token||token.length>8192)return respond(res,401,{error:'Sign in to SalesOS first.'});
 try{
  const auth=await fetch(url.replace(/\/$/,'')+'/auth/v1/user',{headers:{apikey:publishable,Authorization:'Bearer '+token},signal:AbortSignal.timeout(9000)});
  if(!auth.ok)return respond(res,401,{error:'Your SalesOS session has expired.'});
  const user=await auth.json() as {id?:string};if(!user.id)return respond(res,401,{error:'SalesOS session is not authorised.'});
  const input=await bodyOf(req) as {mode?:string;profile?:Sector;cursor?:number;candidates?:Array<{company:string;companyNumber:string;sector:Sector;sicCodes:string[];incorporated:string}>};
  const key=process.env.COMPANIES_HOUSE_API_KEY;
  if(!key)return respond(res,503,{error:'Add COMPANIES_HOUSE_API_KEY to Vercel Production environment to run company checks.'});
  const chAuth='Basic '+Buffer.from(key+':').toString('base64'),now=new Date().toISOString();
  if(input.mode==='recheck'){
   const cs=input.candidates;
   if(!Array.isArray(cs)||!cs.length||cs.length>PROFILE_LIMIT||cs.some(x=>!x||!validNumber(x.companyNumber)||!['recruitment','goods'].includes(x.sector)||typeof x.company!=='string'||!x.company.trim()||x.company.length>220||!Array.isArray(x.sicCodes)||x.sicCodes.length>6||x.sicCodes.some(z=>!/^\d{5}$/.test(z))||typeof x.incorporated!=='string'||x.incorporated.length>15))return respond(res,400,{error:'Select up to 12 valid registered companies to re-screen.'});
   const checks=await batches(cs,4,async c=>({id:'ch:'+c.companyNumber.toUpperCase(),...await screen(c.company,c.companyNumber.toUpperCase(),c.sector,c.sicCodes[0]||'',c.incorporated,chAuth,now)}));
   return respond(res,200,{mode:'recheck',checks,checked:checks.length,ready:checks.filter(x=>x.registryCheck.risk==='ok').length});
  }
  if(!input||!input.profile||!Object.hasOwn(SOURCES,input.profile)||!Number.isSafeInteger(input.cursor)||input.cursor!<0||input.cursor!>9999)return respond(res,400,{error:'Select a research sector and valid scan cursor.'});
  const profile=input.profile as Sector,cursor=input.cursor!,choices=SOURCES[profile],source=choices[cursor%choices.length],page=Math.floor(cursor/choices.length);
  const qs=new URLSearchParams({company_status:'active',sic_codes:source.sic,size:String(PROFILE_LIMIT),start_index:String(page*PROFILE_LIMIT)});
  const response=await chGet('/advanced-search/companies?'+qs,chAuth,12000);
  if(response.status===401||response.status===403)return respond(res,502,{error:'Companies House rejected the configured key. Check its type and permissions.'});
  if(response.status===429)return respond(res,429,{error:'Companies House rate limit reached. Retry later.'});
  if(!response.ok)return respond(res,502,{error:'Companies House discovery unavailable ('+response.status+'). No companies saved.'});
  const payload=await response.json() as {items?:CHItem[]};
  const raw=(Array.isArray(payload.items)?payload.items:[]).filter(x=>x.company_status==='active'&&x.company_type==='ltd'&&!!x.company_name&&validNumber(x.company_number)).slice(0,PROFILE_LIMIT);
  const items:ResearchItem[]=await batches(raw,4,async c=>{
   const company=c.company_name!.trim(),companyNumber=c.company_number!.toUpperCase(),incorporated=c.date_of_creation||'';
   const result=await screen(company,companyNumber,profile,source.sic,incorporated,chAuth,now);
   return {company,companyNumber,sector:profile,sicCodes:(c.sic_codes||[]).filter(z=>/^\d{5}$/.test(z)),incorporated,
    sourceUrl:'https://find-and-update.company-information.service.gov.uk/company/'+companyNumber,
    priority:result.priority,registryCheck:result.registryCheck,
    reason:'Companies House SIC '+source.sic+' ('+source.label+'). '+(result.registryCheck.flags.join(' ')||'Active registry profile verified.')+' Foreign currency payments and UK treasury autonomy unverified.',
    researchMethod:'registry-only',researchConfidence:'Low',foundAt:now};
  });
  const web=await enrichWeb(items,profile);
  items.sort((a,b)=>b.priority-a.priority||a.company.localeCompare(b.company));
  respond(res,200,{items,profile,sourceSic:source.sic,resultsScanned:raw.length,nextCursor:cursor+1,runAt:now,...web,
   registryExcluded:items.filter(x=>x.registryCheck.risk==='excluded').length,
   registryFlagged:items.filter(x=>x.registryCheck.risk==='review'||x.registryCheck.risk==='unverified').length,
   disclaimer:'Registry checks identify legal status and filing concerns, not FX demand. Without independent cross-border evidence companies stay in research backlog. No AI.'});
 }catch(error){
  const message=error instanceof Error?error.message:'Research failed.';
  respond(res,502,{error:/abort|timeout/i.test(message)?'Registry service timed out; no changes saved.':'Research service unavailable; no companies saved.'});
 }
}
