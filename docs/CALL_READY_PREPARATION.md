# Call-ready preparation — separate from scoring evidence

The user approved importing the cleaned workbook with the recommendation to keep original research intact and display short clues/questions separately. Source: `SalesOS_FX_Lead_Reserve_Call_Ready_CLEANED.xlsx`, first sheet `SalesOS Leads`; the `Original Research Archive` remains in the private supplied workbook. Real data and private backups are never committed to GitHub.

## Storage and import

Optional `meta.callPreparation = {version: 1, companies: {[leadId]: ...}}` stores `fxClue`, `question`, `hypothesis`, `internationalEvidence`, `sources`, `sourceDate`, and the operation's `importedAt`. It uses metadata so existing v3 clients and JSON normalisation preserve it before the display client is released. Original `researchRationale`, `callObjective`, `researchHypothesis`, `internationalActivityEvidence`, research dates/sources/confidence and opportunity scores are retained. In particular, blank call clues do not invalidate dated scoring evidence or reserve activation.

The dedicated Settings → Call-ready clues & questions importer accepts CSV exported from `SalesOS Leads`. It deliberately does not add an XLSX dependency; the agent can convert the supplied workbook in the cloud. Required columns: Company Name, Research Rationale, Original Call Objective. The remaining call-preparation columns follow the supplied workbook's existing headings. A blank clue is an explicit empty value in the new record; absence of a record retains legacy display behaviour. Every imported company needs a question. No currency, FX volume or readiness is confirmed by import.

Preview is read-only and shows changed/skipped counts, sample clue/question pairs and identity issues. Apply is atomic through the existing workspace commit/outbox and disables replenishment. The import creates no contacts, companies, tasks, activity, XP or CRM decisions, and does not alter existing lead records. Identity changes and edits to prior call preparation reject a stale preview before any mutation. Cloud conflicts use the existing account revision/recovery system. Repeated identical uploads do not churn timestamps.

`matchExistingCompany` extracts the existing enrichment identity checks without changing them: registration or a unique company name, rejection of competing records/registrations, and supporting-domain checks. Call-preparation grouping can coalesce a blank domain with **one** consistent domain in otherwise identical rows for the same company/registration and call text. It never chooses between different supplied domains or different call preparation. Coalescing helps matching only; it does not assign a company website. Unknown companies stay unmatched. Older Business Clarity import grouping remains unchanged.

## Display and prioritisation

Company identity shows the concise FX clue, or “No specific FX clue recorded — qualify it on the call.” when an imported clue is intentionally blank. Original research is still accessible in the collapsed research/verification context. Prospect details also shows the call-preparation question.

At the user's request, a missing business description uses neutral copy, “No company description added yet.”, without the amber warning or an instruction to add one before calling. Missing text does not imply that a saved description failed verification.

For uncommitted cold Prospecting calls at readiness Unassessed/1/2, Focus's objective and Intelligence's default relevance objective use the imported question. They do not rewrite stored tasks. Protected callbacks/meetings, later acquisition stages and engaged-buyer objectives retain their existing purposes. Intelligence commercial scores/components, readiness, scheduling and recommendation ranking are unchanged. Legacy records without preparation retain their existing display/objective.

## Authorised production intake — 23 November 2026

The user explicitly asked to upload with these recommendations. A fresh recoverable JSON backup was saved privately before the revision-guarded operation. The private preview matched all 437 companies in 549 contact rows: 102 companies have a specific clue and 335 have none. The previously skipped group had one domain and one blank, with matching company identity and call text. Existing guarded enrichment filled that company's missing description and associated description provenance only; no stored domain or original research was overwritten.

Cloud readback matched the prepared document exactly. All contacts, tasks, activity/history, settings and original scoring research were preserved, and every reserve-eligibility result was unchanged. Backup, preparation, SQL guard and readback receipt are under `/workspace/work/private-call-ready-import-2026-11-23`, outside the repository. This was a scoped authorised data operation, not a test fixture or a production reset.

**Release update, 23 November:** The user authorised routine automatic releases. PR #10 is now merged and deployed READY at `595a6a9`; the production client includes this display/importer. Earlier draft-only instructions are historical and superseded by AGENTS.md's standing authorisation. No database migration, authentication change, new service or paid API is needed.

## Validation and limits

Unit coverage: explicit blank vs absent data; legacy JSON/metadata retention; unchanged original research, contacts, schedules and reserve eligibility; unchanged Intelligence priorities; cold-only objectives; true identity conflicts vs missing-domain coalescing; atomic stale rejection/idempotence; malformed/future-format rejection. Existing company-enrichment tests cover the extracted shared matcher.

Browser coverage uses fictional accounts and disposable localhost Auth/Postgres/REST/mail: preview/cancel/local quota; metadata import; blank clue and short question; collapsed original archive; reload/JSON into a second account; two-session conflict and recovery; promised callback objective; narrow mobile layouts. All existing suites/build remain required. The production readback verifies stored data, not hosted signed-in UI behaviour. Work-browser acceptance follows approval of the client release. Research labels retain source caveats; no independent factual verification of every company was performed.
