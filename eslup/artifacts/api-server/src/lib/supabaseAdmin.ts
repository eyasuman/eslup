import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { WebSocket } from "ws";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

if (!supabaseUrl) {
  throw new Error("EXPO_PUBLIC_SUPABASE_URL is not set — required for the admin API to reach Supabase.");
}

// Lazy singleton — we only throw when the client is first accessed so the
// server can start up even if SUPABASE_SERVICE_ROLE_KEY is not yet set.
// Routes that need the admin client will return a 500 error at request time
// instead of crashing the whole process on boot.
let _adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_adminClient) return _adminClient;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set — add it as a Replit Secret to enable privileged API routes.",
    );
  }
  _adminClient = createClient(supabaseUrl!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: WebSocket as unknown as typeof globalThis.WebSocket },
  });
  return _adminClient;
}

// Legacy named export kept for backward-compat — access via getter at call site.
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseAdmin() as any)[prop];
  },
});
