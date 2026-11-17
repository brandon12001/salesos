# SalesOS — canonical product specification

**Version:** Product vision through 12 November 2026. **Audience:** Codex engineer taking over from ChatGPT discussion. **Current implementation:** React migration prototype, not yet production-build verified. This document records user decisions and intended outcomes; it is NOT a claim every feature has been implemented fully.

## 0. Mission, user, priorities

SalesOS is a **personal FX salesperson's execution system**, intended to replace the organisational/motivational experience the user previously enjoyed in Outreach. It must be usable throughout a high-volume prospecting workday while helping qualified opportunities reach their first trade. The user likes completing assigned tasks but does not enjoy manually organising the whole day. Do not build a feature-heavy CRM front end at the expense of execution.

Product priorities (in order): **(1) evidence-based buyer/deal progression, (2) meaningful activity and motivation, (3) organisation and zero missed follow-ups.** The single core loop is:

**Open SalesOS → see highest-priority actionable task → understand why and success criterion → perform action manually → record outcome → generate/recalculate next actions → show the next task.**

One task displayed in Focus Mode at a time. Management screens exist, but are secondary.

## 1. Focus Mode (primary home screen)

- Start in Focus Mode. Sidebar/nav **hidden by default**, toggleable via menu (`M` shortcut). Small top toolbar; no large metric tiles or permanent right-side columns; the task occupies the centre.
- Slim bottom strip for calls, tasks, meetings, XP, due queue and lead supply.
- Visible: task type, contact name/title/company, contact phone/email/LinkedIn action, why it matters, known previous context, next objective/milestone, evidence/commitment that would count as progress, clear task outcome buttons.
- One-click **Copy Number** for Teams, with correct formatting and mobile/landline selection when available (`C` shortcut). A copied number does not imply a completed call.
- Call outcomes should include No Answer, Connected, Wrong Person, Bad Number and quick access to appropriate outcomes (callback, meeting, disqualified, negative nurture, closed lost, take off list).
- **No Answer must be near one click**, log attempt and advance sequence without a questionnaire. Connected/engaged reveals an *optional*, fast FX qualification panel plus readiness and next-milestone update. Unknown fields may stay blank.
- Quick shortcuts already envisaged: `M` toggle menu, `C` copy number, `N` no answer, `G` connected/log, `W` wrong person, `B` bad number, `S` skip/snooze. Do not capture shortcuts while a text input, select or textarea is active.
- Call block mode may focus on calls without overriding urgent commitments. Snooze/skip must not falsely count tasks as completed.
- Expandable context sections show history, buyer readiness, barrier, commercial facts and notes; collapse by default.
- For manual email task: provide **copyable suggested subject and body**; user pastes into Outlook and explicitly clicks Sent. This may be incomplete in current code (currently primary email action copies address only). LinkedIn connection/message opens the user's profile and the user marks actual completion manually; do not auto-connect or auto-message.

## 2. Acquisition pipeline — exactly seven stages

1. **Prospecting:** Find/contact relevant decision-maker and qualify potential FX exposure.
2. **Discovery Complete:** Significant FX discovery has been completed; seek meeting.
3. **Meeting Booked:** Prepare and attend agreed meeting.
4. **Successful Meeting:** Buyer and seller identify relevant next commercial steps.
5. **Onboarding:** Chase/complete applicable requirements and documents.
6. **Account Open:** Account operational, focus on agreed first transaction.
7. **First Trade:** Acquisition complete upon first transaction.

Pipeline milestones are **operational facts**, not evidence by themselves of psychological intent. A prospect can be at a specific pipeline stage and a different Buyer Readiness level. Stage transitions should preserve unrelated commitments, store audit/history and award milestone XP only once. A customer/active-trading status may be tracked separately after first trade; do NOT add an eighth acquisition stage.

## 3. Four non-pipeline prospect outcomes (keep distinct)

