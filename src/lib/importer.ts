import type {State,Lead} from '../types';
import {core} from './core';
export type ImportStats={created:number;merged:number;duplicates:number;skipped:number;warnings:string[]};
export function parseCSV(text:string):string[][]{
  const rows:string[][]=[];let row:string[]=[],value='',quoted=false;const s=text.replace(/^\uFEFF/,'');
  for(let i=0;i<s.length;i++){const ch=s[i];if(ch==='"'){if(quoted&&s[i+1]==='"'){value+='"';i++}else quoted=!quoted}
    else if(ch===','&&!quoted){row.push(value);value=''}
    else if((ch==='\r'||ch==='\n')&&!quoted){if(ch==='\r'&&s[i+1]==='\n')i++;row.push(value);if(row.some(x=>x.trim()))rows.push(row);row=[];value=''}
    else value+=ch;}
  row.push(value);if(row.some(x=>x.trim()))rows.push(row);return rows;
}
const canonical=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
function linkedinProfile(value:string):string{
  const raw=value.trim();
  if(!raw)return '';
  try{
    const url=new URL(/^https?:\/\//i.test(raw)?raw:`https://${raw}`);
    if(!/(^|\.)linkedin\.com$/i.test(url.hostname))return '';
    const match=url.pathname.match(/^\/in\/([^/]+)\/?$/i);
    return match?decodeURIComponent(match[1]).toLowerCase():'';
  }catch{return ''}
}
const companyDomains=['companydomain','companywebsite','website','domain'];
const aliases={company:['company','companyname','organization','organizationname','companynameenglish'],name:['name','fullname','contactname','contact','personname'],first:['firstname','contactfirstname'],last:['lastname','contactlastname'],title:['title','jobtitle','position','jobposition'],mobile:['mobile','mobilephone','mobilenumber','directdial','mobilephonenumber','mobilephone1'],phone:['phone','phonenumber','directphone','workphone','companyphone','officephone'],email:['email','workemail','emailaddress','businessemail','workemailaddress'],linkedin:['linkedin','linkedinurl','linkedinprofile','personlinkedinurl','linkedinprofileurl'],sector:['sector','industry','companyindustry'],domain:companyDomains};
export function importLusha(state:State,text:string):ImportStats{
  const rows=parseCSV(text),report:ImportStats={created:0,merged:0,duplicates:0,skipped:0,warnings:[]};
  if(rows.length<2)throw new Error('This CSV has no contact rows.');
  const h=rows[0].map(canonical);const pick=(row:string[],type:keyof typeof aliases)=>{for(const alias of aliases[type]){const idx=h.indexOf(alias);if(idx>=0&&row[idx]?.trim())return row[idx].trim()}return ''};
  if(!aliases.company.some(alias=>h.includes(alias)))throw new Error('Company name column not detected. Please use a Lusha contacts export.');
  for(const row of rows.slice(1)){
    const company=pick(row,'company');if(!company){report.skipped++;continue}
    const name=pick(row,'name')||[pick(row,'first'),pick(row,'last')].filter(Boolean).join(' ');
    const data={name,title:pick(row,'title'),mobile:pick(row,'mobile'),phone:pick(row,'phone'),email:pick(row,'email'),linkedin:pick(row,'linkedin')};
    const domain=pick(row,'domain').replace(/^https?:\/\//,'').replace(/^www\./,'').split('/')[0].toLowerCase();
    // V3 stores company and contacts; use domain as an extra source hint, not a blanket merge of related subsidiaries.
    const existing=state.leads.find(l=>core.companyKey(l.company)===core.companyKey(company));
    if(existing){
      const profile=linkedinProfile(data.linkedin),email=data.email.toLowerCase();
      // Stable identifiers outrank display names: Lusha can change a contact's name
      // or email between exports without creating a new decision-maker.
      const matches=existing.contacts.find(c=>
        (email&&c.methods.some(m=>m.kind==='email'&&m.value.trim().toLowerCase()===email))||
        (profile&&c.methods.some(m=>m.kind==='linkedin'&&linkedinProfile(m.value)===profile))
      )||existing.contacts.find(c=>name&&c.name.trim().toLowerCase()===name.toLowerCase());
      if(matches){
        let added=false;
        for(const kind of ['mobile','phone','email','linkedin'] as const){
          if(!data[kind])continue;
          // Tracking parameters and trailing slashes do not represent another profile.
          if(kind==='linkedin'&&profile&&matches.methods.some(m=>m.kind==='linkedin'&&linkedinProfile(m.value)===profile))continue;
          const r=core.addMethod(state,existing,matches,kind,data[kind]);
          if(r&&!r.duplicate)added=true;
        }
        if(added)report.merged++;else report.duplicates++;
      }else if(name||Object.entries(data).some(([k,v])=>k!=='title'&&k!=='name'&&!!v)){
        const r=core.addContact(state,existing,data);if(r&&!r.duplicate)report.merged++;else report.duplicates++;
      }else report.skipped++;
      continue;
    }
    // Level 1 is a starting cold-prospect assumption, not demonstrated knowledge of the buyer.
    const lead=core.createLead(state,{company,sector:pick(row,'sector'),contact:name,...data,readiness:1,readinessEvidence:'Default assumption from Lusha import',nextMilestone:core.NEXT_MILESTONES[0],notes:domain?`Source: Lusha CSV · Company domain: ${domain}`:'Source: Lusha CSV'});
    if(lead&&!(lead as {duplicate?:Lead}).duplicate)report.created++;else report.duplicates++;
  }
  report.warnings.push('Existing Buyer Readiness, deal history and opt-out suppression have been preserved. Imported numbers are unverified.');
  return report;
}
