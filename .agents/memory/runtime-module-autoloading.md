---
name: Runtime module autoloading
description: An environment-specific quirk where invoking an unavailable runtime can mutate the Replit module list.
---

When a command invokes a runtime that is not currently declared in `.replit`, the environment may add that runtime's module automatically.

**Why:** A validation probe for an unavailable interpreter changed the module list even though the project configuration was not meant to change.

**How to apply:** Prefer already available shell and Node.js checks. If `.replit` changes unexpectedly, restore it through the schema-validated Replit configuration replacement flow rather than editing it directly.