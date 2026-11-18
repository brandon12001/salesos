# Intelligence v1 — validation, 18 November 2026

## Result

Cloud-local validation passed on `feature/intelligence-v1`, based on PR #3's merged client. This is a review build, not a production release. No production workspace data, real contacts, production credentials, schema, Auth settings or replenishment flag were used/modified for these tests.

| Check | Result | Evidence / scope |
|---|---|---|
| Clean dependency installation | PASS | `npm ci --cache /workspace/work/npm-cache`; no new dependencies or lockfile changes |
| Original four regression suites | PASS | Core, CSV importer, reserve/reclaim and autosave through `npm test` |
| Intelligence suite | PASS | Fixed clock and deterministic fictional IDs; `npm run test:intelligence`, included in `npm test` |
| Production build | PASS | `npm run build`: strict `tsc -b` then Vite |
| Actual local Auth/DB/browser flow | PASS | `npm run test:browser`; compiled client, GoTrue, Postgres, PostgREST and local SMTP fixtures |
| Anonymous denial and account isolation | PASS | SQL rollback suite plus authenticated REST checks against separate fictional accounts |
| Save/reload, offline and conflicts | PASS | Intelligence evidence/events survive reload, offline/reconnect, stale competing writes, recovery export and explicit cloud-winner loading |
| JSON recovery | PASS | Intelligence extensions restore into a separate fictional account; original v2/v3 regression cases still pass |
| Focus execution | PASS | Copy is not outreach; manual outcomes, generated action materialisation, exact permitted method binding, alternative selection/audit, promise priority and feedback deferral |
| Momentum / progression | PASS | Readiness/stage independent; old/undated facts do not imply new momentum; percentages withheld for small samples; no note keyword extraction |
| Power Hour | PASS | 30/45/60-minute budgets, protected future commitments, elapsed time/insufficient work and persisted duration/end time without KPI side effects |
| Reserve | PASS | Existing OFF retained, preset does not enable, explicit opt-in activation, score/clearance/validity/suppression/cap/batch/loop gates and explanation history |
| Keyboard / mobile | PASS | New evidence dialog focus trap/Escape, accessible controls, and 320/390/768/1440px layouts without horizontal overflow |
| Diff hygiene | PASS | `git diff --check`; fictional test artifacts remain gitignored |

The browser suite blocks external HTTP destinations. All emails stay in its localhost mailbox, all identities/companies are fictional, and the disposable stack is removed after each run. No authenticated user session or private prospect backup is copied into tests or repository files.

A cloud-configured test bundle emits Vite's existing >500 kB chunk advisory (approximately 622 kB uncompressed, 178 kB gzip). This is not a build failure. The ordinary environment build is approximately 390 kB / 116 kB gzip. Navigation samples in a successful local browser run were 295, 292, 298 and 292 ms; these are synthetic developer-environment observations, not a work-device performance guarantee.

## Corrections made during implementation

- Checked eligibility at each projected session start, and kept speculative outreach estimates inside working hours while retaining explicit after-hours promises.
- Aligned enhanced replenishment with the recommendation engine: only valid/unverified method states can activate; unfamiliar or do-not-call states cannot pass on phone format alone.
- Prevented ordinary daily-target saves from reverting independently saved Intelligence settings.
- Bound the exact permitted contact/method to the visible recommendation and revalidated it before logging; stale route/schedule changes require review.
- Preserved cancellation timestamps/reasons when an explicit alternative supersedes a generic action.
- Kept generic outreach behind an already planned promise rather than crowding the conversation.
- Kept skip/snooze out of completion/KPI accounting while preserving recommendation feedback.
- Persisted/displayed the selected Power Hour duration consistently after reload.
- Preserved unchanged fact timestamps and required an explicit observation date for fact-based recent momentum.
- Counted meeting/first-trade analytics from structured actual transitions, not phrases appearing in evidence text.

## Remaining acceptance and limitations

Hosted end-to-end acceptance using a separate fictional-only account, a physical second device and work-browser clipboard permissions are not covered by the localhost suite. They remain release checks. Weights, thresholds and effort estimates have not been empirically calibrated; the app does not claim causal attribution, optimal calling windows, switching probabilities or proven conversion improvement.

This draft adds no production migration and does not merge/deploy or enable production automation. The feature branch's Vercel Git deployment is explicitly disabled. Review [the configuration and implementation guide](INTELLIGENCE_V1.md) before an approval-dependent release.

## Cold Call Mode follow-up — 18 November 2026

The user requested a visible on/off calling filter. The former Call block preference is now a persisted **Cold call mode** switch. Legacy, shadow and enabled Intelligence modes filter to eligible due calls/callbacks, stop at an explanatory empty state rather than falling back to non-call work, and resume ordinary work when switched off. Due promised actions and meetings remain protected, with a visible explanation. Power Hour and alternative actions use the same filter.

`npm test`, `npm run build` and the full compiled `npm run test:browser` passed after this change. New fictional-only tests cover keyboard switching, navigation/reload, unchanged non-call tasks and activity history, original future cadence, protected promises, account-scoped preferences, JSON compatibility, no reserve activation on preference changes, and 320/390/768/1440px toolbar layouts. No production workspace was accessed or changed; this remains in draft PR #4, with branch deployments disabled.
