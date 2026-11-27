# Strict contact sourcing update — 27 November 2026

Lead Research now defaults to HMRC goods discovery. Specialist manufacturer codes 27900/28290 are included with the existing checks; matched HMRC research fit scores 65 (70 for regular recorded months) so qualified companies do not remain stranded at registry-only scores. Optional Lusha sourcing accepts only approved senior roles, checks current company/profile/phone data and retains manual ownership clearance. It requires a server-side LUSHA_API_KEY and explicit bounded actions; it is not a 24/7 worker. See [connection, quota and quality rules](STRICT_LUSHA_SOURCING.md).

# SalesOS — rules-based FX Lead Finder (no AI model)

## Current production design

Goods discovery now starts with HMRC trade, followed by strict Companies House matching; see [HMRC-first](HMRC_FIRST.md). Complete recorded-month coverage ranks recent/regular traders. Optional paid research is protected by a shared atomic allowance that starts paused until the remaining Brave balance and stop date are confirmed. See [ranking, budget and release checks](RESEARCH_BUDGET_RANKING.md). Recruitment retains the registry/web route. The historical scoring details below remain applicable to web evidence; HMRC trade fit separately permits manual ownership review without Brave.

This workflow operates only when the user clicks a research button. It does not run an unattended agent, scrape arbitrary websites, integrate with Salesforce, or trigger outreach.

1. **Company discovery**: Companies House advanced SIC search for up to 12 candidates per scan. Each candidate receives a separate official profile check for live status, strike-off proposals, dormant accounts, overdue filings, insolvency flags, and legal identity. Holding/management entities are flagged for manual review.
2. **Web corroboration**: If `BRAVE_SEARCH_API_KEY` is configured, up to **four eligible companies** get **two different targeted Brave searches each** (maximum **eight API calls** per click). Searches focus on international contractor payroll or overseas client billing for recruiters, and foreign manufacturers, importation, supplier invoicing for goods distributors.
3. **Saved-company research**: Click **Research saved companies on web** to automatically take the next four unresearched companies from the existing backlog (including the original 50), re-verify their Companies House profiles, run the capped Brave searches and save evidence. Skips registry-excluded/flagged companies and already researched companies to conserve API credits. The separate **Verify saved registry** button verifies up to 12 company profiles using Companies House alone.
4. **Conservative scoring**: Registry-only and weak marketing evidence stay in the **Research backlog**, at 35/100 or below. One independent **specific cross-border financial-flow signal** can earn 65–75; matching signals on two different websites can earn 80–85. These are **prospecting research priority scores**, not FX qualification scores, revenue estimates or trading probabilities. International offices alone or recruiting overseas candidates cannot earn a high score.
5. **Actionable context**: Each web-researched company stores its website snippet evidence, URLs, research date, an explicitly unverified FX hypothesis, and a targeted buyer discovery question.
6. **Salesforce clearance**: The user manually checks company duplicates before recording availability or colleague ownership. Only verified company profiles with strong sourced operational signals enter the **Ready for Salesforce** list. A cleared company can be moved to Lead Reserve manually; the discovery process never creates calls or emails.

## Costs and access

- Official Companies House API key: `COMPANIES_HOUSE_API_KEY`. Server-only variable in Vercel Production. No key in any `VITE_` variable.
- Search API key: `BRAVE_SEARCH_API_KEY` (optional). Server-only Vercel Production. Requires a valid Brave subscription; Brave may charge for searches beyond any available credit. Check current credit, card requirements, plan and hard spending controls in the Brave dashboard before making repeated research requests. The application limits **requests per user action**, and enforces a conservative shared cloud allowance for the provisioned account across sessions. It does not synchronise external Brave usage or billing. Do not assume the tool is guaranteed free.
- No AI API calls. Search-result snippets are not full website analysis. The app never asserts verified foreign currencies, annual payment volume, treasury authority, supplier contracts or FX provider. User must confirm these in discovery.
- User action is required: **New scan**, **Verify saved registry**, or **Research saved companies on web**.

## Safety / reliability

- All API calls authenticate the signed-in SalesOS session first. CH and Brave keys remain server-side.
- Web enrichment rechecks the company's official legal profile before searching. A company with a strike-off/dormant/red flag cannot advance to Salesforce just from keywords.
- Company registration identity, source URLs and scoring evidence are validated before writing to the workspace. Saved data, prior CRM decisions and buyer readiness are preserved.
- Partial or failed Brave searches do not count as successfully researched companies. Temporary provider failures are retryable. A 401/403 or rate limit is reported rather than fabricated evidence.
- A rerun skips an already web-researched candidate to preserve free credits. Individual URLs are used as evidence; no page crawling, LinkedIn scraping, email sending or CRM API connection.
- Data remains in the existing SalesOS workspace; no new Supabase tables or migration required.

## Setup

1. Register a Companies House REST API key at https://developer.company-information.service.gov.uk/ and save it as `COMPANIES_HOUSE_API_KEY` in Vercel Production.
2. If desired, register a Brave Search API key at https://api-dashboard.search.brave.com/ and save it as `BRAVE_SEARCH_API_KEY` in Vercel Production. Set billing controls with Brave.
3. Redeploy SalesOS after updating environment variables.
4. Open **Lead Research**, then either click **Find next screened batch** or **Research saved companies on web**. Confirm evidence and manually duplicate-check only the justified shortlist.

Official Companies House API specs: https://developer-specs.company-information.service.gov.uk/companies-house-public-data-api/reference/search/advanced-company-search

Current search API terms: https://brave.com/search/api/
