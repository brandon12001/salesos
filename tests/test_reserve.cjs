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

assert.equal(core.addCalendarMonths('2025-11-30',3),'2026-02-28');
assert.equal(core.addCalendarMonths('2023-11-30',3),'2024-02-29','calendar months must respect leap years');
assert.equal(core.addCalendarMonths('2026-01-31',3),'2026-04-30');
assert.equal(core.addCalendarMonths('2026-02-30',3),'','reject invalid dates');
const bank=core.newState();
const dupe=reserve(bank,'Banked International Recruitment Ltd',94,'hold');
assert.equal(core.dupeState(dupe),'missing-activity');
assert.equal(core.reclaimReviewDate(dupe),'','missing dates must not imply an eligibility date');
assert.equal(core.logReclaimRequest(bank,dupe.id,'manager request #A').error.includes('Record'),true);
assert.match(core.reviewReserveCRM(bank,dupe.id,'cleared','I think it is free').error,/Duplicate Queue/i,'generic clearance cannot bypass approval');
assert.equal(core.activateReserve(bank,[dupe.id]).activated,0);
const threeMonthsAgo=core.addCalendarMonths(core.today(),-3);
assert.ok(core.reviewReserveCRM(bank,dupe.id,'hold','Checked owner and confirmed no newer activity',{lastActivityAt:threeMonthsAgo}).ok);
assert.equal(core.reclaimReviewDate(dupe)<=core.today(),true);
assert.equal(core.dupeState(dupe),'review-due');
assert.equal(core.dupeQueue(bank).length,1);
assert.equal(core.pending(bank).length,0,'CRM reclaim reviews are NOT outreach tasks');
assert.ok(core.logReclaimRequest(bank,dupe.id,'Manager request #123 submitted outside SalesOS').ok);
assert.equal(dupe.crmClearance,'hold');
assert.equal(core.dupeState(dupe),'requested');
assert.equal(core.activateReserve(bank,[dupe.id]).activated,0,'request submission does not grant permission to approach');
assert.match(core.logReclaimRequest(bank,dupe.id,'resubmit').error,/already awaiting/i);
assert.ok(core.recordReclaimDecision(bank,dupe.id,'approved','Manager confirmed ownership reassigned and CRM owner updated').ok);
assert.equal(dupe.crmClearance,'cleared');
assert.equal(dupe.leadPool,'reserve');
assert.equal(dupe.opportunityScore,94);
assert.equal(core.dupeQueue(bank).length,0);
assert.equal(core.pending(bank).length,0,'approved companies stay in reserve until activation');
assert.equal(core.reserveEligibility(bank,dupe),'');
assert.equal(core.activateReserve(bank,[dupe.id]).activated,1);
assert.equal(core.pending(bank).length,1);
assert.match(core.recordReclaimDecision(bank,dupe.id,'approved','again').error,/No pending/i,'no second approval');

const declined=reserve(bank,'Declined Duplicate Ltd',96,'hold');
assert.ok(core.reviewReserveCRM(bank,declined.id,'hold','Checked in Salesforce',{lastActivityAt:threeMonthsAgo}).ok);
assert.ok(core.logReclaimRequest(bank,declined.id,'Submitted manager ticket #456').ok);
assert.ok(core.recordReclaimDecision(bank,declined.id,'declined','Manager refused; company still assigned').ok);
assert.equal(core.dupeState(declined),'declined');
assert.equal(core.activateReserve(bank,[declined.id]).activated,0);
assert.match(core.logReclaimRequest(bank,declined.id,'try again').error,/declined/i);
assert.match(core.reviewReserveCRM(bank,declined.id,'cleared','clear it').error,/Duplicate Queue/i);
const newerActivity=core.addCalendarMonths(core.today(),-1);
assert.ok(core.reviewReserveCRM(bank,declined.id,'hold','New activity seen in CRM',{lastActivityAt:newerActivity}).ok);
assert.equal(core.dupeState(declined),'waiting','new activity restarts the three-month clock');
assert.equal(core.logReclaimRequest(bank,declined.id,'early').error.includes('not arrived'),true);
assert.match(core.reviewReserveCRM(bank,declined.id,'hold','Wrong date',{lastActivityAt:threeMonthsAgo}).error,/newer/i);

const pendingDupe=reserve(bank,'Pending Approval Ltd',73,'hold');
assert.ok(core.reviewReserveCRM(bank,pendingDupe.id,'hold','CRM last activity verified',{lastActivityAt:threeMonthsAgo}).ok);
assert.ok(core.logReclaimRequest(bank,pendingDupe.id,'submitted ticket #789').ok);
assert.ok(core.reviewReserveCRM(bank,pendingDupe.id,'hold','New activity found',{lastActivityAt:newerActivity}).ok);
assert.equal(core.dupeState(pendingDupe),'waiting','new CRM activity cancels prior pending status');
assert.match(core.recordReclaimDecision(bank,pendingDupe.id,'approved','old ticket approved').error,/No pending/i);
const oldBackup=core.normalize(structuredClone({version:3,...bank,leads:bank.leads.map(l=>{const x={...l};delete x.crmLastActivityAt;delete x.crmReclaimStatus;return x})}));
assert.equal(oldBackup.leads.find(l=>l.id===pendingDupe.id).crmReclaimStatus,'waiting','older snapshots remain compatible');
assert.equal(core.checkInvariants(bank).length,0);

assert.deepEqual(Array.from(core.checkInvariants(s)),[]);
console.log('RESERVE PASS: rank, opt-in activation, score/CRM gates, expiry, caps, promises, legacy compatibility');
