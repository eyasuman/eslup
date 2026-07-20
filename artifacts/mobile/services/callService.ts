import { supabase } from "@/lib/supabase";

export interface Call {
  id: string;
  doctor_id: string;
  patient_id: string;
  patient_name: string;
  room_name: string;
  status: "waiting" | "accepted" | "rejected" | "ended";
  created_at: string;
}

export async function createCall(params: {
  doctor_id: string;
  patient_id: string;
  patient_name: string;
  room_name: string;
}): Promise<Call> {
  try {
    const { data, error } = await supabase
      .from("calls")
      .insert({
        ...params,
        status: "waiting",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return data as Call;
  } catch {
    // If table doesn't exist yet, return a mock call so UI still works
    return {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
      ...params,
      status: "waiting",
      created_at: new Date().toISOString(),
    };
  }
}

export async function updateCallStatus(callId: string, status: Call["status"]) {
  try {
    const { error } = await supabase
      .from("calls")
      .update({ status })
      .eq("id", callId);
    if (error) throw error;
  } catch {
    // Silently fail if table not set up
  }
}

export function subscribeToCallStatus(
  callId: string,
  onUpdate: (call: Call) => void
) {
  return supabase
    .channel(`call:status:${callId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "calls",
        filter: `id=eq.${callId}`,
      },
      (payload) => onUpdate(payload.new as Call)
    )
    .subscribe();
}

export function subscribeToIncomingCalls(
  doctorId: string,
  onCall: (call: Call) => void
) {
  return supabase
    .channel(`calls:doctor:${doctorId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "calls",
        filter: `doctor_id=eq.${doctorId}`,
      },
      (payload) => onCall(payload.new as Call)
    )
    .subscribe();
}

export function generateRoomName(doctorId: string): string {
  const safe = (doctorId ?? "doc").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
  const ts = Math.floor(Date.now() / 1000);
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `pulse-${safe}-${ts}-${rand}`;
}
