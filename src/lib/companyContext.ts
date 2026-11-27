export type TurnoverTarget={min:number;max:number};
export const DEFAULT_TURNOVER_TARGET:TurnoverTarget={min:3_000_000,max:30_000_000};
export type TurnoverEvidence={amount:number;currency:'GBP';periodEnd:string;periodMonths:12;scope:'entity'|'group';sourceUrl:string;recordedAt:string};
export type TradeActivity={from:number;to:number;months:number[];checkedAt:string;sourceUrl:string};
export type HMRCContext={status:'observed'|'unknown'|'error'|'not-applicable';sourceUrl:string;summary:string;checkedAt?:string;refreshErrorAt?:string;traderId?:number;months?:number[];directions?:string[];products?:string[];matchedName?:string;matchedPostcode?:string;activity?:TradeActivity};
export type GLEIFContext={status:'matched'|'unknown'|'error';sourceUrl:string;summary:string;checkedAt?:string;refreshErrorAt?:string;deferred?:boolean;lei?:string;registrationStatus?:string;parents?:Array<{kind:'direct'|'ultimate';name:string;lei:string;country:string;sourceUrl:string}>};
export type CompanyContext={checkedAt:string;hmrc:HMRCContext;gleif:GLEIFContext};
export const hmrcNameKey=(s:unknown)=>typeof s==='string'?s.toLowerCase().replace(/\blimited\b/g,'ltd').replace(/[^a-z0-9]/g,''):'';
export const hmrcPostcode=(s:unknown)=>typeof s==='string'?s.toUpperCase().replace(/\s/g,''):'';
export function hmrcWindow(now=new Date()){
 const m=now.getUTCFullYear()*12+now.getUTCMonth()-11;
 return {from:Math.floor(m/12)*100+m%12+1,to:now.getUTCFullYear()*100+now.getUTCMonth()+1};
}
/** Research fit only: never confirms currency, FX volume or buying interest. */
export function hmrcQualified(c:{company:string;sector:string;registryCheck?:{postalCode?:string};companyContext?:CompanyContext},now=Date.now()){
 const h=c.companyContext?.hmrc,stamp=Date.parse(h?.checkedAt||''),window=hmrcWindow(new Date(now));
 if(c.sector!=='goods'||h?.status!=='observed'||!Number.isSafeInteger(h.traderId)||h.traderId!<=0||
  !Number.isFinite(stamp)||stamp>now+300000||now-stamp>7*86400000||!hmrcPostcode(c.registryCheck?.postalCode)||
  hmrcNameKey(h.matchedName)!==hmrcNameKey(c.company)||hmrcPostcode(h.matchedPostcode)!==hmrcPostcode(c.registryCheck?.postalCode)||
  !Array.isArray(h.months)||!h.months.some(m=>Number.isInteger(m)&&m>=window.from&&m<=window.to&&m%100>=1&&m%100<=12))return false;
 try{const u=new URL(h.sourceUrl),match=u.searchParams.get('$filter')?.match(/^TraderId eq (\d+) and MonthId ge (\d{6}) and MonthId le (\d{6})$/);return u.origin==='https://api.uktradeinfo.com'&&u.pathname==='/Trade'&&!!match&&Number(match[1])===h.traderId&&h.months.some(m=>m>=Number(match[2])&&m<=Number(match[3])&&m>=window.from&&m<=window.to)}catch{return false}
}
/** Distinct recorded months, never shipments, turnover or FX volume. */
export function tradeActivity(c:Parameters<typeof hmrcQualified>[0],now=Date.now()){
 const a=c.companyContext?.hmrc.activity,w=hmrcWindow(new Date(now));
 if(!a||!hmrcQualified(c,now)||a.from!==w.from||a.to!==w.to||!Array.isArray(a.months)||!a.months.length||a.months.length>12||new Set(a.months).size!==a.months.length||a.months.some(m=>!Number.isInteger(m)||m<w.from||m>w.to||m%100<1||m%100>12))return null;
 const stamp=Date.parse(a.checkedAt);if(!Number.isFinite(stamp)||stamp>now+300000||now-stamp>7*86400000)return null;
 try{
  const u=new URL(a.sourceUrl),expected=`filter(TraderId eq ${c.companyContext!.hmrc.traderId} and MonthId ge ${w.from} and MonthId le ${w.to})/groupby((TraderId,MonthId,TradeTypeId))`;
  if(u.origin!=='https://api.uktradeinfo.com'||u.pathname!=='/Trade'||u.searchParams.get('$apply')!==expected)return null;
 }catch{return null}
 const latest=Math.max(...a.months),age=(Math.floor(w.to/100)-Math.floor(latest/100))*12+w.to%100-latest%100;
 return {months:a.months.length,latest,age};
}
export function tradeActivityRank(c:Parameters<typeof hmrcQualified>[0],now=Date.now()){
 const a=tradeActivity(c,now);return a?a.months*20+(12-a.age):0;
}
export function researchRank(c:Parameters<typeof hmrcQualified>[0]&{turnover?:TurnoverEvidence},target:TurnoverTarget,priority:number,now=Date.now()){
 return Number(turnoverFit(c.turnover,target,now).status==='in-range')*10000000+Number(hmrcQualified(c,now))*1000000+tradeActivityRank(c,now)*100+Math.min(85,Math.max(0,priority));
}
export function validDate(value:string){const n=Date.parse(value+'T00:00:00Z');return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===value}
export function publicSource(value:string){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!['localhost','127.0.0.1','[::1]'].includes(u.hostname)}catch{return false}}
export function turnoverTarget(value?:TurnoverTarget):TurnoverTarget{
 if(value===undefined)return {...DEFAULT_TURNOVER_TARGET};
 if(!value||!Number.isFinite(value.min)||!Number.isFinite(value.max)||value.min<0||value.max<=0||value.min>value.max||value.max>1e12)throw Error('Enter a valid annual turnover range in GBP.');
 return {min:value.min,max:value.max};
}
export function validTurnover(value:TurnoverEvidence){
 return !!value&&Number.isFinite(value.amount)&&value.amount>=0&&value.amount<=1e12&&value.currency==='GBP'&&value.periodMonths===12&&
  ['entity','group'].includes(value.scope)&&validDate(value.periodEnd)&&value.periodEnd<=new Date().toISOString().slice(0,10)&&
  typeof value.recordedAt==='string'&&Number.isFinite(Date.parse(value.recordedAt))&&Date.parse(value.recordedAt)<=Date.now()+300000&&typeof value.sourceUrl==='string'&&value.sourceUrl.length<=1000&&publicSource(value.sourceUrl);
}
export function turnoverFit(evidence?:TurnoverEvidence,target?:TurnoverTarget,now=Date.now()){
 const range=turnoverTarget(target),label='£'+range.min/1e6+'m–£'+range.max/1e6+'m';
 if(!evidence)return {status:'unknown' as const,eligible:true,reason:'Annual turnover unknown; target '+label+'. Missing figures remain eligible.'};
 if(!validTurnover(evidence)||evidence.scope!=='entity'||now-Date.parse(evidence.periodEnd+'T00:00:00Z')>2*366*86400000)
  return {status:'unknown' as const,eligible:true,reason:'Comparable recent company-level annual turnover is unknown; group, stale or unsupported figures do not decide fit.'};
 const eligible=evidence.amount>=range.min&&evidence.amount<=range.max;
 return {status:eligible?'in-range' as const:'outside' as const,eligible,reason:'Recorded company annual turnover £'+(evidence.amount/1e6).toLocaleString('en-GB')+'m (year ended '+evidence.periodEnd+') '+(eligible?'fits':'is outside')+' target '+label+'.'};
}
export function needsCompanyContext(value?:CompanyContext,now=Date.now()){
 const date=Date.parse(value?.checkedAt||''),tradeStamp=Date.parse(value?.hmrc.checkedAt||value?.checkedAt||'');
 const ttl=value?.hmrc?.status==='error'||value?.gleif?.status==='error'||value?.hmrc?.refreshErrorAt||value?.gleif?.refreshErrorAt?86400000:7*86400000;
 return !Number.isFinite(date)||date>now+300000||now-date>ttl||value?.gleif.deferred===true||value?.hmrc.status==='observed'&&(!Number.isFinite(tradeStamp)||now-tradeStamp>7*86400000||!value.hmrc.matchedName||!value.hmrc.matchedPostcode||!value.hmrc.activity||value.hmrc.activity.to!==hmrcWindow(new Date(now)).to||now-Date.parse(value.hmrc.activity.checkedAt)>7*86400000);
}
/** A provider outage must not erase a previously observed source result. */
export function retainContextOnFailure(previous:CompanyContext|undefined,next:CompanyContext):CompanyContext{
 return {...next,
  hmrc:next.hmrc.status==='error'&&previous?.hmrc.status==='observed'?{...previous.hmrc,checkedAt:previous.hmrc.checkedAt||previous.checkedAt,refreshErrorAt:next.checkedAt}:
   next.hmrc.status==='observed'&&!next.hmrc.activity&&previous?.hmrc.activity&&previous.hmrc.traderId===next.hmrc.traderId&&hmrcNameKey(previous.hmrc.matchedName)===hmrcNameKey(next.hmrc.matchedName)&&hmrcPostcode(previous.hmrc.matchedPostcode)===hmrcPostcode(next.hmrc.matchedPostcode)?{...next.hmrc,activity:previous.hmrc.activity}:next.hmrc,
  gleif:next.gleif.status==='error'&&previous?.gleif.status==='matched'?{...previous.gleif,checkedAt:previous.gleif.checkedAt||previous.checkedAt,refreshErrorAt:next.checkedAt}:next.gleif};
}
/** Validate external metadata before it can enter the saved research registry. */
export function validCompanyContext(c:CompanyContext){
 return !!c&&typeof c.checkedAt==='string'&&Number.isFinite(Date.parse(c.checkedAt))&&
  !!c.hmrc&&['observed','unknown','error','not-applicable'].includes(c.hmrc.status)&&publicSource(c.hmrc.sourceUrl)&&typeof c.hmrc.summary==='string'&&c.hmrc.summary.length<=600&&
  (!c.hmrc.activity||Array.isArray(c.hmrc.activity.months)&&c.hmrc.activity.months.length<=12&&c.hmrc.activity.months.every(m=>Number.isInteger(m))&&typeof c.hmrc.activity.checkedAt==='string'&&Number.isFinite(Date.parse(c.hmrc.activity.checkedAt))&&Number.isInteger(c.hmrc.activity.from)&&Number.isInteger(c.hmrc.activity.to)&&publicSource(c.hmrc.activity.sourceUrl))&&
  !!c.gleif&&['matched','unknown','error'].includes(c.gleif.status)&&publicSource(c.gleif.sourceUrl)&&typeof c.gleif.summary==='string'&&c.gleif.summary.length<=600&&
  (!c.gleif.parents||c.gleif.parents.length<=2&&c.gleif.parents.every(p=>['direct','ultimate'].includes(p.kind)&&/^[A-Z0-9]{20}$/.test(p.lei)&&typeof p.name==='string'&&p.name.length<=220&&/^[A-Z]{2}$/.test(p.country)&&publicSource(p.sourceUrl)));
}

// A research-priority score only; never FX volume, currency or buyer readiness.
export function hmrcFitPriority(c:Parameters<typeof hmrcQualified>[0],now=Date.now()){return hmrcQualified(c,now)?(tradeActivity(c,now)?.months||0)>=3?70:65:0}
