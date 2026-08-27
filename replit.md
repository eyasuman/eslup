# Pulse — Telemedicine Platform

A full-stack telemedicine app with an Expo mobile client, Express API server, and React admin panel, all backed by Supabase.

## Architecture

| Artifact | Path | Description |
|---|---|---|
| Mobile app (Expo) | `artifacts/mobile` | Patient & provider React Native app |
| API Server (Express) | `artifacts/api-server` | Service-role Supabase admin API |
| Admin panel (React/Vite) | `artifacts/pulse-admin` | Internal management dashboard |
| Mockup sandbox | `artifacts/mockup-sandbox` | Component preview dev server |

Shared libraries live under `lib/`:
- `lib/db` — Drizzle ORM schema and client
- `lib/api-spec` — OpenAPI spec + Orval codegen
- `lib/api-client-react` — Generated React Query hooks
- `lib/api-zod` — Zod validation schemas

## Running the project

All services start automatically via Replit workflows. To restart manually:

```bash
# Install all dependencies (run once after cloning)
pnpm install

# Individual services
pnpm --filter @workspace/mobile run dev         # Expo (port 18115)
pnpm --filter @workspace/api-server run dev      # API server (port 8080)
pnpm --filter @workspace/pulse-admin run dev     # Admin panel (port 20742)
```

## Environment variables

| Variable | Where used | Notes |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Mobile + API server | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Mobile | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | API server | Secret — bypasses RLS |
| `ZEGO_APP_ID` | API server | ZEGOCLOUD numeric application ID |
| `ZEGO_SERVER_SECRET` | API server | 32-byte ZEGOCLOUD server secret |
| `SESSION_SECRET` | API server | Express session signing |

All secrets are stored in Replit Secrets (not in `.env` files).

## Video consultations

Video calls use ZEGOCLOUD UIKit loaded in an Expo Go-compatible WebView/iframe.
The API authenticates each participant with Supabase, verifies that their video
appointment is paid and eligible, then creates a server-owned room and a
ten-minute Token04. The ZEGOCLOUD secret remains server-only and is never
included in a URL or mobile bundle. Call invitations are appointment-bound
Supabase Realtime signalling; the API controls final room access and session
ending. Apply `scripts/supabase-migration.sql` before enabling consultations.
The app requests camera and microphone permission before joining. This design
does not make an end-to-end encryption or medical-grade privacy claim.

## User roles

The app currently supports two account types:
- **Client** — patients booking appointments
- **Provider** — doctors/specialists offering services

A third role, **Institute**, is planned (see follow-up tasks).

## Key files

- `artifacts/mobile/lib/supabase.ts` — Supabase client + all data-access helpers
- `artifacts/mobile/context/AppContext.tsx` — Auth & session state
- `artifacts/api-server/src/lib/supabaseAdmin.ts` — Service-role Supabase client
- `artifacts/mobile/app/_layout.tsx` — Root navigation layout

## User preferences

- Keep the project's existing structure and stack — do not restructure or migrate
- All app data must come from Supabase (no hardcoded mock data in production screens)
