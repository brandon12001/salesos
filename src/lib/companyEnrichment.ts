import type {Lead,State} from '../types';
import {parseCSV} from './importer';
import {core} from './core';

// Strictly company-level enrichment: never creates contacts, tasks or CRM/FX facts.
// All data comes from an explicitly selected local CSV. No external service receives it.
export type EnrichmentOptions={replaceResearchCopy:boolean};
type EnrichmentField= 'businessDescription'|'standardisedIndustry'|'countriesMentioned'|'currenciesConfirmed'|'potentialCurrencyPairs'|'internationalActivityEvidence'|'descriptionVerification'|'researchReviewFlag'|'descriptionSources'|'researchRationale'|'callObjective'|'researchHypothesis';
export type EnrichmentPatch=Partial<Pick<Lead,EnrichmentField>>;
export type EnrichmentUpdate={id:string;expected:string;fields:EnrichmentPatch};
export type EnrichmentIssue={company:string;reason:string};
export type EnrichmentSample={company:string;before:string;after:string;industry:string};
export type EnrichmentPlan={totalRows:number;companies:number;matched:number;changed:number;unchanged:number;unmatched:number;ambiguous:number;conflicts:number;manualDescriptionsProtected:number;updates:EnrichmentUpdate[];issues:EnrichmentIssue[];samples:EnrichmentSample[]};

