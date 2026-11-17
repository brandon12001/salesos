# Production reliability audit — 17 November 2026

Scope: reliability branch based on production `041f6ee`. No merges, production deployments, production migrations or changes to the user's ten prospects were authorised or performed during this phase. Tests use fictional records and isolated browser contexts against an ephemeral local Auth/Postgres/REST/mail stack in the cloud environment.

## Evidence

- Read-only production baseline: revision 3, five reserve prospects, zero pending tasks for reserve, auto-replenishment off. The completion read returned the same revision, update time and document fingerprint; all prospect records and history remained unchanged. No prospect records were printed or exported during this phase.
- Clean install, all engine/importer/reserve/autosave suites, and TypeScript/Vite build pass. New regressions cover deadline ordering, Call Block meetings, nurture contact safety, replayed outcomes and hidden readiness edits.
- The browser suite tests the compiled cloud-configured app against real local GoTrue/Postgres/PostgREST, not an in-memory persistence mock. It covers refresh, sign-out/sign-in, independent same-account contexts, account B denied account A's REST data, tab locks, competing saves, recovery backup, actual browser offline/reconnect, HTTP failure/retry, quota failures, daily Focus outcomes, reserve/reclaim gates, JSON recovery and mobile widths. See `tests/browser/README.md` for reproduction and isolation boundaries.
- Isolated SQL checks verify stale-write rejection, idempotent retry, row isolation, denied ownership reassignment, anonymous denial and snapshot isolation. The pending conflict migration is exercised only locally.
- No new paid API, product integration, pipeline stage or readiness level. Focus remains one task at a time; default automatic activation remains off.

## Bugs and corrections in the review branch

1. **Callback schedule priority:** a later high-scoring promise could outrank an earlier overdue promise. Hard commitments now sort by due schedule before commercial score; Call Block also honours due meetings from legacy data.
2. **Nurture contact safety:** the early return for nurture commitments bypassed contact suppression/inactive/invalid-phone checks. Such commitments now pass those checks like other outbound work.
3. **Hidden readiness fields:** changing a conversation dialog to No Answer or another non-conversation outcome could still apply its previously selected, now hidden readiness value. Only meaningful conversation/callback/meeting outcomes can apply those readiness edits. All eight readiness levels remain independent of pipeline stage.
4. **Tab-lock acquisition:** immediate non-blocking acquisition could mistake an instance's just-released lock for another tab during Strict Mode/rapid remount. A short, cancellable queued acquisition avoids that false lock while continuing to block a genuinely concurrent same-browser tab.
5. **Conflict HTTP response:** the isolated PostgREST 14.18 stack hung on a deliberately raised serialization SQLSTATE `40001` until request timeout. A pending SQL migration returns an application `PT409`/HTTP 409 conflict instead; the client recognises both old and new codes. The server kept the winning document throughout the failure; the fix improves prompt, explicit conflict handling rather than inventing automatic merging.
6. **Failed durable writes:** prospect dialogs and contact/method fields could close or clear after a quota failure; some settings/contact handlers allowed an uncaught error. They now retain draft inputs and communicate failure. Shared text-field labels are associated with their inputs, and closed navigation is inert so off-screen sidebar buttons cannot capture keyboard focus. These changes improve keyboard/assistive use without redesigning screens.

## Approval-dependent rollout

These fixes are not in production. Review the draft PR before merging. If approved, deploy the compatible client first, then apply `supabase/migrations/20261117155815_immediate_workspace_conflicts.sql` through the managed migration tool. It changes only the save function's conflict response, preserving revision checks, payloads, SECURITY INVOKER, RLS and grants. Refresh older tabs after rollout. The original schema files remain historical installation inputs; new installations must also apply the subsequent migrations in order.

## Remaining risks and manual acceptance

- The user chose to verify hosted sign-in separately. Hosted reload/sign-out/sign-in, a second physical browser/device, hosted Auth email/redirect settings and work-device clipboard permissions are not certified by the local stack.
- A local offline test begins with the app already loaded. There is no PWA/offline-reopen guarantee; keep the page open and wait for Saved to cloud after reconnection. Keep JSON backups.
- Conflicting documents intentionally pause; local work is retained and exportable. Recovery may refuse a replacement that would remove an opt-out or promised commitment; there is no automatic semantic merge.
- Supabase's current security advisor reports leaked-password protection disabled; the current UI uses email links. No paid security setting was enabled. Its performance advisor returned no findings.
- The cloud-configured bundle has a non-fatal size warning (about 575 kB uncompressed / 163 kB gzip). The small-workspace browser navigation check is a smoke test, not a long-day or large-import benchmark. No redesign or speculative optimisation was performed.

Assessment: controlled online use with one session and backups has supporting evidence. A full multi-device/offline production reliability sign-off still requires approval/deployment of the corrections and the remaining hosted checks. Do not represent unmerged fixes as protection already present in the live app.
