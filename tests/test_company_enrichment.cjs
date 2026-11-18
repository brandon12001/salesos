const assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const core=require('./core.cjs');global.window={SalesCore:core};
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'salesos-clarity-'));
const args=['node_modules/typescript/bin/tsc','--target','es2022','--module','commonjs','--strict','--skipLibCheck','--outDir',dir,'--rootDir','src','src/lib/companyEnrichment.ts','src/lib/industryFocus.ts'];
const compilation=cp.spawnSync(process.execPath,args,{encoding:'utf8'});
if(compilation.status!==0)throw Error(compilation.stdout||compilation.stderr);
const {planCompanyEnrichment,applyCompanyEnrichment,descriptionStamp,saveManualBusinessDescription}=require(path.join(dir,'lib/companyEnrichment.js'));
const {industryForLead}=require(path.join(dir,'lib/industryFocus.js'));
const {importLusha}=require(path.join(dir,'lib/importer.js'));
function state(){
 const s=core.newState();
 const recruit=core.createLead(s,{company:'Fictional Penta Recruitment Ltd',sector:'International recruitment',companyNumber:'00001234',companyDomain:'fictional-penta.example',contact:'Alex Example',mobile:'07700900121',email:'alex@example.invalid',opportunityScore:92,researchDate:'2026-11-15',researchRationale:'Original detailed recruiter research',researchSources:'Original source',crmClearance:'cleared',crmCheckedAt:core.today(),callObjective:'Original call objective',readiness:3,readinessEvidence:'Test buyer confirmed a need'});
 const machine=core.createLead(s,{company:'Fictional Doyle Machinery Ltd',sector:'Machinery',companyNumber:'00008765',companyDomain:'fictional-machines.example',contact:'Morgan Example',mobile:'07700900122',crmClearance:'hold',crmNote:'Colleague owns the company',opportunityScore:66,researchRationale:'Old machinery note'});
 core.addTask(s,recruit,'callback','Promise to buyer',core.today(),{isCommitment:true,contactId:recruit.contacts[0].id});
 core.log(s,recruit,'Call','Meaningful conversation','Test only',7);
 return {s,recruit,machine};
}
const headers=['Company Name','Company Number','Company Domain','Full Name','Business Description','Standardised Industry','Countries Mentioned','Currencies Confirmed','Potential Currency Pairs','International Activity Evidence','Description Verification','Research Review Flag','Research Sources','Research Rationale','Original Call Objective','Original Research Hypothesis','Opportunity Score','CRM Clearance'].join(',');
const recruiter=['Fictional Penta Recruitment Ltd','00001234','fictional-penta.example','Alex Example','Provides technology recruitment to businesses in Germany and the UK.','Recruitment & Staffing','UK; Germany','','GBP/EUR','Germany office described; invoice currency unverified','Previous sector research (not rechecked)','Verify website','https://example.invalid/recruitment','Recruits in Germany; ask about EUR invoicing','Who handles EUR contractor payments?','FX settlement is unconfirmed','0','Hold'];
const machinery=['Fictional Doyle Machinery Ltd','00008765','fictional-machines.example','Morgan Example','Imports and distributes industrial machinery and spare parts.','Machinery & Equipment Distribution','Germany','','GBP/EUR','German supplier is recorded; invoice currency not confirmed','Website reviewed 2026-11-18','','https://example.invalid/machinery','Uses German equipment suppliers; ask about currency','Are machines invoiced in EUR or GBP?','Supplier invoices unknown','100','Cleared'];
const newOne=['Fictional Unknown GmbH','','new.example','New Example','Sells industrial equipment to factories.','Machinery & Equipment Distribution','Germany','','','No verified FX activity','Unverified','','','','','','',''];
function csvRow(row){return row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')}
const csv=[headers,csvRow(recruiter),csvRow(recruiter),csvRow(machinery),csvRow(newOne)].join('\n');
{
 const {s,recruit,machine}=state();
 const snapshot={tasks:structuredClone(s.tasks),activities:structuredClone(s.activities),contacts:structuredClone(s.leads.map(l=>l.contacts)),lead:structuredClone(recruit),held:structuredClone(machine),settings:structuredClone(s.settings)};
 const plan=planCompanyEnrichment(s,csv,{replaceResearchCopy:false});
 assert.equal(plan.totalRows,4);assert.equal(plan.companies,3);assert.equal(plan.matched,2);assert.equal(plan.changed,2);assert.equal(plan.unmatched,1);assert.equal(plan.conflicts,0);
 assert.equal(plan.samples[0].after,recruiter[4]);
 assert.equal(recruit.businessDescription,'','preview must be pure');
 assert.equal(applyCompanyEnrichment(s,plan),2);
 assert.equal(recruit.businessDescription,recruiter[4]);
 assert.equal(machine.businessDescription,machinery[4]);
 assert.equal(recruit.countriesMentioned,'UK; Germany');
 assert.equal(recruit.potentialCurrencyPairs,'GBP/EUR');
 assert.equal(recruit.currenciesConfirmed||'','','do not invent confirmed currencies');
 assert.equal(recruit.researchRationale,snapshot.lead.researchRationale,'research copy remains intact by default');
 assert.equal(recruit.callObjective,snapshot.lead.callObjective);
 assert.equal(industryForLead(s,recruit),'recruitment');
 assert.equal(industryForLead(s,machine),'machinery');
 assert.equal(machine.crmClearance,'hold','CSV Cleared must not release holds');
 assert.equal(recruit.crmClearance,snapshot.lead.crmClearance,'CSV Hold must not change clearance');
 assert.equal(recruit.opportunityScore,92,'CSV score ignored');
 assert.equal(recruit.researchDate,snapshot.lead.researchDate);
 assert.deepEqual(s.tasks,snapshot.tasks);
 assert.deepEqual(s.activities,snapshot.activities);
 assert.deepEqual(s.leads.map(l=>l.contacts),snapshot.contacts);
 assert.deepEqual(s.settings,snapshot.settings);
 assert.equal(s.leads.length,2,'enrichment never creates new companies');
 assert.equal(planCompanyEnrichment(s,csv,{replaceResearchCopy:false}).changed,0,'repeat import idempotent');
 const normalized=core.normalize(JSON.parse(JSON.stringify(s)));
 assert.equal(normalized.leads[0].businessDescription,recruiter[4]);
 assert.equal(normalized.leads[0].standardisedIndustry,'Recruitment & Staffing');
 console.log('PASS: multi-contact idempotent company-only import, saved descriptions, conservative currency geography, Industry Focus, no sales changes');
}
{
 const {s,recruit}=state();const plan=planCompanyEnrichment(s,csv,{replaceResearchCopy:true});
 assert.equal(applyCompanyEnrichment(s,plan),2);
 assert.equal(recruit.researchRationale,recruiter[13]);
 assert.equal(recruit.callObjective,recruiter[14]);
 assert.equal(recruit.researchHypothesis,recruiter[15]);
 assert.equal(recruit.opportunityScore,92);
 assert.equal(recruit.researchDate,'2026-11-15');
 console.log('PASS: opt-in research copy replacement without rescoring or changing CRM');
}
{
 const {s,recruit}=state();
 const expected=descriptionStamp(recruit);
 saveManualBusinessDescription(s,recruit.id,'Personally checked recruitment company profile.',expected);
 assert.throws(()=>saveManualBusinessDescription(s,recruit.id,'Stale manual edit',expected),/changed/);
 const plan=planCompanyEnrichment(s,csv,{replaceResearchCopy:false});
 assert.equal(plan.manualDescriptionsProtected,1);
 applyCompanyEnrichment(s,plan);
 assert.equal(recruit.businessDescription,'Personally checked recruitment company profile.');
 assert.equal(recruit.standardisedIndustry,'Recruitment & Staffing','other fields can still be enriched');
 assert.equal(industryForLead(s,recruit),'recruitment');
 console.log('PASS: user descriptions protected from CSV reimports');
}
{
 const {s,recruit,machine}=state();
 const plan=planCompanyEnrichment(s,csv,{replaceResearchCopy:false});
 recruit.researchRationale='Concurrent research change';
 assert.throws(()=>applyCompanyEnrichment(s,plan),/changed since preview/);
 assert.equal(machine.businessDescription,'','conflicted transaction changes nothing');
 const badReg=csv.replace('"00001234"','"99999999"');
 assert.equal(planCompanyEnrichment(s,badReg).conflicts,1,'identity conflict reported, not merged');
 const badDomain=csv.replace('"fictional-penta.example"','"other-subsidiary.example"').replace('"00001234"','""');
 assert.ok(planCompanyEnrichment(s,badDomain).conflicts>=1,'name-only domain disagreement blocked');
 const ambiguous=core.createLead(s,{company:'Fictional Penta Recruitment Ltd',companyNumber:'88888888',contact:'Different Person',mobile:'07700900125'});
 assert.ok(ambiguous);
 assert.equal(planCompanyEnrichment(s,csv).ambiguous,1,'duplicate company name blocked');
 assert.throws(()=>importLusha(s,csv),/Business Clarity CSV/,'regular importer refuses this file');
 console.log('PASS: stale snapshot atomic rejection, legal ID/domain collisions, ambiguity and safe importer route');
}
