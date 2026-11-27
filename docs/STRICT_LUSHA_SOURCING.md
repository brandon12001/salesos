# Strict senior-contact sourcing

The user authorised Lusha API sourcing on 27 November 2026 and limited new contacts to MD, CEO, CFO, Finance Director and Head of Finance. Search, reveal, save and CSV recovery each validate this policy. Exact full-title/abbreviation aliases are in `seniorRoles.ts`, including Financial Director and Director of Finance. No broad seniority fallback. Assistants, controllers, Finance Managers, generic Directors, owners/partners, interim/fractional/former roles and compound titles are rejected. Existing user contacts/history are not reclassified or deleted.

## Company first

The existing HMRC/Companies House route is the default research sector. Live checks exposed suitable equipment manufacturers rejected by the prior wholesale-only SIC list; 27900 and 28290 are now explicitly allowed. Registry status/filings, established-company checks, recent matched trade and the existing turnover target still apply. No other sectors are widened. Unknown revenue remains unknown; small accounts are not proof of £3–30m turnover.

A current legally matched HMRC trade record gives a **research fit** score of 65; at least three distinct recorded trade months with complete valid coverage gives 70. This is applied only after registry/pre-search qualification. SIC alone remains capped at 35. Buyer Readiness, pipeline stage, currencies, payment volume and treasury autonomy are never inferred. Existing raw registry scores and user research remain intact.

Contact sourcing uses either qualified research candidates or ownership-cleared reserve companies with dated source-linked research scoring at least 60 and no callable contact. Holds, suppression, known contacts/left-company records, stale clearance and known invalid numbers are screened before provider spend. For a research candidate, finding a contact does not grant CRM clearance. New phone contacts stay in research/reserve until the existing manual clearance and activation steps succeed.

## Connection and quota

Set `LUSHA_API_KEY` as a server-only encrypted/sensitive **Production** variable in Vercel; never `VITE_`, browser storage, a spreadsheet or chat. Redeploy after adding it. The connected ChatGPT Lusha plugin is separate from this app credential.

The API authenticates the SalesOS session, then uses the existing administrator-provisioned budget RPC for owner authorisation only. It never reserves or changes Brave quota; expired/zero Brave allowance does not prevent authorised Lusha use. Other signed-in accounts cannot use the key. Company/suppression data is fetched through the owner's RLS session before a provider call.

Each action is bounded to four companies and one selected contact per company. Search is at most 1 included-account credit for 25 previews. Phone reveal rechecks current profiles first (up to 1 search credit), then reveals only phones, at most 5 credits each: **21 maximum** per four-company action. Already revealed fields may quote zero. Current provider usage/pricing is verified first; unavailable quota or an unexpected rate fails closed. No account upgrade, payment entitlement change or third-party waterfall is requested. Actual reported usage is displayed; unknown billing is labelled unknown.

There is **no unattended/24-hour loop**, automatic retry, provider webhook, CRM API or new infrastructure. A user click initiates each bounded action. This per-action cap is not a global daily quota ledger; concurrent deliberately initiated actions and use outside SalesOS consume the same Lusha account quota. No automatic refund is assumed after ambiguous failures.

## Quality and persistence

The server checks exact title, UK location, exact normalised company identity and known domain before revealing, and repeats checks on the enriched result. The client validates again before its atomic workspace save. Changed roles/company/price, DNC/missing-DNC, switchboards, non-Lusha data, malformed/non-UK numbers and provider profile/phone dates older than 180 days are excluded. A retrieval today never makes an old provider record fresh. A rejected/empty reveal consumes its preview so the same unsuitable profile cannot immediately trigger another quota charge.

Matched contacts retain original mobile/direct types and alternative mobiles, remain unverified until a real call, and do not confirm FX responsibility. Source IDs, retrieval/provider dates and notes are retained. Canonical stamps tolerate JSONB key ordering but reject genuine competing company/contact/permission changes. A stale save never overwrites the winner; already retrieved valid profiles remain downloadable as CSV. The CSV uses the saved legal company name, avoiding duplicate companies from provider brand aliases. JSON backup/restore preserves optional contact-research metadata.

## Validation

`npm run test:lusha-intake` covers title pollution, company/clearance/suppression gates, provider request shape, pricing/quota/owner checks, current-role revalidation, no waterfall/email spend, DNC/old data/invalid phones, canonical stamps, atomic saves, independent readiness and manufacture/HMRC research scoring. The fictional browser suite covers hostile preview rejection, real cloud save/reload, reveal, CSV recovery, explicit activation with a held control, default HMRC sector and mobile layout. No real prospect activity is used for tests.

Official provider references: [API overview](https://docs.lusha.com/api-reference/overview), [OpenAPI specification](https://docs.lusha.com/openapi.json), [HMRC API](https://www.uktradeinfo.com/api-documentation/).
