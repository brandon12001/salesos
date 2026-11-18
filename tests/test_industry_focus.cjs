const assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const at='2026-11-18T11:00:00Z';
class FixedDate extends Date{constructor(...a){super(...(a.length?a:[at]))}static now(){return Date.parse(at)}}
let n=0;const box={module:{exports:{}},Date:FixedDate,crypto:{randomUUID:()=>`industry-fixture-${++n}`}};
vm.runInNewContext(fs.readFileSync('public/legacy/core.js','utf8'),box);
const core=box.module.exports;
const out=fs.mkdtempSync(path.join(os.tmpdir(),'industry-focus-'));
const res=cp.spawnSync(process.execPath,['node_modules/typescript/bin/tsc','--target','es2022','--module','commonjs','--strict','--skipLibCheck','--outDir',out,'--rootDir','src','src/lib/industryFocus.ts','src/lib/intelligence/engine.ts'],{encoding:'utf8'});
if(res.status)throw Error(res.stdout||res.stderr);
global.window={SalesCore:core};
const mod=require(path.join(out,'lib/industryFocus.js'));
const {evaluate,selectRecommendation}=require(path.join(out,'lib/intelligence/engine.js'));
const today=core.today();
function state(){const s=core.newState();s.settings.intelligenceWorkStart=0;s.settings.intelligenceWorkEnd=1440;return s}
function lead(s,company,sector,more={}){const l=core.createLead(s,{company,sector,contact:'Alex Example',title:'FD',mobile:'07700900123',email:'alex@example.invalid',crmClearance:'cleared',crmCheckedAt:today,...more});for(const t of s.tasks.filter(t=>t.leadId===l.id))t.dueAt=today;return l}
{
 const s=state(),rec=lead(s,'Fictional Recruiter','Technology recruitment'),mach=lead(s,'Fictional Machine Co','Industrial machinery');
 assert.equal(mod.inferredIndustry(rec.sector),'recruitment');
 assert.equal(mod.inferredIndustry(mach.sector),'machinery');
 assert.equal(mod.inferredIndustry('Advanced business services'),'unclassified');
 assert.equal(mod.inferredIndustry('Film production'),'unclassified');
 assert.equal(mod.inferredIndustry('Metal fabrication'),'manufacturing');
 assert.equal(mod.industryLegacyNext(s,false).id,core.nextTask(s).id,'disabled filter preserves legacy selection');
 const off=evaluate(s,new Date(at)),offFiltered=mod.filterIndustryDecision(s,off);
 assert.equal(offFiltered,off,'disabled filter preserves intelligence decision object');
 mod.setIndustryFocus(s,{enabled:true,category:'recruitment'});
 const chosen=mod.industryLegacyNext(s,false);
 assert.equal(chosen.leadId,rec.id,'legacy selection scoped to recruitment');
 const d=mod.filterIndustryDecision(s,evaluate(s,new Date(at)));
 assert.ok(d.recommendations.length>0,'recruitment suggestions exist');
 assert.ok(d.recommendations.every(r=>r.leadId===rec.id),'intelligence excludes out-of-focus industry');
 assert.equal(selectRecommendation(d,{callBlock:true}).leadId,rec.id);
 const promise=core.addTask(s,mach,'callback','Promised machinery callback',today,{origin:'commitment',isCommitment:true,dueTime:'09:00',contactId:mach.contacts[0].id});
 assert.equal(mod.industryLegacyNext(s,true).id,promise.id,'legacy respects out-of-industry promise');
 const dd=mod.filterIndustryDecision(s,evaluate(s,new Date(at)));
 assert.equal(selectRecommendation(dd,{callBlock:true}).leadId,mach.id,'intelligence respects out-of-industry promise');
 assert.equal(mod.industryAllowsTask(s,promise),true);
 const discretionary=s.tasks.find(t=>t.leadId===mach.id&&!mod.isProtectedIndustryTask(t));
 assert.ok(discretionary&&!mod.industryAllowsTask(s,discretionary));
 const restored=core.normalize(JSON.parse(JSON.stringify(s)));
 assert.equal(mod.industryFocusConfig(restored).category,'recruitment','settings survive backup/restore');
 mod.setLeadIndustry(s,mach.id,'recruitment');
 assert.equal(mod.industryForLead(s,mach),'recruitment');
 assert.equal(mod.industryForLead(core.normalize(JSON.parse(JSON.stringify(s))),core.normalize(JSON.parse(JSON.stringify(s))).leads.find(l=>l.id===mach.id)),'recruitment','manual category survives core normalization');
 const id=mod.addIndustryCategory(s,'Freight & Logistics');
 mod.setLeadIndustry(s,rec.id,id);
 assert.equal(mod.industryForLead(s,rec),id);
 assert.equal(mod.industryLabel(s,id),'Freight & Logistics');
 assert.throws(()=>mod.addIndustryCategory(s,'Freight & Logistics'),/exists/);
 mod.setLeadIndustry(s,rec.id,'');
 assert.equal(mod.industryForLead(s,rec),'recruitment','clear override returns to sector');
 console.log('PASS: default-off parity, industry matching, manual overrides, both engines, protected callbacks, JSON persistence');
}
{
 const s=state();
 const rec=lead(s,'Fictional Reserve Recruiter','Executive Search',{leadPool:'reserve',opportunityScore:90,researchDate:today,researchRationale:'Verified recruitment business',crmNote:'Manual check'});
 const mach=lead(s,'Fictional Reserve Manufacturer','Machinery distribution',{leadPool:'reserve',opportunityScore:70,researchDate:today,researchRationale:'Verified machinery business',crmNote:'Manual check'});
 const held=lead(s,'Fictional Held Recruiter','Recruitment',{leadPool:'reserve',opportunityScore:99,researchDate:today,researchRationale:'Verified company',crmClearance:'hold',crmNote:'Owned elsewhere'});
 assert.equal(mod.industrySupply(s,'recruitment').eligible,1,'held prospect excluded from available industry reserve');
 assert.equal(mod.industrySupply(s,'recruitment').eligibleCallable,1);
 assert.equal(mod.industrySupply(s,'machinery').eligible,1);
 assert.equal(core.activateReserve(s,[held.id],{minScore:60}).activated,0,'filter cannot bypass Salesforce Hold');
 assert.equal(core.activateReserve(s,[mach.id],{minScore:60}).activated,1);
 assert.equal(core.activateReserve(s,[rec.id],{minScore:60}).activated,1);
 console.log('PASS: industry reserve supply, callable distinction, existing CRM safety');
}
