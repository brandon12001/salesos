# Business Clarity — safe existing-company enrichment

The updated Business Clarity CSV (one row per contact) is uploaded in the browser. **No real contact CSV is committed to this repository or sent to a new external service.**

## How to use

1. Open Settings & data → Update company descriptions & industries.
2. Download a safety JSON backup before your first import.
3. Choose the user's updated Business Clarity CSV, **not** the standard Scored CSV / Lusha importer.
4. Review unique-company counts, matched, changed, unmatched and conflicts, plus before/after examples. Preview is read-only.
5. Keep optional "Also replace existing research rationale, call objective and hypothesis" OFF unless you want those three pieces of previously saved research text rewritten.
6. Confirm the import and wait for the existing Saved to cloud indicator before closing the tab.
7. In Focus and Prospects, the plain-English WHAT THIS COMPANY DOES one-liner is prominent. Countries are named when supported by research, and any potential currency pairs are labelled unverified.
8. Manually edit descriptions from Focus or Prospect details if necessary. User corrections override later CSV imports.

## Scope and safeguards

- Import requires Company Name, Business Description and Standardised Industry. Registration number and domain may help identify the correct company.
- Match an existing record by unique registration number or uniquely matching company name. Registration/name conflicts, ambiguous matches or mismatching domains without a registration match are flagged and skipped. Domains are **never** standalone merge keys.
- Repeated CSV contact rows are grouped into one company update. Conflicting company-level data on repeated rows is rejected for that company.
- Never create leads or contacts, change Salesforce clearance/holds, CRM dates, numbers/emails, tasks, call logs, XP, opt-outs, Buyer Readiness, pipeline stages, opportunity scores, research dates or confirmed FX flows.
- Import supports optional factual company description, researched Standardised Industry, countries, confirmed currencies, potential (unverified) pairs, international evidence, verification flag and research sources. Missing CSV fields never clear existing values.
- Standardised Industry maps researched categories to Industry Focus; manual classification overrides remain first priority. Original imported sector stays untouched.
- Preview produces expected fingerprints of the allowed company text fields; applying stale plans aborts atomically rather than overwriting changes from a different browser session.
- Existing cloud autosave and JSON backup/normalisation preserve new optional company fields. Automatic lead replenishment is disabled for enrichment changes.
- Original Lusha importer rejects this CSV to prevent accidental CRM/contact changes.

## Verification

- Unit regression suite: synthetic multi-contact groups, normalisation, stale writes, CRM holds, no contact/task/activity modifications, industry mapping and optional research copy.
- Browser reliability suite: fictional-file preview and import, Focus display, Prospect details, idempotency and unchanged existing sales history.
- First real authenticated upload and the counts actually matched in the user's own workspace are manual acceptance, not verified by automated tests.

No production prospect records are accessed during development. No migrations or third-party integrations are required.
