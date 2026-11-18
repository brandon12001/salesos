# SalesOS Intelligence v1 — review build

This feature branch builds on merged PR #3 (`2ff33ace`). It does not authorise a production release. The seven acquisition stages, eight independent Buyer Readiness levels, statuses, suppression, manual communications, historical tasks and cloud revision checks remain in place. No AI, paid APIs, new packages, database schema or production migration are required.

## Operating modes and configuration

Settings → SalesOS Intelligence v1:

- **Shadow comparison (default when the setting is absent, `intelligenceMode: 0`):** Focus uses the existing task selector. A collapsed comparison shows the proposed action. Evaluation does not persist, create tasks, log activity or change any prospect.
- **Use Intelligence (`1`):** Focus uses eligible recommendations and explains the objective, reason, success criterion, Buyer Readiness and Momentum. If no action is safe/due, it shows that explicitly. A broken evaluation fails closed. Switching to Off is the explicit legacy fallback.
- **Off (`2`):** Existing task selection without comparison. The legacy selector has not been rewritten. Its existing behaviour is deliberately preserved; the additional Intelligence clearance/working-hour rules apply to the enabled/shadow decision engine.

Working hours and days use the browser's local timezone. Defaults are Monday–Friday, 09:00–17:30. These are seller preferences, not claims about buyer availability or successful calling windows. Promised callbacks and meetings are exempt from generic working hours, but never from suppression, ownership, channel validity or an explicit buyer contact-date restriction.

Daily call/task/meeting targets, dial accounting, call-duration/KPI minutes and XP rules retain their existing definitions. Recommendation estimates and elapsed session time do not add activity or KPI minutes.

## Five-step decision pipeline

### A. Eligibility

The engine excludes reserve, held/unknown/stale-clearance, suppressed, closed/disqualified and completed-acquisition companies. Clearance must be explicitly recorded, dated, non-future and no older than 30 calendar days. Existing explicitly promised nurture callbacks and respectful review tasks are evaluated under the same contact gates; no speculative nurture outreach is created.

Contact checks include the exact method, plausible phone/email/profile format, blocked/invalid methods, opt-outs, inactivity, wrong responsibility and LinkedIn connection state. The selected route is bound to the recommendation and rechecked when an outcome is saved; a route or schedule change requires review rather than logging against a different person. Internal contact repair can be recommended for an otherwise cleared active prospect without removing an unusable promise.

An active company's manual clearance can be recorded with explicit attestation in the commercial-evidence dialog. Held or reserve companies must use the existing Lead Reserve/Duplicate Queue approval workflow. That dialog cannot clear a hold.

### B. Candidate actions

Existing due actions are considered alongside a small set of generated suggestions. Examples include missing-volume qualification, quantifying a buyer-confirmed problem, resolving an explicit barrier, meeting preparation, onboarding and securing the next payment after account opening. Specific recorded next steps and promises retain their own objectives. Repeated unsuccessful calls can suggest a different approach or an available alternative channel. Unstructured notes are never parsed into alleged facts.

A future pending schedule prevents speculative extra tasks for that prospect. New suggestions for an active prospect without work are virtual: viewing, copying or cancelling a dialog creates no task. Explicit outcome submission creates the task and logs its outcome atomically through the existing local/cloud save boundary. A chosen alternative may cancel only its directly superseded non-promised sequence/follow-up; other history and commitments remain intact.

Due protected actions sort ahead of every numerical score, in deadline order. Call block and alternative selection cannot displace them. Results use stable IDs/tie-breaks and a caller-supplied clock.

### C. Scoring and explanations

Opportunity Score remains the company's researched 0–100 attractiveness. It never changes Buyer Readiness, stage, estimated revenue or ownership clearance.

Action Priority is a design score, **not a conversion probability**:

| Component | Default weight | Inputs |
|---|---:|---|
| Urgency | 30% | Due schedule, capped lateness and recorded recent engagement; protected schedules are a separate hard ordering rule |
| Buyer progression / commercial impact | 35% | Evidence-backed readiness, recent engagement, acquisition milestone, confirmed FX problem, a small research-fit contribution |
| Evidence confidence | 20% | Explicit readiness/progression evidence, confirmed flows, research confidence and recorded commitments |
| Effort efficiency | 15% | Transparent fixed initial effort estimates by action type |

Weights are configurable and normalised to sum to 100%; all-zero input uses the defaults. Individual component values and estimated effort are visible. Inactivity does not increase assumed buyer interest or financial value. No FX revenue, switching probability or buyer intent is invented.

### D. Intelligent Power Hour

The user can preview/start a 30-, 45- or 60-minute suggested session. Its start/end survive cloud saving and reload. Planning recalculates from elapsed wall time and current eligible work after completion, deferral or skip. Known commitments inside the session reserve time; tasks are not packed across their expected start. Similar channels may be grouped only within a five-point priority gap, with promises protected. One speculative action per company avoids duplicate alternative recommendations in the plan.

Calls can exceed their initial estimates. Overruns reduce the remaining budget; an oversized commitment stays due in Focus with a warning. An empty/short queue reports insufficient eligible work or unallocated time. A session is a suggested plan, not a calendar booking or automatic execution/sending facility.

