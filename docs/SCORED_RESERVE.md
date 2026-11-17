# Scored lead imports and ranked reserve

## Product decision (17 November 2026)

**Research and score prospects in ChatGPT before uploading.** SalesOS itself does not buy AI credits, search the web, scrape sites or infer FX volume. The user exports enriched contact rows as CSV, and SalesOS handles deduplication, reserve ranking, controlled activation and daily follow-up execution.

An Opportunity Score (0–100) is **provisional research judgement**, not confirmed FX revenue or Buyer Readiness. It is stored independently of the seven-stage acquisition pipeline, eight readiness levels and opt-out/status system.

## CSV format

Start with a Lusha contacts export and append these company-level columns. Get a ready-to-edit fictional template in Settings → Scored CSV import.

| Column | Purpose |
| --- | --- |
| Company Name | Required; one row per contact, repeated across company contacts |
| Company Number | Stable company registration number; preserve leading zeroes |
| Company Domain | Optional identity hint; NEVER merge separate legal entities by domain alone |
| Full Name / First Name / Last Name | Contact name |
| Job Title | Decision-maker contact data |
| Mobile Phone / Work Email / LinkedIn URL | Contact channels (all imported numbers stay unverified) |
| Industry | Optional sector |
| Opportunity Score | Research score between 0 and 100; blank = unscored |
| Research Date | Required for any score, YYYY-MM-DD, not future |
| Research Rationale | Required for any score; factual basis, not assumptions stated as certainty |
| Research Sources | Source links or source identifiers, comma-quote as needed |
| Research Confidence | Optional research confidence note |
| Original Call Objective | Optional initial discovery objective; shown in Focus Mode on newly activated sequence tasks |
| Original Research Hypothesis | Optional unverified FX hypothesis; preserved separately from confirmed discovery |
| CRM Clearance | Cleared, Hold or Unknown; **Unknown by default** |
| CRM Checked Date | Required for a Cleared or Hold CSV declaration |
| CRM Note | Required for a Cleared or Hold CSV declaration; user-confirmed Salesforce ownership/activity check |

**Do not include real employer-owned contact records unless approved.** No Salesforce integration exists: a CSV's "Cleared" value is a user's attestation, not an API verification. SalesOS provides a *Record Salesforce check* control on each reserve row. A CRM hold cannot be removed by an older imported clearance. Every clearance expires for activation purposes after 30 days and must be rechecked against current Salesforce ownership and activity. An expired check does not itself make a lead reclaimable.

## Import and identity safety

- Full preflight simulates the import on a copy and lists companies created, contacts updated, scores loaded, and CRM holds.
- Invalid scores, inconsistent per-company scores, missing score evidence/date, conflicting company registration numbers and unsubstantiated CSV clearance all **block the import** before the real state is changed.
- Match by registration number when present, otherwise by normalized legal name. Name/registration conflicts require manual review. Shared domains are not a safe identity match.
- Match repeat contacts by verified-identical email or canonical LinkedIn profile, then name fallback. Do not create duplicate profiles from tracking-URL variants.
- Imported **new** companies enter `leadPool='reserve'`, stage Prospecting and readiness 1 Unaware. **No outreach tasks are created by default.** Existing companies keep their leadPool, stages, readiness, status, activity history, notes, FX facts and opt-outs. Newer dated research may refresh scores without rewriting existing opportunities.
- Unscored and uncontactable companies remain visible for research/repair, rather than receiving a made-up score.
- Import batches cap at 10,000 contact rows. Use smaller batches if browser storage or sync limits are reached.

## Ranked reserve and activation

Reserve sorted by descending Opportunity Score; ties by time added, then name. An unscored company ranks last.

Activation requires **all** of:
1. Reserve status and active/eligible company (not a closed/nurture/opt-out entity)
2. A real numeric score, respecting configured minimum for bulk/auto activation
3. Usable, non-suppressed phone or email for a permitted contact
4. Explicit `Cleared` Salesforce check no more than 30 days old
5. Available slots under chosen batch and active-prospect cap when auto-activating

Manual **Activate** action can override the configured score floor but never opt-out, contactability or CRM clearance safeguards.

**Automatic replenishment is OFF by default.** If explicitly enabled, after each committed action SalesOS measures eligible pending tasks within the configured working-day horizon; when fewer than the chosen supply floor, it activates at most the batch size, the missing task count and spare active-prospect slots. It never contacts people automatically or silently sends emails. Existing callbacks and meetings continue to outrank fresh cold tasks.

## Reserve freshness

- Scores 80+ receive a reserve review deadline five working days after import; other reserves 15 working days.
- Research older than 30 days is visibly flagged for re-evaluation; scores are **not** silently changed or falsely reverified.
- CRM checks older than 30 days **block activation** until the user confirms current ownership/activity.
- Reupload a refreshed ChatGPT-scored CSV to update a score with newer research evidence. Older research must not overwrite it.
- Prospects still appear separately in management views, but reserve rows are excluded from active-pipeline/Buyer Intelligence calculations until activated.

## Validation and deployment

`npm test` includes reserve engine gates and scored import cases, along with existing business rule and autosave tests. `npm run build` must pass before merging. Review the GitHub Actions result for the feature branch; this change is not a production release until reviewed and merged into main.

Use fictional CSV rows and employer-approved data only. Supabase authenticated cross-device sign-in and persistence still require independent end-to-end testing.
