import type {State,Lead} from '../types';
import {core} from './core';
export type ImportStats={created:number;merged:number;duplicates:number;skipped:number;scored:number;researchUpdated:number;unscored:number;crmCleared:number;crmHeld:number;warnings:string[]};
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
const aliases={company:['company','companyname','organization','organizationname','companynameenglish'],name:['name','fullname','contactname','contact','personname'],first:['firstname','contactfirstname'],last:['lastname','contactlastname'],title:['title','jobtitle','position','jobposition'],mobile:['mobile','mobilephone','mobilenumber','directdial','mobilephonenumber','mobilephone1'],phone:['phone','phonenumber','directphone','workphone','companyphone','officephone'],email:['email','workemail','emailaddress','businessemail','workemailaddress'],linkedin:['linkedin','linkedinurl','linkedinprofile','personlinkedinurl','linkedinprofileurl'],sector:['sector','industry','companyindustry'],domain:companyDomains,companyNumber:['companynumber','companieshousenumber','registrationnumber','companyregistrationnumber','crn'],score:['opportunityscore','fxopportunityscore','leadscore','priorityscore'],researchDate:['researchdate','scoredon','scoredate','lastresearched'],rationale:['researchrationale','scorereason','scoringrationale','researchreason','scorejustification'],sources:['researchsources','researchsource','sources','researchurls','sourcelinks'],confidence:['researchconfidence','scoreconfidence'],crmClearance:['crmclearance','salesforceclearance','salesforcestatus'],crmCheckedAt:['crmcheckeddate','salesforcecheckeddate','crmcheckedat'],crmNote:['crmnote','salesforcenote','crmownershipnote'],crmLastActivityAt:['crmlastactivitydate','salesforcelastactivitydate','lastqualifyingcrmactivity','lastsalesforceactivity'],callObjective:['callobjective','originalcallobjective'],researchHypothesis:['researchhypothesis','originalresearchhypothesis']};
function researchDateValid(value:string):boolean{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const date=new Date(value+'T12:00:00Z');
  return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value&&value<=new Date().toISOString().slice(0,10);
}
function researchRow(row:string[],line:number,pick:(row:string[],type:keyof typeof aliases)=>string){
  const raw=pick(row,'score');
  if(!raw)return null;
  const score=Number(raw),date=pick(row,'researchDate'),rationale=pick(row,'rationale'),sources=pick(row,'sources'),confidence=pick(row,'confidence');
  if(!Number.isFinite(score)||score<0||score>100)throw new Error('CSV row '+line+': Opportunity Score must be between 0 and 100.');
  if(!researchDateValid(date))throw new Error('CSV row '+line+': scored leads need a valid, non-future Research Date (YYYY-MM-DD).');
  if(!rationale)throw new Error('CSV row '+line+': a researched score needs a Research Rationale.');
  return {score,date,rationale,sources,confidence};
}
export function importLusha(state:State,text:string):ImportStats{
  const rows=parseCSV(text),report:ImportStats={created:0,merged:0,duplicates:0,skipped:0,scored:0,researchUpdated:0,unscored:0,crmCleared:0,crmHeld:0,warnings:[]};
  if(rows.length<2)throw new Error('This CSV has no contact rows.');
  if(rows.length>10001)throw new Error('Import up to 10,000 contact rows at a time. Split larger exports into batches.');
  const h=rows[0].map(canonical);const pick=(row:string[],type:keyof typeof aliases)=>{for(const alias of aliases[type]){const idx=h.indexOf(alias);if(idx>=0&&row[idx]?.trim())return row[idx].trim()}return ''};
  if(!aliases.company.some(alias=>h.includes(alias)))throw new Error('Company name column not detected. Please use a Lusha contacts export.');
  const seenResearch=new Map<string,string>();
  const seenClearance=new Map<string,string>();
  for(let index=1;index<rows.length;index++){
    const row=rows[index],line=index+1;
    const company=pick(row,'company');if(!company){report.skipped++;continue}
    const name=pick(row,'name')||[pick(row,'first'),pick(row,'last')].filter(Boolean).join(' ');
    const data={name,title:pick(row,'title'),mobile:pick(row,'mobile'),phone:pick(row,'phone'),email:pick(row,'email'),linkedin:pick(row,'linkedin')};
    // Preserve the supplied destination, including subdomains, path and case.
    // Navigation validates it; importing never guesses a domain.
    const domain=pick(row,'domain').trim();
    const companyNumber=pick(row,'companyNumber').replace(/\s/g,'').toUpperCase();
    const researched=researchRow(row,line,pick);
    const callObjective=pick(row,'callObjective'),researchHypothesis=pick(row,'researchHypothesis');
    const clearanceRaw=pick(row,'crmClearance').toLowerCase();
    const crmClearance=clearanceRaw==='cleared'||clearanceRaw==='clear'?'cleared':clearanceRaw==='hold'||clearanceRaw==='assigned'?'hold':'unknown';
    if(clearanceRaw&&!['cleared','clear','hold','assigned','unknown'].includes(clearanceRaw))throw new Error('CSV row '+line+': CRM Clearance must be Cleared, Hold, or Unknown.');
    const crmCheckedAt=pick(row,'crmCheckedAt'),crmNote=pick(row,'crmNote'),crmLastActivityAt=pick(row,'crmLastActivityAt');
    if(crmLastActivityAt&&(!researchDateValid(crmLastActivityAt)||crmClearance!=='hold'))throw new Error('CSV row '+line+': CRM Last Activity Date must be a valid past date on a Hold row.');
    if(crmClearance!=='unknown'&&(!researchDateValid(crmCheckedAt)||!crmNote))throw new Error('CSV row '+line+': Cleared/Hold CRM status needs a valid CRM Checked Date and a CRM Note explaining the manual Salesforce check.');

    const key=companyNumber||core.companyKey(company);
    if(crmClearance!=='unknown'){
      const signature=JSON.stringify([crmClearance,crmCheckedAt,crmNote,crmLastActivityAt]);
      if(seenClearance.has(key)&&seenClearance.get(key)!==signature)throw new Error('CSV row '+line+': inconsistent Salesforce clearance for '+company+'.');
      seenClearance.set(key,signature);
    }
    if(researched){
      const signature=JSON.stringify([researched.score,researched.date,researched.rationale,researched.sources]);
      if(seenResearch.has(key)&&seenResearch.get(key)!==signature)throw new Error('CSV row '+line+': conflicting research scores for '+company+'. Use one consistent score/date/rationale per company.');
      seenResearch.set(key,signature);
    }
    // Registration number is a stable legal-entity identifier. Do not merge unrelated
    // subsidiaries simply because they share a domain or a trading-group name.
    const byNumber=companyNumber?state.leads.find(l=>l.companyNumber===companyNumber):null;
    const byName=state.leads.find(l=>core.companyKey(l.company)===core.companyKey(company));
    if(byName&&companyNumber&&byName.companyNumber&&byName.companyNumber!==companyNumber)throw new Error('CSV row '+line+': '+company+' has a conflicting company registration number. Resolve identity before importing.');
    if(byNumber&&byName&&byNumber.id!==byName.id)throw new Error('CSV row '+line+': company name and registration number identify different existing records.');
    const existing=byNumber||byName;
    if(existing){
      if(companyNumber&&!existing.companyNumber)existing.companyNumber=companyNumber;
      if(domain&&!existing.companyDomain)existing.companyDomain=domain;
      if(callObjective&&!existing.callObjective)existing.callObjective=callObjective;
      if(researchHypothesis&&!existing.researchHypothesis)existing.researchHypothesis=researchHypothesis;
      if(existing.leadPool==='reserve'&&crmClearance!=='unknown'&&(!existing.crmCheckedAt||crmCheckedAt>=existing.crmCheckedAt)){
        // Importing a later 'Cleared' value must NEVER release a held duplicate.
        // Only a recorded reclaim approval inside SalesOS can remove that hold.
        if(existing.crmClearance!=='hold'||crmClearance==='hold'){
          if(crmClearance==='hold'){
            const newActivity=crmLastActivityAt&&(!existing.crmLastActivityAt||crmLastActivityAt>existing.crmLastActivityAt);
            if(newActivity){
              existing.crmLastActivityAt=crmLastActivityAt;
              if(['requested','declined'].includes(existing.crmReclaimStatus||'')){
                existing.crmReclaimStatus='waiting';existing.crmReclaimRequestedAt='';existing.crmReclaimDecisionAt='';
                core.log(state,existing,'CRM','Reclaim status reset after newer activity','Updated last qualifying Salesforce activity: '+crmLastActivityAt,0);
              }
            }
            if(existing.crmClearance!=='hold'){
              existing.crmReclaimStatus='waiting';existing.crmReclaimRequestedAt='';existing.crmReclaimDecisionAt='';
            }
          }
          existing.crmClearance=crmClearance;existing.crmCheckedAt=crmCheckedAt;existing.crmNote=crmNote;
        }
      }
      if(researched&&(!existing.researchDate||researched.date>=existing.researchDate)){
        const changed=existing.opportunityScore!==researched.score||existing.researchDate!==researched.date||existing.researchRationale!==researched.rationale||existing.researchSources!==researched.sources;
        if(changed){
          existing.opportunityScore=researched.score;existing.researchDate=researched.date;existing.researchRationale=researched.rationale;existing.researchSources=researched.sources;existing.researchConfidence=researched.confidence;
          report.researchUpdated++;
          core.log(state,existing,'Research','Opportunity score updated',researched.rationale,0);
        }
      }
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
    const lead=core.createLead(state,{company,sector:pick(row,'sector'),contact:name,...data,companyNumber,companyDomain:domain,crmClearance,crmCheckedAt:crmClearance==='unknown'?'':crmCheckedAt,crmNote:crmClearance==='unknown'?'':crmNote,crmLastActivityAt:crmClearance==='hold'?crmLastActivityAt:'',callObjective,researchHypothesis,leadPool:'reserve',reservedAt:new Date().toISOString(),opportunityScore:researched?.score??null,researchDate:researched?.date||'',researchRationale:researched?.rationale||'',researchSources:researched?.sources||'',researchConfidence:researched?.confidence||'',readiness:1,readinessEvidence:'Default assumption from CSV import',nextMilestone:core.NEXT_MILESTONES[0],notes:'Source: researched CSV / Lusha'});
    if(lead&&!(lead as {duplicate?:Lead}).duplicate){report.created++;if(researched)report.scored++;else report.unscored++;if(crmClearance==='cleared')report.crmCleared++;if(crmClearance==='hold')report.crmHeld++}else report.duplicates++;
  }
  report.warnings.push('New companies enter the lead reserve with no outreach tasks. Existing Buyer Readiness, deal history and opt-outs are preserved. Imported numbers are unverified.');
  if(report.unscored)report.warnings.push(report.unscored+' new companies have no researched score and cannot be activated until scored.');
  report.warnings.push('Salesforce clearance is never inferred. Unknown and held companies cannot activate. Clearance older than 30 days needs a fresh manual check.');
  return report;
}