### E. Outcomes and learning foundations

Explicit execution records the recommendation, rule version, reason, score, contact role/channel, linked activity IDs, actual recorded outcome and known call duration. Explicit stage/readiness advancement is distinguished from a conversation or attempt. Snoozing is not outreach completion. Copying/opening and viewing alternatives are not completed activities.

Unsuitable recommendations can be deferred with Wrong person, Wrong time, Irrelevant action, Better action available, Insufficient information or Other reason. Wrong person/irrelevant pauses the same recommendation for seven days; other feedback pauses it for 24 hours. Feedback is not a suppression change, CRM clearance or actual call outcome. Due promises cannot be dismissed by feedback; the existing explicit rescheduling workflow remains available.

Observed results group reliably linked call outcomes by channel, role, day and broad local-time band. No percentages are displayed below 20 calls per group. A recorded conversation rate is labelled with its numerator/denominator and does not personalise timing. Only explicit progression during linked recommended actions is counted; later unrelated stage edits are not assigned causal credit. Future learning can build on those links without retroactively inventing missing metadata.

## Prospect Momentum and commercial evidence

Momentum is derived, never written into readiness:

- **Progressing:** explicit progression evidence or a buyer-confirmed problem/impact with an explicit confirmation date within 14 days. Re-saving unchanged evidence preserves its original timestamp; unknown or old observation dates do not establish fresh momentum.
- **Stable:** recent meaningful engagement without a newer confirmed milestone.
- **Stalling:** three unsuccessful attempts in 30 days without later engagement, or more than 14 days since a recorded engagement.
- **At risk:** five unsuccessful attempts in that window, or an overdue pending commitment (timed: over 30 minutes; untimed: prior date).
- **Insufficient evidence:** no reliable engagement/progression basis. Old cold data is not automatically an opportunity.

Reasons accompany the state. An overdue task means completion is unrecorded; it is not proof the buyer has lost interest.

The optional commercial-evidence dialog captures **Problem, Impact, Timing and Decision barrier**, each buyer-Confirmed/Hypothesised/Unknown, plus explicit contact date limits. Existing FX provider, confirmed/estimated flows, payment timing, readiness evidence, barriers and research hypotheses are displayed with their provenance. Confirmed recurring flow presence can resolve a volume qualification gap; currencies and periods are not silently added or converted. A hypothesised problem does not trigger the confirmed-impact rule. Buyer Readiness and acquisition stages still need explicit human confirmation.

## Enhanced existing reserve replenishment

The existing `reserveAutoActivate` flag remains OFF for new workspaces and is never turned on by enabling Intelligence. Existing saved settings are preserved. Lead Reserve offers a separate opt-in refinement (`reserveIntelligentRefill`) and a **40 task floor / 10 company batch / 65 minimum score** preset. Applying that preset alone does not enable automation.

After explicit enabling/saving, the existing replenisher:

1. Counts currently due, permitted work rather than filling on the basis of distant scheduled tasks.
2. Ranks the same researched reserve using existing Opportunity Scores.
3. Applies existing recent manual clearance, suppression and status gates plus plausible phone/email checks.
4. Enforces score, batch and active-prospect limits.
5. Permits one batch per completed-work change (or new day), preventing unrelated settings, evidence and feedback saves from looping through the reserve.
6. Records activated company names and an explanation in the existing activity history, visible in Lead Reserve.

It never removes holds, changes ownership evidence, sends messages, places calls or deletes history. Existing dated reclaim review/request/approval rules remain untouched. It operates after explicit saved user actions, not a background timer.

## Storage and compatibility

All new data is an optional top-level `intelligence` extension to the existing v3 JSON document: version, commercial evidence by lead ID, explicit contact timing, decision events and optional session. Numeric configuration stays in existing settings. This placement survives the existing normalisation, cloud JSONB save, conflict recovery and JSON backup/restore without altering Lead or Activity schemas. No migration, service-role key, new Auth flow or paid service is needed.

The existing autosave controller and revision RPC remain the authority. Transactional action errors are rejected before saving; forms retain their drafts on failure. This feature does not merge competing documents or overwrite the cloud winner.

## Verification and remaining limits

`npm test` includes the original engine/import/reserve/autosave suites and a new fixed-clock Intelligence suite. `npm run build` runs strict TypeScript and Vite. `npm run test:browser` tests the compiled app against disposable localhost Auth/Postgres/PostgREST/mail with external network blocked and fictional companies only. It includes new feature setting, evidence, feedback, session, method/accounting, cloud round-trip, keyboard and mobile checks in addition to the reliability suite.

Hosted acceptance on a separate fictional-only account, a physical second device and work-browser clipboard permissions are still release acceptance checks, not claims made by localhost tests. No real prospects are read/exported/edited for this feature's tests. Production data and automatic replenishment remain unchanged. A deployment-disabled feature-branch rule prevents a Git-triggered Vercel preview while this draft is reviewed; no manual deployment is requested.

Statistical learning, optimal call-window recommendations, automatic note extraction, causal attribution and automatic communications are deliberately outside this release. The displayed rules/estimates are initial design assumptions to review against real outcomes, not evidence of improved conversion.
