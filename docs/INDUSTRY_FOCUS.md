# Industry Focus — draft PR #8

Industry Focus is an **opt-in filter for discretionary daily prospecting**, not a different pipeline, a new scoring system, or an instruction to ignore the buyer. Its default is OFF, preserving existing task recommendations.

## Use during the calling day

1. In Focus Mode turn on **Industry Focus** and select **Recruitment & Staffing**, **Industrial Machinery & Equipment**, **Manufacturing**, **Other Industries** or **Unclassified**.
2. Combine it with **Cold call mode** if you only want calls. The selected industry is displayed in a banner and on the prospect card.
3. **Promised callbacks, meetings and explicitly protected commitments remain due regardless of industry.** They are labelled when outside the chosen focus; the next discretionary task returns to the selected industry.
4. Click **Industry Lead Reserve** to see that category's reserve prospects. Counters distinguish callable, eligible and research-needed prospects. Activate 5/10/25/50 only after an explicit click; 25/50 ask confirmation. This does **not** switch on automatic replenishment.
5. To correct an industry, open the company in **Prospects**, then in its overview select a manual **Industry Focus category**. Clear the override to return to inference from the original Sector field. You can add a custom category in the same panel.

## Evidence and data rules

- Classification uses only **explicit keywords in the recorded sector**, not company names, account names, overseas offices, presumed FX opportunities or research scores.
- Recruitment variants include staffing and executive search. Machinery covers explicitly named industrial/machine tools/plant equipment. Manufacturing covers manufacturing and fabrication. Unrecognised or ambiguous sector text remains Unclassified.
- **Original sector text is never overwritten by a category correction.** The optional `industryCategory` field is preserved by legacy v3 normalisation, cloud workspace persistence and backups. Duplicate CSV merges do not reset it.
- Filter preferences and custom categories live in optional `meta.industryFocus` rather than adding string values to numeric-only `settings`. Existing workspaces default to OFF.
- Both legacy `core.due` selection and Intelligence v1 recommendations use the shared `industryAllowsTask` predicate. It is applied before selecting a recommended task, so displayed evidence, actions and target company match.
- The filter never modifies, deletes, cancels, schedules or completes existing tasks. Historical review and manual browsing remain available. Industry does not change CRM ownership, suppression, readiness, acquisition stages or XP.
- Reserve activation still invokes `core.reserveEligibility` with the configured minimum research score and manual Salesforce clearance check. Automatic replenishment remains separately opt-in and unchanged.

## Tests and verification

- `npm run test:industry` includes default-off parity, recruitment/machinery/manufacturing/ambiguous grouping, manual overrides, v3 backup normalisation, both selectors, cold-call commitments, callable reserve supply and ownership holds.
- `npm run test:browser` includes an Industry Focus case with cloud persistence, a change from Recruitment to Machinery, filter-scoped reserve activation, and a due cross-sector promise in Intelligence mode.
- Full `npm test` and `npm run build` must pass in GitHub CI. The browser reliability workflow uses disposable fictional accounts and local services, not production Salesforce or prospect records.
- After approval, manually smoke-test filter OFF, both industry presets, a due promise from another industry, classified and unclassified prospects, Save & Stay / Previous and Next, reserve activation, and a cross-device refresh.

No feature-branch Vercel deployment, production workspace mutation or migration is authorised by this draft PR.
