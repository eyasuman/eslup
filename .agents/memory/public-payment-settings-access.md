---
name: Platform payment source
description: Canonical database source for patient-visible platform payment accounts.
---

Patient booking payment methods must come from the dedicated singleton platform-payment table and its global Telebirr and CBE fields. Never derive payment accounts from the general settings table or authentication/profile phone values.

**Why:** General settings stored phone-like values that could be mistaken for merchant accounts. Dedicated payment migrations created the authoritative payment record with public read access and separate account numbers and account names.

**How to apply:** Read the singleton payment row directly, show each method only when its account number is non-empty, and keep account names and numbers sourced from that same row. Do not add fallback or fabricated payment details.