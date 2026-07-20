---
name: Supabase direct Postgres connection gotchas
description: Pitfalls when connecting directly to a Supabase project's Postgres for DDL/migrations from this environment.
---

When running DDL or migrations directly against a Supabase project's Postgres (bypassing the Supabase client SDK):

- Use the **Session Pooler** host, not the direct connection host — the direct host is often IPv6-only and unreachable from this environment (IPv4).
- Pasted connection strings from the Supabase dashboard sometimes wrap the password in stray `[`/`]` brackets — strip them before using the string, or the connection will fail with an auth error that looks unrelated to the brackets.

**Why:** Hit this while trying to inspect/modify a Supabase project's schema directly via `psql`/`pg` from the shell.

**How to apply:** Before debugging a "connection refused" or "auth failed" error against Supabase Postgres, check the host (pooler vs direct) and re-check the password for stray bracket characters first.
