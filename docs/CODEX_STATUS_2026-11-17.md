# SalesOS — current Codex handoff (17 November 2026)

> **Current status supersedes the historical first-build instructions** in `docs/ENGINEERING_HANDOFF.md`, the original status sections of `AGENTS.md`, and the initial rollout description in `docs/CLOUD_AUTOSAVE.md`. Read those files for architecture and safeguards, but do **not** treat the original TypeScript build failure or the original lack of Supabase configuration as the current situation.

## Follow-up PR #2 validation

Validation resumed from `2fb36c9c7987fc9189a362a47c3e5a3918b227e6`. Clean install, all four automated suites and TypeScript/Vite production build passed. Isolated headless Chromium checks passed against the built app for synthetic full-header CSV preview/import, activation and CRM/reclaim gates, repeated-import preservation, callback priority, reload and fresh-browser-context JSON restoration. A reproduced bug where an explicitly cleared CRM activity date reused the historical date was fixed with regressions. See [PR #2 validation evidence and limits](PR2_VALIDATION_2026-11-17.md).

PR #2 remains a draft; production has not been changed. The successful real Supabase sign-in/empty-workspace verification below remains valid; authenticated prospect saving and cross-device/offline/conflict UI acceptance remain incomplete. Use the current branch tip and its latest CI run for subsequent work, rather than treating the earlier feature head below as current.

## Repository, branches and deployment

- Repo: `brandon12001/salesos`. The `main` production head last verified at `83e3d0b5c878da71f5263ece1134db5966b080f1`.
- Work in `feature/scored-lead-reserve`, head `078b4a3a8a9cabaa96e80b6f75119fa686153bcd` at last verification.
- Draft PR **#2**: https://github.com/brandon12001/salesos/pull/2 ; currently open and mergeable. It includes the LinkedIn contact identity/dedupe work from draft PR #1, so avoid merging #1 separately without reconciling overlaps.
- GitHub Actions `Validate SalesOS` passed on this branch head: `npm ci`, `npm test` (core, scored importer, reserve/reclaim, autosave), `npm run build`. Prior failures in intermediate commits were corrected; inspect the latest run rather than older failures: https://github.com/brandon12001/salesos/actions/runs/44080460427.
- Vercel preview for this branch head built READY: https://salesos-45tdffsf4-up-next7.vercel.app . Preview may have deployment protection. This is **not** the live production release.
- Production `https://salesos-up-next7.vercel.app` remains on `main`. No scored-reserve/Duplicate-Queue deployment to production or merge has been authorised.

## Supabase — corrected status

- Supabase project `yzluyxqbohzkmctgvtwf`, account-scoped `salesos_workspaces` and `salesos_snapshots` with RLS, automatic cloud autosave code and revision-conflict protection are set up. Public Supabase Vite configuration is present on Vercel.
- User confirmed configuring Supabase Authentication Site/Redirect URLs. **Real sign-in succeeded** on 17 November 2026 at approximately **11:33 UTC**, and Supabase confirmed **one authenticated user and one saved cloud workspace (revision 1)** at 11:33:39 UTC. At that verification, the workspace had **0 leads and 0 tasks**; manual snapshots table had 0 rows.
- Therefore, do **not** say authentication is entirely untested or the database is empty. Also do **not** claim end-to-end cloud persistence is fully verified: **saving and reloading an actual fictional prospect, separate-browser/device sign-in, conflict recovery and offline recovery remain to be tested via UI**.
- The introductory `docs/CLOUD_AUTOSAVE.md` deployment status predates the user's successful setup; its design/security testing remains relevant. Keep production data safe, avoid accidental resets or preview-to-production writes, and never expose secret/service-role credentials.

## Current product scope in PR #2 (already implemented)

1. **Research outside SalesOS:** ChatGPT researches and ranks candidates before upload; SalesOS makes no paid AI calls.
2. **Evidence-backed CSV import:** Opportunity Score 0–100 + Research Date/Rationale/Sources/Confidence; company registration number when known; contact columns and original call objective/research hypothesis. New companies default to **reserve**, pipeline **Prospecting**, readiness **Level 1 Unaware**, with **no outbound tasks**. Existing prospect statuses, history, opt-outs and readiness are protected; LinkedIn canonical contact dedupe and legal-entity safeguards added.
3. **Ranked Lead Reserve:** Manual activation of top eligible leads in batches; auto-replenishment **off by default**, with score, supply, batch and active-prospect caps. Buyer Readiness and 7 acquisition stages remain **independent** of research score; existing engaged opportunities and promises outrank new cold leads.
4. **Manual Salesforce ownership checks:** No Salesforce integration. `Unknown` and `Hold` cannot activate. A normal available prospect needs explicit recent clearance (max 30 days) and a contactable, unsuppressed method. Scores never imply FX volume or ownership.
5. **Duplicate Queue:** Salesforce-owned/unavailable companies are **banked**, not thrown away. User records *last qualifying Salesforce activity*; review date is **three calendar months after that date** (proper month-end/leap-year handling). Unknown date stays unknown. Recheck CRM at review; newer qualifying activity resets clock. User manually submits the internal request, then logs it; `requested` is not an approval. Only an **explicit approved reassignment** changes a held company to `Cleared`; `declined` remains held. Importing a newer `Cleared` CSV cell may **not** silently remove an existing hold. No automatic calling or ownership claims.
6. **Navigation and UI:** Distinct `Lead Reserve` and `Dupe Queue`, due-review badge, reserve/CRM status controls and guarded request/decision recording. Research rationale and initial call objective surfaced in Focus Mode for newly activated sequences.
7. **Documents/tests:** `docs/SCORED_RESERVE.md`, `tests/test_importer.cjs`, `tests/test_reserve.cjs` and standard engine/autosave tests cover the above at code level.

## Latest intake files — user conversation, NOT in GitHub

- The user supplied a 10-row replacement CSV, and a scored 10-row enriched CSV was created **in the conversation**. **Neither is automatically part of this repository. Do not pretend the files are available in the Codex workspace.** Ask for the user's approved/redacted file or construct a **synthetic fixture with identical headers** to test importer compatibility.
- Source-style headers include `company_name`, `contact_name`, `mobile_e164`, `mobile_display`, `email`, `sector`, `call_objective`, `research_hypothesis`, `salesforce_status`, `last_meaningful_activity`, `owner_managed_verified`. Scored output also includes a **`Mobile Phone`** column to ensure the current importer reads telephone numbers, plus `Opportunity Score`, `Research Date`, `Research Rationale`, `Research Sources`, `Research Confidence`, `CRM Clearance`, `CRM Checked Date`, `CRM Note`, `CRM Last Activity Date`.
- All ten imported-candidate CRM clearances were set to **`Unknown`**. The filename's words `unowned_unverified` **are not evidence of Salesforce availability**. Four candidates overlapped an earlier researched batch; overlap across CSV files is **not** proof of Salesforce duplicate ownership. The importer should not reset status, readiness, activity history or CRM holds on repeated uploads.
- Do **not** commit, print in public GitHub comments, or seed personal/employer-owned lead contact details in this public repo; follow user/employer licensing, permission and privacy requirements. Neither FX volumes nor financial value were established by research.

## Next engineering actions — priorities

1. **Review PR #2; do not rewrite what already passes.** Run `npm ci && npm test && npm run build` against latest head before reporting.
2. **Browser acceptance test** with synthetic company/contact records: scored importer preview/commit, unknown clearance, CRM holds entering Duplicate Queue, missing activity date, exact three-month deadline, recheck/new activity resetting clock, request pending, approved/declined decisions, and protected opt-outs. Confirm no held/unknown lead creates an actionable outbound task.
3. Verify legacy user data still normalises and all eight Buyer Readiness levels/seven pipeline stages survive; verify promised callbacks still outrank fresh cold outreach in Focus Mode. Confirm repeated CSV imports don't multiply companies/contacts/tasks or override existing sales work.
4. **Complete cloud E2E:** sign in to production with a fictional contact, save, reload and verify persisted row, then test on a second browser/session and negative/conflict/offline cases. Avoid real employer-owned data until approved. Preview authentication might have separate redirect allow-list issues; do not equate preview status READY with logged-in UI acceptance.
5. Consider **synthetic full-header CSV test fixture** mirroring the user's latest export. Preserve unverified status; distinguish provider names/company aliases from legal-entity identifiers. Source `mobile_e164` isn't automatically mapped by the importer, but the enriched file contains `Mobile Phone` for compatibility; confirm live preview behavior.
6. After review, report exact verified/unverified results, propose corrections only where needed, and request explicit approval before merging PR #2 or changing production. Do not add AI research, Salesforce/Teams/Outlook integrations or a new pipeline stage.

See `docs/SCORED_RESERVE.md`, `docs/CLOUD_AUTOSAVE.md`, `docs/ENGINE_RULES.md` and `docs/ACCEPTANCE_TESTS.md` for detailed requirements.