const canonical=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
function companyKey(s:string){return String(core.companyKey(s)||'').trim()}
function registration(s:string){return s.replace(/\s/g,'').toUpperCase()}
function domain(s:string){
 try {return new URL(/^https?:\/\//i.test(s.trim())?s.trim():'https://'+s.trim()).hostname.replace(/^www\./i,'').toLowerCase()}catch{return ''}
}
const columns:ReadonlyArray<readonly [string,EnrichmentField]>=[
 ['Business Description','businessDescription'],
 ['Standardised Industry','standardisedIndustry'],
 ['Countries Mentioned','countriesMentioned'],
 ['Currencies Confirmed','currenciesConfirmed'],
 ['Potential Currency Pairs','potentialCurrencyPairs'],
 ['International Activity Evidence','internationalActivityEvidence'],
 ['Description Verification','descriptionVerification'],
 ['Research Review Flag','researchReviewFlag'],
 ['Research Sources','descriptionSources'],
 ['Research Rationale','researchRationale'],
 ['Original Call Objective','callObjective'],
 ['Original Research Hypothesis','researchHypothesis']
];
const CORE_FIELDS:EnrichmentField[]=['businessDescription','standardisedIndustry','countriesMentioned','currenciesConfirmed','potentialCurrencyPairs','internationalActivityEvidence','descriptionVerification','researchReviewFlag','descriptionSources'];
const RESEARCH_FIELDS:EnrichmentField[]=['researchRationale','callObjective','researchHypothesis'];
const LIMITS:Partial<Record<EnrichmentField,number>>={businessDescription:500,standardisedIndustry:120,countriesMentioned:600,currenciesConfirmed:300,potentialCurrencyPairs:300,internationalActivityEvidence:1200,descriptionVerification:250,researchReviewFlag:500,descriptionSources:15000,researchRationale:2000,callObjective:1000,researchHypothesis:1500};
function rowFingerprint(record:{name:string;number:string;domain:string;fields:EnrichmentPatch}){
 return JSON.stringify([record.name,record.number,record.domain,record.fields]);
}
function leadFingerprint(l:Lead){
 return JSON.stringify([l.id,l.company,l.companyNumber,l.companyDomain,l.industryCategory,l.businessDescriptionEditedAt,...columns.map(([,key])=>l[key]||'')]);
}
export function descriptionStamp(l:Lead){return JSON.stringify([l.businessDescription||'',l.businessDescriptionEditedAt||'',l.descriptionVerification||'',l.researchReviewFlag||''])}
export function saveManualBusinessDescription(s:State,id:string,value:string,expected:string){
 const l=s.leads.find(x=>x.id===id);
 if(!l)throw Error('Company no longer exists.');
 if(descriptionStamp(l)!==expected)throw Error('Company description changed on another device. Reopen the company and review the current text.');
 const cleaned=value.trim();
 if(cleaned.length<8||cleaned.length>500)throw Error('Write a clear business description of 8–500 characters.');
 if(cleaned===l.businessDescription)return l;
 l.businessDescription=cleaned;
 l.businessDescriptionEditedAt=new Date().toISOString();
 l.descriptionVerification='Manually edited in SalesOS; source not independently checked';
 l.researchReviewFlag=l.researchReviewFlag||'Verify the description against the company website';
 return l;
}
export function planCompanyEnrichment(s:State,text:string,options:EnrichmentOptions={replaceResearchCopy:false}):EnrichmentPlan {
 if(text.length>12*1024*1024)throw Error('Choose a CSV smaller than 12 MB.');
 const csv=parseCSV(text);
 if(csv.length<2)throw Error('No company data rows found.');
 if(csv.length>10001)throw Error('Import up to 10,000 rows at a time.');
 const heads=csv[0].map(canonical),col=(name:string)=>heads.indexOf(canonical(name));
 const nameIndex=col('Company Name')>=0?col('Company Name'):col('Company');
 if(nameIndex<0||col('Business Description')<0||col('Standardised Industry')<0)throw Error('Company Name, Business Description and Standardised Industry columns are required. Use the business-clarity CSV, not the ordinary Lusha importer.');
 const numIndex=col('Company Number'),domainIndex=col('Company Domain');
 const pick=(row:string[],i:number)=>i>=0?String(row[i]||'').trim():'';
 const groups=new Map<string,{name:string;number:string;domain:string;fields:EnrichmentPatch;fingerprint:string;conflict:boolean}>();
 let totalRows=0;
 for(const row of csv.slice(1)){
  const name=pick(row,nameIndex);if(!name)continue;totalRows++;
  const number=registration(pick(row,numIndex)),url=pick(row,domainIndex),fields:EnrichmentPatch={};
  for(const [header,key] of columns){
   if(!CORE_FIELDS.includes(key)&&!options.replaceResearchCopy)continue;
   const val=pick(row,col(header)),max=LIMITS[key]||2000;
   if(val&&val.length>max)throw Error('Company '+name+': '+header+' is longer than '+max+' characters.');
   if(val)fields[key]=val;
  }
  const key=number?'reg:'+number:'name:'+companyKey(name);
  if(!key||key==='name:')continue;
  const entry={name,number,domain:url,fields,fingerprint:rowFingerprint({name:companyKey(name),number,domain:domain(url),fields}),conflict:false};
  const prev=groups.get(key);
  if(prev){if(prev.fingerprint!==entry.fingerprint)prev.conflict=true;}
  else groups.set(key,entry);
 }
 const plan:EnrichmentPlan={totalRows,companies:groups.size,matched:0,changed:0,unchanged:0,unmatched:0,ambiguous:0,conflicts:0,manualDescriptionsProtected:0,updates:[],issues:[],samples:[]};
 for(const item of groups.values()){
  if(item.conflict){plan.conflicts++;plan.issues.push({company:item.name,reason:'Conflicting company-level values across CSV contact rows'});continue;}
  const nameMatches=s.leads.filter(l=>companyKey(l.company)===companyKey(item.name));
  const regMatches=item.number?s.leads.filter(l=>registration(l.companyNumber||'')===item.number):[];
  if(regMatches.length>1||nameMatches.length>1){plan.ambiguous++;plan.issues.push({company:item.name,reason:'Several existing companies share the same identifier; manual review required'});continue;}
  const byReg=regMatches[0],byName=nameMatches[0];
  if(byReg&&byName&&byReg.id!==byName.id){plan.conflicts++;plan.issues.push({company:item.name,reason:'Registration number and company name resolve to different records'});continue;}
  // A legal registration number must not overwrite a different registered company.
  if(byName&&item.number&&byName.companyNumber&&registration(byName.companyNumber)!==item.number){plan.conflicts++;plan.issues.push({company:item.name,reason:'Existing registration number does not match the CSV'});continue;}
  const match=byReg||byName;
  if(!match){plan.unmatched++;if(plan.issues.length<100)plan.issues.push({company:item.name,reason:'No existing company matched; nothing will be created'});continue;}
  // Domains are supporting evidence, NEVER a standalone merge key.
  if(!byReg&&item.domain&&match.companyDomain&&domain(item.domain)&&domain(match.companyDomain)&&domain(item.domain)!==domain(match.companyDomain)){
   plan.conflicts++;plan.issues.push({company:item.name,reason:'Company name matches but website domains differ; verify identity'});continue;
  }
  plan.matched++;
  const patch:EnrichmentPatch={};
  for(const [key,val] of Object.entries(item.fields) as [EnrichmentField,string][]){
   if(!val)continue; // Missing CSV evidence must not blank existing facts or notes.
   if(key==='businessDescription'&&match.businessDescriptionEditedAt){plan.manualDescriptionsProtected++;continue;}
   if(val!==(match[key]||''))patch[key]=val;
  }
  if(!Object.keys(patch).length){plan.unchanged++;continue;}
  plan.changed++;
  plan.updates.push({id:match.id,expected:leadFingerprint(match),fields:patch});
  if(plan.samples.length<8)plan.samples.push({company:match.company,before:match.businessDescription||'Not recorded',after:patch.businessDescription||match.businessDescription||'Not recorded',industry:patch.standardisedIndustry||match.standardisedIndustry||match.sector});
 }
 return plan;
}
export function applyCompanyEnrichment(s:State,plan:EnrichmentPlan){
 // Atomic when invoked through the existing workspace commit clone. Re-check every
 // target before changing a single value; concurrent edits cannot be silently lost.
 for(const update of plan.updates){
  const l=s.leads.find(x=>x.id===update.id);
  if(!l||leadFingerprint(l)!==update.expected)throw Error('One or more company records changed since preview. Refresh the preview before importing.');
  for(const key of Object.keys(update.fields) as EnrichmentField[]){
   if(!columns.some(([,allowed])=>allowed===key))throw Error('Unexpected enrichment field.');
  }
 }
 for(const update of plan.updates){
  const l=s.leads.find(x=>x.id===update.id)!;
  Object.assign(l,update.fields);
 }
 return plan.updates.length;
}
