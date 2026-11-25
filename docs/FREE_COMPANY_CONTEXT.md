# Turnover target and free company context

The user chose an initial **£3m–£30m annual turnover** target on 25 November 2026, to adjust after reviewing yield. This means company sales revenue, separate from FX flow, group turnover, assets or SalesOS projected revenue.

## Research sequence

1. **Find companies (no Brave)** discovers and verifies official Companies House profiles. This client explicitly requests registry-only discovery, conserving Brave credits. Older compatible clients retain their bounded discovery contract.
2. **Verify saved registry** refreshes missing/old official fields, now including registered postcode.
3. **Free trade & ownership checks** enriches up to four persisted, unchecked, eligible companies in the selected sector. Each provider result has a source and check date. It never calls Brave.
4. Optional **Research saved companies on web** retains the four-company/eight-request bound, now also enforcing the saved turnover target on the server. Recent recorded turnover in range and observed goods trade are preferred in the saved research batch; missing data is not treated negatively.

Checks are explicit user actions, not a scheduler. No provider calls run in Focus or task navigation. Normal context is reused for seven days; provider outages become dated errors and are retryable after one day. Failed refreshes retain previously observed source facts with their original source date and an explicit refresh warning. Stale/missing registry fields remain subject to the existing free pre-search gate. There is no daily/monthly Brave budget ledger or transactional credit reservation.

## What turnover does and does not do

- The default inclusive range is £3,000,000 to £30,000,000, with adjustable minimum/maximum in Lead Research. Explicit saves persist in optional `meta.leadFactory.turnoverTarget`; loading the default does not modify production settings.
- Optional published annual turnover evidence lives on the research candidate, with GBP amount, 12-month period, financial year end, entity/group scope, source URL and recording date. The screen makes clear this is recorded evidence, not an automatic verification of the accounts.
- A supported, recent company-level annual figure outside the range holds paid research. Group, non-GBP, unsupported, old or missing figures leave company turnover unknown/eligible. No currency conversion, assets-as-turnover or silent annualisation.
- **Automatic revenue extraction from Companies House accounts is not implemented.** Neither HMRC nor GLEIF supplies the requested private-company turnover dataset. Most new companies will therefore have unknown turnover until sourced figures are recorded.
- This targets research spending, not existing prospect eligibility. It never disqualifies a prospect, changes ownership clearance, advances readiness or activates a lead.

## Provider matching and limits

HMRC UK Trade Info is queried only for goods companies. A bounded trader search requires an exact conservatively normalised legal name **and** registry postcode, with one matching trader ID. A further bounded query samples at most twelve trade rows within the current and previous eleven calendar months. Directions/months/products describe observed sample entries, not a complete history, trading frequency, values, payment currencies or counterparties. Missing/ambiguous matches and omissions remain unknown. Recruitment services are explicitly not covered by goods-trade data.

GLEIF uses company number and the verified registration authority: RA000585 (England/Wales), RA000586 (Northern Ireland), RA000587 (Scotland). The returned registry ID, company number and normalised legal name must agree. Only active/issued entities support current relationship display. Direct/ultimate accounting parent lookups are optional; missing parent data does not mean independent treasury, and a foreign parent does not establish centralised FX control. Partial parent failures are stated.

All outbound hosts and paths are constructed from fixed provider origins; provider-supplied links are never followed to arbitrary hosts, and redirects are rejected. Supabase bearer tokens and Companies House keys are never forwarded to the free providers. The existing account-scoped workspace read, duplicate/opt-out skips and request limits remain. Source failures do not trigger paid fallback research.

The API refreshes official registry facts before context lookup, processes at most two companies concurrently and reuses saved fresh context. A company has at most two HMRC calls and three GLEIF calls, with 4.5-second request timeouts. Cached/context fields are optional v3-compatible metadata; no schema migration, API key, paid provider, new infrastructure or production prospect edit is required.

The HMRC-first follow-up now lets current matched goods-trade evidence qualify company research fit for manual ownership checking without Brave. This does not raise FX confidence, Buyer Readiness or pipeline stage. See [HMRC-first qualification](HMRC_FIRST.md). New authorised reserve/duplicate transfers retain context and size notes/source links in their research archive, while the original research-candidate metadata stays linked. Existing real prospects are not backfilled or tested against providers.

## Verification

Official documentation: [HMRC API](https://www.uktradeinfo.com/api-documentation/), [HMRC coverage](https://www.uktradeinfo.com/find-uk-traders/how-to-use-our-tool-to-find-uk-traders/), [GLEIF API](https://www.gleif.org/en/lei-data/gleif-api). Live schema/no-match syntax checks confirmed the filters and UK authority IDs. HMRC rejects `$orderby`; the bounded recent-period query deliberately does not use it.

Automated tests use fictional data/provider fixtures, consume zero real Brave searches and cover inclusive turnover boundaries, target adjustment, missing/group/stale figures, zero-credit holds, exact matching, provider outages, cache, safe hosts, stale-update rejection, JSON recovery, archive transfer, browser save/reload/mobile, and unchanged prospect/history/settings. Run install/build/all available suites and the complete isolated browser suite plus final-head CI before automatic release. Take a fresh private backup and verify exact Vercel SHA/READY/alias and SELECT-only preservation. The release PR records exact results; protected production sign-in remains the user's separate manual check.

GDELT/news and automatic accounts parsing remain outside this increment. No Salesforce, Teams or Outlook API integration.
