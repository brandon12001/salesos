import {ruleScore,type SearchHit,type Signal} from './rule-score.js';
import {assessRegistry,screenedPriority,PROFILE_LIMIT,type CompanyProfile,type RegistryCheck} from './registry-quality.js';
import {preSearchScreen,sameResearchCompany} from '../src/lib/researchScreen.js';
import {turnoverFit,turnoverTarget,needsCompanyContext,retainContextOnFailure,type TurnoverTarget,type TurnoverEvidence,type CompanyContext} from '../src/lib/companyContext.js';
import {freeCompanyContext} from '../server/freeCompanyContext.js';
import type {IncomingMessage,ServerResponse} from 'node:http';

type Request=IncomingMessage&{body?:unknown};
type Sector='recruitment'|'goods';
const SOURCES:{[K in Sector]:Array<{sic:string;label:string}>}={
 recruitment:[{sic:'78200',label:'Temporary employment agencies'},{sic:'78300',label:'Human resources provision'},{sic:'78109',label:'Employment placement agencies'}],
 goods:[{sic:'46690',label:'Other machinery wholesale'},{sic:'46620',label:'Machine tools wholesale'},{sic:'46610',label:'Agricultural machinery wholesale'},{sic:'46630',label:'Construction machinery wholesale'},{sic:'46520',label:'Electronic equipment wholesale'}]
};
type CHItem={company_name?:string;company_number?:string;company_status?:string;company_type?:string;sic_codes?:string[];date_of_creation?:string};
type ResearchItem={company:string;companyNumber:string;sector:Sector;sicCodes:string[];incorporated:string;sourceUrl:string;priority:number;reason:string;foundAt:string;registryCheck:RegistryCheck;researchMethod?:'registry-only'|'web-rule-screen';researchConfidence?:'Low'|'Medium';evidence?:Signal[];webCheckedAt?:string;webQueries?:number;fxHypothesis?:string;discoveryQuestion?:string};
type KnownCompany={company:string;companyNumber?:string;sector?:Sector;status?:string;webCheckedAt?:string;turnover?:TurnoverEvidence;companyContext?:CompanyContext};
type WorkspaceScreen={leads:KnownCompany[];factory:{candidates:KnownCompany[];turnoverTarget?:TurnoverTarget}|null};
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
 return {registryCheck,priority:screenedPriority(sector,registryCheck.sicCodes?.[0]||sic,registryCheck.incorporated||incorporated,registryCheck)};
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
async function enrichWeb(items:ResearchItem[],blocked:KnownCompany[]=[],known?:WorkspaceScreen,enabled=true){
 const target=turnoverTarget(known?.factory?.turnoverTarget);
 const screened=items.map(c=>{
  const registry=preSearchScreen(c.sector,c.registryCheck),saved=known?.factory?.candidates.find(k=>sameResearchCompany(k,c));
  const fit=turnoverFit(saved?.turnover,target);
  return {c,gate:{eligible:registry.eligible&&fit.eligible,reasons:[...registry.reasons,fit.reason]}};
 });
 const eligible=screened.filter(({c,gate})=>gate.eligible&&!blocked.some(b=>sameResearchCompany(c,b)))
  .map(({c})=>c).sort((a,b)=>b.priority-a.priority).slice(0,MAX_WEB_COMPANIES);
 const preSearchHeld=screened.filter(({gate})=>!gate.eligible).length;
 const knownSkipped=screened.filter(({c,gate})=>gate.eligible&&blocked.some(b=>sameResearchCompany(c,b))).length;
 for(const {c,gate} of screened){
  c.reason+=' Pre-search: '+(blocked.some(b=>sameResearchCompany(c,b))?'Already tracked in SalesOS; no search credits spent.':gate.reasons.join(' '));
 }
 const screening={preSearchPassed:screened.length-preSearchHeld-knownSkipped,preSearchHeld,knownSkipped};
 const searchKey=process.env.BRAVE_SEARCH_API_KEY;
 if(!searchKey||!enabled)return {...screening,webSearches:0,webErrors:0,webResearchEnabled:false,webCompleted:0,authRejected:false,rateLimited:false};
 let webSearches=0,webErrors=0,webCompleted=0,authRejected=false,rateLimited=false;
 await batches(eligible,2,async c=>{
  const hits:SearchHit[]=[],unique=new Set<string>();let completed=0;
  for(const q of webQueries(c.company,c.sector)){
   if(authRejected||rateLimited)break;
   try{
    webSearches++;
    const response=await fetch('https://api.search.brave.com/res/v1/web/search?'+new URLSearchParams({q,count:'10'}),{
     headers:{'X-Subscription-Token':searchKey,Accept:'application/json'},signal:AbortSignal.timeout(5500)});
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
   const result=ruleScore(c.company,c.sector,c.priority,hits.slice(0,20));
   c.priority=result.priority;c.reason+=' '+result.reason;
   c.researchMethod=result.researchMethod;c.researchConfidence=result.researchConfidence;c.evidence=result.signals;
   c.fxHypothesis=result.fxHypothesis;c.discoveryQuestion=result.discoveryQuestion;
   c.webCheckedAt=new Date().toISOString();c.webQueries=completed;webCompleted++;
  }
 });
 return {...screening,webSearches,webErrors,webResearchEnabled:true,webCompleted,authRejected,rateLimited};
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
  // Read only this authenticated user's RLS-protected workspace. Fail closed
  // when duplicate/suppression context is unavailable; never spend speculatively.
  let known:WorkspaceScreen={leads:[],factory:null};
  if(input.mode!=='recheck'){
   const query=new URLSearchParams({select:'leads:payload->leads,factory:payload->meta->leadFactory',user_id:'eq.'+user.id,limit:'1'});
   const saved=await fetch(url.replace(/\/$/,'')+'/rest/v1/salesos_workspaces?'+query,{headers:{apikey:publishable,Authorization:'Bearer '+token},signal:AbortSignal.timeout(9000)});
   if(!saved.ok)return respond(res,503,{error:'Could not check your saved companies. No search credits spent; retry when cloud saving is available.'});
   const rows=await saved.json() as WorkspaceScreen[];
   if(!Array.isArray(rows)||rows.length!==1||!Array.isArray(rows[0]?.leads)||(rows[0].factory!==null&&!Array.isArray(rows[0].factory?.candidates)))
    return respond(res,503,{error:'Saved company screening was unavailable. No search credits spent.'});
   if(rows[0])known=rows[0];
  }
  if(input.mode==='web-enrich'||input.mode==='free-context'){
   const cs=input.candidates;
   if(!Array.isArray(cs)||!cs.length||cs.length>MAX_WEB_COMPANIES||
    cs.some(x=>!x||!validNumber(x.companyNumber)||!['recruitment','goods'].includes(x.sector)||
     typeof x.company!=='string'||!x.company.trim()||x.company.length>220||
     !Array.isArray(x.sicCodes)||x.sicCodes.length>6||x.sicCodes.some(z=>!/^\d{5}$/.test(z))||
     typeof x.incorporated!=='string'||x.incorporated.length>15))
    return respond(res,400,{error:'Select up to four existing companies for web research.'});
   if(new Set(cs.map(c=>c.companyNumber.toUpperCase())).size!==cs.length||
    cs.some(c=>!known.factory?.candidates.some(s=>s.companyNumber===c.companyNumber.toUpperCase()&&s.company===c.company&&s.sector===c.sector&&s.status==='unchecked'&&(input.mode==='free-context'||!s.webCheckedAt))))
    return respond(res,409,{error:'A selected company is already researched, unavailable or not saved yet. Refresh the queue after cloud saving completes.'});
   if(input.mode==='web-enrich'&&!process.env.BRAVE_SEARCH_API_KEY)return respond(res,503,{error:'Add the Brave Search server-side key before running website research.'});
   const checks:ResearchItem[]=await batches(cs,4,async c=>{
    const companyNumber=c.companyNumber.toUpperCase();
    const screening=await screen(c.company,companyNumber,c.sector,c.sicCodes[0]||'',c.incorporated,chAuth,now);
    return {company:c.company,companyNumber,sector:c.sector,sicCodes:c.sicCodes,incorporated:c.incorporated,
     sourceUrl:'https://find-and-update.company-information.service.gov.uk/company/'+companyNumber,
     foundAt:now,reason:'Refreshed official registry screening. Foreign currency flows still require discovery.',
     priority:screening.priority,registryCheck:screening.registryCheck,researchMethod:'registry-only' as const,researchConfidence:'Low' as const};
   });
   if(input.mode==='free-context'){
    if(checks.some(c=>known.leads.some(l=>sameResearchCompany(c,l))))return respond(res,409,{error:'A selected company is already in your prospect workspace. Existing prospects were not researched.'});
    const updates=await batches(checks,2,async c=>{
     const saved=known.factory!.candidates.find(k=>k.companyNumber===c.companyNumber)!;
     const eligible=preSearchScreen(c.sector,c.registryCheck).eligible&&turnoverFit(saved.turnover,known.factory?.turnoverTarget).eligible;
     const companyContext=!eligible?saved.companyContext||{checkedAt:now,hmrc:{status:'unknown' as const,sourceUrl:'https://www.uktradeinfo.com/search/traders/',summary:'Pre-search filters require review; lookup not run.'},gleif:{status:'unknown' as const,sourceUrl:'https://www.gleif.org/en/lei-data/gleif-api',summary:'Pre-search filters require review; lookup not run.'}}:
      saved.companyContext&&!needsCompanyContext(saved.companyContext)?saved.companyContext:retainContextOnFailure(saved.companyContext,await freeCompanyContext({...c,postalCode:c.registryCheck.postalCode},new Date(now)));
     return {id:'ch:'+c.companyNumber,expectedCheckedAt:saved.companyContext?.checkedAt||'',registryCheck:c.registryCheck,companyContext};
    });
    return respond(res,200,{mode:'free-context',updates,braveSearches:0,providerErrors:updates.reduce((n,u)=>n+Number(u.companyContext.hmrc.status==='error'||!!u.companyContext.hmrc.refreshErrorAt)+Number(u.companyContext.gleif.status==='error'||!!u.companyContext.gleif.refreshErrorAt),0)});
   }
   const web=await enrichWeb(checks,known.leads,known);
   const {webSearches,webCompleted,rateLimited,authRejected}=web;
   if(authRejected)return respond(res,502,{error:'Brave rejected the API key (401/403). Check its subscription, permissions or billing status. No results saved.'});
   if(rateLimited&&webCompleted===0)return respond(res,429,{error:'Brave has rate-limited web research. Try later. No results saved.'});
   if(webCompleted===0&&webSearches>0)return respond(res,502,{error:'All Brave searches failed. Check the key/subscription and try again; no results saved.'});
   return respond(res,200,{mode:'web-enrich',updates:checks.map(c=>({
    id:'ch:'+c.companyNumber,registryCheck:c.registryCheck,priority:c.priority,reason:c.reason,
    researchMethod:c.researchMethod,researchConfidence:c.researchConfidence,evidence:c.evidence||[],
    fxHypothesis:c.fxHypothesis||'No specific currency flow evidenced.',discoveryQuestion:c.discoveryQuestion||'Which overseas payments does this company make or receive?',
    webCheckedAt:c.webCheckedAt||'',webQueries:c.webQueries||0
   })),...web});
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
  const web=await enrichWeb(items,[...known.leads,...(known.factory?.candidates||[])],known,input.mode!=='registry-discover');
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
