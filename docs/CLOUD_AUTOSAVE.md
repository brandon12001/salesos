# SalesOS cloud autosave

## Rollout status — 17 November 2026

**Latest verification:** the user created a fictional prospect through the signed-in live app; an account-scoped database read confirmed the record and its task at 15:25:47 UTC (revision 2). The first approved ten-contact batch subsequently committed at revision 3: five active, five reserve and five pending tasks; the fictional test is excluded from outreach. This verifies cloud writes and readback, not authenticated browser reload, second-device or offline/conflict UI recovery. See [current handoff](CODEX_STATUS_2026-11-17.md). Older rollout descriptions below are historical where they conflict with this update.

Supabase project **SalesOS** (`yzluyxqbohzkmctgvtwf`) exists in London (`eu-west-2`) in brandon12001's Org. The schema and row-security checks have been applied and verified. The application implementation and automated tests are included in this repository.

**Update after initial rollout:** The user confirmed configuring Authentication URLs, and live Supabase queries on 17 November 2026 showed one successfully signed-in user and a cloud workspace saved at 11:33:39 UTC (revision 1, zero leads/tasks at that check). Public Vercel Supabase configuration is present, and production is deployed. Thus the earlier statements that Supabase was unconfigured or that sign-in had never succeeded are historical. **Full end-to-end persistence is still NOT verified**: create/reload a fictional prospect, second-browser/device recovery, conflicts, and offline recovery remain unchecked. See [current Codex handoff](CODEX_STATUS_2026-11-17.md).

## Initial activation checklist (configuration/sign-in now performed; remaining verification below)

1. In the Supabase dashboard, open SalesOS → Authentication → URL Configuration.
2. Set Site URL to `https://salesos-up-next7.vercel.app/` and save. Add that same exact URL under Redirect URLs. Use this canonical SalesOS URL consistently; other Vercel aliases have separate browser storage and require their own redirect allow-list entries if used.
3. Add only the project's public `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to the Vercel **production** environment, then deploy the reviewed commit. The legacy VITE_SUPABASE_ANON_KEY is a compatibility fallback only. Never expose a service-role key or database password to Vite. Do not give arbitrary preview branches production database credentials.
4. Open SalesOS, request the email sign-in link, and open it in the browser where you want to work. The built-in Supabase mail service may restrict recipients and rate; use an authorised project/team email for initial testing. Configure SMTP separately if the service reports a mail-delivery restriction.
5. On the first sign-in, browser records are not uploaded automatically. If no cloud workspace exists, choose **Back up and use these records** to export JSON and migrate explicitly, or start empty while retaining the originals. If cloud records already exist, they load first; old browser-only records remain exportable in Settings.
6. Verify a fictional record reaches **Saved to cloud**, then sign in in a separate browser/device and verify it loads. Check offline queueing/reconnect and a deliberate conflicting edit before migrating real data.

Email-link sign-in and production redirect configuration have already succeeded. A second authenticated browser/device session remains to be verified; do not ask the user to repeat completed setup.

## Behaviour and safety

- The existing v3 State JSON, seven pipeline stages, eight independent readiness levels, statuses, task rules, FX, imports and XP remain unchanged. The new table stores the complete document; it is not a CRM rewrite or new integration.
- Every committed action first writes a versioned per-account browser recovery cache/outbox, then queues an automatic cloud write after a short debounce. A local-storage error blocks the action rather than claiming it saved.
- The server serialises per-account saves and compares the expected revision. An out-of-date writer receives a conflict instead of overwriting newer work. Identical retry payloads are idempotent if a response was lost.
- Changes made while a request is in flight remain queued for a subsequent write. Network failures preserve the outbox; reconnect and periodic retry recheck the cloud revision. Clean sessions check lightweight revision receipts and pull updates while no editing form is active.
- Conflicts pause editing. The recovery action downloads local work and preserves a recovery copy before loading the latest cloud version. Recovery refuses to load a cloud copy that would remove local opt-outs or a missing promised commitment; those cases require reconciliation while both copies remain intact. There is no automatic force-overwrite or speculative merge of tasks, opt-outs or histories.
- A browser lock permits one active tab per account/origin so two tabs cannot overwrite the same offline outbox. Use current Chrome/Edge. Separate browsers/devices are protected by database revision checks.
- Sign-out hides the account workspace and retains pending work under that account's cache key. Outgoing requests capture their account token, and disposed controllers ignore late responses. FX drafts are account-scoped and stay local until Save discovery is pressed.
- Offline operation assumes the app is already loaded. Offline reopening of the website is not a PWA guarantee. Clearing browser storage before unsynced changes reach the cloud will still lose those local changes; a before-unload warning helps prevent accidental closure while dirty.
- Snapshot-sized storage remains subject to browser quota. Large imports/migration copies can fill localStorage; the app fails the write rather than silently dropping the recovery copy. Cloud storage does not replace periodic JSON exports.
- Manual authenticated snapshots remain available separately in Settings and do not bypass autosave's revision checks on restore.

## Database

`db/001_salesos_snapshot.sql` retains manual backups with explicit grants. `db/002_cloud_autosave.sql` creates the workspace table and save RPC. Both tables use RLS, explicit authenticated-role grants and auth.uid ownership policies. The RPC is SECURITY INVOKER with an empty search_path; it does not bypass RLS. Only the signed-in user ID is used for ownership. Anonymous roles cannot read or save workspaces.

Schema changes were applied through Supabase's managed migration tool after inspecting the empty public schema. The CLI migration generator could not initialise in this environment, so the exact source is retained in db/ rather than pretending a local CLI migration was verified.

## Verification performed

- Existing engine/importer tests and strict TypeScript/Vite production build pass.
- New autosave tests cover coalescing, edits during writes, offline restart/reconnect, lost responses, JSONB object-key order, two competing sessions, durable conflict recovery, explicit migration, preservation of extension fields, account cache isolation, corrupt cache handling, quota failures, unknown-cloud offline startup and sign-out races.
- `db/verify_cloud_autosave.sql` passed against the hosted database with synthetic identities inside a rolled-back transaction: own-account saves, idempotent retry, stale-write rejection, cross-account read/update/insert/ownership reassignment rejection, anonymous read/save rejection and manual-snapshot isolation. No synthetic user or data rows survived.
- Supabase security and performance advisors returned no findings after schema application.
- A cloud-configured production build rendered the sign-in screen in the cloud browser, preserved the legacy browser-data backup option and blocked a blank-email submission without sending mail. No application-origin errors were observed. An authenticated sign-in and empty-workspace creation succeeded on 17 November 2026; tests with actual persisted records and multi-browser recovery remain pending.

## Still to verify before claiming end-to-end cloud persistence

Email sign-in delivery/callback and initial account-workspace creation were observed. **Still unverified:** saving/reloading an actual fictional prospect, two authenticated browser/device sessions, browser lock behaviour with a signed-in account, UI migration/conflict recovery, offline recovery in an actual network interruption and real-sized approved imports. Unit/SQL tests cover the core logic but are not a substitute for these user-authenticated checks. The previous local-mode production smoke pass remains recorded in docs/LIVE_VERIFICATION.md.
