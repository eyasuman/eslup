---
name: EAS in a mobile monorepo
description: Why native Expo builds must use the actual mobile package as their project root.
---

Keep EAS and Expo app configuration in the Expo package, not at the monorepo root.

**Why:** A root-level minimal Expo manifest can make EAS identify the repository itself as an app, producing the wrong version and application identifier before failing because the root package cannot resolve Expo.

**How to apply:** For native build investigation or configuration, first confirm that the reported app name, version, and identifier match the mobile package. Treat a mismatch as a wrong-project-root problem before debugging native source code.