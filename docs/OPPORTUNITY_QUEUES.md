# Commercial work queues — first increment

The user approved the recommended first step from the Opportunity Intelligence proposal: use existing evidence and reviewed research to prioritise daily work before adding automated research. This branch is stacked on PR #10 (`feature/call-ready-preparation`). Both remain separate release approvals. No paid API, automated research, n8n, contact enrichment, scheduled research job or production data operation is included.

## Daily execution

Focus offers Recommended plus four one-click queue buttons: Opportunities, Qualified, Gold and Standard. Recommended orders eligible due actions in that order. Each selected queue filters discretionary work only. Due callbacks, meetings and promised actions stay first globally, in deadline order, regardless of commercial queue, industry or Cold Call Mode. Future actions are not pulled forward.

Counts show eligible **actions** under current call/industry filters, independent of the selected commercial category. Protected commitments are counted separately in the accompanying sentence, rather than duplicated in four badges. Enabled Intelligence can offer its existing virtual next actions derived from stored records; these are not claims of additional persisted task rows. Reserve companies, held/unknown/stale-clearance companies, future work and unusable routes do not inflate the counts.

Next-task navigation, alternatives and Power Hour use the same filtered order. Power Hour cannot group a lower commercial category ahead of a higher one merely to keep using the same channel. History/recent-task navigation remains a deliberate review path; it does not change schedules or record activity. Copying phone/email and opening a profile remain neutral actions.

## Evidence and classification

Categories are working classifications, independent of the seven acquisition stages, eight Buyer Readiness levels, Opportunity Score and lifecycle status. No free-text note extraction, conversion probability or implicit readiness change is introduced.

Conservative derivation from existing structured information:

- **Opportunity:** current readiness is at least Interested, with matching dated, non-future readiness history/evidence, plus a recorded relevant conversation linked to a named decision-maker. A meeting stage, high score, polite answer or generic information request alone is insufficient.
- **Qualified:** a recorded relevant conversation, confirmed recurring FX flow, valid FX observation timestamp and explicitly dated buyer-confirmed commercial impact. A forecast or volume field alone is insufficient. No arbitrary currency threshold or invented FX revenue is used.
- **Gold:** explicit human research approval is required. Never inferred from the research score or an AI label. Approval requires a description, dated research within 90 days, original rationale/source URL, a specific call clue where call-preparation metadata exists, an opening question, and a named permitted contact route. The reviewer attests to the commercial hypothesis, plausible scale and UK decision access. Source truth and company suitability are human review decisions, not a claim of automated independent verification.
- **Standard:** no qualifying evidence/approval, or a reasoned manual correction. Missing evidence is not a disqualification.

Focus and prospect details offer Review queue evidence. A manual Opportunity/Qualified confirmation records a named permitted contact, actual evidence date, supporting statement and explicit real-conversation attestation; it can capture facts learned outside the app without fabricating a call log. Gold records a research review. Every correction requires a reason. These are optional actions; No Answer retains its one-click path. Generic cold objectives for confirmed interest/qualification become buyer-progression or problem/timing objectives, without rewriting stored tasks. Specific recorded actions, later pipeline objectives and promised callbacks retain their purpose. Intelligence records the updated rule version; classification never advances readiness.

A manual correction acknowledges the existing evidence snapshot. Only a new positive readiness/FX evidence change can promote it automatically. Notes, copying, unsuccessful calls, provider spelling changes and resaving unchanged evidence do not promote it. Explicitly recorded Opportunities are not blindly downgraded when a different field changes; review current evidence/status intentionally. Derived classifications follow the structured evidence currently recorded. Negative Nurture, DQ, Closed Lost, opt-outs and completed acquisition retain their existing lifecycle gates. Pending commitments remain scheduled. No classification reopens outreach or removes a hold.

Gold approval, its reason and earlier reviews remain in queue history after promotion. Original company research and scoring fields remain intact. Research changes or a research date older than 90 days invalidate the actionable Gold classification until reapproval; this does not delete the approval history, change readiness or hide a due promise.

## Safety and persistence

The audit found that the old legacy selector did not apply the newer manual-CRM-clearance gates. The new Focus selection and transactional outcome boundary apply ownership, suppression, contact, date and due-time checks in both modes. Legacy/Off still permits work outside Intelligence's optional working-hour window; switching Off cannot bypass holds, unknown/stale clearance or explicit buyer contact-date limits. Users can record active-company clearance through the existing Settings commercial-evidence flow; held/reserve companies retain the existing reserve/reassignment procedure.

Optional `meta.workQueues` version 1 stores the selected view, latest explicit record by lead ID and append-only review events with evidence baselines. Existing JSON normalisation, account autosave/outbox, revision conflicts, backup/recovery and older clients retain this metadata. No schema migration or new database service is needed. Unsupported future metadata versions reject writes rather than resetting their contents.

Queue preference/evidence changes use the existing atomic workspace commit with replenishment disabled. They create no task, contact, outreach activity, FX flow, readiness/stage transition, revenue or XP. A stale evidence form rejects before mutation. Quota failures retain the draft. Competing sessions use the existing cloud-winner and explicit recovery workflow.

## Validation and release

Use fictional data only. Unit tests cover derived/manual classification, precedence, promises, correction baselines, source/freshness gates, record preservation, both selection modes, action-time safety, Power Hour and metadata/JSON compatibility. Browser tests cover honest counts, explicit approval and attestation, saved filters, industry/call-mode interactions, cross-account JSON recovery, quota draft preservation, competing classification edits and mobile layouts.

No production workspace has been modified for this feature. Feature-branch Vercel deployment is disabled. Obtain the user's release approval, release PR #10 first, then retarget this PR onto main and release it after fresh checks. Hosted sign-in, physical second-device behaviour and work-browser acceptance remain release checks; isolated localhost results do not establish them.

Automated candidate investigation, dossiers beyond the existing sourced upload workflow, research budgets/jobs, paid enrichment and conversion-effectiveness reporting are later increments, not implemented integrations in this release.
