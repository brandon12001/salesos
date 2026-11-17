# Core workflow and decision rules — engineering reference

This file supplements `PRODUCT_SPEC.md` with expected event handling. The existing implementation lives in `public/legacy/core.js`. Preserve behaviour where valid and add tests rather than copying these rules blindly.

## Actions and precedence

**On every action:** verify opt-out/eligibility → identify current lead/contact/method → persist actual event (with timestamp) → update supported facts → generate/cancel only directly affected tasks → preserve independent promised commitments → run dedupe/invariant checks → rerank due tasks → show next actionable Focus task.

**Do not treat a copied phone number, copied email address, or opened LinkedIn page as an actual call/email/message.** Completion is recorded only after user's explicit action/logging.

### Outcome matrix

| Outcome | Log | What happens next | What should NOT happen |
|---|---|---|---|
| No answer | One-click attempt, timestamp | Advance appropriate prospecting cadence, suggest another window, next task | Don't request FX/readiness form; don't automatically advance readiness |
| Gatekeeper | Actual gatekeeper info | Research/appropriate follow-up | Don't claim decision-maker engaged |
| Connected, meaningful | Notes, optionally FX discovery, readiness evidence | Pause obsolete cold steps; create objective-based next action | Don't blindly resume cold cadence |
| Promised callback | Explicit date/time, contact, reason | Priority commitment task; exact promise respected | Don't cancel during stage change |
| Wrong person / not FX owner | Reason, any suggested correct decision-maker | Contact Resolution task; research correct contact | Don't DQ whole company automatically |
| Bad number | Mark specific method invalid | Cancel only calls on that method; alternative method or research | Don't call invalid number again |
| Left business | Inactivate contact | Identify successor/alternative channel | Don't DQ otherwise viable company |
| No FX / group treasury owns it | Confirm scope of business opportunity | DQ entity if genuinely not addressable; log reason | Don't confuse with wrong contact |
| Negative response but future potential | Capture objection/review date | Negative Nurture with review, if permitted | Don't label Closed Lost without a genuine proposed solution |
| Qualified and chose incumbent | Reason after solution offered | Closed Lost | Don't label DQ |
| Explicit take me off list | Timestamp and person/company scope | Suppress all appropriate outreach and future reimport | No automated re-enrolment |
| Meeting booked/held | Commitment and actual milestone | Meeting prep/relevant commercial next action | No double XP for same meeting |
| Onboarding/account open/first trade | Evidence, stage advance | Specific next operational milestone or close acquisition | Do not infer readiness 8 before actual trade |

### Example outreach sequence

Day 1 Call, Day 2 Email, Day 4 LinkedIn Connect, Day 6 Call, Day 9 Email, Day 12 LinkedIn Message (if connected), Day 15 Call. Use working days, configurable delays. Buyer interest or commitment branches away from default cold sequence. Avoid automatic high-frequency outreach to someone who declined; comply with opt-outs, lawful contact rules and any company guidelines.

## Task ranking reference

1. **Hard exclusions:** explicit opt-outs, closed/DQ without permitted review, invalid contact method, action before due date, duplicate/cancelled tasks.
2. **Hard schedule priorities:** callback exact time, imminent meeting/preparation and documented deadlines.
3. **Within eligible tasks:** value/opportunity, prospect fit, likelihood of next milestone, recency of *meaningful* interactions, urgency, Buyer Readiness (one factor only), due/overdue time, workload block settings.
4. **Don't let rank make no-actionable contact look callable.** Add research/leadgen tasks when appropriate.
5. Focus Mode shows exactly one highest-eligible action, then recomputes after each event.

## Meaningful buyer progression

Readiness is not operational stage. Level changes need explicit seller confirmation and recorded evidence, including regression. Tasks should display **current condition → barrier → next desirable buyer milestone → success criteria**. After a call, compare evidence with objective; no forced stage advance. When there is already a pending commitment, adapt the content of that task instead of spawning a duplicate.

## Sales discovery, FX and revenue

Raw entries can be incomplete. Record currency pair, flow direction, volume amount and denomination, period, source/confidence, percent addressable, margin assumption, products, incumbent provider, pricing, hedging and next payment. Avoid forcing unknowns to zero. Avoid summing GBP and USD nominal amounts. Example potential annual revenue formula:

`GBP-equivalent annual addressable flow * (proposed margin in basis points / 10,000)`

A projected annual total is NOT realised or commissionable revenue. Confirm the time frame, source, and whether a value is hypothesised, prospect-stated or verified. Avoid duplicate flows; don't double-count the same company's volume through multiple contacts.

## Lead supply and XP

Task supply uses completion rate, due/upcoming tasks, estimated future tasks, usable contacts, and research backlog; it can recommend sourcing more prospects or pausing intake without suppressing critical follow-ups. XP for calls is small. XP for verified milestones is higher but granted once per unique milestone; do not allow stage toggling to farm points.