- **Negative Nurture:** Eligible company/contact but not receptive now; e.g. happy with bank, bad timing, no appetite to review. Track reason, optional future review and respect expressed preferences. Not active opportunity value.
- **Disqualified (DQ):** Not a viable FX opportunity: no FX, group treasury entirely controls the exposure with no locally addressable decision, business shut/retired, etc. Contact not handling FX is NOT automatically company DQ; first find the right contact.
- **Closed Lost:** Qualified, a real solution has been explored/offered, but client decides not to proceed, perhaps remaining with incumbent. Different from Negative Nurture.
- **Take Me Off the List:** Explicit no-further-contact request; immediate suppression of future automated/manual outreach tasks within recorded contact/company scope, preserved across CSV re-import. Store timestamp, scope and reason; never award sales XP for opting out.

Records/history stay available for audit; suppression is absolute until lawfully and appropriately withdrawn. Do not auto-reopen DQ/Closed Lost or add nuisance tasks.

## 4. Independent eight-level Buyer Readiness (awareness) system

| Level | Name | Evidence to consider | Next purpose |
|---|---|---|---|
| 1 | Unaware | No demonstrated knowledge of us (default cold import assumption, not established fact) | Make first contact |
| 2 | Aware | Recognises us but has no demonstrated interest | Establish relevance |
| 3 | Interested | Genuine curiosity or relevance | Discovery |
| 4 | Problem Recognised | Acknowledges FX issue or useful improvement | Quantify impact, urgency, consequences |
| 5 | Motivated to Change | Buyer believes issue matters enough to act | Explore/demonstrate suitable solution |
| 6 | Considering Us | Actively evaluating our solution | Resolve objections, decision-makers, terms |
| 7 | Ready to Commit | Explicit agreement to proceed, subject to requirements | Complete onboarding and first trade |
| 8 | Switched | First transaction completed | Acquisition complete |

- Never advance on activity volume alone or infer from pipeline stage. After a *meaningful* interaction, user may explicitly confirm level, including regression, with supporting evidence. Store old/new, date, notes and reason, and display history.
- For each active prospect store/display: **current acquisition stage, readiness level, main barrier, next desired buyer milestone, next actionable task, and evidence/date of last meaningful progress**.
- Display readiness in prospect list/profile and expandable Focus context; filter/sort by readiness. Current stage and status independent.
- A verified FX volume does not automatically imply interest/motivation. The UI should suggest, not assert or silently change readiness. No-answer/gatekeeper interactions should not trigger readiness forms.
- For Lusha CSV **new records default to Level 1 Unaware**. Treat as a working cold-prospect default; do NOT rewrite existing record/confirmed evidence when matching duplicates. Legacy records may remain Unassessed if never classified; don't silently invent certainty.

## 5. Task/sequence/follow-up logic

- Sequence defines **what channel/action comes next and when**; priority engine chooses the highest-value among due eligible tasks; progression engine determines the objective and branches from meaningful outcomes.
- Suggested starting cadence across working days (configurable): Day 1 Call → Day 2 Email → Day 4 LinkedIn Connect → Day 6 Call → Day 9 Email → Day 12 LinkedIn Message (only if connected and appropriate) → Day 15 Call. This is a prototype, not a proven optimum.
- No Answer: log quickly, rotate calling windows where appropriate, follow cadence. Don't repeatedly call at identical times. Exhausted unengaged leads may move to an appropriate review/nurture decision, not automatically to DQ.
- Connected: inspect what was learned. If information/meeting requested, **pause generic cold sequence** and create specific next action; preserve exact promised callbacks/dates. After meetings, onboarding and account opening, build milestone-specific tasks. No blind multi-channel follow-ups after meaningful buyer feedback.
- Priority hard constraints: suppress opt-outs; exact-time promised callback, scheduled meeting and actual deadlines take precedence. Then rank by commercial potential, opportunity fit, actionable next milestone, time since last meaningful engagement, buyer readiness as **one modest factor** (not absolute rank), and contactability. Never put a bad-number call first.
- Keep pending commitments when advancing stages, changing readiness or closing obsolete sequence steps; cancel only the tasks superseded by the change.
- Tasks must have **objective**, **success criterion**, **due date/time**, **lead/contact/method IDs**, **origin**, and **commitment flag** where applicable. Avoid duplicate generated tasks. Newly created insight tasks pass through the same queue, and must not overrule a promised callback.
- Nurture review is low frequency and should first evaluate whether respectful recontact is appropriate. Disqualified, Closed Lost and opt-outs are not general active sequences.

