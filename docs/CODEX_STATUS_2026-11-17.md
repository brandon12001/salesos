# Current update — 23 November 2026: commercial work queues (first increment)

The user approved the recommended first implementation of the Opportunity Intelligence idea: four Focus work queues using existing evidence and human-approved research. Work is on `feature/opportunity-queues` in `/workspace/salesos-opportunity-queues`, **stacked on draft PR #10**, head `3fd3fae71b333cf3c8b120de75adafec0f861f0d`. Production main remains `e19f5b2`; neither branch has merge/deploy approval. Release #10 first, then retarget this PR and recheck before release. Preserve the separately backed-up older industry attempt in `/workspace/salesos`.

Implemented: Opportunities > Qualified > explicitly approved Gold > Standard, one-click filters/counts, global due-commitment priority, shared Industry/Cold Call/Power Hour filtering, conservative existing-evidence derivation and reasoned manual review/corrections. Original research, readiness, lifecycle, pipeline, contacts, tasks and sales history are preserved. The audit also closed missing ownership-clearance checks in legacy Focus and at outcome submission. Optional compatible metadata only; no migration, production data changes, paid research API, enrichment or new infrastructure. All feature-branch deployments are disabled.

See [work-queue rules, evidence requirements, verification and deferred scope](OPPORTUNITY_QUEUES.md). The 437-company cleaned-workbook intake below is already saved; do not rerun it or replace the workspace with a CSV. Production rollout and hosted work-browser acceptance remain separately approved work.

---

# Current update — 23 November 2026: cleaned call preparation

Actual released main is `e19f5b273a7ae444461edb4b98e40ad8a948b3f0`: PR #8 Industry Focus and PR #9 Business Clarity were merged and deployed after PRs #6/#7. Current production deployment is `dpl_CMfnRGH41PuvLM9rokAb37K2be83`, canonical https://salesos-up-next7.vercel.app/. Earlier review/draft statements below are historical. There were no open PRs when this work started.

New work is `feature/call-ready-preparation`, based on that current main in `/workspace/salesos-current-review`. The older uncommitted industry attempt in `/workspace/salesos` is preserved separately and must not overwrite the shipped recovery branch.

The user authorised uploading the cleaned workbook **with the recommendation to preserve original scoring evidence and keep call preparation separate**. The 23 Nov data intake is completed: 437 matched company call-preparation records, including the previously skipped missing-domain group, with 102 specific clues / 335 intentional blanks. Original scoring research and all contacts/tasks/history/settings/CRM fields remain intact; the missing company description was also populated through existing guarded enrichment. Fresh backup and exact readback receipt are in private `/workspace/work/private-call-ready-import-2026-11-23`. Do not restore the older ten-prospect fixture or replace the current workspace from an old source CSV.

The corresponding UI/importer changes are **draft review only; no merge/deploy approval**. Upload permission is not code-release permission. Metadata storage is compatible with old v3 clients; the new Focus display requires the approved client release. See [design, import mapping, evidence preservation and validation](CALL_READY_PREPARATION.md). Feature-branch Vercel deployments are disabled. No migration or new dependency/API is required.

---

# Current update — 18 November 2026: company research and execution feedback

The user requested one-click Companies House / website research and professional Focus completion feedback, with draft PR only. Work is on `feature/company-research-feedback`, **stacked on PR #6** at `1b9cbd2`. PR #6 is still draft/unmerged; production main remains PR #5's `e9705a7`. Merge the dependency first and retarget this branch to main after explicit approval; do not duplicate/revert its Salesforce Lead work. New feature-branch Vercel deployments are disabled.

Implemented: reusable always-visible research links in active/review Focus, Save & Stay, prospect details and Salesforce queue/preview; safe HTTP(S) URL validation; explicit verified website edit with stale-write guard and no replenishment; CSV destination/path preservation. Accepted actions get immediate local/queued feedback, cloud-confirmed green completion feedback, neutral task navigation and first-time evidenced commercial/call milestones. CSS-only effects respect reduced motion; celebrations and call milestones are configurable. No sales rules, XP, schema, APIs, infrastructure or production data are changed.

See [behaviour, dependency, validation and limitations](COMPANY_RESEARCH_FEEDBACK.md). Validation uses fictional-only localhost Auth/Postgres/REST/mail and intercepted external destinations. Real website/legal-entity identity and subjective work-browser acceptance remain manual; no production workspace or real company was used as a test fixture. Earlier PR #6 Salesforce field/record-type/SSO limitations remain unchanged. No merge/deployment is authorised by this request.

---

# Priority update — 18 November 2026: prefilled Salesforce Leads (draft PR #6)

