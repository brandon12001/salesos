# Trade activity ranking and shared search allowance

This increment follows PR #28 HMRC-first qualification. It changes Lead Research only; Focus, sales queues, readiness/stages, reserve activation and existing history stay unchanged. No unattended research is enabled.

## Recorded trade months

The existing 12-row trade sample still establishes source-linked goods research fit. A separate bounded HMRC `$apply` query groups the same trader's last twelve calendar months by trader ID, month and import/export direction. There can be at most 24 distinct groups; the request asks for 25 to detect invalid overflow. Only a complete, valid response without a next-page link supplies a frequency rank. Unknown, duplicate, mismatched, truncated or failed coverage remains unranked. This is completeness of the returned published monthly groups, not completeness of all trade: HMRC suppresses some records and publishes monthly with a lag.

The shortlist gives precedence to recorded comparable in-range entity turnover, then current matched HMRC research fit, then distinct recorded months with recency as the tie-breaker, then existing research priority. Regular recorded activity ranks ahead of a single recent month; this is a prospecting heuristic, not predicted conversion or trade value. UI and paid shortlist use the same weights. The displayed count is months, never shipments, value, currencies or buying intent. Source-specific links and timestamps are retained. Older records gain coverage only through explicit new discovery/free checks, with no workspace rewrite or outreach. Optional coverage failure never removes valid trade qualification. Old dated activity facts are retained on refresh failure and cannot rank after expiry.

## Shared allowance

A single provider-key budget is bound to one administrator-provisioned SalesOS account. It lives separately from the autosaved workspace so stale sessions, JSON imports and workspace recovery cannot roll the counter back. Other accounts cannot read, claim, configure or reserve it. No provider or service-role key is exposed to the browser.

Initial allowance is **zero**. The owner checks Brave's current balance and reset date, opens **Search budget**, enters the remaining amount (0–1000) and stop date, and explicitly confirms. The stop date is exclusive at 00:00 UTC; no further searches are allowed on that date, and no automatic renewal occurs. This is an app spending guard, not a synchronised Brave billing balance. Any key use outside SalesOS must be deducted when confirming the allowance. Brave's own dashboard remains authoritative.

Each eligible paid batch atomically reserves two requests per company, at most eight. When allowance is smaller, only funded pairs run and the rest are deferred. One remaining request cannot start a two-query company. The server always reserves, including calls from older clients or legacy discovery mode. No credits are reserved for excluded, known, held or otherwise ineligible companies, or free scans/checks.

Reservations are conservative: provider rejection, timeout, unused slots after a rate limit, an interrupted server and an ambiguous/lost reservation response never automatically refund allowance. There is no retry/reuse of a grant. The UI refreshes the counter after success or failure. A provider outage/expired/empty/unprovisioned budget fails closed for paid search and keeps free scans usable. Confirming a changed allowance requires the latest budget revision; a competing reservation/configuration causes a visible conflict rather than replenishing from stale numbers. Configuration sets a new remaining ceiling against the lifetime allocated count; it never resets that count.

The research function has a 90-second ceiling so bounded slow Auth/registry/budget/provider calls can finish without the platform cutting off a funded batch. Individual provider timeouts and four-company/eight-request caps remain unchanged; normal requests do not wait for the ceiling. No background process or paid infrastructure is added.

## Migration and release order

1. Run install/build, all unit/API suites, real local Postgres permission/concurrency checks and the full isolated fictional browser suite; require final-head CI.
2. Back up the latest production workspace privately and verify exact repo/project/team/source tree.
3. Merge/deploy the compatible client/API first and wait for Vercel READY plus canonical alias verification. Until the migration exists, paid search fails closed; normal workspace saving and free discovery remain compatible.
4. Apply `20261125150019_research_search_budget.sql` once. It creates a private ledger, RLS, an owner-checked private privileged function and a restricted public invoker RPC. It does not read/write any workspace, change Auth settings or grant direct table access. No new paid service, dependency or API key is needed.
5. Provision the intended owner's UUID as administrator with `insert into salesos_research_private.search_budget(owner_id) values ('<verified-account-uuid>') on conflict do nothing;`. This creates zero allowance only; never infer 1,000 unused searches. If migration/provisioning fails, stop/report without destructive recovery.
6. Verify schema/permissions/advisors and SELECT-only workspace/history/settings preservation, and retain a private release receipt. Test budget and provider operations only against isolated fictional services, never real prospects or real Brave credits. Live protected sign-in remains a separate manual check.

The private ledger is not included in ordinary SalesOS JSON backup/restore. It must remain intact when restoring prospects; administrator recovery must never decrease allocated usage or restore an older allowance. Take a separate administrator export if its configuration needs backup.

## Validation

Regression tests cover complete vs partial monthly groups, month deduplication, source/date/identity guards and ranking, budget reservation before provider calls, exhaustion, provider/ledger errors, and failed-attempt accounting. The real local Postgres suite tests anonymous/cross-account denial, no direct resets, stale allowance conflict, expiry, caps and ten simultaneous sessions against six available requests. Browser checks exercise real local authenticated RPCs, initial paid pause with free scanning, explicit configuration, ranked queue, lost provider result, conflict/outage/mobile and unchanged workspace/history. No real Brave requests are used.

Sources: [HMRC trader coverage](https://www.uktradeinfo.com/find-uk-traders/how-to-use-our-tool-to-find-uk-traders/), [HMRC API limits](https://www.uktradeinfo.com/api-documentation/), [Brave rate-limit guidance](https://api-dashboard.search.brave.com/documentation/guides/rate-limiting).
