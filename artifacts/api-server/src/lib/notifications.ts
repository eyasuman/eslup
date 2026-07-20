import { supabaseAdmin } from "./supabaseAdmin";

/**
 * Mirrors the mobile app's client-side `createNotification` helper
 * (artifacts/mobile/lib/supabase.ts). There are no DB triggers for
 * notifications in this project — every code path that changes state
 * a user cares about must insert the notification row itself.
 */
export async function createNotification(n: { user_id: string; title: string; body: string; type: string }) {
  const { error } = await supabaseAdmin
    .from("notifications")
    .insert({ ...n, read: false, created_at: new Date().toISOString() });
  if (error) {
    // Notifications are best-effort — never fail the admin action because of them.
    console.error("createNotification failed", error);
  }
}
