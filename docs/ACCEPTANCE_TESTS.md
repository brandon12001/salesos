# SalesOS — Codex regression and acceptance test checklist

Use fictional/synthetic companies, contact methods and emails. Add unit tests plus browser tests for all high-risk transitions. A task passes only when its expected next action and persistent state are both correct.

## Priority P0 — real build and UI validation

- [ ] In Codex cloud shell: `npm install`, `npm run build`, `npm test` all exit 0. `dist/` generated; no Vercel fatal TS18047 error. Never use an untested transpile-only syntax check as a substitute.
- [ ] Browser app starts without errors; empty-state has a safe useful action and no crashed dashboards.
- [ ] Fictional demo opens Focus Mode, sidebar hidden, primary task centred, minimal top bar and slim bottom progress strip; nav toggles with M and menu button; mobile layout remains usable.
- [ ] C copies usable number; phone isn't considered called until outcome logged. N logs No Answer and displays new task, with no discovery form. G opens meaningful call logging; W/B respectively create correct research/repair route. S snoozes/defers without false completion. Shortcuts don't fire while typing.
- [ ] JSON backup exported, imported into a fresh browser origin, and restored leads/tasks/history/opt-outs remain correct.

## Task and scheduling cases

- [ ] A new cold prospect with valid number receives appropriate first call from the configured sequence.
- [ ] First No Answer logs one call, awards only small activity XP, creates one appropriate due follow-up in cadence and never changes readiness.
- [ ] If a person asked for a call at a precise date/time, it ranks ahead of lower-priority generic tasks when due, even if a high-value other deal exists.
- [ ] Stage advancement or switching into active progression cancels obsolete cold outreach without deleting an unrelated promised callback or outstanding task.
- [ ] Connected prospect asks for info: create a manual email task with copyable subject/body, require manual sent confirmation, don't assume Outlook sent it.
- [ ] LinkedIn connect/message tasks only open profile/copy suggested copy; require manual completion. Message isn't scheduled if connection is unconfirmed when required.
- [ ] No redundant duplicate tasks after repeated outcome/logging or reload; no duplicate XP for the same milestone.
- [ ] No task for explicit opted-out contact/company; no outbound task after reimport.

## Contact resolution

- [ ] Bad number makes only that contact method invalid, removes associated call task, presents other valid method or creates find-number task.
- [ ] Wrong person creates identify-correct-FX-owner task; the company remains qualified/active unless separately shown otherwise.
- [ ] Contact left business is inactive; company can retain other contacts.
- [ ] Email-only prospect gets compliant email task and may receive research task if useful; no impossible call to missing number.
- [ ] Contact/company scope of opt-out persists across company deduplication and imported new contacts.

## Buyer readiness and pipeline independence

- [ ] All **seven named stages** exist in exact order; no extra stage is inserted.
- [ ] All **eight named readiness levels** exist, independent of pipeline stage and status.
- [ ] Meaningful evidence allows manually confirmed promotion or regression with date, old/new, evidence and blocker; no-answer/email-sent/call-count never automatically promote.
- [ ] Level 8 corresponds to completed first transaction, not just account opened or promise to trade.
- [ ] New Lusha CSV company begins Level 1 Unaware. Duplicate import preserves existing Level 4 etc., stage, opt-outs and activity history.
- [ ] Negative Nurture, Disqualified, Closed Lost and Take Me Off the List remain distinct; status choice does not change readiness into a fake 9th level.
- [ ] DQ after verified no FX and Closed Lost after qualified solution rejection are recorded distinctly.

## FX qualification and pipeline value

- [ ] While handling a connected call, user can optionally enter several flows/pairs/directions, currency, amount, period, confidence, incumbent provider, price with units, spot/forwards, hedging and notes; no mandatory form for unanswered calls.
- [ ] Incomplete FX values remain Unknown, not zero; saved data reopens with prior entries and last modified context.
- [ ] Financial total excludes unqualified/duplicate flows; currencies aren't summed without GBP-normalisation; addressable portion and margin assumption explicit.
- [ ] Pipeline Value distinguishes discovered volume, qualified addressable volume, projected annual, weighted expected, realised revenue; none falsely presented as certain.
- [ ] Insights show active readiness distribution with correct denominator and unknowns, stalled barriers, sensible recommended next tasks, and opt-outs/closed statuses excluded from active queues.
- [ ] Lead Supply differentiates callable contacts from research-only leads and does not flood tasks after large Lusha imports.

## Cloud deployment and security (later P1, separately report status)

- [ ] Hosted app opens on Vercel stable URL with no local installation.
- [ ] If Supabase used: login, RLS tenant/user isolation, secure secret handling, reliable read/write, backup/restore, migration, and conflict handling tested. Verify that a fresh browser/device still has data after sign-in.
- [ ] Until above complete, explicitly label app browser-local storage; do not claim cloud memory just because it is hosted.
- [ ] No production use of real Lumon/third-party contact data unless employer policies/license and storage approval are satisfied.

## Reporting template

Tell the user: (a) what worked, (b) what was fixed, (c) exact commands/tests with results, (d) what remains broken/unverified, (e) how to access the browser deployment, (f) whether cloud data persists across devices. Never promise future work outside an active task.
