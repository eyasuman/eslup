import * as Crypto from "expo-crypto";
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
  const { data, error } = await supabase
    .from("calls")
    .insert({
      ...params,
      status: "waiting",
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Unable to start the video call: ${error.message}`);
  }
  if (!data) {
    throw new Error("Unable to start the video call: Supabase did not return a call record.");
  }

  return data as Call;
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

export function generateRoomName(): string {
  return `pulse-${Crypto.randomUUID().replace(/-/g, "")}`;
}
