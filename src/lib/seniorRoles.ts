// Deliberately exact. A seniority band or a substring is never an approved role.
export const SENIOR_TITLES=['Managing Director','MD','Chief Executive Officer','CEO','Chief Financial Officer','CFO','Finance Director','Director of Finance','Financial Director','FD','Head of Finance'] as const;
export type SeniorRole='MD'|'CEO'|'CFO'|'FD'|'Head of Finance';
const text=(v:unknown)=>typeof v==='string'?v.normalize('NFKC').trim().replace(/\s+/g,' '):'';
export function seniorRole(title:unknown):SeniorRole|null{
 const t=text(title).toLowerCase().replace(/\./g,'');
 const roles:Record<string,SeniorRole>={'managing director':'MD',md:'MD','chief executive officer':'CEO',ceo:'CEO','chief financial officer':'CFO',cfo:'CFO','finance director':'FD','director of finance':'FD','financial director':'FD',fd:'FD','head of finance':'Head of Finance'};
 return Object.hasOwn(roles,t)?roles[t]:null;
}
export const roleRank=(title:string)=>({CFO:0,FD:1,'Head of Finance':2,MD:3,CEO:4}[seniorRole(title)||'CEO']);
export const companyIdentity=(value:unknown)=>text(value).toLowerCase().replace(/&/g,' and ').replace(/\b(?:limited|ltd|plc)\b/g,'').replace(/[^a-z0-9]/g,'');
export const personIdentity=(value:unknown)=>text(value).toLowerCase().replace(/\b(?:mr|mrs|ms|dr)\b\.?/g,'').replace(/[^a-z0-9]/g,'');
export function companyDomain(value:unknown){try{const raw=text(value);if(!raw)return '';const u=new URL(raw.includes('://')?raw:'https://'+raw),host=u.hostname.toLowerCase().replace(/^www\./,'');return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(host)&&!['linkedin.com','facebook.com','companieshouse.gov.uk','find-and-update.company-information.service.gov.uk','localhost'].includes(host)?host:''}catch{return ''}}
export type SeniorPreview={id:string;name:string;title:string;company:string;domain:string;linkedin:string;phoneCredits:number};
export type SeniorContact=SeniorPreview&{phones:Array<{number:string;kind:'mobile'|'phone';updatedAt:string}>;checkedAt:string;providerUpdatedAt:string};
export type ContactResearch={lastOutcome?:'no-callable-profile'|'revealed';version:1;searchedAt:string;previews:SeniorPreview[];contact?:SeniorContact};
export const normalPhone=(v:unknown)=>{let n=text(v).replace(/[\s()\-]/g,'');if(n.startsWith('00'))n='+'+n.slice(2);if(n.startsWith('0'))n='+44'+n.slice(1);if(n.startsWith('44'))n='+'+n;return n};
export function validSeniorPreview(p:SeniorPreview){return !!p&&typeof p.id==='string'&&p.id.length>0&&p.id.length<=180&&typeof p.name==='string'&&p.name.trim().length>1&&p.name.length<=160&&!!seniorRole(p.title)&&!!companyIdentity(p.company)&&companyDomain(p.domain)===p.domain&&Number.isInteger(p.phoneCredits)&&p.phoneCredits>=0&&p.phoneCredits<=5&&typeof p.linkedin==='string'&&(!p.linkedin||/^https:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9%_-]+\/?$/.test(p.linkedin))}
export function freshProviderDate(value:unknown,now=Date.now()){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const t=Date.parse(value+'T00:00:00Z');return Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===value&&t<=now+300000&&now-t<=180*86400000}
export function validSeniorContact(c:SeniorContact){return validSeniorPreview(c)&&freshProviderDate(c.providerUpdatedAt)&&!!c.checkedAt&&Number.isFinite(Date.parse(c.checkedAt))&&Array.isArray(c.phones)&&c.phones.length>0&&c.phones.length<=2&&new Set(c.phones.map(p=>p.number)).size===c.phones.length&&c.phones.every(p=>['mobile','phone'].includes(p.kind)&&freshProviderDate(p.updatedAt)&&/^\+44\d{9,10}$/.test(p.number))}
