import { useEffect, useRef, useState } from "react";
import { Call, subscribeToIncomingCalls, updateCallStatus } from "@/services/callService";
import { supabase } from "@/lib/supabase";

export function useRealtimeCalls(doctorUserId: string | undefined) {
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const channelRef = useRef<ReturnType<typeof subscribeToIncomingCalls> | null>(null);

  useEffect(() => {
    if (!doctorUserId) return;
    let active = true;

    void supabase
      .from("calls")
      .select("*")
      .eq("doctor_id", doctorUserId)
      .eq("status", "waiting")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (active && !error && data) setIncomingCall(data as Call);
      });

    channelRef.current = subscribeToIncomingCalls(doctorUserId, (call) => {
      if (call.status === "waiting") {
        setIncomingCall(call);
      }
    });

    return () => {
      active = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [doctorUserId]);

  const acceptCall = async (call: Call) => {
    await updateCallStatus(call.id, "accepted");
    setIncomingCall(null);
    return call.room_name;
  };

  const rejectCall = async (call: Call) => {
    await updateCallStatus(call.id, "rejected");
    setIncomingCall(null);
  };

  const dismissCall = () => {
    setIncomingCall(null);
  };

  return { incomingCall, acceptCall, rejectCall, dismissCall };
}
