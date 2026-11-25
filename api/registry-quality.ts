/** Evidence-preserving Companies House profile validation.
 * Legal status and filing health are not evidence of foreign-currency payments.
 * A negative or unavailable profile must never upgrade a prospect.
 */
export type RegistryRisk='ok'|'review'|'excluded'|'unverified';
export type RegistryCheck={
 checkedAt:string; risk:RegistryRisk; flags:string[];
 companyStatus:string; statusDetail:string; accountsType:string;
 accountsOverdue:boolean; confirmationOverdue:boolean;
 sicCodes?:string[]; incorporated?:string; companyType?:string;
};
export type CompanyProfile={
 company_name?:string; company_number?:string; company_status?:string; company_status_detail?:string;
 accounts?:{last_accounts?:{type?:string};overdue?:boolean;next_accounts?:{overdue?:boolean}};
 confirmation_statement?:{overdue?:boolean}; has_insolvency_history?:boolean;
 has_been_liquidated?:boolean;
 sic_codes?:string[]; date_of_creation?:string; type?:string;
};
export const PROFILE_LIMIT=12;
const HOLDING=/\b(HOLDINGS?|INVESTMENT(S)?|PROPERTY HOLDINGS?|GROUP HOLDCO)\b/i;
export function registryBase(sector:'recruitment'|'goods',sic:string,incorporated:string){
 const recruitment:Record<string,number>={'78200':23,'78300':27,'78109':18};
 const goods:Record<string,number>={'46690':27,'46620':29,'46610':25,'46630':28,'46520':22};
 const base=(sector==='recruitment'?recruitment:goods)[sic]||18;
 const age=Date.parse(incorporated+'T00:00:00Z');
 const years=Number.isFinite(age)?(Date.now()-age)/(365.25*86400000):0;
 return Math.max(10,Math.min(35,base+(years>=8?3:years>=3?1:years<1?-3:0)));
}
export function assessRegistry(name:string,number:string,profile:CompanyProfile|null,now=new Date().toISOString()):RegistryCheck{
 const blank={checkedAt:now,companyStatus:'',statusDetail:'',accountsType:'',accountsOverdue:false,confirmationOverdue:false};
 if(!profile||String(profile.company_number||'').toUpperCase()!==number.toUpperCase()){
  return {...blank,risk:'unverified',flags:['Company profile could not be verified. No Salesforce clearance until it is rechecked.']};
 }
 const flags:string[]=[],status=String(profile.company_status||'').toLowerCase(),detail=String(profile.company_status_detail||'').toLowerCase();
 const accountsType=String(profile.accounts?.last_accounts?.type||'').toLowerCase();
 const accountsOverdue=profile.accounts?.next_accounts?.overdue===true||profile.accounts?.overdue===true;
 const confirmationOverdue=profile.confirmation_statement?.overdue===true;
 let risk:RegistryRisk='ok';
 if(status!=='active'){risk='excluded';flags.push('Company status is '+(status||'unknown')+'.')}
 if(detail==='active-proposal-to-strike-off'||detail.includes('strike-off')){risk='excluded';flags.push('Active proposal to strike off.')}
 if(accountsType==='dormant'){risk='excluded';flags.push('Latest accounts filed as dormant.')}
 if(profile.has_been_liquidated===true){risk='excluded';flags.push('History of liquidation; manual verification needed.')}
 if(accountsOverdue){if(risk==='ok')risk='review';flags.push('Accounts overdue.')}
 if(confirmationOverdue){if(risk==='ok')risk='review';flags.push('Confirmation statement overdue.')}
 if(profile.has_insolvency_history){if(risk==='ok')risk='review';flags.push('Insolvency history flagged.')}
 if(HOLDING.test(name)||HOLDING.test(profile.company_name||'')){if(risk==='ok')risk='review';flags.push('Holding/investment entity — identify trading operating company before prospecting.')}
 const canonical=(s:string)=>s.toLowerCase().replace(/\b(ltd|limited|the)\b/g,'').replace(/[^a-z0-9]/g,'');
 if(canonical(profile.company_name||'')!==canonical(name)){
  if(risk==='ok')risk='review';flags.push('Registered name differs; check legal identity.');
 }
 return {...blank,risk,flags,companyStatus:status,statusDetail:detail,accountsType,accountsOverdue,confirmationOverdue,
  sicCodes:Array.isArray(profile.sic_codes)?profile.sic_codes.filter(c=>/^\d{5}$/.test(c)):[],
  incorporated:profile.date_of_creation||'',companyType:profile.type||''};
}
export function screenedPriority(sector:'recruitment'|'goods',sic:string,incorporated:string,check:RegistryCheck){
 const base=registryBase(sector,sic,incorporated);
 if(check.risk==='excluded')return 0;
 if(check.risk==='review')return Math.max(5,base-8);
 if(check.risk==='unverified')return Math.max(5,base-10);
 return base;
}
