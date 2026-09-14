---
name: Expo inline-component anti-pattern
description: Defining a React component inside another component's render function in Expo/React Native crashes with "Invalid hook call".
---

Never define a function component inside another component's render body (e.g. a helper `function Row() {...}` declared inside `ScreenComponent()`'s function body, re-created every render).

**Why:** React Native's hook dispatcher gets confused when a "new" component type is created on every render — this reliably produces "Invalid hook call. Hooks can only be called inside the body of a function component" even though the code looks syntactically fine. This has bitten past Expo builds carried over from an imported project.

**How to apply:** When importing or reviewing Expo/RN screen code, check for nested component definitions inside render functions and hoist them to module scope before they cause a runtime crash.
