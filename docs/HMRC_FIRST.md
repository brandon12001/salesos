# HMRC-first goods qualification

The user asked to check companies with HMRC import/export data first and use it as qualification. For the existing machinery/equipment profile, discovery now starts with distinct traders from HMRC goods records, before Companies House matching. Existing research candidates can qualify through the free checks too. Recruitment keeps its separate services/web-evidence route.

## What qualifies

This is **company research fit for manual ownership checking**, not an FX-qualified sales opportunity, Buyer Readiness, Gold approval or a pipeline milestone. A current source-linked import/export record can establish cross-border goods activity. It does not establish payment currency, FX volume, decision authority, interest or revenue.

An HMRC route requires:

- Acceptable active registry profile and the existing age, filing and targeted equipment-wholesale SIC checks.
- One legal company matched by normalised name and registered postcode. Limited/Ltd are equivalent; PLC and leading “The” are not stripped for HMRC identity matching. Ambiguous Companies House matches are skipped.
- A positive trader ID, matched name/postcode, a provider-specific Trade query URL, observed sample months within the last twelve calendar months and source check no older than seven days. Generic source links, old incomplete cache entries and unmatched/old data cannot qualify automatically.
- The existing adjustable £3m–£30m target for recorded comparable entity turnover. Unknown/group/stale figures remain unknown and eligible; no turnover or FX amount is inferred from trade records.

Existing independent web-evidence qualifications remain compatible. New optional goods Brave research requires current HMRC evidence on the server as well as the ordinary registry/turnover checks. HMRC-qualified goods can reach manual clearance without using Brave. Recruitment is not blocked by absence of goods records.

## Discovery and review

Select **Machinery & equipment · HMRC first**, then **Find HMRC traders (no Brave)**. The API groups recent HMRC trade rows by trader ID, filtering machinery/electrical goods chapters 84/85, and takes four distinct IDs per page. It fetches each trader's public name/postcode, searches Companies House, and verifies the unique legal company profile and a bounded recent trade sample. The existing equipment SIC target is retained; this is not a scan of every importing industry.

Known prospects, reserve entries, ownership holds and tracked research names/numbers are skipped. A failed provider page is not saved or advanced. A trader that cannot be uniquely identified is counted as unmatched; no invented legal-entity prospect is created. Matched legal companies with registry or trade concerns remain recorded for research/flags. Existing unmatched backlog records remain unchecked, not disqualified.

The independent `hmrc-goods` cursor leaves the old Companies House goods and recruitment cursors intact. HMRC is a changing dataset, so offset pagination is not a completeness guarantee; identity dedupe protects repeated pages. The returned trade rows are a bounded sample, not full shipment history or trading frequency.

Refresh old/incomplete source evidence through **Free trade & ownership checks**. Fresh HMRC proof is reused when only GLEIF ownership context is deferred. Cleared candidates can refresh source evidence without changing their manual ownership decision; stale evidence cannot silently permit a reserve transfer. Provider failures retain previously observed facts with original source dates and warnings; a still-fresh observed record remains evidence, while expired data requires review.

## Safeguards

Only persisted eligible candidates may be researched. No provider credentials, user bearer tokens or arbitrary provider URLs are forwarded to other services. All provider calls use fixed origins, bounded result sizes, timeouts and no redirects. HMRC-first discovery and source qualification use **zero Brave requests**; optional deeper web research stays at four companies/eight requests per action. There is no scheduler or daily/monthly search ledger.

Manual Salesforce ownership checking remains required before availability/transfer; held duplicates still require the existing approval workflow. Reserve activation still requires permitted contacts and valid methods, and auto replenishment remains OFF unless explicitly enabled. Qualification and source viewing never log outreach, change stages/readiness, award XP or create calls. No existing prospects are reclassified or overwritten by deployment. A no-query web hold updates registry checks without erasing previous independent research.

All fields remain optional compatible v3 metadata. No database migration, new API key, paid service or Focus redesign. New authorised transfers retain the HMRC source/context in their research archive.

## Validation

Fictional handler/provider tests cover source-first ordering, query bounds, strict identity/date/source matching, known/held skips, ambiguity, legal/filing exclusions, unavailable services, separate cursors, zero-Brave holds, optional paid enrichment only after proof, explicit clearance/reserve transitions, independent readiness and preserved research. Browser tests cover discovery, unknown records, mandatory manual confirmation, passive reserve transfer, failure/reload and existing calling performance. All available suites and final-head CI are required before automatic release, with fresh private backup and exact deployment/alias plus SELECT-only data preservation checks.

Public API syntax and grouped-query response type/latency were checked without fetching trader names or changing any workspace. These checks do not establish end-to-end production matching for real prospects. The user previously chose to verify live protected sign-in separately.
