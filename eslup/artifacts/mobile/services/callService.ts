import { createVideoInvitation } from "@workspace/api-client-react";
import { supabase } from "@/lib/supabase";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface Call {
  id: string;
  doctor_id: string;
  patient_id: string;
  patient_name: string;
  room_name: string;
  appointment_id: string;
  status: "waiting" | "accepted" | "rejected" | "ended";
  created_at: string;
}

export async function createCall(appointmentId: string): Promise<Call> {
  if (!UUID.test(appointmentId)) {
    throw new Error("A valid appointment is required to start a video call.");
  }
  return createVideoInvitation({ appointmentId }) as Promise<Call>;
}

export async function updateCallStatus(callId: string, status: Call["status"]) {
  const { error } = await supabase
    .from("calls")
    .update({ status })
    .eq("id", callId);

  if (error) {
    throw new Error(`Unable to update the video call: ${error.message}`);
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

