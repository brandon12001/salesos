# Salesforce contact workflow validation — 18 November 2026

Scope: manual Salesforce contact administration, based on released Focus Mode 2.0/main `e9705a7`. No integration, migration, production record access or deployment is part of this change.

**Local result:** `npm test`, `npm run build` and the full production-bundle browser suite exited 0. Queue navigation/search with 350 outstanding fictional contacts took 406 ms in this cloud environment (an observation, not a latency guarantee). Mobile screenshots were inspected after the toolbar fix.

## Coverage

| Requirement | Automated evidence |
| --- | --- |
| Existing/imported contacts default Not Checked | Core normalisation and helper tests; browser default queue empty until explicitly flagged |
| Company clearance is independent | Unit snapshot/held-reclaim checks; browser company Cleared remains unchanged while contact status changes |
| Quick Add before/after calling | Browser opens/copies before a call without changes, then uses Save & Stay and reopens same prospect |
| Seven copy fields and compound names | Browser individual clipboard and exact TSV values; temporary name split versus explicitly saved compound surname |
| Queue Needs Adding / Added | Browser Focus one-click flag, queue row/count/status, automatic next after explicit Added |
| Different contacts at one company | Unit/browser independent statuses, notes and timestamps |
| Company holds and opt-outs | Unit/browser suppression flags/invalid methods/hold retained; restricted phone/email/Copy All disabled |
| Task navigation and callbacks | Browser Previous/Return recommendation; unit current recommendation stable; no administrative tasks, activity XP or reserve refill |
| Cloud persistence and account safety | Disposable Auth/Postgres browser refresh and sign-out/sign-in, negative RLS/account isolation; existing offline/conflict/503 tests remain included |
| JSON backup / recovery | Browser exports status-bearing workspace and restores into separate fictional account; unit normalises old/new documents |
| Invalid/missing methods and safe corrections | Unit usable-method validation, same-person association, unverified new methods, original IDs/flags/routes retained, stale edits rejected |
| Duplicate imports | Unit matched contact retains Added/note/timestamp while new contact defaults Not Checked |
| Priorities and bulk administration | Unit evidence-based company/person/commitment distinctions; explicit atomic bulk guard; browser selection-only does nothing, confirmation required, blank bulk note preserves existing notes |
| Hundreds of contacts | Browser paginated 350-contact Needs Adding fixture, 100-row initial cap and indexed filtering |
| Mobile / keyboard / clipboard permissions | Browser widths 320/390/768/1440, Tab trap/Escape, blocked clipboard manual-selection fallback |
| Existing product | Full engine/import/reserve/autosave/Intelligence/Focus suites and browser workflow retained, including seven stages/eight readiness levels |

Commands: `npm test` (seven suites), `npm run build`, `npm run test:browser`. Browser infrastructure is disposable localhost Auth/Postgres/PostgREST/mail with fictional accounts; the runner forbids external network requests. GitHub runs the same production-bundle tests on the draft PR.

## Issues addressed during validation

- Explicitly preserve optional contact-status/name-split metadata through core normalisation, rather than losing it during JSON recovery.
- Keep administrative mutations outside reserve replenishment, task completion and milestone/XP paths.
- Preserve existing verification notes when a bulk update leaves its optional note blank.
- Fix management-toolbar overflow at 320 px using wrapping; the new queue check covers this genuine narrow-screen issue.
- Synchronise the new sign-out test with the actual signed-out screen before navigating to sign in; the test previously interrupted the asynchronous sign-out request.

## Manual review and limits

Follow the [workflow checklist](SALESFORCE_CONTACTS.md#restrictions-and-manual-checks) using a fictional account on an approved preview. Check your employer's actual Salesforce form and work-browser clipboard policy manually: no Salesforce automation or API test is performed. Verify Added only after personally creating or finding the contact in Salesforce.

Temporary copy-form edits are intentionally discarded on Close. They become part of SalesOS only through Save corrected contact details; company and industry edits remain copy-only. Existing task method IDs are not silently changed. Confirm the existing **Saved to cloud** indicator before switching devices or closing the browser. Hosted production sign-in/physical-device acceptance is separate from isolated browser tests. Outcome reconciliation remains outside this contact-administration PR. The existing Supabase-enabled test bundle still emits Vite’s non-fatal >500 kB chunk warning; measured queue responsiveness did not justify a bundling rewrite.

Nothing in these tests touches real production prospects. No merge/deployment is authorised by this development request; the prior PR #5 approval does not apply to this feature.
