---
name: Public payment settings access
description: Database rules required for patient checkout to read admin-managed payment methods safely.
---

Admin-managed booking payment methods use several dedicated rows in the shared settings table. Do not restore a unique index over a constant expression that restricts this table to one row.

**Why:** The legacy singleton index allowed the first payment value to save but rejected the remaining method fields. In addition, an RLS policy alone was insufficient: PostgREST returned a table-permission error until the public roles also received table-level SELECT permission.

**How to apply:** Keep the primary key on each setting ID, allow multiple rows, grant SELECT to anon and authenticated, and use a scoped SELECT policy that exposes only the approved payment-setting IDs. Never expose unrelated settings rows.