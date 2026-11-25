# Open opportunities and positive responses

The existing Focus Opportunities filter lists eligible due actions. It is not a list of all open buyer relationships. The dedicated **Opportunities** navigation page now lists recorded buyer interest regardless of whether a follow-up is due, future, missing, blocked, in reserve or paused. Source data remains the existing workspace; no service, API, paid dependency, migration or production data backfill.

## Capture

- In Connected / Log choose **Positive response — interested**, or use **They’re interested — add to Opportunities**. Record what the buyer actually agreed to. This saves the actual call and evidenced opportunity inside one atomic existing workspace commit. Invalid evidence saves neither half.
- An explicitly logged booked meeting also opens an opportunity. Existing genuinely logged meeting calls are recognised when no newer manual classification correction supersedes them. A stage field alone is not proof.
- **Record positive response** on the new page handles an actual email/LinkedIn/other response. Choose a named permitted contact, actual response and observation date. It creates an opportunity evidence/audit record, never a fake call or sent message.
- Existing evidenced interest classifications appear automatically. Traceable, explicitly recorded Interested-or-higher readiness plus a real relevant conversation can establish interest without an extra decision-maker checkbox; this does not establish authority or FX qualification, whose stricter checks remain unchanged. Plain notes, contact copies, successful connection, busy/callback-only requests, research scores and untraced readiness values cannot create interest automatically. Older unstructured notes require explicit human review.

Opportunity membership does not set Buyer Readiness, change an acquisition stage, confirm FX volume, award XP, clear ownership or activate a reserve company. The seven stages/eight readiness levels remain independent. Existing explicit correction records are respected; contact/ownership restrictions remain visible rather than making open interest disappear. Closed Lost, Disqualified, opt-out and actual First Trade records appear in a separate closed view.

## Daily use

Each card shows company/contact, positive evidence/date, next agreed step, next scheduled action/date, blocker, gaps, current stage/readiness and last recorded conversation. Default All open includes future/no-task records. Action due and Needs attention filters support daily reviews. Due status refreshes locally every 15 seconds without network research.

Copying a permitted number records no outreach. A due task can open its existing call/outcome workflow; the current eligibility checks are re-run on action. Future/blocked tasks offer no early outcome log. Open prospect retains the existing detailed record workflow.

Update next step records human-entered notes and an optional dated call, email or internal review. It updates one owned opportunity task or the existing generic progression task, keeping its ID; it does not repeatedly create duplicates. A missing schedule remains a visible gap. New outreach tasks require current clearance, active status/pool and a permitted method. Internal review tasks never represent a call or email being sent.

Promised callbacks/meetings and explicit commitments are never replaced by a competing plan. When a promise exists the editor displays it and leaves the exact task/schedule unchanged; explicit rescheduling remains through the existing workflow. Recording actual interest pauses/cancels only obsolete routine cold sequence/follow-up tasks, preserving other work and commitments. No automatic replenishment is invoked for opportunity-page edits.

## Persistence, conflicts and verification

Optional version-1 next-step notes live under `meta.opportunities`; evidence uses the existing `meta.workQueues` records. Both are part of normal cloud saves and JSON backups. Draft stamps include lead/evidence/contact/notes and pending tasks, so a changed opportunity is rejected instead of silently overwritten. The existing cloud revision-conflict/outbox recovery protects competing sessions. Future metadata versions fail closed on edits.

Use fictional records and isolated local Auth/PostgREST/Postgres only. Tests cover genuine versus inferred interest, atomic positive-call capture, future/no-task inclusion, manual replies without fake calls, next-action dedupe, promises, stale edits, ownership/contact/reserve restrictions, independent stage/readiness/XP, corrected and closed views, JSON/reload, mobile and keyboard access. Build/all suites/full browser and final-head CI precede the standing-authorised release, with fresh private recoverable backup and exact deployment/alias plus SELECT-only preservation checks. No production prospect is modified for testing; protected live sign-in remains manual.
