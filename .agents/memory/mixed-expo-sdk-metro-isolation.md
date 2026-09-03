---
name: Mixed Expo SDK Metro isolation
description: Prevent one Expo app from bundling another app's React Native runtime in a shared pnpm workspace.
---

When Expo apps on different SDK generations share workspace packages, each app's Metro resolver must anchor React, React Native, React DOM, and React Query to that app's own `node_modules`.

**Why:** pnpm virtual paths can bypass ordinary Metro aliases. A patient app on Expo SDK 54 passed type checks but Android export pulled React Native 0.86 from an SDK 57 admin app and failed during codegen.

**How to apply:** Use Metro's `resolveRequest` hook for native singleton package names and subpaths. Do not add the entire workspace as an explicit watch folder; that can exhaust Linux file watchers by scanning both native dependency trees.