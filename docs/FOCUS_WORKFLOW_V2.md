# Focus Mode 2.0 — review candidate, 18 November 2026

This branch follows main `b2c388c0fda805cb614c9aaebc5a5f0c4fe23cea` (released PR #4). It is a development-only change: no production data reads/writes, deployment or migration are required for implementation. Publishing this feature branch does not enable a Vercel deployment. A separate user approval is required before merge/deploy.

## Recording and reviewing work

**Save & Stay** records the outcome once, completes the pending task and pins the recorded prospect. **Save & Next** records once and returns to the live eligible recommendation. The post-call workspace offers editable notes, FX discovery, Buyer Readiness, contact details, history and explicit callback/meeting scheduling. A second save edits the activity; it never replays the call or its XP.

Previous/Next and the capped 30-entry session trail change a view cursor only. Task IDs and activity IDs remain stable when recommendations rerank; executed virtual recommendations are replaced with their persisted task/activity identities. Historical tasks have a clear review badge and no completion buttons/hotkeys. The current due commitment remains visible when reviewing another task. The session trail resets on reload; recorded work persists and remains searchable in Activity History.

Calling tasks expose phone, email and LinkedIn for the associated contact only. An invalid/missing explicit contact is never replaced with an unrelated person. Copy/open actions do not log outreach. Contact corrections do not retarget planned commitments.

## Follow-up email

The post-call suggestion is available for Meaningful conversation, Callback requested and Meeting booked. Creating a task requires explicit acceptance, an active permitted contact, a valid same-contact email, current manual CRM clearance and a permitted company. Missing email/contact details give an actionable explanation. The dialog proposes today, records objective and internal conversation context, and distinguishes an explicitly agreed email from a discretionary follow-up. Contact date restrictions apply.

`post_call` tasks carry `sourceActivityIds`. Repeated acceptance returns the existing task, including after completion. An open post-call email for the same person can accumulate conversation references; no promised callback/meeting is cancelled. **I sent the email** is explicit manual confirmation; copying alone never completes it. The connected cadence stays paused; fulfilling the email does not invent a new conversation, readiness change or commitment.

## Historical edits and durability

Activity History searches company/contact/type/outcome/notes/task text and filters type, outcome, date range and completed tasks; newest records appear first, with 100-row pagination. Opening an activity returns to Focus review.

Simple edits support notes, talk time, valid same-company contact association and follow-up information. They update the original activity, append nested `editHistory` before/after records and refresh linked decision minutes. KPI call minutes derive from the corrected activity timestamp/date. No new activity, XP, readiness advancement, sales outcome replay or reserve activation occurs. A stale editor stamp rejects the change and retains its draft. Unknown historical roles are not reassigned from current contact roles.

Unsaved editor drafts are browser-local and account-scoped, with debounced writes and flush on leaving the editor. Durable workspace/quota failures retain the form; HTTP/offline failures use the existing account outbox and visible save indicator. Conflicting sessions still pause for recovery and never silently overwrite. Drafts are not synced across devices; explicit Save updates is required for cloud persistence. If browser storage itself is unavailable the draft warning requires saving/copying before leaving.

**Deferred, by the user's permitted scope split:** outcome correction with preview and downstream reconciliation. Outcome is read-only in this release. Never overwrite it via the simple-edit path; the helper rejects extra fields. That acceptance criterion remains incomplete until a separately reviewed reconciliation workflow exists.

## Answered — No Conversation

This outcome has optional Hung up immediately, Bad timing / busy, Declined to speak or Other reasons. It counts one dial and an answered phone, with attempt-level XP only. It does not create meaningful engagement, readiness evidence or an opt-out. Normal unsuccessful-contact cadence applies where permitted; explicit Declined to speak pauses generic cadence and schedules a five-business-day review. Promised actions remain protected. Observed analytics separate answered from meaningful-conversation rates, exclude unknown answer classifications from answer denominators and require 20 samples before percentages.

## Compatibility

The v3 JSON document gains only optional activity/task metadata. No SQL schema change, new dependency, paid service or integration. Seven stages, eight independent readiness levels, reserve/dupe approval and suppression rules remain intact. Existing autosave/revision protocol is unchanged. Never reset production from older fixtures/backups: production has progressed beyond the initial ten contacts.

## Manual approval checklist

On an approved preview with a fictional account:

1. Call → Save & Stay → update notes/time/FX → save again; one call and its XP remain.
2. Create an agreed follow-up email, copy its recipient, confirm manual Sent, then Previous; callback/meeting remains due as agreed.
3. Save & Next → Previous → Return current; no navigation action records activity. Reload, search History and reopen the call.
4. Inspect a missing-email/multiple-contact case; no unrelated address appears. Try the workflow using keyboard and a narrow mobile viewport.
5. Try offline save and competing sessions; inspect saved/queued/conflict states and recovery export.
6. Recorded outcome remains read-only; do not treat this release as outcome reconciliation.

Local automated results and the draft PR record are authoritative for this candidate; production sign-in/device verification is not implied by isolated browser tests.
