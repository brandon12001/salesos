# SalesOS audit and validation — 17 November 2026

## Outcome

Existing app retained; production build succeeds. No redesign, new integrations or storage migration. This is a deployable source tree, not a verified Vercel production deployment or complete product-spec implementation.

## Commands executed in cloud

- npm install --cache /workspace/work/npm-cache: PASS. Initial default-cache attempt failed because the home cache was unwritable; no laptop installation required.
- npm ci --cache /workspace/work/npm-cache: PASS (final reproducibility check).
- npm test: PASS (engine and importer suites).
- npm run build: PASS (strict TypeScript build and Vite production output).
- npm audit --cache /workspace/work/npm-cache: zero reported vulnerabilities at audit time.

The supplied Settings.tsx null guard already fixes the reported TS18047 error; no further Settings change was needed.

## Fixes and files

- tests/test_importer.cjs: corrected nonexistent TypeScript bin/tsc.js path to bin/tsc.
- tests/core.cjs: replaced duplicate engine with a VM loader for public/legacy/core.js; tests now exercise deployed business logic.
- public/legacy/core.js: exclude inactive/suppressed promised contacts and uncallable callbacks; avoid substituting another contact for a callback with no usable phone; preserve stage-origin commitments during stage changes.
- tests/test_core.cjs: regressions for blocked/inactive callback contacts and stage-origin commitment preservation.
- src/lib/helpers.ts: phone copy rejects blocked and non-phone task methods.
- src/components/Focus.tsx: callback shortcut parity; ignore Focus shortcuts while dialogs are open; refresh time-dependent queue every 15 seconds with cleanup.
- package.json / package-lock.json: Node 24.x and reproducible dependency resolution.
- .gitignore, .github/workflows/validate.yml, vercel.json: exclude secrets/generated files; automated install/tests/build; explicit Vercel build settings.
- README.md, CLOUD_DEPLOY.md, VALIDATION.md: replace stale unverified-build guidance with actual results and browser-only deployment instructions.

## Automated coverage

Existing sequence timing, no-answer follow-up, protected callbacks, readiness evidence and regression, independence from pipeline stage, milestone XP deduplication, wrong-person resolution, bad-number repair, company opt-outs, FX calculations and v2 migration pass against the shipped engine. CSV tests cover quoted names, company/contact merging, new Level 1 defaults, duplicate preservation and suppression on reimport. New callback and stage commitment regressions pass.

## Observed Chrome checks

Production preview at http://127.0.0.1:4173/ in the cloud browser: empty state; navigation; fictional demo; single-task Focus; reload persistence; phone-copy action reports success without increasing calls; Connected dialog; N does nothing while that dialog is open; Cancel then one-click No Answer increments calls/tasks by one and XP by two without a discovery form. Sample CSV preview and import report two companies plus one merged contact, and Focus displays an imported contact and formatted phone number.

Clipboard read returned no text through the browser tooling, so actual cross-app paste remains unverified. Browser logs observed extension metadata errors; these came from chrome-extension URLs, not SalesOS. A comprehensive console-error-free browser suite was not run.

## Remaining gaps and unverified areas

- Update, 17 November 2026: source published to https://github.com/brandon12001/salesos on main after rerunning build and all tests. Vercel project salesos is now GitHub-linked and the production deployment of commit 5e6561c reached READY. Production: https://salesos-up-next7.vercel.app . Sign-in protection remains enabled. A production desktop smoke/functional pass and counting fix are recorded in docs/LIVE_VERIFICATION.md. See CLOUD_DEPLOY.md.
- Supabase auth, RLS, snapshot upload/restore and multi-device use are unverified. Current storage is localStorage; optional snapshots are manual, not live sync.
- Full browser acceptance remains incomplete. Production checks now include same-origin JSON download/restore, dashboard rendering, FX save/restore, Lusha sample import and wrong/bad-number UI routing. Fresh-origin restoration, mobile layout, FX draft recovery, exact-time callback rollover and long-session behaviour still need coverage. See docs/LIVE_VERIFICATION.md.
- Existing manual email task copies an address, not suggested subject/body. Connected conversations do not expose a dedicated send-information branch. These documented P2 gaps were not expanded during the build-repair scope.
- Import deduplication matches company name, not domain, and contact name/email rather than LinkedIn identity. Imports immediately enrol new companies; no batch activation control. Large and redacted real-world Lusha exports remain unverified.
- Readiness Level 8 relies on human evidence text; the engine does not independently verify a completed transaction. FX conversion provenance, realised revenue and all reporting requirements have not been certified against the full specification.
- Uncallable callbacks are excluded rather than automatically converted into contact repair tasks; the commitment remains stored. Follow-up repair handling needs a focused acceptance pass.

## Deliverables

Source remains in /workspace/salesos. A source-only ZIP is retained in /workspace/output, excluding dependencies, dist, environment files and build caches. The environment denied creation of the designated /codex output directory, so a downloadable attachment could not be produced there. This is an OS permission failure, not an automatic approval-review rejection.

## Production follow-up

Live testing found and fixed skip/snooze history incorrectly inflating completed-task totals and Lead Supply pace (commit b9e54d2). Regression tests, npm test, npm run build and GitHub CI passed. The automatically deployed fix was retested in the protected production browser. Existing data and history formats were preserved. Full evidence and limits: docs/LIVE_VERIFICATION.md.

## Cloud autosave implementation

An opt-in account autosave layer and hosted Supabase schema have been added. Existing engine/importer tests, new autosave regression tests and production build pass. Hosted SQL tests verified RLS isolation and atomic revision checks with rolled-back synthetic users/data. Security and performance advisors returned no findings. Production activation and user-authenticated browser checks remain pending. See docs/CLOUD_AUTOSAVE.md for exact coverage and limits.
