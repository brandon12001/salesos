# PR #2 validation — 17 November 2026

Scope: draft PR #2, `feature/scored-lead-reserve`, resumed from `2fb36c9c7987fc9189a362a47c3e5a3918b227e6`. Production `main` was not merged or redeployed. No production database rows, authentication settings, environment variables or integrations were changed during this validation.

## Bug reproduced and corrected

In Duplicate Queue, clearing a known last-activity date in **Recheck CRM** previously retained the old date while updating the check to today. The row still displayed **Review due**, and the engine accepted a reclaim request despite the newly unknown activity date. Both a direct engine reproduction and a failing Chromium assertion demonstrated the issue.

An explicitly empty date now clears current activity-date verification and invalidates any pending reclaim request/decision. The company remains held with **Activity date needed**, without an actionable sales task. The previous date is retained in activity history. A note-only engine update that omits the date option preserves the existing date. Added regressions verify these distinctions and prevent an old approval releasing the hold.

## Commands and automated checks

- `npm ci --cache /workspace/work/npm-cache`: passed.
- `npm test`: engine, importer, reserve/reclaim and autosave suites passed before and after the fix.
- `npm run build`: strict TypeScript and Vite production build passed before and after the fix.
- `git diff --check`: passed.
- Added `tests/fixtures/scored_full_headers.csv`, containing only fictional contacts and source-style/enriched headers. Tests verify the explicit **Mobile Phone** compatibility column, separate research hypothesis/objective, unknown ownership, no inferred FX flows, no initial outreach, repeated-import identity and preservation of readiness, pipeline, opt-outs, CRM holds and history.
- Added normalization checks for every combination of the seven pipeline stages and eight independent readiness levels. Old v3 records continue to default to active rather than reserve.

## Browser evidence

Used headless Chromium through Playwright in the Codex cloud environment, with fresh isolated browser contexts and no Supabase configuration. Initial reproduction used the development server; the complete passing flow then used the production bundle served by Vite preview at `http://127.0.0.1:4174/`. Test tooling was installed outside the application repository at `/workspace/work/browser-validation`; no application dependencies were added.

Verified via UI actions and persisted browser state:

- Full-header CSV preflight saves nothing; committing adds two Level 1 / Prospecting reserve companies with usable unverified phone methods and zero tasks. Unknown clearance disables activation.
- Recording a hold moves the company to Duplicate Queue. Missing activity date gives no reclaim-request action. A known activity date yields a review three calendar months later.
- Logging a submitted request leaves the company held without outreach. New qualifying activity resets the clock and removes the pending-decision action.
- Approval returns a company to reserve without tasks; explicit activation creates one task. Decline keeps it held. Reload preserves activation and task count.
- Explicitly clearing a previously known activity date shows **Activity date needed**, correcting the reproduced failure.
- Repeat CSV imports preserve existing company/contact identities, engaged readiness and stage, discovery notes, company opt-out and promised follow-up; subsequent identical imports do not multiply tasks or history.
- Focus selects the promised callback ahead of newly activated cold outreach.
- Exported JSON restored through the file input into a fresh browser context with equal normalized state, including promises and suppression.
- No page JavaScript errors occurred during these flows.

## Remaining acceptance

These isolated UI tests verify browser-local workflow behaviour, not authenticated Supabase persistence. The real account's earlier successful sign-in and empty cloud workspace (revision 1) remain established. Saving/reloading an actual fictional prospect through production Auth, second-browser/device cloud sync, and offline/conflict recovery through authenticated UI still require acceptance. Controller-level offline/conflict/account-isolation tests pass, but do not substitute for those checks.

The current Vercel preview build/CI should be checked at the published feature commit. No claim is made that all product-spec workflows, real Lusha exports, mobile interaction, cross-app clipboard paste or prolonged calling-day behaviour have been certified. No merge or production release is part of this validation.
