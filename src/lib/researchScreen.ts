/** Free registry facts decide where scarce web-search credits are spent.
 * These are fit heuristics, never evidence of FX exposure or company size.
 */
export type ScreenRegistry={
 risk:string; checkedAt:string; accountsType:string;
 sicCodes?:string[]; incorporated?:string; companyType?:string;
};
export const TARGET_SICS={
 recruitment:['78200','78300'],
 goods:['46690','46620','46610','46630','46520']
} as const;
export const researchNameKey=(name:string)=>String(name||'').toLowerCase().replace(/\b(?:limited|ltd|plc|the)\b/g,'').replace(/[^a-z0-9]/g,'');
export function needsRegistryRefresh(check?:ScreenRegistry,now=Date.now()){
 const stamp=Date.parse(check?.checkedAt||'');
 return !check?.companyType||!check.incorporated||!Array.isArray(check.sicCodes)||!Number.isFinite(stamp)||stamp>now+300000||now-stamp>30*86400000;
}
export function sameResearchCompany(a:{company:string;companyNumber?:string},b:{company:string;companyNumber?:string}){
 const number=(v?:string)=>String(v||'').replace(/\s/g,'').toUpperCase();
 return (!!number(a.companyNumber)&&number(a.companyNumber)===number(b.companyNumber))||
  (!!researchNameKey(a.company)&&researchNameKey(a.company)===researchNameKey(b.company));
}
export function preSearchScreen(sector:'recruitment'|'goods',check?:ScreenRegistry,now=new Date().toISOString()){
 const reasons:string[]=[];
 if(!check||check.risk!=='ok')reasons.push('Verify an active trading company with acceptable filings first.');
 if(!check?.companyType||!Array.isArray(check.sicCodes)||!check.incorporated)
  reasons.push('Refresh the official registry profile to verify business type and company age.');
 else{
  if(check.companyType!=='ltd')reasons.push('Outside the UK private limited company target.');
  const codes=check.sicCodes;
  if(codes.some(c=>c==='99999'||c==='74990'||/^642\d\d$/.test(c)||c==='70100'))
   reasons.push('Non-trading, holding or head-office classification needs manual review.');
  if(!(TARGET_SICS[sector] as readonly string[]).some(c=>codes.includes(c)))
   reasons.push(sector==='recruitment'?'Generic placement alone is too broad: prioritise temporary staffing or HR provision.':'Outside the selected machinery/equipment wholesale SIC targets.');
  const date=check.incorporated,stamp=Date.parse(date+'T00:00:00Z');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(stamp)||new Date(stamp).toISOString().slice(0,10)!==date||stamp>Date.parse(now))
   reasons.push('Incorporation date is missing or invalid.');
  else if(date>String(Number(now.slice(0,4))-2)+now.slice(4,10))
   reasons.push('Under two years old: hold search credits for more established companies.');
 }
 if(!check?.accountsType||['null','no-accounts-type-available','dormant'].includes(check.accountsType))
  reasons.push('A completed non-dormant accounts filing is required before web research.');
 const checked=Date.parse(check?.checkedAt||''),time=Date.parse(now);
 if(!Number.isFinite(checked)||checked>time+300000||time-checked>30*86400000)
  reasons.push('Registry verification is missing or older than 30 days; refresh it first.');
 return {eligible:reasons.length===0,reasons:reasons.length?reasons:[
  'Established private limited company; acceptable registry/filing checks; targeted '+(sector==='recruitment'?'staffing/HR provision':'equipment wholesale')+' SIC. FX need remains unverified.'
 ]};
}