The user corrected the record type: **Salesforce Leads, not Contacts**, and approved URL-based New Lead navigation with prefilled values. The same branch/draft [PR #6](https://github.com/brandon12001/salesos/pull/6) now adds the fixed approved organisation/path, separate recordTypeId, seven-field preview and launch, exact Industry choices supplied by the user, popup/copy fallbacks, manual saved confirmation, and Create Lead actions in Focus, historical review, the Lead Queue and Prospects contact cards. Existing per-contact status metadata is retained for compatibility. PR #5 is merged/deployed; this branch already contains it.

The user also supplied form labels for Company Registration Number, Lusha Job Title and Position. Their API names are unconfirmed. Extra copy-only helpers are provided, with no guessed custom URL mappings; standard Title remains the explicitly requested job-title mapping. Existing Lusha/United Kingdom form defaults are untouched. Actual record-type/layout/custom fields/SSO behaviour remain manual checks: the anonymous live probe failed to connect, and automated browser redirects are intercepted fixtures, not live Salesforce verification. No Salesforce Lead was submitted. See [workflow, sources and cancel-only manual test](SALESFORCE_CONTACTS.md).

Do not merge/deploy or alter real prospects, and do not submit fictional Leads into production Salesforce, without explicit approval. The old no-integration restriction still excludes APIs and automatic submission; the new explicit exception permits only the approved URL navigation. No database migration is needed.

---

# Current update — 18 November 2026: manual Salesforce contact administration

This section supersedes older release statements below. The user approved PR #5 with “Deploy it”. It was merged as `e9705a7ba1e5de2791e999e4447636aaafbeb2d1` and released READY in Vercel deployment `dpl_EybRtFNkDJXFi9RDBxacNdXj8MZs`, https://salesos-n3t0l19rc-up-next7.vercel.app, canonical https://salesos-up-next7.vercel.app/. The production tree exactly matched tested PR head `d015676`. No database migration or workspace write was performed. Live authenticated acceptance remains a manual user check; deployment assets returned HTTP 200.

The next user request is **Salesforce Contact Queue & Focus Mode Quick Add**, implemented on `feature/salesforce-contact-queue` from released main. This means manual copy/confirmation only, never a Salesforce integration. Contact creation status is independent of company ownership. See [workflow and limits](SALESFORCE_CONTACTS.md) and [validation](SALESFORCE_CONTACTS_VALIDATION.md). All seven unit/regression suites, strict production build and the full isolated production-bundle browser suite pass locally, including 350-contact queue, clipboard fallback and status sign-out/sign-in.

This phase is **draft PR only**: do not merge, deploy, run production migrations or alter real prospects without new approval. The earlier PR #5 deployment approval does not cover this work. Feature-branch deployment is disabled in `vercel.json`. There are no open competing PRs at branch creation; old manual-email/Lusha branches were inspected, and their changes already exist in main. Preserve Focus Mode 2.0 and its independent seven stages/eight readiness levels. Use synthetic accounts only; never reset production to the original ten-record fixture.

---

# Current update — 18 November 2026: Focus Mode 2.0 review candidate

This section supersedes older release states below. PR #4 (Intelligence v1 / Cold call mode) was approved, merged and deployed. Current production main is `b2c388c0fda805cb614c9aaebc5a5f0c4fe23cea`; immutable deployment https://salesos-i13a9nlsl-up-next7.vercel.app and canonical https://salesos-up-next7.vercel.app. Earlier draft/unmerged statements below are historical.

New work is on `feature/focus-workflow-v2`, based on that main, in **[draft PR #5](https://github.com/brandon12001/salesos/pull/5)**. Initial workflow implementation commit: `057dfb641daed5d4f1e547935bd553ac09866972`. The user requested **draft PR only; no merge, deployment, production migration or real workspace changes**. Vercel deployment is disabled for the feature branch. Implementation and synthetic tests are described in [Focus workflow v2](FOCUS_WORKFLOW_V2.md).

Implemented: Save & Stay/Next, session task navigation/review, same-contact channels, accepted/deduplicated manual follow-up email, searchable persisted history and audited simple edits, Answered — No Conversation. **Outcome-changing correction/reconciliation is deferred to a separate PR**, as explicitly permitted by the request; this release keeps outcomes read-only.

Production data has progressed beyond the initial ten prospects. Never restore an old ten-record snapshot or use production records as test fixtures. This phase uses disposable local Auth/Postgres and fictional browser accounts only. No new migration or infrastructure is introduced. `npm test`, `npm run build` and the full production-bundle `npm run test:browser` all pass locally. See [validation and limits](FOCUS_WORKFLOW_V2_VALIDATION.md). Await explicit approval after review before publishing to production.

---

# SalesOS — current Codex handoff (17 November 2026)

## Intelligence development — current branch, 18 November 2026

The user supplied the “Build SalesOS Intelligence v1” request and authorised a feature branch plus tested draft PR only. Draft [PR #4](https://github.com/brandon12001/salesos/pull/4) is open for review. Work is on `feature/intelligence-v1`, based on PR #3's merge `2ff33ace`. See [Intelligence v1 configuration, behaviour and limits](INTELLIGENCE_V1.md). Do not merge, deploy, alter the live workspace, apply production migrations or enable production replenishment without new explicit approval. Fictional-only isolated tests are required; do not export/manipulate the ten real prospects for testing.

The user subsequently requested an on/off Cold Call Mode. The draft adds a persisted Focus filter across legacy/shadow/enabled modes, leaving routine non-call work queued and protecting due promises. Preference-only saves do not run replenishment. This remains review-only and does not authorise deployment.

PR #3 **was** approved, merged and deployed on 17 November 2026. Production client deployment `dpl_8SYBAzmf5xX69ZeWYEAJojaWdcp2` reached READY before reviewed migration `20261117163144_immediate_workspace_conflicts` was applied successfully. Recoverable backups were created before that rollout. Post-rollout comparison confirmed the unchanged revision-3 workspace: ten prospects, five active/five reserve, 17 activities and automatic replenishment OFF. The rollout record in [PR #3](https://github.com/brandon12001/salesos/pull/3) supersedes the pending/approval statements in the historical reliability sections below. Hosted authenticated UI/physical-device acceptance remains distinct from isolated browser CI.

## Reliability phase — historical pre-rollout instructions

The user has frozen their ten real prospects for testing and prohibited new production merges/deployments without approval. Reliability work is isolated on `reliability/daily-execution`, using fictional records, localhost Auth/Postgres/REST/mail containers and separate browser contexts. Production received only read-only metadata/advisor checks; revision 3 and its document fingerprint matched before and after the audit. Do not reuse the earlier production-intake authorisation for testing or deployment.

See [the reliability audit](PRODUCTION_RELIABILITY_2026-11-17.md) for fixes, test evidence, approval-dependent client/SQL rollout and manual acceptance. The user chose to verify hosted sign-in separately. A local full-stack pass is not proof of physical-device or hosted Auth configuration. The pending SQL conflict migration has NOT been applied to production.


## Current release and first batch — supersedes all status below

- PR #2 was authorised for release in the user conversation and merged as `73923dc8e307f9863103a0226c347b750d9088d9`. Vercel production deployment `dpl_8YijqDP1bgdRM1qCMzHV5GFEwXGR` reached READY. Canonical app: https://salesos-up-next7.vercel.app/ . Deployment protection remains enabled. Do not treat this PR as draft or unmerged.
- Merge CI passed: https://github.com/brandon12001/salesos/actions/runs/44114897910 . All four test suites and TypeScript/Vite build also passed in the cloud before release. Later documentation commits may advance main; inspect its current tip.
- The user created a fictional prospect in the signed-in production app. A targeted database read confirmed that exact company, Prospecting stage, readiness 1 and one pending task at 15:25:47 UTC (revision 2). The cloud write is verified.
- The user supplied the enriched ten-contact CSV and explicitly confirmed checking all ten companies manually. Treat dated CRM Clearance/Note fields as their attestation; do not ask them to reconfirm these same ten. The original source status wording predates that confirmation. Existing holds, opt-outs and newer evidence must still be preserved.
- The actual importer/engine prepared the batch against a backed-up workspace copy: ten new companies first entered reserve, then the top five eligible scores were explicitly activated. Five remain in reserve; automatic replenishment is OFF. The known fictional test remains stored as Disqualified with a test-only reason; its sequence task was cancelled, not deleted.
- A connected database operation scoped to that account and expected revision 2 committed at 15:32:40 UTC (revision 3). Readback confirmed ten scored prospects, five active, five reserve, five pending tasks and one excluded fictional test. The revision condition protected concurrent edits. No schema, permissions or authentication settings changed. This was controlled server-side intake using the shipped importer, not an authenticated browser upload test.
- Private backup/preparation files are under `/workspace/work/private-intake`; user CSVs are in private attachments, outside the repository. Do not commit contact details or these private files to this public repository. Synthetic fixtures remain the test data.
- **Still to verify:** user-browser reload of the imported batch, a second authenticated browser/device, and authenticated offline/conflict/lock recovery through UI. Do not claim these passed based on controller tests or database reads. The agent's cloud browser was signed out; no authentication tokens were copied or fabricated.
- **Next action:** have the user refresh production and confirm five active tasks/prospects and five reserve companies, with the fictional test excluded. Do not reset or reimport because the agent's browser is signed out. Keep Focus Mode minimal and preserve all existing buyer/task/opt-out rules.

## Historical pre-release handoff

The sections below retain the earlier review history. Their draft/unmerged, empty-database, unavailable-CSV and unconfirmed-clearance statements are superseded by the current release update above. PR #2 includes PR #1's identity fix; do not merge PR #1 separately without reconciling overlaps.

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
