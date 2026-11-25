# Free screening before Brave research

The same deterministic fit rules run in the research screen and on the server **before any Brave request**, for both new discoveries and saved-company research. This change does not schedule research or activate prospects.

Default targets:

- Active UK private limited company (`ltd`), incorporated at least two calendar years ago.
- Verified official profile, completed non-dormant accounts, acceptable existing legal/filing checks. Overdue, strike-off, insolvency, holding and identity concerns remain held/excluded.
- Recruitment: temporary employment (`78200`) or HR provision (`78300`). Generic placement (`78109`) alone is held to conserve credits.
- Goods: machinery/equipment wholesalers (`46690`, `46620`, `46610`, `46630`, `46520`). Other sectors are held.
- Non-trading/dormant (`74990`, `99999`), holding (`642xx`) and head-office (`70100`) SIC classifications require review, including secondary codes.

Unknown facts fail closed. Micro-entity filings are allowed: filing category does not establish turnover, employee count or FX volume. Age and SIC are targeting heuristics, not a measured probability of buying. Good companies can be held by these deliberately narrow defaults; inspect them manually rather than treating a hold as disqualification. A healthy registry profile never proves foreign-currency flows or local treasury authority. The existing independent-source evidence and manual Salesforce ownership clearance remain required.

Saved records from older clients remain compatible. **Verify saved registry** refreshes missing/older-than-30-day profile facts without using Brave. The selected sector determines the saved research batch. **Review pre-search holds** explains each reason; nothing is deleted. Refreshing a held record can make it eligible when its facts change.

The API refreshes official profiles itself; browser-supplied age/SIC fields cannot bypass the gate. It reads only the authenticated user's existing RLS-protected workspace through their own bearer token, with JSON projections of leads/research candidates. Missing/unreadable screening context stops research. No service-role key, new schema, RPC or production data edit is needed.

Discovery skips already tracked companies by company number or conservatively normalised legal name, including reserve, duplicates, opt-outs and previously dismissed research. Saved research accepts only persisted, unchecked, unresearched candidates; the server also blocks companies already in the prospect workspace. These are quota protections, never ownership approvals. Concurrent sessions can still submit the same unresearched batch before either saves its result: this is not a transactional research-credit ledger.

Each manual action researches at most four eligible companies, with two focused Brave queries each (eight request attempts maximum). Provider failures count as attempted requests; rate-limit/key rejection stops subsequent work, allowing already in-flight requests to finish. Held records use zero requests. Already researched companies are skipped after saving. **No daily/monthly budget counter or 24/7 scheduler is implemented**; keep the provider's own spending cap enabled and pace manual batches.

Validation uses fictional data only: free-gate boundaries, authoritative registry overrides, mixed-sector limits, zero-credit exclusions/duplicates/cloud outages, account-scoped projection, saved-selection race rejection, browser hold reasons/sector selection, refreshed downgrade with zero searches, reload, mobile layout, and preserved prospects/tasks/history/settings. No real Brave queries are used by tests. Run `npm run build`, `npm test` and the complete isolated `npm run test:browser` before release; use the release PR for exact CI/deployment results.
