---
name: Supabase migration fallback
description: Recovery path when valid-looking Supabase pooler credentials repeatedly fail authentication.
---

When the Supabase pooler recognizes the project tenant but rejects both stored and newly reset database passwords, stop retrying credentials and use the authorized Supabase management connection to apply tracked migrations.

**Why:** Repeated pooler retries did not distinguish stale credential state from dashboard propagation, while authorized project access could verify the exact project and apply DDL safely without exposing credentials.

**How to apply:** Confirm the project identity first, use the migration operation for DDL and raw SQL only for verification, keep migrations idempotent, and verify live columns, policies, publication membership, and cleanup afterward.