export type TurnoverTarget={min:number;max:number};
export const DEFAULT_TURNOVER_TARGET:TurnoverTarget={min:3_000_000,max:30_000_000};
export type TurnoverEvidence={amount:number;currency:'GBP';periodEnd:string;periodMonths:12;scope:'entity'|'group';sourceUrl:string;recordedAt:string};
export type HMRCContext={status:'observed'|'unknown'|'error'|'not-applicable';sourceUrl:string;summary:string;checkedAt?:string;refreshErrorAt?:string;traderId?:number;months?:number[];directions?:string[];products?:string[]};
export type GLEIFContext={status:'matched'|'unknown'|'error';sourceUrl:string;summary:string;checkedAt?:string;refreshErrorAt?:string;lei?:string;registrationStatus?:string;parents?:Array<{kind:'direct'|'ultimate';name:string;lei:string;country:string;sourceUrl:string}>};
export type CompanyContext={checkedAt:string;hmrc:HMRCContext;gleif:GLEIFContext};
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
 const date=Date.parse(value?.checkedAt||'');
 const ttl=value?.hmrc?.status==='error'||value?.gleif?.status==='error'||value?.hmrc?.refreshErrorAt||value?.gleif?.refreshErrorAt?86400000:7*86400000;
 return !Number.isFinite(date)||date>now+300000||now-date>ttl;
}
/** A provider outage must not erase a previously observed source result. */
export function retainContextOnFailure(previous:CompanyContext|undefined,next:CompanyContext):CompanyContext{
 return {...next,
  hmrc:next.hmrc.status==='error'&&previous?.hmrc.status==='observed'?{...previous.hmrc,checkedAt:previous.hmrc.checkedAt||previous.checkedAt,refreshErrorAt:next.checkedAt}:next.hmrc,
  gleif:next.gleif.status==='error'&&previous?.gleif.status==='matched'?{...previous.gleif,checkedAt:previous.gleif.checkedAt||previous.checkedAt,refreshErrorAt:next.checkedAt}:next.gleif};
}
/** Validate external metadata before it can enter the saved research registry. */
export function validCompanyContext(c:CompanyContext){
 return !!c&&typeof c.checkedAt==='string'&&Number.isFinite(Date.parse(c.checkedAt))&&
  !!c.hmrc&&['observed','unknown','error','not-applicable'].includes(c.hmrc.status)&&publicSource(c.hmrc.sourceUrl)&&typeof c.hmrc.summary==='string'&&c.hmrc.summary.length<=600&&
  !!c.gleif&&['matched','unknown','error'].includes(c.gleif.status)&&publicSource(c.gleif.sourceUrl)&&typeof c.gleif.summary==='string'&&c.gleif.summary.length<=600&&
  (!c.gleif.parents||c.gleif.parents.length<=2&&c.gleif.parents.every(p=>['direct','ultimate'].includes(p.kind)&&/^[A-Z0-9]{20}$/.test(p.lei)&&typeof p.name==='string'&&p.name.length<=220&&/^[A-Z]{2}$/.test(p.country)&&publicSource(p.sourceUrl)));
}
