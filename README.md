# SalesOS

Production: https://salesos-up-next7.vercel.app (Vercel sign-in required). Automatic deployments follow pushes to `main`.

Permanent source repository: https://github.com/brandon12001/salesos (branch `main`).

Existing React 19 / TypeScript / Vite application for progression-first personal FX sales execution. Focus Mode shows one task at a time; management screens are secondary.

Read AGENTS.md and the canonical specifications in docs/ before changing business functionality.

## Verified cloud build

On 17 November 2026: dependency installation, production TypeScript/Vite build and all engine/importer tests passed in Codex cloud. See VALIDATION.md for scope and remaining gaps.

Cloud developer commands (not laptop setup instructions): `npm ci`, `npm test`, `npm run build`. Node 24.x; committed lockfile; GitHub validation workflow; Vercel configuration included.

See CLOUD_DEPLOY.md for browser-only private GitHub → Vercel deployment.

## Cloud autosave rollout

Supabase autosave, account sign-in, offline outbox and conflict protection are implemented and tested at the controller/database level. **Production activation is pending the Supabase email redirect configuration.** See [docs/CLOUD_AUTOSAVE.md](docs/CLOUD_AUTOSAVE.md) for the exact activation steps and verification limits.

## Persistence and compatibility

Browser localStorage remains the default under salesos.personal.v3, with v2/v3 JSON backup support. Optional Supabase provides manual snapshots, not live sync. Seven pipeline stages, eight independent readiness levels, statuses, FX discovery, CSV imports, scheduled follow-ups and XP remain in the existing application. No Salesforce, Teams or Outlook integrations.

Source is deployable; full product acceptance and production cloud persistence remain incomplete. Use fictional data for validation.
