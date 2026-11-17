# SalesOS Web — React migration (v4 foundation)

This project moves SalesOS away from a single downloadable HTML application into a modular **React + TypeScript + Vite** project. It retains the proven v3.1 rules engine, data format (`salesos.personal.v3`), seven acquisition stages, eight Buyer Readiness levels, outcome statuses and task prioritisation. The current frontend is rebuilt as React components, with the old engine isolated at `public/legacy/core.js` until it is gradually ported to TypeScript.

## Running locally (Node.js 22.12+)

1. Extract the project ZIP.
2. Open the folder in VS Code and open the integrated terminal.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open `http://localhost:5173` in Chrome.
6. Optional: `npm run build` to produce a deployable `dist/` folder.

The standalone HTML from v3.1 is still useful as a fallback. This project itself must be served via Vite or hosted, rather than opened directly by double-clicking its `index.html` file.

## What works

- Focus Mode, one task at a time, copy number, no-answer quick logging, manual call outcomes and skip/snooze.
- Prospect and contact records, evidence-backed Buyer Readiness changes, independent acquisition stages and suppressed-contact statuses.
- FX discovery (including multiple currency flows), Contact Resolution, task queue and configurable sequences.
- Buyer Intelligence and Pipeline Value dashboards, plus milestone-based XP and a lead-supply indicator.
- Lusha CSV importer: preview; new prospects default to **Level 1 — Unaware**, with existing records, opt-outs and readiness protected. Supports common header variations; validate a real Lusha sample before importing a large batch.
- JSON v2/v3 backup restore, export, fictional demo data.
- Optional manual Supabase backup / restore, after setup and sign-in. No automatic sync yet.

The application **does not** integrate with Salesforce, Outlook or Teams. Call numbers and email addresses are copied manually. LinkedIn profiles can be opened manually. No activity is inferred from copying a number or opening a profile.

## Importing data from your old HTML app

**Do not rely on browser localStorage transferring from a `file://` page to `localhost` or a hosted site.**

1. In SalesOS v3.1, choose Settings → Export full JSON backup.
2. Save that file somewhere safe.
3. Open the React application at `localhost:5173`.
4. Open Settings → Restore v2/v3 JSON backup.
5. Confirm that your companies, tasks and opt-outs look correct.
6. Export another JSON backup from the React version.

### Data safety

This frontend continues to use localStorage unless you explicitly configure and use Supabase cloud snapshots. **Do not store employer-owned lead data outside your employer's approved systems without authorisation.** Deploying to Vercel doesn't by itself make it an approved CRM or secure it. Even a cloud account needs an agreed retention, access and handling policy.

## Optional Supabase cloud backup

1. Create your own Supabase project.
2. Run `db/001_salesos_snapshot.sql` from the Supabase SQL Editor.
3. Copy `.env.example` to `.env.local` and populate `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (publishable/anon key only).
4. Configure Auth email sign-in and your site URLs in Supabase.
5. Run `npm run dev` and use Settings → Supabase cloud backup.
6. Sign in, then **explicitly** upload or restore a snapshot. Cloud backup is *manual*; if you change data on two devices, you must reconcile it before uploading.

Do not place a service-role secret or database password in `.env.local` with a `VITE_` prefix.

## Deploying to Vercel

1. Create a private GitHub repository and push this project (excluding `.env.local`).
2. Import the repository into Vercel as a Vite project.
3. Set build command `npm run build`, output directory `dist`.
4. If using Supabase, add your two public `VITE_` variables in Vercel and configure the correct Auth redirect/site URLs.
5. Use only fictional or explicitly approved business data until security, storage and permissions have been reviewed.

## Architecture

```
src/App.tsx              App state, scheduling actions, navigation
src/components/Focus.tsx Minimal task execution screen
src/components/Dialogs.tsx Outcomes, evidence-backed changes, contact repair
src/components/Prospects.tsx Company/contact and FX qualification UI
src/components/Dashboards.tsx Pipeline, Buyer Intelligence, Pipeline Value, Task Queue
src/components/Settings.tsx Lusha import, backup, targets, sequence, cloud settings
src/lib/importer.ts    Lusha parsing / deduplication
src/lib/storage.ts     Local state and JSON migration
src/lib/cloud.ts       Optional Supabase Auth + user-scoped snapshot
src/lib/core.ts        Compatibility adapter for the v3 business logic
public/legacy/core.js  Existing tested deterministic sales engine
```

## Known limitations of this migration release

This is a **foundation release**, not a production-ready multi-user CRM. Dependency installation is required before building. No automated Teams/Outlook/LinkedIn integration, no native Excel import, no cloud autosync, no email-body template editor yet, and no conflict-safe multi-device writes. The initial React migration intentionally keeps the v3 JS business engine unchanged to preserve behaviour; the next engineering task is to migrate and unit-test those rules as TypeScript modules.

## Quick start on Windows

If you prefer not to use the command line, install Node.js first, extract this ZIP, then double-click `START_SALESOS_WINDOWS.bat`. It installs dependencies if needed and opens the local development URL. This does **not** deploy SalesOS online; you need to leave the terminal open while using the local app.

Try `sample_Lusha_fictional.csv` first to confirm the import workflow with safe synthetic data.

## Engineering validation completed for this handoff

- The original v3 business engine regression suite passed.
- The new Lusha CSV importer passed standalone checks for quoted names, first/last name merging, duplicate contacts, default Unaware, preservation of readiness and opt-out rules.
- TypeScript JSX was transpiled and all emitted JavaScript passed syntax checks.
- A full Vite/React dependency installation, production build and browser UI test **could not be run in this environment**, because access to the npm registry was unavailable. Run `npm install && npm run build` on a machine with normal internet access before deploying. Report any build errors so they can be corrected before storing real data.
