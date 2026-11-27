import {assessRegistry,screenedPriority,type CompanyProfile} from '../api/registry-quality.js';
import {preSearchScreen,sameResearchCompany} from '../src/lib/researchScreen.js';
import {hmrcNameKey,hmrcPostcode,hmrcWindow,hmrcQualified,type CompanyContext} from '../src/lib/companyContext.js';
import {freeGet,hmrcTradeQuery,hmrcTradeContext,hmrcActivity} from './freeCompanyContext.js';
import {HMRCProviderError} from './hmrcProvider.js';
type Known={company:string;companyNumber?:string};
type CHGet=(path:string,auth:string,timeout?:number)=>Promise<Response>;
const HMRC='https://api.uktradeinfo.com',SIZE=4;
/** Start from distinct recorded traders, then verify the legal company.
 * Machinery/electrical goods chapters retain the current equipment ICP.
 * No source/provider credentials or Brave calls are used here.
 */
export async function discoverHMRC(cursor:number,now:Date,chAuth:string,chGet:CHGet,known:Known[]){
 const {from,to}=hmrcWindow(now);
 const query=new URLSearchParams({'$apply':`filter(MonthId ge ${from} and MonthId le ${to} and (Commodity/Hs2Code eq '84' or Commodity/Hs2Code eq '85'))/groupby((TraderId))`,'$top':String(SIZE),'$skip':String(cursor*SIZE)});
 const page=await freeGet(HMRC+'/Trade?'+query);
 if(!Array.isArray(page.value))throw Error('Invalid HMRC discovery response');
 const ids=[...new Set<number>(page.value.slice(0,SIZE).map((r:any)=>r.TraderId).filter((id:any)=>Number.isSafeInteger(id)&&id>0))];
 let unmatched=0,knownSkipped=0,sourceErrors=0,providerFailure:HMRCProviderError|undefined;
 const rows=await Promise.all(ids.map(async id=>{
  try{
   const trader=await freeGet(HMRC+`/Trader(${id})?$select=TraderId,CompanyName,PostCode`);
   if(trader.TraderId!==id||typeof trader.CompanyName!=='string'||!trader.CompanyName.trim()||trader.CompanyName.length>220||typeof trader.PostCode!=='string'||!hmrcPostcode(trader.PostCode)){unmatched++;return null}
   if(known.some(k=>sameResearchCompany(k,{company:trader.CompanyName}))){knownSkipped++;return null}
   const qs=new URLSearchParams({q:trader.CompanyName,items_per_page:'5'});
   const search=await chGet('/search/companies?'+qs,chAuth);
   if(!search.ok)throw Error('Registry search unavailable');
   const found=await search.json() as {items?:any[]};
   const matches=(Array.isArray(found.items)?found.items:[]).filter(x=>x.company_status==='active'&&hmrcNameKey(x.title)===hmrcNameKey(trader.CompanyName)&&hmrcPostcode(x.address?.postal_code)===hmrcPostcode(trader.PostCode)&&/^(?:\d{8}|[A-Z]{2}\d{6}|R\d{7})$/.test(x.company_number||''));
   if(matches.length!==1){unmatched++;return null}
   const companyNumber=matches[0].company_number,company=matches[0].title;
   if(known.some(k=>sameResearchCompany(k,{company,companyNumber}))){knownSkipped++;return null}
   const official=await chGet('/company/'+encodeURIComponent(companyNumber),chAuth);
   if(!official.ok)throw Error('Registry profile unavailable');
   const p=await official.json() as CompanyProfile;
   if(hmrcNameKey(p.company_name)!==hmrcNameKey(trader.CompanyName)||hmrcPostcode(p.registered_office_address?.postal_code)!==hmrcPostcode(trader.PostCode)||p.company_number!==companyNumber){unmatched++;return null}
   const registryCheck=assessRegistry(company,companyNumber,p,now.toISOString());
   let hmrc:CompanyContext['hmrc']={status:'unknown',traderId:id,checkedAt:now.toISOString(),sourceUrl:HMRC+'/Trader('+id+')',summary:'Trader discovered in machinery/electrical goods. Detailed trade checks deferred because registry or sector filters require review.'};
   if(preSearchScreen('goods',registryCheck,now.toISOString()).eligible){
    const [trade,activity]=await Promise.all([freeGet(HMRC+'/Trade?'+hmrcTradeQuery(id,now)),hmrcActivity(id,now)]);
    if(!Array.isArray(trade.value))throw Error('Invalid HMRC trade response');
    hmrc={...hmrcTradeContext(trader,trade.value,now),activity};
   }
   const companyContext:CompanyContext={checkedAt:now.toISOString(),hmrc,gleif:{status:'unknown',deferred:true,sourceUrl:'https://www.gleif.org/en/lei-data/gleif-api',summary:'Ownership context not checked in this HMRC-first scan. Manual Salesforce clearance is still required.'}};
   const result={company,companyNumber,sector:'goods' as const,sicCodes:registryCheck.sicCodes||[],incorporated:registryCheck.incorporated||'',
    sourceUrl:'https://find-and-update.company-information.service.gov.uk/company/'+companyNumber,foundAt:now.toISOString(),registryCheck,companyContext,
    priority:screenedPriority('goods',registryCheck.sicCodes?.[0]||'',registryCheck.incorporated||'',registryCheck),researchMethod:'registry-only' as const,researchConfidence:'Low' as const,
    reason:'Discovered from HMRC machinery/electrical goods traders, then matched to Companies House by legal name and postcode. '+(hmrc.status==='observed'?'Matched recorded trade qualifies company research fit only.':'Detailed trade checks deferred by registry or sector filters.')+' FX currencies, volume and UK decision authority are unverified.'};
   return result;
  }catch(error){sourceErrors++;if(error instanceof HMRCProviderError)providerFailure=error;return null}
 }));
 // Provider failure does not advance past potentially missed companies.
 if(providerFailure)throw providerFailure;
 if(sourceErrors)throw Error('HMRC or registry checks were unavailable. No batch saved and no Brave requests spent; retry this page later.');
 const items=rows.filter((x):x is NonNullable<typeof x>=>!!x).filter((c,i,all)=>all.findIndex(x=>x.companyNumber===c.companyNumber)===i);
 return {items,profile:'goods',discoverySource:'hmrc',resultsScanned:ids.length,nextCursor:cursor+1,runAt:now.toISOString(),sourceExhausted:ids.length<SIZE,unmatched,knownSkipped,
  tradeQualified:items.filter(c=>preSearchScreen('goods',c.registryCheck,now.toISOString()).eligible&&hmrcQualified(c,now.getTime())).length,
  registryExcluded:items.filter(c=>c.registryCheck.risk==='excluded').length,registryFlagged:items.filter(c=>c.registryCheck.risk==='review'||c.registryCheck.risk==='unverified').length,
  webSearches:0,webCompleted:0,webErrors:0,webResearchEnabled:false,disclaimer:'Recorded goods trade is evidence of cross-border business activity, not confirmed FX need, turnover or buyer readiness.'};
}
