# Focus performance — 25 November 2026

The reported slowdown was switching tasks and logging calls. A synthetic 442-company workspace (170 active tasks, 600 logged calls, 1,042 total activities) reproduced a slow queue-count calculation: it recalculated the same daily KPI for each task, constructing a new London timezone formatter for each historical call on every calculation. Growing call history therefore multiplied the work.

| Calculation | Before | After |
| --- | ---: | ---: |
| Work queue counts | 5,848.6 ms | 5.2 ms |
| One daily-minute calculation | 43.6 ms | 4.1 ms |

These are diagnostic Node timings on the same synthetic workload in the cloud environment, not promised end-to-end timings on a work laptop. No live prospect data was used.

The queue gate is now calculated once per count operation, timezone formatter instances are reused, and Focus memoizes read-only daily/supply/industry statistics for the current state and clock tick. Navigation, copy notifications and cloud status updates reuse unchanged derived values. Actual workspace changes and the existing 15-second clock invalidate the UI values, so completed calls, edits, daily rollover and due commitments still refresh. There is no global state-identity cache that could hide in-place legacy/test mutations. Daily London date calculations and imported call matching retain their timezone/DST semantics.

The performance regression guards one history pass rather than per-task conversion, formatter reuse, same-object call/time edits and London summer/winter midnight/DST totals. Browser checks use 442 fictional companies and 600 historical calls in shadow and enabled Intelligence modes at 2x CPU throttling. They measure Next/Previous and No Answer to next-task visibility, check unchanged navigation/history, retain a promised callback, verify one actual dial and refreshed footer counts, and guard against repeated sorting during navigation. Budgets are 1.5 seconds per navigation and 2 seconds to the next task after No Answer, excluding the separate cloud acknowledgement wait. Existing full storage, conflict, buyer progression, eligibility and manual Cold Call Mode tests remain required.

No scoring, ordering, data schema, settings, sales records, readiness, pipeline, reserve behaviour, infrastructure or screen design changes. Production deployment still requires a fresh private backup and SELECT-only preservation checks under the standing release authorisation. Signed-in production/device acceptance remains separate from isolated tests.
