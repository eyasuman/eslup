---
name: Restoring an uploaded zip snapshot of this monorepo template
description: How to safely bring an uploaded zip of a prior snapshot of this same pnpm-monorepo/artifact template back into a fresh workspace.
---

When a user uploads a `.zip` that is a full prior snapshot of this same Replit pnpm-monorepo/artifact template (not a foreign codebase), the fastest safe path is:

1. Extract and read the zip's `artifact.toml` / `.replit` to identify what kind of artifact it was (expo/web/etc.) and any hardcoded config (env values, EAS project IDs, etc.).
2. Create a **fresh** artifact of the same kind in the current workspace via the artifacts tooling rather than copying the zip's own `.replit-artifact` config wholesale — the fresh scaffold's shared/base files (ErrorBoundary, ErrorFallback, KeyboardAwareScrollViewCompat, metro/babel config, build/serve scripts) are often newer than the snapshot's and should be diffed, not blindly overwritten.
3. Copy over the product-specific source directories (app/components/context/lib/etc.) wholesale, but re-apply the fresh scaffold's versions of shared infra files after copying, and merge `package.json`/`app.json` by hand rather than replacing them outright (drop stale EAS `extra.eas.projectId`/`updates.url` blocks — they point to a project this workspace doesn't own).
4. Any hardcoded public/client-safe config in the zip's `.replit` `[userenv.shared]` block (e.g. a Supabase anon/publishable key + URL) can be reused directly as env vars — verify the backend is still live with a plain curl before trusting it, rather than asking the user to re-provide it.

**Why:** This pattern applies whenever a user re-uploads a project they built in a previous Replit session — it's a restore/merge operation, not a from-scratch build.

**How to apply:** Reach for this whenever an uploaded zip contains its own `artifacts/<name>/.replit-artifact/artifact.toml` matching the current template's shape.
