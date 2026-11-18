# Company research and execution feedback — review candidate

This branch is based on draft PR #6 (`feature/salesforce-contact-queue`, tested parent `1b9cbd2`) and includes released Focus Mode 2.0. **Merge PR #6 first, then retarget this PR to main.** No merge/deploy approval is implied; branch deployments are disabled. No database migration, API service, new dependency or production workspace operation is needed.

## Company research

The reusable `CompanyResearch` strip appears above active/reviewed Focus work, in Save & Stay, all prospect drawer tabs, Salesforce queue rows and the Salesforce Lead preview. Links open a separate tab with `noopener noreferrer` and no referrer. Opening a link never calls the mutation engine.

Companies House uses the recorded registration number when it matches an eight-character company-number format (eight digits, two letters plus six digits, or historic R plus seven digits). Leading zeros are retained and prefixes uppercased. **Format is not proof of registration or legal identity.** Missing/malformed numbers use an explicitly labelled name search; no number is padded, invented or selected from results.

Websites accept bare domains and HTTP(S), normalise with the browser URL parser and retain subdomains, case-sensitive paths, query and fragment. Non-web schemes, malformed authorities/hostnames, credentials, control characters, whitespace and backslashes are rejected. Invalid/missing websites show Find Website (ordinary Google search) and Add Website. Saving is explicit, requires the user to verify the destination and checks the previous value against concurrent changes. Only `companyDomain` changes; auto-replenishment is disabled for this administrative save. Search never guesses or saves a destination. Research remains available on held records; it grants no outreach clearance.

CSV imports previously removed `www` and paths. New imports preserve the supplied field; existing populated websites are not overwritten and stored records are not bulk rewritten. Paths lost in previous imports cannot be recovered automatically: use Edit Website after verification. JSON v3 retains websites and preferences. No external website content is fetched or validated automatically.

## Execution feedback

Feedback is derived only inside explicit execution/progression transactions. It compares newly completed tasks and actual new milestone receipts; renders, navigation, reconciliation, restore/import and historical edits cannot originate feedback. No XP, ranking, readiness, pipeline or acquisition rule is changed.

- Task accepted into the durable local outbox: immediate neutral **Recorded on this device**, with syncing/offline text. Actions and next-task selection continue immediately.
- Cloud acknowledgement (or browser-only local persistence): green tick, **Task completed**, 600ms card highlight/check. A 220ms neutral fade/slide identifies a different task/review; Previous/Next has no success tick of its own. Recorded result text also distinguishes cloud, browser and queued writes.
- A rejected local write creates no feedback and retains the entered form. A pending cloud failure/conflict removes its feedback; recovery/retry cannot replay it. The normal persistent sync/conflict controls remain authoritative.
- Confirmed feedback is latched to that event, so unrelated saves/rerenders do not replay its effects. Switching screens does not replay the card flash. Feedback disappears after five seconds; a slow/offline write still gets the persistent sync indicator, without a delayed celebration after the notification expires.
- First-time, evidenced engine milestone receipts show the actual meeting/stage/readiness achievement. Readiness reassessment from Unknown, regression or stage bouncing produces no commercial celebration. Account Open / First Trade receive a small CSS spark effect. Ordinary unsuccessful calls receive routine task feedback only.
- Optional daily call notices at 25, 50, 100, 200 follow the existing daily KPI counting convention. Only a new live call crossing the threshold qualifies. Consumed thresholds are retained as `meta.callFeedbackReceipts` in the same atomic save (recent 30 days), including while notices are disabled. Refresh, remote adoption and activity edits do not originate notices; no additional XP is awarded.

Settings: **Celebratory milestone effects** defaults on; **Daily call milestones** defaults off. Basic confirmation remains. CSS respects `prefers-reduced-motion` with static messages/ticks and no spark movement. All overlays ignore pointer input, never steal focus and use a polite live region. No animation libraries are installed.

## Validation and limits

Use only isolated synthetic accounts. `npm test` includes a new research/feedback regression suite; `npm run test:browser` covers the production bundle against disposable localhost Auth/Postgres/REST/mail. Research destinations are intercepted fictional pages: these prove the requested URL, new-tab/no-opener/no-referrer behaviour and absence of workspace mutations, **not** the correctness or availability of any real company's website/Companies House record. Existing Salesforce URL/clipboard/queue, Focus, autosave/offline/conflict/isolation, reserve, importer and Intelligence suites remain required.

User acceptance after an approved release: check the correct legal company/site for real records and confirm the visual feedback feels right during a calling session in the work browser. Existing production Salesforce layout/record-type/SSO checks from PR #6 remain outstanding and unrelated to these navigation links. Do not use real prospects as automated test fixtures.
