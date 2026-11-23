import {ruleScore,type SearchHit} from './rule-score';
import type {IncomingMessage,ServerResponse} from 'node:http';

type Request=IncomingMessage&{body?:unknown};
type Profile='recruitment'|'goods';
const SOURCES:{[K in Profile]:Array<{sic:string;label:string;base:number}>}={
 recruitment:[{sic:'78200',label:'Temporary employment agency activities',base:56},{sic:'78300',label:'Human resources provision and management',base:55},{sic:'78109',label:'Other employment placement agency activities',base:46}],
 goods:[{sic:'46690',label:'Wholesale of other machinery and equipment',base:57},{sic:'46620',label:'Wholesale of machine tools',base:59},{sic:'46610',label:'Wholesale of agricultural machinery',base:57},{sic:'46630',label:'Wholesale of mining and construction machinery',base:58},{sic:'46520',label:'Wholesale of electronic and telecommunications equipment',base:50}]
};
type Result={company_name?:string;company_number?:string;company_status?:string;company_type?:string;sic_codes?:string[];date_of_creation?:string};
function respond(res:ServerResponse,status:number,body:unknown){
 res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(body));
}
async function bodyOf(req:Request){
 if(req.body!==undefined){if(typeof req.body==='string')return JSON.parse(req.body);return req.body;}
 let total=0,body='';for await(const chunk of req){total+=chunk.length;if(total>2000)throw Error('Request too large.');body+=chunk.toString('utf8')}
 return body?JSON.parse(body):{};
}
function score(row:Result,base:number){
 let n=base;const name=(row.company_name||'').toUpperCase();
 if(/\b(HOLDINGS?|INVESTMENTS?|PROPERTIES|MANAGEMENT GROUP)\b/.test(name))n-=15;
 if(/\b(DORMANT|NON TRADING|NON-TRADING)\b/.test(name))n-=25;
 const age=row.date_of_creation?Date.now()-Date.parse(row.date_of_creation+'T00:00:00Z'):0;
 if(age>0&&age<365*86400000)n-=6;
 if(age>4*365*86400000)n+=4;
 return Math.max(12,Math.min(65,n));
}
export default async function handler(req:Request,res:ServerResponse){
 if(req.method!=='POST')return respond(res,405,{error:'Use POST.'});
 const url=process.env.VITE_SUPABASE_URL,publishable=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!publishable)return respond(res,503,{error:'Cloud authentication is not configured for this deployment.'});
 const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 if(!token||token.length>8192)return respond(res,401,{error:'Sign in to SalesOS first.'});
 try{
  const auth=await fetch(url.replace(/\/$/,'')+'/auth/v1/user',{headers:{apikey:publishable,Authorization:'Bearer '+token},signal:AbortSignal.timeout(9000)});
  if(!auth.ok)return respond(res,401,{error:'SalesOS session is not authorised.'});
  const user=await auth.json() as {id?:string};if(!user.id)return respond(res,401,{error:'SalesOS session is not authorised.'});
  const data=await bodyOf(req) as {profile?:Profile;cursor?:number};
  if(!data||!Object.hasOwn(SOURCES,data.profile||'')||!Number.isSafeInteger(data.cursor)||data.cursor!<0||data.cursor!>9999)return respond(res,400,{error:'Select a valid research profile and scan cursor.'});
  const profile=data.profile as Profile,code=+data.cursor!,choices=SOURCES[profile];
  const source=choices[code%choices.length],page=Math.floor(code/choices.length);
  const apiKey=process.env.COMPANIES_HOUSE_API_KEY;
  if(!apiKey)return respond(res,503,{error:'Companies House research is not connected yet. Add a free COMPANIES_HOUSE_API_KEY to the Vercel project Production environment. The key is stored server-side, never in SalesOS.'});
  const qs=new URLSearchParams({company_status:'active',sic_codes:source.sic,size:'50',start_index:String(page*50)});
  const response=await fetch('https://api.company-information.service.gov.uk/advanced-search/companies?'+qs,{
   headers:{Authorization:'Basic '+Buffer.from(apiKey+':').toString('base64'),Accept:'application/json'},signal:AbortSignal.timeout(16000)
  });
  if(response.status===401||response.status===403)return respond(res,502,{error:'Companies House rejected the configured key. Check the production API key.'});
  if(response.status===429)return respond(res,429,{error:'Companies House rate limit reached. Try another scan later.'});
  if(!response.ok)return respond(res,502,{error:'Companies House discovery unavailable ('+response.status+'). No candidates were saved.'});
  const payload=await response.json() as {items?:Result[];hits?:number};
  const now=new Date().toISOString();
  let items: Array<{company:string;companyNumber:string;sector:Profile;sicCodes:string[];incorporated:string;sourceUrl:string;priority:number;reason:string;foundAt:string;researchMethod?:string;researchConfidence?:string;evidence?:Array<{label:string;sourceUrl:string;excerpt:string;strength:'strong'|'supporting'}>}>= (Array.isArray(payload.items)?payload.items:[]).filter(row=>row.company_status==='active'&&!!row.company_name&&/^(\d{8}|[A-Z]{2}\d{6}|R\d{7})$/i.test(row.company_number||'')&&row.company_type==='ltd')
   .map(row=>({
    company:String(row.company_name).trim(),companyNumber:String(row.company_number).toUpperCase(),sector:profile,
    sicCodes:(row.sic_codes||[]).filter(code=>/^\d{5}$/.test(code)),
    incorporated:String(row.date_of_creation||''),
    sourceUrl:'https://find-and-update.company-information.service.gov.uk/company/'+row.company_number,
    priority:score(row,source.base),
    reason:'Companies House confirms an active UK limited company classified under SIC '+source.sic+' ('+source.label+'). Operational international activity, payment currencies, FX volume and decision-making autonomy are unverified. Screening priority only.',
    foundAt:now
   })).sort((a,b)=>b.priority-a.priority||a.company.localeCompare(b.company)).slice(0,50);
  // Optional zero-AI public web corroboration. Hard cap: eight paid/free-credit
  // web searches per scan, sequential, never behind the user's back.
  const searchKey=process.env.BRAVE_SEARCH_API_KEY;
  const maxSearches=searchKey?Math.min(8,items.length):0;
  let webSearches=0,webErrors=0;
  if(searchKey){
   for(let i=0;i<maxSearches;i++){
    const company=items[i];
    try{
     const phrase=profile==='recruitment'?'international contractor payroll overseas payments employer of record':'imported machinery overseas supplier official distributor';
     const query='"'+company.company.replace(/[\x22]/g,'').slice(0,85)+'" '+phrase;
     const web=await fetch('https://api.search.brave.com/res/v1/web/search?'+new URLSearchParams({q:query,count:'7'}),{
      headers:{'X-Subscription-Token':searchKey,Accept:'application/json'},signal:AbortSignal.timeout(5000)
     });
     webSearches++;
     if(web.status===429){webErrors++;break}
     if(!web.ok){webErrors++;continue}
     const found=await web.json() as {web?:{results?:SearchHit[]}};
     const assessment=ruleScore(company.company,profile,company.priority,found.web?.results||[]);
     items[i]={...company,priority:assessment.priority,reason:company.reason+' '+assessment.reason,
      researchMethod:assessment.researchMethod,researchConfidence:assessment.researchConfidence,
      evidence:assessment.signals};
    }catch{webErrors++}
   }
  }
  items=items.sort((a,b)=>b.priority-a.priority||a.company.localeCompare(b.company));
  respond(res,200,{items,profile,sourceSic:source.sic,resultsScanned:(payload.items||[]).length,nextCursor:code+1,runAt:now,
   webSearches,webErrors,webResearchEnabled:!!searchKey,
   disclaimer:'Rule-based screening, not AI. Public search snippets may be inaccurate or refer to other entities. Even high-ranked companies have unverified FX volume, invoice currency and treasury autonomy. Companies House-only scores are limited to 65.'});
 }catch(error){
  const message=error instanceof Error?error.message:'Research failed.';
  respond(res,502,{error:/abort|timeout/i.test(message)?'The research source timed out. Retry later.':'Research failed without importing candidates. Check the configured source and retry.'});
 }
}
