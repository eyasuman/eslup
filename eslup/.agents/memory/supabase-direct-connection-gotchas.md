---
name: Supabase direct Postgres connection gotchas
description: Pitfalls when connecting directly to a Supabase project's Postgres for DDL/migrations from this environment.
---

When running DDL or migrations directly against a Supabase project's Postgres (bypassing the Supabase client SDK):

- Use the **Session Pooler** host, not the direct connection host — the direct host is often IPv6-only and unreachable from this environment (IPv4).
- Session-pooler usernames use `postgres.<project-ref>`, not plain `postgres`.
- Supabase connection examples can contain the literal `[YOUR-PASSWORD]` placeholder. Replace it with the real database password; URL-encode special characters instead of merely stripping brackets.

**Why:** Direct DDL attempts failed for three different-looking reasons: IPv6 routing, a pooler username mismatch, and a connection URI that still contained Supabase's password placeholder.

**How to apply:** Before debugging a Supabase Postgres connection, verify the pooler host, `postgres.<project-ref>` username, and that the URI contains a real URL-encoded password rather than a bracketed placeholder.
