import { randomBytes } from "node:crypto";
import { Router } from "express";
import { getSupabaseAdmin } from "../lib/supabaseAdmin";
import { generateToken04 } from "../lib/zegoToken";
import { requireParticipant } from "../middleware/requireParticipant";

const router = Router();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const eligibleStatuses = new Set(["scheduled", "accepted", "confirmed"]);
const eligibleServiceTypes = new Set(["video", "online", "video consultation"]);
const asString = (value: unknown) => typeof value === "string" ? value : "";

function appointmentParticipants(appointment: Record<string, unknown>) {
  return {
    patientId: asString(appointment.patientId ?? appointment.patient_id),
    doctorId: asString(appointment.doctorUserId ?? appointment.doctor_id),
  };
}

function appointmentIsEligible(appointment: Record<string, unknown>) {
  return appointment.paymentStatus === "verified" &&
    eligibleStatuses.has(asString(appointment.status)) &&
    eligibleServiceTypes.has(
      asString(appointment.serviceType ?? appointment.service_type).toLowerCase(),
    );
}

function config() {
  const rawAppId = process.env.ZEGO_APP_ID;
  const secret = process.env.ZEGO_SERVER_SECRET;
  const appId = rawAppId && /^\d+$/.test(rawAppId) ? Number(rawAppId) : NaN;
  if (!Number.isSafeInteger(appId) || appId <= 0 || !secret || Buffer.byteLength(secret, "utf8") !== 32) {
    throw new Error("Video service is not configured");
  }
  return { appId, secret };
}

router.post("/invitations", requireParticipant, async (req, res) => {
  const appointmentId = asString(req.body?.appointmentId);
  if (!UUID.test(appointmentId)) {
    return res.status(400).json({ error: "A valid appointment identifier is required" });
  }
  try {
    const db = getSupabaseAdmin();
    const { data: appointment, error: appointmentError } = await db.from("appointments").select("*").eq("id", appointmentId).maybeSingle();
    if (appointmentError || !appointment) return res.status(404).json({ error: "Appointment not found" });
    const { patientId, doctorId } = appointmentParticipants(appointment);
    const userId = res.locals.userId as string;
    if (userId !== patientId) return res.status(403).json({ error: "Only the appointment patient can notify the provider" });
    if (!doctorId || !appointmentIsEligible(appointment)) {
      return res.status(403).json({ error: "This appointment is not eligible for video consultation" });
    }
    const { data: existing, error: existingError } = await db
      .from("calls")
      .select("*")
      .eq("appointment_id", appointmentId)
      .in("status", ["waiting", "accepted"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) return res.json(existing);

    const insert = {
      appointment_id: appointmentId,
      doctor_id: doctorId,
      patient_id: patientId,
      patient_name: asString(appointment.patientName) || "Patient",
      room_name: `pulse-${randomBytes(16).toString("hex")}`,
      status: "waiting",
    };
    const { data: invitation, error: insertError } = await db
      .from("calls")
      .insert(insert)
      .select("*")
      .single();
    if (insertError) throw insertError;
    return res.json(invitation);
  } catch (cause) {
    req.log.error({ err: cause }, "Unable to create video invitation");
    return res.status(500).json({ error: "Unable to notify the provider" });
  }
});

router.post("/sessions", requireParticipant, async (req, res) => {
  const appointmentId = asString(req.body?.appointmentId);
  const callId = asString(req.body?.callId);
  if (!UUID.test(appointmentId) || !UUID.test(callId)) {
    return res.status(400).json({ error: "A valid appointment and accepted call identifier are required" });
  }
  try {
    const db = getSupabaseAdmin();
    const { data: appointment, error: appointmentError } = await db.from("appointments").select("*").eq("id", appointmentId).maybeSingle();
    if (appointmentError || !appointment) return res.status(404).json({ error: "Appointment not found" });
    const { patientId, doctorId } = appointmentParticipants(appointment);
    const userId = res.locals.userId as string;
    if (userId !== patientId && userId !== doctorId) return res.status(403).json({ error: "Not authorized for this appointment" });
    if (!appointmentIsEligible(appointment)) {
      return res.status(403).json({ error: "This appointment is not eligible for video consultation" });
    }
    const { data: call, error: callError } = await db.from("calls").select("*").eq("id", callId).maybeSingle();
    if (callError || !call || call.appointment_id !== appointmentId ||
      asString(call.patient_id) !== patientId || asString(call.doctor_id) !== doctorId ||
      call.status !== "accepted") {
      return res.status(403).json({ error: "An accepted invitation is required for this appointment" });
    }
    const now = new Date().toISOString();
    const minimumValidUntil = new Date(Date.now() + 60 * 1000).toISOString();
    const { data: existing, error: existingError } = await db.from("video_sessions").select("*")
      .eq("appointment_id", appointmentId).eq("status", "active").gt("expires_at", minimumValidUntil).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (existingError) throw existingError;
    let session = existing;
    if (!session) {
      await db.from("video_sessions").update({ status: "ended", ended_at: now })
        .eq("appointment_id", appointmentId).eq("status", "active").lte("expires_at", minimumValidUntil);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const insert = { appointment_id: appointmentId, call_id: callId, room_id: `pulse-${randomBytes(16).toString("hex")}`, patient_id: patientId, doctor_id: doctorId, status: "active", expires_at: expiresAt };
      const { data, error } = await db.from("video_sessions").insert(insert).select("*").single();
      if (error) throw error;
      session = data;
    } else if (!session.call_id) {
      const { data, error } = await db
        .from("video_sessions")
        .update({ call_id: callId })
        .eq("id", session.id)
        .is("call_id", null)
        .select("*")
        .single();
      if (error) throw error;
      session = data;
    }
    const { appId, secret } = config();
    const tokenLifetimeSeconds = Math.max(
      1,
      Math.min(600, Math.floor((Date.parse(session.expires_at) - Date.now()) / 1000)),
    );
    const { token, expiresAt } = generateToken04(
      appId,
      userId,
      secret,
      tokenLifetimeSeconds,
      JSON.stringify({
        room_id: session.room_id,
        privilege: { 1: 1, 2: 1 },
        stream_id_list: null,
      }),
    );
    return res.json({ sessionId: session.id, appId, roomId: session.room_id, userId, userName: userId === doctorId ? "Provider" : "Patient", token, expiresAt: expiresAt.toISOString() });
  } catch (cause) {
    req.log.error({ err: cause }, "Unable to create video session");
    return res.status(500).json({ error: "Unable to create video session" });
  }
});

router.post("/sessions/:sessionId/end", requireParticipant, async (req, res) => {
  const sessionId = asString(req.params.sessionId);
  if (!UUID.test(sessionId)) return res.status(400).json({ error: "Invalid session identifier" });
  try {
    const db = getSupabaseAdmin();
    const { data: session, error } = await db.from("video_sessions").select("*").eq("id", sessionId).maybeSingle();
    if (error || !session) return res.status(404).json({ error: "Video session not found" });
    if (res.locals.userId !== session.patient_id && res.locals.userId !== session.doctor_id) return res.status(403).json({ error: "Not authorized for this video session" });
    if (session.status !== "ended") {
      await db.from("video_sessions").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", sessionId);
      if (session.call_id) await db.from("calls").update({ status: "ended" }).eq("id", session.call_id).eq("status", "accepted");
    }
    return res.json({ ended: true });
  } catch (cause) {
    req.log.error({ err: cause }, "Unable to end video session");
    return res.status(500).json({ error: "Unable to end video session" });
  }
});

export default router;