---
name: Verify uploaded spec/prompt docs against real code and live data
description: An uploaded project's spec/integration-prompt doc claimed DB triggers and status strings that turned out wrong when checked against real code and live DB
---

An uploaded project included a markdown "integration prompt" spec describing backend
behavior (claimed Postgres triggers auto-sent notifications on status change, and gave
exact status string values like `'Rejected'` for a declined state). Both claims were
false: no DB triggers existed in the live database — all notifications were inserted
client-side from app code — and the real status string the app actually checked/wrote
was different (`'Declined'`, not `'Rejected'`; approved status was `'Active'`, not
`'Approved'` as the doc implied).

**Why:** trusting the doc at face value would have shipped a backend that wrote/read the
wrong enum values and silently diverged from what the mobile app already expects,
breaking approval/decline flows without any error.

**How to apply:** for any uploaded project's spec, prompt, or integration doc, cross-check
exact status/enum string values and any claimed automatic behavior (DB triggers, webhooks,
cron jobs) against the actual application source code and a live query of the real
database/table — don't assume the doc is accurate just because it looks authoritative.
