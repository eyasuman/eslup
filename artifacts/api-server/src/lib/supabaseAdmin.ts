import { createClient } from "@supabase/supabase-js";
import { WebSocket } from "ws";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("EXPO_PUBLIC_SUPABASE_URL is not set — required for the admin API to reach Supabase.");
}
if (!serviceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set — required for the admin API to perform privileged operations.");
}

// Service-role client. Bypasses RLS — never expose this key or this client to any browser-facing code.
// Node 20 lacks native WebSocket; supply `ws` so @supabase/realtime-js can initialise.
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: WebSocket as unknown as typeof globalThis.WebSocket },
});
