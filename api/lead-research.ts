import {ruleScore,type SearchHit,type Signal} from './rule-score.js';
import {assessRegistry,screenedPriority,PROFILE_LIMIT,type CompanyProfile,type RegistryCheck} from './registry-quality.js';
import type {IncomingMessage,ServerResponse} from 'node:http';

type Request=IncomingMessage&{body?:unknown};
type Sector='recruitment'|'goods';
const SOURCES:{[K in Sector]:Array<{sic:string;label:string}>}={
 recruitment:[{sic:'78200',label:'Temporary employment agencies'},{sic:'78300',label:'Human resources provision'},{sic:'78109',label:'Employment placement agencies'}],
 goods:[{sic:'46690',label:'Other machinery wholesale'},{sic:'46620',label:'Machine tools wholesale'},{sic:'46610',label:'Agricultural machinery wholesale'},{sic:'46630',label:'Construction machinery wholesale'},{sic:'46520',label:'Electronic equipment wholesale'}]
};
type CHItem={company_name?:string;company_number?:string;company_status?:string;company_type?:string;sic_codes?:string[];date_of_creation?:string};
type ResearchItem={company:string;companyNumber:string;sector:Sector;sicCodes:string[];incorporated:string;sourceUrl:string;priority:number;reason:string;foundAt:string;registryCheck:RegistryCheck;researchMethod?:'registry-only'|'web-rule-screen';researchConfidence?:'Low'|'Medium';evidence?:Signal[];webCheckedAt?:string;webQueries?:number;fxHypothesis?:string;discoveryQuestion?:string};
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
/** Search is explicitly user-triggered and bounded to 8 calls per action.
 * Two distinct queries per entity help surface the PAYMENT MECHANISM, not
 * just generic international marketing claims. No website crawling or AI.
 */
