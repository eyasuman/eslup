---
name: Post-merge setup safety
description: Scope and safety rules for the automatic setup script after task merges.
---

Keep automatic post-merge setup limited to deterministic dependency installation and local build checks. Do not run remote database schema mutation or introspection as part of every merge.

**Why:** The setup script has a short user-facing timeout, and a remote schema operation can hang or wait on unavailable credentials. More importantly, applying database changes implicitly makes unrelated code merges destructive.

**How to apply:** Put migrations and schema pushes in an explicit, environment-aware workflow. The post-merge script should be idempotent, non-interactive, and fast.