# PULSE Payment Methods Management

**Purpose:** Quick reference for where payment methods are currently managed in PULSE.

## 1. Patient checkout

Patients select a payment method on the booking payment screen:

- **App:** PULSE patient/provider app
- **Screen:** Booking flow
- **Code location:** `artifacts/mobile/app/booking.tsx`
- **Current methods:** Telebirr and CBE bank transfer

The booking screen first uses a provider's own payment details when available. If the provider has not supplied them, it uses the platform-level fallback accounts.

## 2. Platform-level payment accounts

The platform-level fallback payment accounts are read from the Supabase `settings` table using these keys:

| Setting key | Purpose |
|---|---|
| `global_telebirr_number` | Platform Telebirr merchant number |
| `global_telebirr_name` | Telebirr account/merchant name |
| `global_cbe_number` | Platform CBE account number |
| `global_cbe_name` | CBE account name |

These values are read by `artifacts/mobile/app/booking.tsx` through `getSetting(...)`.

If a value is missing, the booking screen currently falls back to the built-in fallback values in that file. Those fallback values should be replaced with real production account details before release.

## 3. Provider-specific payment accounts

Provider payment details are stored on the `doctors` table:

- `telebirrMerchant`
- `cbeAccount`

The patient booking flow gives these provider-specific values priority over the platform-level settings.

The shared provider data functions are in:

`artifacts/mobile/lib/supabase.ts`

## 4. Admin payment-proof review

This is where an administrator reviews payments submitted by patients.

- **Admin app path:** Dashboard → **Payments**
- **Admin route:** `/payments`
- **Screen title:** Payment Proofs
- **Code location:** `artifacts/pulse-admin-mobile/app/payments/index.tsx`

Administrators can:

- Filter payment proofs by Pending, Verified, Rejected, or All
- Open the uploaded payment proof
- Review the payment method, transaction ID, sender, and amount
- Verify or reject a payment

Payment status values are:

- `pending`
- `verified`
- `rejected`

The backend stores the status on the `appointments` table and exposes the admin API through:

- `PATCH /api/admin/network/appointments/:id/payment-status`
- `GET /api/admin/network/appointments/:id/payment-proof-url`

## 5. Admin Settings screen: current limitation

There is also a screen at:

- **Admin app path:** Dashboard → Settings → Payment Details
- **Admin route:** `/settings`
- **Code location:** `artifacts/pulse-admin-mobile/app/settings/index.tsx`

This screen displays fields named **Payment Account Number** and **Payment Method**. However, these fields currently send data to the general platform settings endpoint, while the backend only persists the platform fee, cancellation policy, and reminder cadence.

The current backend implementation does **not** persist the global Telebirr/CBE keys listed in Section 2. Therefore:

> The real patient-facing platform payment accounts are currently managed in the Supabase `settings` table, not through the Admin Settings → Payment Details fields.

## Summary

| Need | Real location |
|---|---|
| Patient chooses Telebirr or CBE | Patient app booking screen |
| Global Telebirr/CBE account numbers | Supabase `settings` table |
| Provider's own payment accounts | Supabase `doctors` table |
| Admin verifies uploaded payment proof | Admin app → Payments |
| Generic admin payment fields | Admin app → Settings → Payment Details, but not currently connected to global Telebirr/CBE settings |

## Recommended next improvement

Add dedicated Telebirr and CBE fields to the Admin Settings screen and update the admin settings API so administrators can safely manage:

- `global_telebirr_number`
- `global_telebirr_name`
- `global_cbe_number`
- `global_cbe_name`

After that change, the admin console would become the single reliable place to manage platform payment accounts.