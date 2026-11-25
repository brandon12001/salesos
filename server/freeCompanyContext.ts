import {researchNameKey} from '../src/lib/researchScreen.js';
import type {CompanyContext,HMRCContext,GLEIFContext} from '../src/lib/companyContext.js';
import {hmrcNameKey,hmrcPostcode,hmrcWindow,hmrcQualified,tradeActivity} from '../src/lib/companyContext.js';
type Company={company:string;companyNumber:string;sector:'recruitment'|'goods';postalCode?:string};
const HMRC='https://api.uktradeinfo.com',GLEIF='https://api.gleif.org/api/v1';
const hmrcSource='https://www.uktradeinfo.com/search/traders/';
const gleifSource='https://www.gleif.org/en/lei-data/gleif-api';
export async function freeGet(url:string){
 // URLs are assembled from fixed provider origins, never from provider links.
 const r=await fetch(url,{headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(4500)});
 if(!r.ok)throw Error('Provider unavailable');return r.json();
}
const get=freeGet;
export function hmrcTradeQuery(id:number,now:Date){
 const {from,to}=hmrcWindow(now);
 return new URLSearchParams({'$filter':`TraderId eq ${id} and MonthId ge ${from} and MonthId le ${to}`,'$top':'12','$select':'TraderId,TradeTypeId,MonthId,CommodityId','$expand':'Commodity($select=Hs2Code,Hs2Description)'});
}
export function hmrcActivityQuery(id:number,now:Date){
 const {from,to}=hmrcWindow(now);
 return new URLSearchParams({'$apply':`filter(TraderId eq ${id} and MonthId ge ${from} and MonthId le ${to})/groupby((TraderId,MonthId,TradeTypeId))`,'$top':'25'});
}
export async function hmrcActivity(id:number,now:Date):Promise<HMRCContext['activity']>{
 try{
  const query=hmrcActivityQuery(id,now),result=await get(HMRC+'/Trade?'+query),{from,to}=hmrcWindow(now);
  if(!Array.isArray(result.value)||!result.value.length||result.value.length>24||result['@odata.nextLink'])return undefined;
  const rows=result.value;
  if(rows.some((x:any)=>x.TraderId!==id||!Number.isInteger(x.MonthId)||x.MonthId<from||x.MonthId>to||x.MonthId%100<1||x.MonthId%100>12||![1,2].includes(x.TradeTypeId))||new Set(rows.map((x:any)=>x.MonthId+':'+x.TradeTypeId)).size!==rows.length)return undefined;
  return {from,to,months:[...new Set<number>(rows.map((x:any)=>x.MonthId))].sort().reverse(),checkedAt:now.toISOString(),sourceUrl:HMRC+'/Trade?'+query};
 }catch{return undefined} // Incomplete coverage must never become a frequency score.
}
export function hmrcTradeContext(trader:{TraderId:number;CompanyName:string;PostCode:string},rows:any[],now:Date):HMRCContext{
 const id=trader.TraderId,{from,to}=hmrcWindow(now);
 const sample=rows.slice(0,12).filter((x:any)=>x.TraderId===id&&Number.isInteger(x.MonthId)&&x.MonthId>=from&&x.MonthId<=to&&x.MonthId%100>=1&&x.MonthId%100<=12&&[1,2].includes(x.TradeTypeId));
 if(!sample.length)return {status:'unknown',sourceUrl:hmrcSource,traderId:id,checkedAt:now.toISOString(),summary:'Trader matched, but no recent goods-trade entries returned. Missing data does not establish inactivity.'};
 return {status:'observed',sourceUrl:HMRC+'/Trade?'+hmrcTradeQuery(id,now),traderId:id,checkedAt:now.toISOString(),matchedName:trader.CompanyName,matchedPostcode:trader.PostCode,
  months:[...new Set<number>(sample.map(x=>x.MonthId))].sort().reverse(),directions:[...new Set<string>(sample.map(x=>x.TradeTypeId===1?'Imports observed':'Exports observed'))],
  products:[...new Set<string>(sample.map(x=>String(x.Commodity?.Hs2Description||'').slice(0,160)).filter(Boolean))].slice(0,4),
  summary:'Recent goods-trade entries matched by legal name and registry postcode. Research fit evidenced; payment currencies, amounts and treasury authority are unverified.'};
}
async function hmrc(c:Company,now:Date):Promise<HMRCContext>{
 if(c.sector!=='goods')return {status:'not-applicable',sourceUrl:hmrcSource,summary:'HMRC goods-trade data does not cover recruitment services.'};
 if(!c.postalCode)return {status:'unknown',sourceUrl:hmrcSource,summary:'Registry postcode unavailable; no HMRC company match asserted.'};
 const prefix=c.company.toLowerCase().match(/[a-z0-9]{3,}/)?.[0];
 if(!prefix)return {status:'unknown',sourceUrl:hmrcSource,summary:'Company name is too ambiguous for a safe HMRC match.'};
 try{
  const qs=new URLSearchParams({'$filter':"startswith(tolower(CompanyName),'"+prefix+"')",'$select':'TraderId,CompanyName,PostCode','$top':'10'});
  const found=await get(HMRC+'/Trader?'+qs);
  if(!Array.isArray(found.value))throw Error('Invalid trader response');
  const matches=found.value.filter((x:any)=>hmrcNameKey(x.CompanyName)===hmrcNameKey(c.company)&&hmrcPostcode(x.PostCode)===hmrcPostcode(c.postalCode!));
  if(matches.length!==1||!Number.isSafeInteger(matches[0].TraderId)||matches[0].TraderId<=0)
   return {status:'unknown',sourceUrl:hmrcSource,summary:'No unique HMRC name-and-postcode match in the bounded search. Coverage is incomplete; this is not evidence of no overseas trade.'};
  const id=matches[0].TraderId;
  const query=hmrcTradeQuery(id,now);
  const [result,activity]=await Promise.all([get(HMRC+'/Trade?'+query),hmrcActivity(id,now)]);
  if(!Array.isArray(result.value))throw Error('Invalid trade response');
  return {...hmrcTradeContext(matches[0],result.value,now),activity};
 }catch{return {status:'error',sourceUrl:hmrcSource,summary:'HMRC lookup unavailable; no negative conclusion drawn. Retry after the provider recovers.'}}
}
async function gleif(c:Company):Promise<GLEIFContext>{
 const authority=/^\d{8}$/.test(c.companyNumber)?'RA000585':/^NI\d{6}$/.test(c.companyNumber)?'RA000586':/^SC\d{6}$/.test(c.companyNumber)?'RA000587':'';
 if(!authority)return {status:'unknown',sourceUrl:gleifSource,summary:'Registration authority is outside this lookup’s supported UK registers.'};
 try{
  const qs=new URLSearchParams({'filter[entity.registeredAt]':authority,'filter[entity.registeredAs]':c.companyNumber,'page[size]':'2'});
  const result=await get(GLEIF+'/lei-records?'+qs);
  if(!Array.isArray(result.data))throw Error('Invalid LEI response');
  const matches=result.data.filter((x:any)=>x.attributes?.entity?.registeredAt?.id===authority&&x.attributes.entity.registeredAs===c.companyNumber&&researchNameKey(x.attributes.entity.legalName?.name)===researchNameKey(c.company));
  if(matches.length!==1||!/^[A-Z0-9]{20}$/.test(matches[0].id))return {status:'unknown',sourceUrl:gleifSource,summary:'No unique matching LEI found. Many private companies have no LEI; ownership remains unknown.'};
  const record=matches[0],lei=record.id,status=String(record.attributes.registration?.status||'');
  const sourceUrl=GLEIF+'/lei-records/'+lei;
  if(record.attributes.entity.status!=='ACTIVE'||status!=='ISSUED')return {status:'unknown',sourceUrl,lei,registrationStatus:status,summary:'LEI matched but is not currently active/issued. Ownership needs review; no current parent relationship assumed.'};
  const parents:NonNullable<GLEIFContext['parents']>=[];let incomplete=false;
  await Promise.all((['direct','ultimate'] as const).map(async kind=>{
   const expected=sourceUrl+'/'+kind+'-parent';
   if(record.relationships?.[kind+'-parent']?.links?.related!==expected)return;
   try{
    const p=(await get(expected)).data,e=p?.attributes?.entity;
    if(!p||!/^[A-Z0-9]{20}$/.test(p.id)||!e?.legalName?.name||e.status!=='ACTIVE'||p.attributes.registration?.status!=='ISSUED'||!/^[A-Z]{2}$/.test(e.legalAddress?.country))throw Error('Unverified parent');
    parents.push({kind,name:String(e.legalName.name).slice(0,220),lei:p.id,country:e.legalAddress.country,sourceUrl:GLEIF+'/lei-records/'+p.id});
   }catch{incomplete=true}
  }));
  parents.sort((a,b)=>a.kind.localeCompare(b.kind));
  return {status:'matched',sourceUrl,lei,registrationStatus:status,parents,summary:parents.length?'Reported accounting parent relationship(s). This does not establish who controls FX decisions.'+(incomplete?' Some parent lookups failed; ownership context is incomplete.':''):incomplete?'LEI matched; parent lookup unavailable. Ownership remains unknown.':'LEI matched; no usable parent relationship returned. Do not assume independent treasury.'};
 }catch{return {status:'error',sourceUrl:gleifSource,summary:'GLEIF lookup unavailable; ownership remains unknown.'}}
}
export async function freeCompanyContext(c:Company,now=new Date(),previous?:CompanyContext):Promise<CompanyContext>{
 const cached=!previous?.hmrc.refreshErrorAt&&hmrcQualified({...c,registryCheck:{postalCode:c.postalCode},companyContext:previous},now.getTime());
 let tradeCheck:Promise<HMRCContext>;
 if(!cached)tradeCheck=hmrc(c,now);
 else if(tradeActivity({...c,registryCheck:{postalCode:c.postalCode},companyContext:previous},now.getTime()))tradeCheck=Promise.resolve(previous!.hmrc);
 else tradeCheck=hmrcActivity(previous!.hmrc.traderId!,now).then(activity=>({...previous!.hmrc,activity:activity||previous!.hmrc.activity}));
 const [trade,ownership]=await Promise.all([tradeCheck,gleif(c)]);
 return {checkedAt:now.toISOString(),hmrc:{...trade,checkedAt:trade.checkedAt||now.toISOString()},gleif:{...ownership,checkedAt:now.toISOString()}};
}