const MAX_WEB_COMPANIES=4;
function webQueries(company:string,sector:Sector){
 const brand=company.replace(/\b(?:LTD|LIMITED|PLC)\b/ig,'').replace(/["\\]/g,'').trim().slice(0,85);
 const quoted='"'+brand+'"';
 return sector==='recruitment'
  ?[quoted+' international contractor payroll payments',quoted+' overseas clients invoicing currencies employer of record']
  :[quoted+' imported equipment overseas manufacturers distributors',quoted+' foreign suppliers invoicing currency Germany Europe Asia'];
}
async function enrichWeb(items:ResearchItem[],profile:Sector){
 const searchKey=process.env.BRAVE_SEARCH_API_KEY;
 if(!searchKey)return {webSearches:0,webErrors:0,webResearchEnabled:false,webCompleted:0};
 let webSearches=0,webErrors=0,webCompleted=0,authRejected=false,rateLimited=false;
 const eligible=items.filter(x=>x.registryCheck.risk==='ok').slice().sort((a,b)=>b.priority-a.priority).slice(0,MAX_WEB_COMPANIES);
 await batches(eligible,2,async c=>{
  const hits:SearchHit[]=[],unique=new Set<string>();let completed=0;
  for(const q of webQueries(c.company,profile)){
   if(authRejected||rateLimited)break;
   try{
    const response=await fetch('https://api.search.brave.com/res/v1/web/search?'+new URLSearchParams({q,count:'10'}),{
     headers:{'X-Subscription-Token':searchKey,Accept:'application/json'},signal:AbortSignal.timeout(5500)});
    webSearches++;
    if(response.status===401||response.status===403){webErrors++;authRejected=true;break}
    if(response.status===429){webErrors++;rateLimited=true;break}
    if(!response.ok){webErrors++;continue}
    const found=await response.json() as {web?:{results?:SearchHit[]}};completed++;
    for(const hit of (Array.isArray(found.web?.results)?found.web!.results!:[]).slice(0,10)){
     if(!hit||typeof hit.url!=='string'||!/^https:\/\//.test(hit.url)||unique.has(hit.url))continue;
     unique.add(hit.url);hits.push(hit);
    }
   }catch{webErrors++}
  }
  if(completed){
   const result=ruleScore(c.company,profile,c.priority,hits.slice(0,20));
   c.priority=result.priority;c.reason+=' '+result.reason;
   c.researchMethod=result.researchMethod;c.researchConfidence=result.researchConfidence;c.evidence=result.signals;
   c.fxHypothesis=result.fxHypothesis;c.discoveryQuestion=result.discoveryQuestion;
   c.webCheckedAt=new Date().toISOString();c.webQueries=completed;webCompleted++;
  }
 });
 return {webSearches,webErrors,webResearchEnabled:true,webCompleted,authRejected,rateLimited};
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
  if(input.mode==='web-enrich'){
   const cs=input.candidates;
   if(!Array.isArray(cs)||!cs.length||cs.length>MAX_WEB_COMPANIES||
    cs.some(x=>!x||!validNumber(x.companyNumber)||!['recruitment','goods'].includes(x.sector)||
     typeof x.company!=='string'||!x.company.trim()||x.company.length>220||
     !Array.isArray(x.sicCodes)||x.sicCodes.length>6||x.sicCodes.some(z=>!/^\d{5}$/.test(z))||
     typeof x.incorporated!=='string'||x.incorporated.length>15))
    return respond(res,400,{error:'Select up to four existing companies for web research.'});
   if(!process.env.BRAVE_SEARCH_API_KEY)return respond(res,503,{error:'Add the Brave Search server-side key before running website research.'});
   const checks:ResearchItem[]=await batches(cs,4,async c=>{
    const companyNumber=c.companyNumber.toUpperCase();
    const screening=await screen(c.company,companyNumber,c.sector,c.sicCodes[0]||'',c.incorporated,chAuth,now);
    return {company:c.company,companyNumber,sector:c.sector,sicCodes:c.sicCodes,incorporated:c.incorporated,
     sourceUrl:'https://find-and-update.company-information.service.gov.uk/company/'+companyNumber,
     foundAt:now,reason:'Refreshed official registry screening. Foreign currency flows still require discovery.',
     priority:screening.priority,registryCheck:screening.registryCheck,researchMethod:'registry-only' as const,researchConfidence:'Low' as const};
   });
   let webSearches=0,webErrors=0,webCompleted=0,rateLimited=false,authRejected=false;
   for(const sector of ['recruitment','goods'] as const){
    const subset=checks.filter(c=>c.sector===sector);
    if(!subset.length)continue;
    const out=await enrichWeb(subset,sector);
    webSearches+=out.webSearches;webErrors+=out.webErrors;webCompleted+=out.webCompleted;
    rateLimited=rateLimited||out.rateLimited;authRejected=authRejected||out.authRejected;
   }
   if(authRejected)return respond(res,502,{error:'Brave rejected the API key (401/403). Check its subscription, permissions or billing status. No results saved.'});
   if(rateLimited&&webCompleted===0)return respond(res,429,{error:'Brave has rate-limited web research. Try later. No results saved.'});
   if(webCompleted===0&&checks.some(c=>c.registryCheck.risk==='ok'))return respond(res,502,{error:'All Brave searches failed. Check the key/subscription and try again; no results saved.'});
   return respond(res,200,{mode:'web-enrich',updates:checks.map(c=>({
    id:'ch:'+c.companyNumber,registryCheck:c.registryCheck,priority:c.priority,reason:c.reason,
    researchMethod:c.researchMethod,researchConfidence:c.researchConfidence,evidence:c.evidence||[],
    fxHypothesis:c.fxHypothesis||'No specific currency flow evidenced.',discoveryQuestion:c.discoveryQuestion||'Which overseas payments does this company make or receive?',
    webCheckedAt:c.webCheckedAt||'',webQueries:c.webQueries||0
   })),webSearches,webErrors,webCompleted,rateLimited,webResearchEnabled:true});
  }
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
   disclaimer:'A public search snippet is an unverified clue; these scores never confirm FX volumes, currencies, decision authority or revenue. No AI.'});
 }catch(error){
  const message=error instanceof Error?error.message:'Research failed.';
  respond(res,502,{error:/abort|timeout/i.test(message)?'Registry service timed out; no changes saved.':'Research service unavailable; no companies saved.'});
 }
}
