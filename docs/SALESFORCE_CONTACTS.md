# Salesforce Lead Queue and prefilled New Lead creation

Draft PR #6 builds on released Focus Mode 2.0/main `e9705a7`. The user confirmed that Salesforce records are **Leads**, and approved URL-based navigation to the existing Lightning New Lead form. No Salesforce API, automatic submission, Outlook/Teams integration or new service is used. Do not merge, deploy or submit a fictional Lead into production Salesforce without explicit approval.

## Daily workflow

Click **Create Lead in Salesforce** from the selected Focus contact, the post-call Save & Stay/completed-task review, a Salesforce Lead Queue row, or the contact card in Prospects. This opens a compact **Salesforce Quick Add** preview. Check/edit the proposed fields, then click **Open Prefilled Salesforce Lead**. A new browser tab opens; SalesOS keeps the prospect and task available.

The target is fixed to `https://d1r000000gheeea2.lightning.force.com/lightning/o/Lead/new`. The user-supplied `recordTypeId=012Sr0000044uCbIAI` is passed separately from `defaultFieldValues`. Only those two navigation parameters are generated. No uid/count/navigationLocationId, unsupported RecordTypeId field default, Salesforce session token or guessed owner is added.

| Preview field | Salesforce field API name |
| --- | --- |
| Company | Company |
| First Name | FirstName |
| Last Name | LastName |
| Job Title | Title |
| Phone | Phone |
| Email | Email |
| Industry | Industry |

Names use an editable initial split; never assume compound surnames are correct. Usable mobile then landline methods are used for the selected person, with no unrelated-contact fallback. Unknown values remain blank. Industry is an exact-choice selector using the list supplied by the user on 18 November 2026; --None-- and unrecognised sectors are omitted from the URL. There is no guessed industry mapping. API-value/layout behaviour still needs the live manual check below.

The user subsequently showed additional form labels: Company Registration Number, Lusha Job Title and Position, with existing Lead Source **Lusha** and Country **United Kingdom** defaults. Labels do not establish field API names. Until the three additional mappings are confirmed, the expanded **Extra fields on your Salesforce form** section offers registration-number/job-title/Position copying only. Position uses the user's supplied choices, starts blank and does not infer a role or mark someone as left. The URL's job-title mapping remains the explicitly specified standard `Title` field; verify whether the displayed Lusha Job Title label is that field or a custom field. Lead Source/Country defaults are left untouched. Do not guess custom `__c` field names or send composite Name as a field default.

## Opening, confirmation and fallback

- Opening/cancelling Salesforce never marks Added, logs outreach, changes company clearance/readiness/stage, completes/skips a task or awards XP. Not Checked remains available under that queue filter until explicitly changed.
- After saving manually in Salesforce, return and click **I've saved this Lead in Salesforce**. Only this confirmation sets Added and its timestamp/note.
- **Add to Salesforce Queue for later** explicitly sets Needs Adding; Focus also has a one-click queue action. No sales task is generated.
- **Not added / Close** closes the preview without changing status. Temporary copy-form edits are discarded unless saved explicitly to SalesOS.
- If the browser blocks a popup, the preview stays open with a user-clicked opening-link fallback. Editing a field invalidates the previous retry URL. The new tab has no opener; outgoing navigation uses no referrer. Restriction/hold changes also hide a stale retry link.
- Individual Copy buttons and seven-value, tab-separated **Copy All Fields** remain available. Empty positions remain in TSV; embedded tabs/newlines become spaces. This does not automatically fill separate Salesforce inputs. Clipboard denial shows selectable text for manual Copy.
- If Salesforce sign-in loses defaults, finish normal sign-in, return to SalesOS and open the form again. If the layout ignores a default, copy the field manually. There is no automatic verification or readback from Salesforce.

The launch URL is created only in browser memory on the explicit click. It is not written to the workspace, localStorage, JSON backups, analytics or backend logs. No raw URL appears in UI messages/errors. The only destination receiving it is the approved Salesforce navigation. The retry anchor is ephemeral and not a tracking link.

## Queue and independent status

The navigation page is **Salesforce Lead Queue**, independent of **Dupe Queue**. Per-SalesOS-contact metadata remains compatible: optional `salesforceStatus` (`not_checked`, `needs_adding`, `added`), `salesforceStatusUpdatedAt`, `salesforceVerificationNote`. Existing contacts/imports default to Not Checked without an invented update timestamp. Company ownership and import success never imply Lead creation. Matched imports and JSON normalisation preserve saved metadata and name splits. These fields use the existing account workspace, autosave/outbox/revision protection and backup format; no SQL migration.

