# SalesOS Lead Research — activation and operating rules

## Enable official UK company discovery

1. Create a **live** Companies House developer application at https://developer.company-information.service.gov.uk/ and generate a REST **API Key**. The official advanced search endpoint is `GET /advanced-search/companies`, filtered by SIC codes and `company_status=active`.
2. In your Vercel project for SalesOS → Settings → Environment Variables, create `COMPANIES_HOUSE_API_KEY` for **Production** (and Preview if testing previews). Paste the key **in Vercel only**; never in GitHub, code, browser, chats, the public `VITE_` namespace, or commits.
3. Redeploy SalesOS so its serverless function receives the new environment variable.
4. Open **Lead Research** in SalesOS; choose Recruitment or Machinery & Equipment Distribution; click **Find next batch of companies**. The system cycles through preset SIC codes and pages. It does not require a submitted company list.
5. Review each company using the official Companies House link; click **Copy name**, run your own Salesforce duplicate check and mark either **Available** or **Already owned**.
6. For available companies, click **Move to reserve** individually, **Move selected**, or **Move all cleared**. These companies have no verified contacts, no demonstrated FX flows, and no call tasks until further enrichment and existing activation gates are satisfied.
7. For owned companies, record the Salesforce owner and (optionally) your manager's verified last qualifying activity date. They are added to the existing **Duplicate Queue** under Hold. Three calendar months without qualifying activity creates a review opportunity only; manager approval and actual reassignment are mandatory.

## What research does / does not prove

- The free discovery scanner returns Companies House registration number, incorporation date, status, SIC codes and an official source link. It uses rule-based **screening priority** capped at 65/100.
- SIC code, company age and registration are **not evidence** of foreign-currency payments, independently controlled treasury, overseas contractor payroll, or revenue. The queue must never label such signals as confirmed.
- This version is a working company-discovery and Salesforce-clearance foundation, **not yet an AI deep-web research agent**. To automatically verify websites, international payment models and stronger opportunity scores, add a separately approved research/AI provider with verifiable URLs and cost controls.
- SalesOS never connects to Salesforce automatically, sends calls or emails, or transfers a held company without a documented manager decision.
- The discovery endpoint authenticates the signed-in Supabase user but keeps the Companies House key entirely server-side. The scanner is initiated from the app; it is **not yet a recurring unattended cron job**.

## Operational limits

- Maximum 50 registry records reviewed per research run; staging queue has a 600-record cap.
- Salesforce ownership and contact verification are human decisions; the model cannot determine CRM activity dates.
- No candidate is inserted into Lead Reserve by discovery alone.
- Existing lead matches are skipped using registration number and normalised legal name.
- No source/API key means the UI will show a configuration error, not invented leads.

Official references:
- https://developer-specs.company-information.service.gov.uk/companies-house-public-data-api/reference/search/advanced-company-search
- https://developer.company-information.service.gov.uk/get-started
