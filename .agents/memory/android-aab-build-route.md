---
name: Android AAB build route
description: Current supported path for producing Android App Bundles for this Expo monorepo.
---

Expo Launch's live agent documentation currently marks Play Store support as planned rather than available, even when broader Replit documentation implies Android bundles are supported.

**Why:** Relying on the Replit publishing flow for an Android-only release can leave the project ready but unable to produce the requested `.aab`.

**How to apply:** Keep each app's `app.json` and `eas.json` inside its Expo package, use a separate Expo project and Android application ID for each app, and start the Android production build from Expo.dev after production environment variables are configured there.