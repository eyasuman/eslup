---
name: CodeExecution sandbox has no process.env
description: The durable CodeExecution JS sandbox cannot read process.env, so operations needing env vars/secrets (e.g. Supabase admin calls) must go through ShellExec instead.
---

The CodeExecution ("use impure" or durable) JS runtime does not expose `process.env`. Any workflow that needs a secret or env var at execution time — e.g. calling Supabase's admin/service-role REST API, running authenticated curl requests — must be done via the ShellExec/bash tool, not CodeExecution.

**Why:** Discovered while wiring a Supabase-backed Expo app — attempts to read `SUPABASE_SERVICE_ROLE_KEY` inside CodeExecution silently fail/are unavailable, while `ShellExec` sees real environment variables (including Replit secrets injected into the shell).

**How to apply:** For Supabase (or similar) admin/storage operations gated behind a secret, use `curl` via ShellExec with `apikey`/`Authorization` headers, not a CodeExecution fetch.
