# SalesOS — instructions for Codex

**Read this file first, then `docs/CODEX_STATUS_2026-11-17.md`, `docs/PRODUCT_SPEC.md`, `docs/ENGINE_RULES.md`, `docs/ENGINEERING_HANDOFF.md` and `docs/ACCEPTANCE_TESTS.md` before changing functionality.** This is the source repository for a one-person, browser-only FX sales execution app, not a generic CRM starter project.

## Non-negotiable product vision

The priority order is: **(1) move viable prospects towards becoming customers; (2) increase meaningful sales activity and consistency; (3) improve organisation, eliminate missed follow-ups.** Every task should answer: who, why now, what is known, what to achieve, and what counts as meaningful progress. The default experience is one actionable task at a time in distraction-free Focus Mode, not a busy CRM dashboard.

## Historical first engineering task — already addressed in CI; see current handoff

1. Inspect the existing source and run `npm install`, `npm run build`, and `npm test` inside your own **cloud** development environment. Fix any build/runtime failures. Do not ask the user to install software, open a terminal on their work laptop, or run a local server.
2. Two Vercel Drop deployments failed with TypeScript `TS18047` in `src/components/Settings.tsx` (`cloud` possibly `null`). The prior fixes were incomplete. This handoff has changed the remaining `cloud.auth.signOut()` callback to `cloud?.auth.signOut()` as a likely correction, **but there has not been a verified production build yet**. Don't assume this is the only error. Treat a passing real `npm run build` as the initial checkpoint.
3. Test the browser app, especially Focus Mode, contact and number handling, task flow, local persistence, sample Lusha CSV import, JSON backup/restore, and phone copy. Fix regressions while preserving business rules and existing data formats.
4. Recommend a **private** GitHub repository + Vercel deployment and later Supabase Auth/Postgres with RLS for user-scoped persistent storage; keep all work browser-accessible. Do not claim cloud storage exists just because the UI is hosted. Vercel Drop uploads may create separate projects; a GitHub-connected Vercel project is the sustainable route. Obtain required access/authorisation rather than guessing credentials.
5. Report tests performed, unverified areas, and files changed. Keep changes small and well tested; make a PR or commit when repository access is available.

## Technology and current layout

- React 19 + TypeScript + Vite 7. CSS in `src/styles.css`.
- `src/components/Focus.tsx`: clean default Focus screen with collapsible navigation, strong primary call action and slim bottom stats.
- `src/components/Dialogs.tsx` and `FXQuickDialog.tsx`: outcomes/readiness/discovery.
- `src/components/Prospects.tsx`, `Dashboards.tsx`, `Settings.tsx`: management screens.
- `src/lib/importer.ts`: Lusha CSV parser and merge rules.
- `src/lib/storage.ts`: browser `localStorage` + JSON v2/v3 migrations.
- `src/lib/cloud.ts`: Supabase client and manual snapshots. `src/lib/autosave.ts`, `workspaceRemote.ts`, `workspaceStore.ts` and `src/hooks/useCloudWorkspace.ts`: opt-in account autosave/outbox with revision checks. See `docs/CLOUD_AUTOSAVE.md` for activation status and verification limits.
- `public/legacy/core.js` and `src/lib/core.ts`: original tested v3 sales rules and adapter; **do not remove or rewrite wholesale until parity tests pass**.
- `src/types.ts`: current state types.
- `tests/`: existing engine and importer tests. Create more regression tests for scenario coverage.
- `reference/SalesOS_v3_1_legacy_reference.html` is a **historical visual/functional reference**, not the new app to ship. `docs/assets/focus_v3_1_reference.png` documents the intended clean execution layout.

## Hard constraints

- Work laptop: **NO local software installation**. The result must be a fully cloud-deployed web app accessible in an ordinary browser. Codex can use its own cloud environment to run Node/tests/builds.
- **NO Salesforce, Microsoft Teams or Outlook integrations** (the employer won't permit them). Do not propose these as prerequisites. Manual work: copy phone number → paste into Teams → call → log outcome; copy email subject/body → paste/send in Outlook → explicitly mark sent. LinkedIn: open profile manually, send connect/message manually, mark done. Copying or opening is NOT proof the activity occurred.
- Personal use only. No multi-tenant SaaS features, team dashboards, payment system, or commercialisation work.
- Do not store real employer-owned prospects unless approved under employer policies/licensing and an adequate privacy/security review. Use synthetic/redacted test data. Secrets/service-role keys never go to browser bundles.
- **Preserve exactly seven acquisition pipeline stages:** Prospecting → Discovery Complete → Meeting Booked → Successful Meeting → Onboarding → Account Open → First Trade.
- **Preserve eight INDEPENDENT Buyer Readiness levels:** 1 Unaware; 2 Aware; 3 Interested; 4 Problem Recognised; 5 Motivated to Change; 6 Considering Us; 7 Ready to Commit; 8 Switched. Never advance because of call/email/task counts; require evidence and human confirmation for real advancement or regression.
- **Preserve separate statuses:** Active, Negative Nurture, Disqualified, Closed Lost, Take Me Off the List. These are not readiness levels or pipeline stages. Opt-out suppresses outreach at the proper contact/company scope, including after re-import.
- **Lusha CSV imports:** Every genuinely NEW imported prospect starts at **readiness Level 1 Unaware** as a practical default assumption. Existing confirmed readiness, history, contacts, statuses and opt-outs MUST NOT reset on duplicates.
- Protect existing promised callbacks and commitments when sequences, stages and readiness change; avoid duplicate generated tasks and duplicate milestone XP.

## Current lead intake decision — research outside SalesOS

The user has explicitly chosen to score prospects in ChatGPT and upload an enriched contact CSV, rather than paying for in-app AI/company research. New CSV companies enter a ranked **lead reserve** with no automatic outreach tasks by default. A distinct Opportunity Score (0–100, dated and evidenced) ranks reserve activation and is **not** Buyer Readiness, FX revenue, pipeline stage or guaranteed suitability. Users can activate scored prospects in batches; optional auto-replenishment is OFF by default and must respect limits, commitments, opt-outs and CRM clearance. Salesforce integration remains forbidden, so a recent **manually recorded Salesforce ownership/activity check** is required before any reserve activation. Keep existing prospect history, stages, readiness and suppression on reimport. See `docs/SCORED_RESERVE.md` and `tests/test_reserve.cjs`. Salesforce-owned duplicates stay banked in a dedicated **Dupe Queue**. Three calendar months after the last *known qualifying* Salesforce activity is a prompt to review and request reassignment, never automatic ownership. Unknown activity dates must remain unknown, and a held company can only be released after a logged request and approved decision.

## Product management rule

Do NOT implement many new features at once. First: verified build and correct current workflows; second: trustworthy cloud storage/migration when authorised; third: tighten any missing requirements from the spec. Preserve minimal/no-admin No Answer path; show detailed FX discovery only when a decision-maker engages. Functionality must remain usable across an entire calling day.
