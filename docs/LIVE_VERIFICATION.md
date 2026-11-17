# Live SalesOS verification — 17 November 2026

Production: https://salesos-up-next7.vercel.app/ . Project `salesos`, workspace `up-next7`. Production source is GitHub `brandon12001/salesos`, branch main. Vercel sign-in protection stayed enabled. A user-approved temporary access link was used only inside this testing session; its secret is not recorded in this repository.

## Observed in production Chrome

- Protected HTML returned HTTP 200; React loaded into Focus Mode from an empty local database.
- Menu and management navigation worked; fictional demonstration records loaded.
- Phone-copy button displayed success without logging a call. Cross-app paste could not be verified because the cloud browser virtual clipboard returned no text.
- Connected dialog opened with eight optional Buyer Readiness levels. Trying to change readiness without evidence showed the validation error and did not save. Cancelling then clicking No Answer logged one call, one completed task and two activity XP, without a discovery questionnaire.
- Reload preserved the records, activity and queue. Task Queue showed the next-working-day email follow-up and the existing discovery-stage task.
- Pipeline displayed exactly seven acquisition stages, independent readiness and separate statuses.
- FX Discovery displayed existing flows and products. A fictional provider edit saved, and the same value remained after JSON backup restoration.
- Full JSON export downloaded, uploaded through Restore, and restored successfully on the same origin after confirmation. Activity totals, follow-ups, readiness and FX persisted.
- Buyer Intelligence and Pipeline Value rendered; the synthetic GBP monthly flow annualised to GBP 3 million, GBP 2.1 million addressable, GBP 8,400 annual potential and GBP 1,008 weighted estimate.
- Fictional Lusha CSV preview/import reported two new companies and one merged contact. New records displayed Level 1 Unaware; existing demo readiness stayed at Levels 3 and 4.
- Bad Number excluded the failed number and generated a usable alternative contact task. Wrong Person generated contact research while the company remained Active. Focus subsequently selected the alternative finance contact.
- Skip rescheduled a pending task. This test exposed the counting bug below; it was fixed and retested in production.
- Final application-origin console-error query returned no errors. The shared browser did emit unrelated extension metadata errors; these were from chrome-extension URLs.

## Fix discovered during live testing

Previously every history entry carrying a task ID counted as a completed task, including Skip and Snooze. The same mistake inflated observed completion pace in Lead Supply. The fix filters those two rescheduling outcomes in both calculations and keeps all existing history and state formats compatible. It does not change scheduling or XP.

A failing regression reproduced 40 false completions after repeated skip/snooze. With the fix, deferrals count as zero; a real subsequent call counts once; XP stays unchanged during deferrals; the same rules hold after JSON normalisation. All engine and importer tests and the strict TypeScript/Vite build passed before push.

Commit `b9e54d2` deployed automatically to production and reached READY. GitHub CI passed. Reloading production corrected the previously inflated count from 4 to 3 without deleting history. Skipping another pending task left calls/tasks at 3/3, XP unchanged, the queue intact and no due task until its new date.

## Verification limits

This is a desktop smoke/functional pass, not certification of the full product specification. Cross-app clipboard paste, mobile devices, fresh-origin backup restoration, every outcome/status branch, opt-out reimport in the browser, real redacted Lusha headers, prolonged sessions and all FX assumptions still need further coverage. Automated tests cover several of these business-rule cases.

Supabase is not configured in this deployment; authentication, RLS and manual snapshots were not tested. Browser localStorage is still the persistence layer. The pre-existing email-composition and reporting gaps recorded in VALIDATION.md remain outside this small counting fix.
