const assert=require('node:assert/strict');
const core=require('./core.cjs');

function reserve(s,company,score,crm='cleared',phone='07700900111',checked=core.today()){
  return core.createLead(s,{company,contact:'Alex Example',title:'Finance Director',mobile:phone,leadPool:'reserve',reservedAt:new Date().toISOString(),opportunityScore:score,researchDate:core.today(),researchRationale:'Public cross-border indicators: FX need unconfirmed',researchSources:'https://example.invalid',crmClearance:crm,crmCheckedAt:checked,crmNote:'User checked ownership in Salesforce',readiness:1});
}
const s=core.newState();
const top=reserve(s,'Top Researched Recruitment Ltd',95);
const middle=reserve(s,'Second Recruitment Ltd',82);
const low=reserve(s,'Lower Priority Importer Ltd',61);
const held=reserve(s,'Already Assigned Ltd',99,'hold');
const unknown=reserve(s,'Not Checked Ltd',98,'unknown');
const unscored=reserve(s,'Not Researched Ltd',null);
const noPhone=reserve(s,'Uncontactable Ltd',90,'cleared','');
assert.equal(core.pending(s).length,0,'reserve imports must never create outreach tasks');
assert.equal(core.leadSupply(s).ready,0);
assert.equal(core.insights(s).active,0,'reserve records must not inflate active buyer pipeline');
assert.equal(core.pipelineValue(s).rows.length,0,'reserve must not inflate pipeline value');
assert.equal(core.reserveRank(s)[0].company,'Already Assigned Ltd','raw order is by score, eligibility follows separately');
assert.match(core.reserveEligibility(s,held),/hold/i);
assert.match(core.reserveEligibility(s,unknown),/clearance/i);
assert.match(core.reserveEligibility(s,unscored),/score/i);
assert.match(core.reserveEligibility(s,noPhone),/contact/i);
assert.equal(core.autoReplenishReserve(s).activated,0,'automatic activation defaults off');
assert.equal(core.activateReserve(s,[held.id,unknown.id,unscored.id,noPhone.id]).activated,0);
assert.equal(core.reserveReviewDue(top),core.businessAdd(core.today(),5));
assert.equal(core.reserveReviewDue(low),core.businessAdd(core.today(),15));

// Opt in: only eligible, high-scoring, CRM-checked prospects enter a bounded batch.
s.settings.reserveAutoActivate=1;
s.settings.reserveSupplyFloor=12;
s.settings.reserveActivationBatch=5;
s.settings.reserveMinScore=70;
s.settings.reserveActiveCap=2;
const first=core.autoReplenishReserve(s);
assert.equal(first.activated,2);
assert.deepEqual(Array.from(first.names),['Top Researched Recruitment Ltd','Second Recruitment Ltd']);
assert.equal(core.pending(s).length,2);
assert.equal(core.autoReplenishReserve(s).activated,0,'active-prospect cap prevents repeated reserve draining');
assert.equal(core.activateReserve(s,[top.id]).activated,0,'activation is idempotent');
assert.equal(low.leadPool,'reserve');

// A fresh, explicit Salesforce check changes eligibility without fabricating research.
const stale=reserve(s,'Expired Salesforce Check Ltd',97,'cleared','07700900333',core.addDays(core.today(),-31));
assert.match(core.reserveEligibility(s,stale),/older than 30/i);
assert.equal(core.activateReserve(s,[stale.id]).activated,0);
assert.ok(core.reviewReserveCRM(s,stale.id,'cleared','Checked owner and activity in CRM').ok);
assert.equal(core.reserveEligibility(s,stale),'');
assert.equal(core.reviewReserveCRM(s,stale.id,'cleared','').error.includes('Record'),true);

// CRM hold and opt-out never become eligible from high scores.
core.changeStatus(s,held,'Take Me Off the List','Explicit do not contact',{scope:'company',contact:held.contacts[0]});
assert.equal(core.activateReserve(s,[held.id]).activated,0);

// Existing promises outrank newly activated cold calls in Focus Mode.
const engaged=core.createLead(s,{company:'Existing Engaged Client Ltd',contact:'Chris',mobile:'07700900444',readiness:5});
const promised=core.scheduleCallback(s,engaged,core.today(),'','Promised exact follow-up');
assert.equal(core.nextTask(s).id,promised.id);
assert.equal(core.insights(s).active,3,'two activated + one manually active; reserve excluded');

// Old v3 backups default to active rather than silently placing existing deals in reserve.
const old=structuredClone(s);
delete old.leads.find(l=>l.id===engaged.id).leadPool;
const migrated=core.normalize(old);
assert.equal(migrated.leads.find(l=>l.id===engaged.id).leadPool,'active');
assert.deepEqual(Array.from(core.checkInvariants(s)),[]);
console.log('RESERVE PASS: rank, opt-in activation, score/CRM gates, expiry, caps, promises, legacy compatibility');
