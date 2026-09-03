---
name: GitHub push credential recovery
description: Recover normal Git pushes when the repository remote has stale HTTPS credentials despite an active Replit GitHub connection.
---

When `git push` rejects the stored HTTPS credential but Replit's GitHub integration is active, use the Replit-provided GitHub CLI authentication helper to configure Git credentials, then retry the normal push.

**Why:** Connector API reads can still work while the Git remote uses an expired or unrelated credential; attempting to reconstruct hundreds of Git objects through the connector API is slower and can fail on large blobs.

**How to apply:** Confirm `gh auth status` identifies the intended GitHub account, run `gh auth setup-git`, then push normally. Never print or copy the credential itself.