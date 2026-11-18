# Focus Mode 2.0 validation — 18 November 2026

**Local result:** all commands below exited 0 on 18 November 2026. History navigation plus search took 330–357 ms with the large synthetic fixture; Focus navigation samples were 298–419 ms in this cloud browser. The final rerun also passed with Playwright Chromium 159 (the CI browser), after the mobile-wrap correction. These are observations, not latency guarantees.

Candidate branch: `feature/focus-workflow-v2`. Base: released main `b2c388c`. Review only; production and its workspace were not changed. No migration, additional dependency or integration is introduced.

## Automated checks

- `npm test`: engine, importer, reserve/duplicate rules, autosave, Intelligence and the new Focus workflow regression suite pass.
- `npm run build`: strict TypeScript and Vite production build pass.
- `npm run test:browser`: disposable localhost Auth/Postgres/PostgREST/mail, fictional accounts and real production bundle; external network blocked. Includes SQL RLS/revision/idempotence/snapshot verification.

| Requested acceptance case | Coverage |
| --- | --- |
| Save & Stay, then update notes | Browser: same prospect pinned; original call updated, audit appended, activity/XP unchanged |
| Save & Next and Previous | Browser: next eligible prospect and completed-task review; no repeat completion controls |
| Persisted completed history | Browser: reload, search/filter company/notes/type/completed, reopen saved call |
| Contact channels on calls | Browser: associated recipient copy, unrelated company contact excluded; unit: missing association refuses fallback |
| Follow-up email and Sent | Browser: accepted objective/context/today/agreement; same contact; opening/copying never marks Sent; explicit Sent records once; repeat offer reuses completed task |
| Promised callbacks | Browser/unit: creating or fulfilling email preserves callback; unit: explicit callback/meeting scheduling deduplicates |
| Historical notes and minutes | Browser/unit: edits keep call count/XP/readiness, correct daily minutes and append audit; stale/invalid/cross-company changes rejected |
| Outcome correction | **Deferred.** Outcome is read-only; simple-edit helper refuses outcome/XP fields. Needs separate preview/reconciliation PR |
| Answered — No Conversation | Browser/unit: answered dial, no meaningful conversation/readiness/opt-out; optional reasons and respectful review after declined conversation |
| Failed save | Browser: local quota keeps draft/form; HTTP 503 preserves durable outbox; reconnection retries; unsaved history draft survives reload |
| Two sessions/account isolation | Browser: independent sessions, negative RLS, conflicting activity edits stop with recovery export, cloud winner preserved |
| Mobile/keyboard | Browser: 320/390/768/1440px Focus/post-call layouts; copy hotkeys, modal Tab trap/Escape, keyboard toggle; full-page screenshots inspected |
| Substantial history | Browser: 302 fictional prospects plus 1,500 additional call records, indexed history search with capped initial rendering |
| Existing behavior | Browser/unit: seven stages/eight readiness levels, ownership/opt-out checks, five passive reserve entries, auto-off, Dupe Queue request/approval, JSON recovery and Cold call mode |

## Bugs addressed

- Completing the call always removed the prospect from Focus; recording and view selection are now independent.
- Completed tasks lacked convenient return/search/edit routes; stable review and history preserve the original record.
- Calling screens hid related email details; all available channels now use the associated person.
- There was no accepted, linked and deduplicated post-call email action.
- Task Queue **Open** could immediately complete email/other simple tasks. It now opens those in Focus and requires explicit completion. A browser regression reproduced the old behavior and covers the fix.
- Some generic call-cadence cancellation predicates did not exempt explicit promises; connected/callback outcomes now retain those commitments.
- CI caught a 320 px post-call overflow under its Chromium build. Review grids now allow shrinking and long controls wrap; layout failures report overflowing element geometry. CI screenshot upload now explicitly includes the hidden test-artifact directory.
- Answered calls without conversations could only be misclassified; the new outcome separates answered and meaningful-conversation statistics.

## Remaining limits and manual review

1. Outcome reconciliation is intentionally incomplete, as permitted by the request. Do not change production outcomes by editing JSON.
2. Unsaved editor drafts are browser-local. Only saved workspace edits travel across devices; private-browser storage, clearing site data or device loss can remove unsaved drafts.
3. Automated sign-in/network/concurrency tests use isolated infrastructure. They do not assert live production Auth/Vercel/device behavior. After approval, use a fictional account for that smoke test and the [manual checklist](FOCUS_WORKFLOW_V2.md#manual-approval-checklist).
4. The browser test bundle includes Supabase and emits Vite's non-fatal >500 kB chunk warning. No measured history/navigation stall justified a bundling rewrite in this workflow PR.

This candidate is prepared for review, not certified as deployed. Merge, deployment and any production smoke testing require the user's explicit approval.
