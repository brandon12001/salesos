# Engineering handoff — initial action plan and known state

## What the user is asking Codex to do

Take ownership of the existing **SalesOS React web project**, make it build and deploy reliably in the cloud, protect previously built functionality, then progressively improve to meet `PRODUCT_SPEC.md`. The user is NOT requesting a fresh CRM or redesign from scratch. Everything must be accessible in Chrome/Edge on a locked-down work laptop with **no installed software**.

## History that matters

1. SalesOS originated as a single-file HTML app (`v2`, then `v3`, then `v3.1`), incorporating task queues, progressive Focus UI, sequence-based prospecting, eight buyer levels and the separate FX sales pipeline.
2. v3.1's **minimal Focus Mode** design was positively received; see `docs/assets/focus_v3_1_reference.png`. Preserve the hideable nav, central task and bottom progress strip. Do not return to side-by-side dashboard cards.
3. React + TypeScript + Vite migration (package version `4.0.0-alpha.1`) wrapped the pre-existing tested sales engine instead of immediately rewriting it.
4. User cannot install Node/IDE/CLI locally. A Vercel Drop ZIP was created. **Two deployments failed at compile time**:
   - First: `src/components/Settings.tsx(12,51) TS18047: 'cloud' is possibly 'null'`; also `(20,830)` same.
   - Second, after an incomplete patch: only `src/components/Settings.tsx(20,830) TS18047: 'cloud' is possibly 'null'`.
   - Vercel reported `npm run build` → `tsc -b && vite build`; dependency install finished. The `npm warn Unknown env config cache-dir` and `esbuild allowScripts` notices were *warnings*, not the reported blocking error.
5. This handoff package starts from the **latest corrected ZIP**, then changes the remaining `onClick={()=>void cloud.auth.signOut()}` to `onClick={()=>void cloud?.auth.signOut()}`. **A full `npm run build` has NOT yet been completed here**, so Codex must verify and fix any further errors itself. Do not state that deployments are now fixed without verification.

## Existing architecture

- `package.json`: `npm run build` runs TypeScript build and Vite; `npm test` runs core and importer tests.
- `src/App.tsx`: owns app state and action callbacks. Copies state before applying engine actions, validates invariants and persists to localStorage.
- `src/types.ts`: TS structural types; dynamic v3 business functions are accessed through adapter.
- `src/components/Focus.tsx`: prioritised next task, copy phone/email, manual activity outcomes, expandable prospect context, live FX panel launch.
- `src/components/Dialogs.tsx`: call outcomes and readiness evidence; `src/components/FXQuickDialog.tsx`: commercial qualification capture.
- `src/components/Prospects.tsx`: company/contact profiles. `src/components/Dashboards.tsx`: pipeline, readiness intelligence, financial value, task queue.
- `src/components/Settings.tsx`: Lusha CSV upload, sequence settings, backup and optional cloud snapshot.
- `src/lib/importer.ts`: CSV parse / import; new records Level 1 Unaware. **Carefully assess dedupe and contact matching** before real-scale imports.
- `src/lib/storage.ts`: `core.KEY` localStorage and JSON v2/v3 backup normalize.
- `src/lib/cloud.ts`: optional manual Supabase snapshot with Auth; not durable multi-device automatic sync.
- `public/legacy/core.js`: tested sales logic, including stage/readiness/status safety, scheduling, prior commitments, scoring, contact repair, XP, forecasts. `src/lib/core.ts` uses global `window.SalesCore`.
- `db/001_salesos_snapshot.sql`: sample user-specific Supabase snapshot table with policy. Review before production use.

## Initial milestone (P0) — build and test, no feature expansion

- Run cloud-side `npm install`, `npm run build`, `npm test`. Fix TypeScript, module/asset/runtime issues and make build repeatably successful.
- Open the resulting app in a browser on a test URL; verify no blank screen, JS console errors or broken routing/assets.
- Validate an empty account, fictional demo data, Focus phone copy, keyboard shortcuts, No Answer, Connected, protected callback, alternate number resolution, stage/readiness update, dashboards, CSV import and v3.1 JSON backup/restore. Tests must not use real client/prospect information.
- Add regression tests for any bugs found; make an explicit report of tested and untested paths.
- Provide a cloud-only deployment procedure: ideally a **private GitHub repo connected to Vercel** so updates deploy to one stable domain. Provide browser UI steps, not local commands for the user. Do not silently delete existing Vercel projects/data.

## Next milestones, only after P0

**P1 — reliable storage and safety:** Secure login and genuinely persisted cloud database with row-level security, staged v3 JSON migration and backups. User/company approval is required before handling real Lumon or Lusha work contacts. Cloud snapshots alone are not live sync. Avoid cross-device overwrite conflicts.

**P2 — workflow correctness:** Fix incomplete manual email composition (copy subject+body, explicit send confirmation), cross-contact method handling, staged import preview/activation, duplicate-safe task scheduling, optional FX fields and all promised-commitment preservation.

**P3 — progression intelligence and reports:** Iterate on readiness evidence capture, next milestone prompts, buyer insight explanations, FX annualised revenue calculations, lead supply metrics and milestone-safe gamification. Validate data denominator/uncertainty; do not over-engineer predictive AI.

## Red flags to avoid

- Don't assume Vercel hosting implies server-side persistence; current app remains browser `localStorage` unless cloud is explicitly enabled.
- Don't reset user data, v3/v3.1 backups, suppression history or existing buyer readiness on imports/updates.
- Don't infer buyer stage movement from call count or task completion; human confirms readiness evidence.
- Don't schedule calls to invalid numbers, send automated Outlook messages, or assume Teams activity integration.
- Don't award large XP simply for repeated manual stage bouncing.
- Don't add paid features, multi-user organisations or OAuth integrations as prerequisites for personal use.
- Don't claim Lusha real-world header mapping and security are production-proven without testing real **redacted** exports and relevant policy approvals.

## Acceptance for handoff completion

P0 is done when Codex can report successful **real** `npm run build` and `npm test`, a working cloud preview in a browser, no critical task-flow regression, and instructions to deploy/operate without the user installing software. P1 is separately required to claim persistent cloud memory.
