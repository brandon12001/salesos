# SalesOS

Production: https://salesos-up-next7.vercel.app (Vercel sign-in required). Automatic deployments follow pushes to `main`.

Permanent source repository: https://github.com/brandon12001/salesos (branch `main`).

Existing React 19 / TypeScript / Vite application for progression-first personal FX sales execution. Focus Mode shows one task at a time; management screens are secondary.

Read AGENTS.md and the canonical specifications in docs/ before changing business functionality.

**Scored import and reserve (released):** Research and score companies in ChatGPT, upload a dated/evidenced CSV, rank in the Lead Reserve, record Salesforce clearance manually, and activate the highest-ranked eligible companies in controlled batches. Details and field template: [Scored lead reserve](docs/SCORED_RESERVE.md).

## Verified cloud build

On 17 November 2026: dependency installation, production TypeScript/Vite build and all engine/importer tests passed in Codex cloud. See VALIDATION.md for scope and remaining gaps.

Cloud developer commands (not laptop setup instructions): `npm ci`, `npm test`, `npm run build`. Node 24.x; committed lockfile; GitHub validation workflow; Vercel configuration included.

See CLOUD_DEPLOY.md for browser-only private GitHub → Vercel deployment.

## Cloud autosave rollout

Supabase autosave is enabled in production. Real sign-in and a prospect saved from the live app have been confirmed in the database. The first scored batch is stored in the account. Authenticated reload, second-device and offline/conflict UI acceptance remain incomplete. See [current status](docs/CODEX_STATUS_2026-11-17.md) and [autosave design and limits](docs/CLOUD_AUTOSAVE.md).

## Persistence and compatibility

Configured production uses authenticated Supabase autosave with a per-account browser recovery cache and revision checks. Without cloud configuration, browser-local mode remains available under salesos.personal.v3, with v2/v3 JSON backup support. Manual snapshots are separate backups. Seven pipeline stages, eight independent readiness levels, statuses, FX discovery, CSV imports, scheduled follow-ups and XP remain in the existing application. No Salesforce, Teams or Outlook integrations.

Source is deployable; full product acceptance and production cloud persistence remain incomplete. Use fictional data for validation.
