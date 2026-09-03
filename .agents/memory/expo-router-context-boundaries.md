---
name: Expo Router context boundaries
description: Why routed screens need shared context providers above the stable root navigation tree.
---

Place context providers consumed by routed screens above the stable Expo Router navigation tree. Do not mount the provider only inside conditional authenticated or unauthenticated branches.

**Why:** Expo Router can resolve and render route modules through its root navigation tree before a conditional branch appears to wrap them. A provider inside an auth branch can therefore still produce runtime “must be used within Provider” errors on startup.

**How to apply:** Keep the provider mounted under any provider it depends on, but above the auth gate and Stack/Tabs tree. Gate network activity with an `enabled` flag rather than conditionally mounting the provider.