## 6. Contact Resolution (separate task queue; not pipeline/readiness level)

Wrong person, doesn't handle FX, left company, bad/invalid number, number belongs to another person, or no usable contact method should generate **research/repair** tasks rather than destroying the company opportunity.

- Store **company → multiple contacts → multiple contact methods**. A number can be Valid/Unverified/Invalid/Do Not Call; distinguish verified deliverability from merely plausible format. Keep mobile/landline/email/LinkedIn independent.
- Wrong contact: seek correct person (CFO/FD/Head of Finance/CEO/MD preferred); optionally email known contact to ask who manages FX if permitted.
- Bad number: flag specific number invalid, stop using it, choose valid alternative where available, otherwise create find-new-number/find-new-contact task. Do not cycle back to invalid number.
- Contact gone: mark person inactive and research replacement; do not automatically DQ company.
- Email-only prospect: appropriate email-led task plus research for phone if valuable; require manual send confirmation.
- Group treasury: qualify whether local entity has addressable FX; if truly no route, DQ the **entity** with reason, not just the person.
- Contact resolution queue contributes to Focus Mode and lead supply. Companies with no usable method are not counted as callable leads. Prioritise resolution tasks by opportunity value and urgency.

## 7. Live FX qualification (optional, only when buyer engages)

Inline or expandable panel from Focus Mode; previously entered fields prepopulated; autosave draft as appropriate. Capture only what is learned; blanks and Unknown permitted. Fields:

- Annual/monthly/quarterly FX amount **and denomination currency**, observed vs estimated, time period, annualisation, date/source/confidence. Multiple distinct currency flows, currency pairs and **buy/sell direction** without double counting.
- Provider(s), current pricing/spread/fees with units and source (do not equate incumbent spread to our forecast take rate).
- Spot, forwards, options where relevant; percentage hedged, forward tenor and product use, payment frequency/timing/next payment, budget rate.
- FX decision-maker, contact fit, renewal/review dates, issues/objections, notes, next steps and promises.

Captured data updates company/opportunity commercial context and informs next discovery questions/milestones. User explicitly confirms readiness changes. Avoid mandatory questionnaires after a no answer.

## 8. Lusha CSV import and source hygiene

Default source = **Lusha CSV export** (no Lusha API required, user prefers CSV). Detect/map common company/contact, name/title, mobile/direct, email, LinkedIn, industry/domain headings. Prefer original header handling and preview, clear errors, invalid numbers directed to resolution. Real Lusha header formats should be tested against **redacted or fictitious** samples.

- Import each company once, with multiple contacts; dedupe by company name/domain with cautious subsidiary matching, and by contact email/LinkedIn/person. Avoid overwriting existing notes, stage, readiness, history or suppression.
- Newly imported companies **Level 1 Unaware**; Stage Prospecting; no FX qualification assumed; contact numbers unverified. Correct acquisition stage stays independent.
- On reimport, preserve opted-out contacts/companies and confirmed readiness, and never recreate suppressed tasks.
- **Confirmed user decision (17 Nov 2026):** New CSV companies enter a ranked reserve with **no automatic sequence enrolment** by default. Research and scores are produced in ChatGPT before import (no in-app AI service). Reserve activation uses a distinct dated Opportunity Score, explicit CRM ownership clearance, contactability and batch/capacity limits; optional auto-replenishment defaults OFF. Existing manually created and previously active records remain active. See docs/SCORED_RESERVE.md.
- **Salesforce duplicate bank:** An assigned or otherwise unavailable company is kept in **Duplicate Queue**, not discarded. A known last qualifying Salesforce activity date yields a review date exactly three calendar months later. The date only triggers a **manual ownership/activity recheck and possible reclaim request**; it never automatically grants permission to prospect. Track manual request, approval or refusal. Only recorded approval clears a held company, and imported `Cleared` values may not bypass that approval. No Salesforce integration, guessed activity dates, lead calls, or automatic claim submissions.
- Permit JSON backups/migration from v2/v3 and report import summaries. The user cannot integrate Salesforce.

