# SalesOS Lead Research — activation and operating rules

## Enable official UK company discovery

1. Create a **live** Companies House developer application at https://developer.company-information.service.gov.uk/ and generate a REST **API Key**. The official advanced search endpoint is `GET /advanced-search/companies`, filtered by SIC codes and `company_status=active`.
2. In your Vercel project for SalesOS → Settings → Environment Variables, create `COMPANIES_HOUSE_API_KEY` for **Production** (and Preview if testing previews). Paste the key **in Vercel only**; never in GitHub, code, browser, chats, the public `VITE_` namespace, or commits.
3. Redeploy SalesOS so its serverless function receives the new environment variable.
4. **Optional zero-AI corroboration:** Add a separate `BRAVE_SEARCH_API_KEY` to Vercel Production, as a server-only secret. The scanner will search for public web snippets indicating overseas contractor payroll or imported equipment and show their source links, applying deterministic rules instead of a language model. Each scan performs at most **eight** Brave searches. Brave currently offers $5 monthly free credits but paid usage is possible; configure a provider spending cap before enabling this key. Without it, all research remains Companies House-only at a maximum screening score of 65/100.
5. Open **Lead Research** in SalesOS; choose Recruitment or Machinery & Equipment Distribution; click **Find next batch of companies**. The system cycles through preset SIC codes and pages. It does not require a submitted company list.
6. Review each company using the official Companies House link; click **Copy name**, run your own Salesforce duplicate check and mark either **Available** or **Already owned**.
7. For available companies, click **Move to reserve** individually, **Move selected**, or **Move all cleared**. These companies have no verified contacts, no demonstrated FX flows, and no call tasks until further enrichment and existing activation gates are satisfied.
8. For owned companies, record the Salesforce owner and (optionally) your manager's verified last qualifying activity date. They are added to the existing **Duplicate Queue** under Hold. Three calendar months without qualifying activity creates a review opportunity only; manager approval and actual reassignment are mandatory.

## What research does / does not prove

- The free discovery scanner returns Companies House registration number, incorporation date, status, SIC codes and an official source link. It uses rule-based **screening priority** capped at 65/100.
- SIC code, company age and registration are **not evidence** of foreign-currency payments, independently controlled treasury, overseas contractor payroll, or revenue. The queue must never label such signals as confirmed.
- This version is **deliberately not an AI agent**: it runs deterministic regex rules on public web-search snippets from an optional web-search provider. Indexed snippets can be wrong, stale or ambiguous, so even a high rule-based score is *not* a confirmed currency requirement. Until a second source backs an overseas payment clue, rank increases remain limited. Registered UK companies are not assumed to control their own FX decisions.
- SalesOS never connects to Salesforce automatically, sends calls or emails, or transfers a held company without a documented manager decision.
- The discovery endpoint authenticates the signed-in Supabase user but keeps the Companies House key entirely server-side. The scanner is initiated from the app; it is **not yet a recurring unattended cron job**.

## Operational limits

- Maximum 50 registry records reviewed per research run; up to eight optional Brave searches; staging queue has a 600-record cap.
- Salesforce ownership and contact verification are human decisions; the model cannot determine CRM activity dates.
- No candidate is inserted into Lead Reserve by discovery alone.
- Existing lead matches are skipped using registration number and normalised legal name.
- No source/API key means the UI will show a configuration error, not invented leads.

Official references:
- https://developer-specs.company-information.service.gov.uk/companies-house-public-data-api/reference/search/advanced-company-search
- https://developer.company-information.service.gov.uk/get-started

Current Brave Search plan details: https://brave.com/search/api/ — check prices and monthly free credits before enabling paid access.