Default view is Needs Adding, with counts for all three statuses, company/person search, title/status filters and 100-row pagination. Priority uses recorded company commercial stage, person-specific promises/conversations, explicit company readiness evidence and upcoming actions. Explanations distinguish company context from person engagement. Administrative items never enter the Focus sales-task queue or outrank due callbacks/meetings there.

**Work Needs Adding queue** opens the first matching record. **Next outstanding Lead** navigates without changing status. Explicit Added confirmation advances to the next matching outstanding record or closes the preview. In Focus, the same prospect stays available. Bulk status updates require confirmation; bulk Added requires personally confirming every selected Salesforce Lead exists. A blank bulk note retains prior notes. Stale selected statuses reject the entire update. No bulk selection alone marks records Added.

## Corrections and safeguards

Copy/launch-form edits are temporary until **Save corrected contact details to SalesOS**. Saving changes the same contact ID's name/split/title and adds or prefers usable methods; company/Industry copy edits do not alter company data. Old methods/flags/IDs/history and task routes stay intact. New methods remain unverified; blank methods do not delete anything. Invalid/blocked methods cannot be revalidated. Duplicate same-company names and stale details are refused. Status-only changes create no activity/XP/tasks and do not run reserve replenishment.

Suppressed/inactive/left-company/not-responsible contacts cannot launch or copy phone/email/Copy All or save corrections. Company holds block New Lead launching, remain visible and cannot be released here. Administrative status confirmation is still available; it never authorises outreach or clears a hold. No real production records are used in testing.

## One manual Salesforce test — cancel without saving

Use an approved fictional SalesOS record on an approved preview, in the normal desktop work browser:

1. Open **Create Lead in Salesforce** and enter fictional values with punctuation: Company `Fictional O'Brien & Sons, Ltd`; First Name `Anne Marie`; Last Name `O'Example, Test`; Job Title `CFO & Director, FX`; an approved fictional phone/email. Select the exact Industry `Professional Services (Legal, Accounting, Actuarial)` from the supplied list.
2. Click **Open Prefilled Salesforce Lead**. Confirm the exact organisation, New **Lead** form, and intended record type/layout. Verify all seven values, especially commas/apostrophes/ampersands and whether standard Title appears under the displayed job-title label. Do not assume a custom field has populated.
3. If asked to sign in, use the normal work sign-in. Check whether values survive; if not, return and reopen after sign-in. Check popup-blocker fallback and an unknown-sector preview (--None--, not a fabricated Industry).
4. Use **Cancel** in Salesforce. Return to SalesOS; verify the original task, activity/XP, company clearance and contact's prior Salesforce status are unchanged. Do **not** click the saved confirmation for a cancelled form.
5. For real approved work, save manually in Salesforce, return and confirm Added. Actually saving a fictional production Salesforce record needs separate explicit approval and is not part of the automated test.

## Verification limits and references

Unit/browser tests cover URL generation, exact host/path/query keys, encoded values, separate record type, user-supplied Industry choices, popup handling, intercepted desktop navigation and a **simulated** authentication redirect. They do not access a live authenticated Salesforce session. An anonymous live request from the cloud environment failed with ECONNREFUSED; no live form, record type, custom-field mapping or SSO/default retention was verified. No test Lead was submitted. Additional field API names remain a required input before extending their prefill mapping.

Salesforce documents default-field serialization and warns against RecordTypeId inside defaults. A separate record-type URL hint is retained from the user's existing URL, with no claim that every org override honours it. See [default-value navigation](https://developer.salesforce.com/docs/platform/lwc/guide/use-navigate-default.html), [Page Reference Utils](https://developer.salesforce.com/docs/platform/lightning-component-reference/guide/lightning-page-reference-utils), [custom-button defaults](https://help.salesforce.com/s/articleView?id=sf.links_useful_custom_buttons_create_record_dfv.htm&language=en_US&type=5) and [record-type limitations](https://help.salesforce.com/s/articleView?id=005299460&language=en_US&type=1).

Each raw field value is escaped once in Salesforce's comma-separated serialization, then that serialized string is encoded once as a query parameter. This separates field delimiters from literal punctuation. A percent sign can therefore appear as `%25` in the outer transport; decoding each boundary exactly once restores the raw value, including literal `%2C` text. No repeatedly encoded whole URL is supplied. Tests independently inspect actual browser-request values, not merely URL substring presence.