## 9. Gamification and measurable buyer progress

Reward consistent execution but reward **evidence-based milestones** more strongly; initial illustrative values: attempted call +2 XP; meaningful decision-maker conversation +20; qualified discovery +50; meeting booked +100; successful meeting +150; onboarding initiated +200; account open +250; first trade +500. Calibrate later. Track a milestone ID to avoid awarding XP twice on repeat logs, stage bouncing or duplicate imports.

Measure activity and meaningful progression separately: calls, productive connects, qualified discoveries, meetings, follow-up completion, readiness improvements/regressions, stage progression, first trades and revenue. A disqualification can be useful quality information; gamification must not incentivise inventing progress or contacting opted-out prospects.

## 10. Buyer Intelligence Dashboard

Keep dashboards out of default Focus Mode. Show readiness distribution (denominators, legacy Unassessed separate, active vs nurture/closed segmentation), prospects stuck at levels with duration/barriers, readiness transitions over time, stage conversion, meeting conversion, first trades, no-next-action alerts, overdue commitments, contact resolution backlog, common objections, and recommended focus (e.g. 5 Interested prospects have not moved to Problem Recognised).

Insights are **actionable**: recommend appropriate tasks or open an existing task in Focus Mode, dedupe tasks, and preserve hard priority rules. Avoid claiming causality from tiny samples. Weekly coaching can highlight bottlenecks (e.g. Problem Recognised → Motivated to Change) with specific questions to investigate rather than unfounded predictions.

## 11. Pipeline Value Dashboard

Track separately:

- **Discovered FX volume:** supported or explicitly estimated, with currency/period/confidence.
- **Qualified, realistically addressable FX volume:** not necessarily the company's entire FX exposure.
- **Potential annual revenue:** annualised addressable volume × assumed margin bps / 10,000, with explicit assumptions, currency and confidence. For GBP dashboard, require a documented/dated conversion of non-GBP exposure; never silently add currencies.
- **Weighted forecast:** potential revenue × assumption/estimated close probability; separate from actual realised revenue and period-specific revenue target.
- **First-trade and revenue realised:** verified events, distinct from forecasts.

Avoid double-counting repeated contacts, duplicated companies, overlapping FX flows or currency pairs. Show qualified opportunity value by stage, value of stalled deals, missing margin/volume information and target attainment. Prefer planned or user-confirmed conversion assumptions to fake certainty. High-value missing information can generate discovery tasks.

## 12. Lead Supply Engine

Estimate how quickly due/upcoming tasks are being consumed, upcoming task production from sequences and deals, average task duration, and availability of **callable** companies versus uncallable contact-resolution work. Tell the user whether to source more leads, maintain intake or reduce enrolment while overdue follow-ups are addressed. Suggest lead generation tasks without interrupting urgent commitments. Provide forecast confidence; a lead is not equivalent to a single task. Distinguish temporarily empty queue (nothing due) from genuine shortage of suitable leads.

## 13. Storage, security, portability

Current build is **localStorage-first**, which means hosted Vercel UI does not equal cloud memory. Optional Supabase code currently supports **manual authenticated snapshots**, not autosync. Desired future: Supabase/Postgres with user authentication, RLS, safe per-user data, backup, migrations, conflict-safe writes and restoration, all while user operates from a normal browser. Preserve `salesos.personal.v3` JSON v2/v3 migration compatibility; export backup before replacing storage. Don't store employer confidential data until permission exists.

## 14. What success feels like

A high-volume day should be comfortable: user opens website, sees one relevant action, copies number into Teams, makes call, clicks No Answer and immediately gets next task. For a meaningful conversation, captures FX volume/currencies/provider/products and buyer evidence, confirms readiness/next milestone, schedules agreed follow-up and returns to Focus Mode. No morning planning spreadsheet, no forgotten callbacks, no activity theatre. Dashboards show where buyer progression and financial opportunity are genuinely improving.
