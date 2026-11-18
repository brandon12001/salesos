# Manual Salesforce contact queue and Focus Quick Add

Review candidate based on released PR #5 / main `e9705a7`. This feature is entirely manual: no Salesforce API, automated browser input, sending or third-party service. It needs no database migration and remains undeployed until new user approval.

## Everyday workflow

Open **Salesforce Quick Add** in Focus before a call, or after **Save & Stay**. The same company/contact/task stays selected. Company, First Name, Last Name, Job Title, Phone, Email and Industry are prefilled for that person. The name split is a heuristic; correct compound names manually. Usable mobile numbers are preferred, then landlines. Missing/invalid/blocked methods stay blank.

- Each field has its own Copy button. **Copy All Fields** copies one row with seven tab-separated values in the displayed order; empty fields retain their positions. Embedded tabs/newlines are flattened to spaces. It cannot populate separate Salesforce inputs automatically.
- If the work browser blocks clipboard access, a read-only text area appears and selects the value for manual Copy.
- Copying, opening or closing the panel does not confirm Salesforce creation, log outreach, advance readiness/stage, change ownership, skip/snooze/complete a task or earn XP.
- **Mark Added to Salesforce** is your explicit confirmation that this individual contact exists in Salesforce. It stores Added, an ISO update timestamp and the optional verification note.
- **Add to Salesforce Queue** stores Needs Adding. Focus also offers this in one click, so the call can continue immediately.
- **Close / Continue Calling** discards temporary copy-form edits and preserves Focus selection.

## Independent contact status

Each contact has optional `salesforceStatus` (`not_checked`, `needs_adding`, `added`), `salesforceStatusUpdatedAt` and `salesforceVerificationNote`. Missing or unrecognised status displays **Not Checked**, including historical records; normalisation does not invent a status-update date. Company clearance never implies contact Added, and one company's contacts can have different statuses. Imports never infer this status from source ownership/clearance/notes and preserve matched contacts' saved metadata. No status update creates activity, sales tasks or XP, runs reserve replenishment, changes suppression or releases ownership holds.

These fields live in the existing account workspace document. Existing autosave/outbox/conflict protection and JSON backup apply. Normalisation explicitly preserves status metadata, corrected name splits and recorded contact meaningful-engagement timestamps. Old v2/v3 documents remain accepted. Older deployed clients should be refreshed before using the new status workflow; old application versions cannot display the new metadata.

## Temporary copy form versus saved corrections

Editing copy fields alone changes nothing in SalesOS. **Save corrected contact details to SalesOS** explicitly saves the name/split/title and adds or prefers usable phone/email methods for that same contact ID. Company and Industry edits stay copy-only; edit company information through the existing company workflow.

Old methods and their flags/IDs/history remain. New methods stay unverified. Blank phone/email does not delete a method. Invalid/blocked methods cannot be revalidated here. Existing task routes are not silently retargeted. A correction that matches another same-company contact name is refused for identity review. Changing a copied phone or email does not mark the Salesforce record Added.

Status and detail stamps reject stale form/selection changes. A failed durable local save retains entered fields and shows an error. Network failures use the existing visible queued/pending save status and retry; only **Saved to cloud** confirms cloud persistence. Temporary copy-form edits are not autosaved or synced until explicitly saved.

## Queue administration

**Salesforce Contacts** is a separate navigation page, independent of **Dupe Queue**. Summary counts cover all contacts. Default view is Needs Adding; search company/contact and filter job title/status. Rows expose available contact channels, industry, company stage/status/pool/clearance and a brief priority explanation. Initial rendering is capped at 100 rows, with Show 100 more.

Priority uses recorded context only: company meeting/onboarding/commercial stage, contact-specific promised action, contact-specific meaningful call or explicit company readiness evidence, upcoming follow-up, active prospect, then unengaged/inactive/reserved contacts. Company-level evidence is labelled as company-level. An unrelated contact does not inherit another person's conversation. These are administrative priorities only; no item enters Focus or outranks due calls/meetings there.

**Work Needs Adding queue** opens the first matching contact. **Next Salesforce Contact** navigates without changing status. Mark Added from the queue immediately opens the next matching outstanding contact, or closes the panel when none remain. Focus Mark Added stays on the same prospect. Search/filter changes clear bulk selection; selecting visible rows alone changes no data. Bulk updates require a separate confirmation, and Added requires explicit confirmation that every selected contact exists in Salesforce. If any selected status changed, the entire bulk update is refused. A blank bulk note preserves each selected contact’s existing verification note.

## Restrictions and manual checks

Ownership holds remain visible and unchanged. Contact administration cannot authorise outreach. Suppressed/inactive/left-company/not-responsible contacts have phone/email copying, Copy All and saved corrections disabled; administrative status confirmation remains available so CRM records can still be accounted for. No suppression or validity flag is cleared.

Review with fictional accounts only: open Quick Add before/after Save & Stay, inspect all seven fields/name splits, copy individually/TSV and test blocked clipboard fallback, queue without completing the call, confirm Added and move next, filter/bulk confirm, reload/sign in, and export/restore JSON. Confirm the separate company hold remains and no sales activity/XP was fabricated. Try a narrow screen and Tab/Shift+Tab/Escape.

Actual Salesforce creation is a manual verification outside SalesOS. Automated tests must never automate Salesforce or touch the user's production prospects. See `tests/test_salesforce_contacts.cjs` and `tests/browser/salesforce_contacts.cjs` for synthetic regression coverage.
