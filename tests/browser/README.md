# Isolated reliability tests

Run in a cloud developer environment with Node 24, Docker Compose and Chromium. The user does not need to install anything on a work laptop.

```
npm ci
npx playwright install --with-deps chromium
npm run test:browser
```

The runner uses `/usr/bin/chromium` when installed, otherwise Playwright's downloaded browser. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` can identify another installed Chromium. `npm run test:browser -- --dev` additionally exercises React Strict Mode; the default tests a compiled production bundle.

## Isolation

- Only the fixed `salesos-reliability` Docker Compose project is created/reset. It is disposable test data, bound to localhost ports 55421, 55424, 55429, 55430 and 55432; the app uses port 5273.
- Test credentials and the signing key in Compose are public, local-only fixtures. No production environment variables, Supabase keys, uploaded CSVs, user browser profiles or Vercel sessions are loaded.
- Docker images are pinned by digest. PostgreSQL, GoTrue, PostgREST and an internal SMTP mailbox exercise actual authentication, HTTP/RPC and row-level security; these are not mocked save responses. The proxy only connects localhost services.
- The browser refuses external HTTP destinations. Synthetic email links are captured in the local mailbox, not delivered to real inboxes. Tokens stay inside the runner/browser and are never logged or uploaded as artifacts.
- The shipped schema and migration files are applied only to the disposable database. SQL tests roll back fixtures. Each browser context contains fictional records; restore/replacement tests never use production accounts.
- `.test-artifacts/` contains fictional screenshots, JSON recovery files and a test-only build; it is gitignored. CI uploads only failure screenshots. Services and temporary database volumes are removed on completion/failure.

## Coverage

The suite checks refresh; sign-out/sign-in; independent sessions of the same account; account isolation through REST/RLS; duplicate-tab locks; competing writes with backup and explicit recovery; browser offline/reconnect; a failed HTTP save and retry; quota failures with prospect/contact/method drafts retained; clipboard copying versus actual outcomes; No Answer, Connected, Wrong Person and Invalid Number; hidden readiness field safety; promised callbacks; passive reserve and manual reclaim approval; full JSON export/restore into another fictional account; 320/390/768/1440px Focus layout; and navigation timings.

Local authentication does not certify hosted email delivery/redirect policy, a physical second device, a work browser's clipboard permissions, long offline sessions or offline reopening of an unloaded website. Those remain separate acceptance checks.

## Intelligence v1 coverage

`intelligence.cjs` also exercises shadow/enable/off settings, optional structured buyer evidence, keyboard focus/Escape, exact route/copy accounting, virtual-action execution, explicit alternative feedback and cancellation audit, session duration/end reload, enhanced refill opt-in and method/status gates. Intelligence data is round-tripped through real local Auth/DB reload, offline/reconnect, competing saves with recovery exports and a different fictional account's JSON restore. The same external-network block and disposable-data restrictions apply.

`cold_call.cjs` checks the calls filter in all three recommendation modes, keyboard on/off, navigation/reload, unchanged non-call work, no premature future calls, protected meetings/callbacks, mobile toolbar widths, account-scoped preferences and no activation side effect from toggling.
