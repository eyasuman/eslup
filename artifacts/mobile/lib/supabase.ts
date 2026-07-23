import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { Hospital } from "@/data/ethiopianHospitals";

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "placeholder_anon_key";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web",
    storage: {
      getItem: (key: string) => AsyncStorage.getItem(key),
      setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
      removeItem: (key: string) => AsyncStorage.removeItem(key),
    },
  },
});

/**
 * Fetch a system setting by its key
 */
export async function getSetting(key: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("settings")
    .select("*");
  
  if (error) return null;
  
  const setting = data?.find((s: any) => {
    const k = (s.key || s.name || s.setting_key || s.id || s.identifier || s.key_name || "").toLowerCase();
    return k === key.toLowerCase();
  });

  const val = setting?.value || setting?.val || setting?.setting_value || setting?.content || setting?.data || setting?.v || setting?.json_data;
  return val ? String(val) : null;
}

// ─── AUTH ──────────────────────────────────────────────────────────────────────

export async function signUp(email: string, password: string, name: string, role: string, phone?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, role, ...(phone ? { phone } : {}) } },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/**
 * Convert an Ethiopian phone number to a deterministic synthetic email for
 * Supabase auth. Accounts created this way are phone-primary — the email is
 * only an internal auth identifier and is never shown to the user.
 */
export function phoneToEmail(phone: string): string {
  const clean = phone.replace(/\s/g, "").replace(/^\+251/, "0");
  return `${clean}@pulse.app`;
}

export async function signUpWithPhone(phone: string, password: string, name: string, role: string) {
  return signUp(phoneToEmail(phone), password, name, role, phone);
}

export async function signInWithPhone(phone: string, password: string) {
  return signIn(phoneToEmail(phone), password);
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

// ─── DOCTORS (PROVIDERS) ─────────────────────────────────────────────────────
// The `doctors` table uses "userId" (camelCase) as the foreign key to auth.users

export interface SupabaseDoctor {
  id?: string;
  userId: string;
  name: string;
  email?: string;
  providerType?: string;
  specialty?: string;
  city?: string;
  experienceYears?: number;
  bio?: string;
  phone?: string;
  consultationFee?: number;
  serviceModes?: {
    video?: boolean;
    audio?: boolean;
    inPerson?: boolean;
    homeVisit?: boolean;
  };
  availability?: any[];
  status?: string;
  telebirrMerchant?: string;
  cbeAccount?: string;
  lat?: number;
  lng?: number;
}

export async function getDoctorByUserId(userId: string) {
  const { data, error } = await supabase
    .from("doctors")
    .select("*")
    .eq("userId", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function getApprovedDoctors() {
  const { data, error } = await supabase
    .from("doctors")
    .select("*")
    .eq("status", "Active")
    .order("updatedAt", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getAllDoctorsForAdmin() {
  const { data, error } = await supabase
    .from("doctors")
    .select("*")
    .order("updatedAt", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Fully tear down a realtime channel subscription.
 * Always use this (instead of `channel.unsubscribe()`) in effect cleanups —
 * `unsubscribe()` alone leaves the channel registered on the client, so the
 * next `.channel(sameTopic)` call reuses the stale (already-subscribed)
 * object and throws "cannot add postgres_changes callbacks ... after subscribe()".
 */
export function unsubscribeChannel(channel: any) {
  if (channel) supabase.removeChannel(channel);
}

/**
 * `supabase.removeChannel()` is async — it awaits a server round-trip before
 * the channel is actually torn down and removed from the client's internal
 * registry. React effect cleanups can't await that. If a screen remounts
 * quickly (fast tab switching, back-and-forth navigation, dev Fast Refresh)
 * the next `subscribeTo*()` call can run before the previous channel finished
 * tearing down. Since `supabase.channel(topic)` reuses any existing channel
 * with the same topic string, that reuse hands back an already-subscribed
 * channel, and calling `.on()` on it throws "cannot add postgres_changes
 * callbacks ... after subscribe()" — which crashes the screen into the
 * generic "try again" error state.
 *
 * Suffixing every topic with a unique id guarantees each subscription call
 * always gets a brand-new channel object, so this class of race can't happen
 * regardless of how fast a screen remounts or how slow teardown is.
 */
let channelSeq = 0;
function uniqueTopic(base: string) {
  channelSeq += 1;
  return `${base}:${Date.now()}:${channelSeq}`;
}

export function subscribeToProviders(callback: (payload: any) => void) {
  return supabase
    .channel(uniqueTopic("providers:all"))
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "doctors" },
      callback
    )
    .subscribe();
}

export function subscribeToProviderStatusChanges(
  userId: string,
  onStatusChange: (newStatus: string, fullRecord: any) => void
) {
  return supabase
    .channel(uniqueTopic(`provider:status:${userId}`))
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "doctors",
        filter: `userId=eq.${userId}`,
      },
      (payload) => {
        const record = payload.new as any;
        if (record?.status) {
          onStatusChange(record.status, record);
        }
      }
    )
    .subscribe();
}

export async function upsertDoctor(doctor: {
  userId: string;
  name: string;
  email: string;
  providerType: string;
  specialty: string;
  city?: string;
  experienceYears?: number;
  bio?: string;
  phone?: string;
  licenseNo?: string;
  consultationFee?: number;
  serviceModes?: Record<string, boolean>;
  availability?: any[];
  status?: string;
  licenseFile?: Record<string, any> | null;
  telebirrMerchant?: string;
  cbeAccount?: string;
}) {
  const payload: any = {
    ...doctor,
    status: doctor.status ?? "Pending",
    serviceModes: doctor.serviceModes ?? { video: true, audio: false, inPerson: true, homeVisit: false },
    availability: doctor.availability ?? [],
    updatedAt: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("doctors")
    .upsert(payload, { onConflict: "userId" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProviderPaymentInfo(userId: string, info: { telebirrMerchant?: string; cbeAccount?: string }) {
  const { error } = await supabase
    .from("doctors")
    .update({ ...info, updatedAt: new Date().toISOString() })
    .eq("userId", userId);
  if (error) throw error;
}

export async function updateDoctorOnlineStatus(userId: string, isOnline: boolean) {
  const { error } = await supabase
    .from("doctors")
    .update({
      availability: isOnline ? [{ active: true, mode: "online" }] : [],
      updatedAt: new Date().toISOString(),
    })
    .eq("userId", userId);
  if (error) throw error;
}

export async function updateDoctorConsultationFee(userId: string, fee: number) {
  const { error } = await supabase
    .from("doctors")
    .update({ consultationFee: fee, updatedAt: new Date().toISOString() })
    .eq("userId", userId);
  if (error) throw error;
}

// Updates the hospital/institute part of the bio while preserving the languages part.
// Bio is stored as "HospitalName · languages" — this replaces only the hospital segment.
export async function updateDoctorHospital(userId: string, hospitalName: string) {
  const { data } = await supabase
    .from("doctors")
    .select("bio")
    .eq("userId", userId)
    .single();
  const currentBio = (data?.bio ?? "") as string;
  const languagesPart = currentBio.includes("·")
    ? currentBio.split("·").slice(1).join("·").trim()
    : "";
  const newBio = languagesPart ? `${hospitalName} · ${languagesPart}` : hospitalName;
  const { error } = await supabase
    .from("doctors")
    .update({ bio: newBio, updatedAt: new Date().toISOString() })
    .eq("userId", userId);
  if (error) throw error;
  return newBio;
}

export async function updateDoctorServiceModes(userId: string, serviceModes: Record<string, boolean>) {
  const { error } = await supabase
    .from("doctors")
    .update({ serviceModes, updatedAt: new Date().toISOString() })
    .eq("userId", userId);
  if (error) throw error;
}

export async function updateDoctorAvailabilitySchedule(userId: string, availability: any[]) {
  const { error } = await supabase
    .from("doctors")
    .update({ availability, updatedAt: new Date().toISOString() })
    .eq("userId", userId);
  if (error) throw error;
}

// Legacy alias used by dashboard.tsx
export async function updateProviderAvailability(
  userId: string,
  available: boolean,
  _onlineStatus: boolean
) {
  return updateDoctorOnlineStatus(userId, available);
}

// ─── PROFILE IMAGE UPLOAD ──────────────────────────────────────────────────────

export async function uploadProfileImage(userId: string, imageUri: string): Promise<string> {
  const ext = imageUri.split(".").pop()?.split("?")[0] ?? "jpg";
  const fileName = `${userId}/avatar_${Date.now()}.${ext}`;
  const response = await fetch(imageUri);
  const blob = await response.blob();
  const { error } = await supabase.storage
    .from("profile-images")
    .upload(fileName, blob, { contentType: `image/${ext}`, upsert: true });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from("profile-images").getPublicUrl(fileName);
  await supabase
    .from("doctors")
    .update({ updatedAt: new Date().toISOString() })
    .eq("userId", userId);
  return urlData.publicUrl;
}

// ─── PAYMENT PROOF UPLOAD ──────────────────────────────────────────────────────

export async function uploadPaymentProof(userId: string, imageUri: string): Promise<string> {
  const ext = imageUri.split(".").pop()?.split("?")[0] ?? "jpg";
  const fileName = `payment_proofs/${userId}_${Date.now()}.${ext}`;
  const response = await fetch(imageUri);
  const blob = await response.blob();
  
  const { data, error } = await supabase.storage
    .from("payment-proofs")
    .upload(fileName, blob, { contentType: `image/${ext}`, upsert: true });
    
  if (error) throw error;
  
  const { data: urlData } = supabase.storage.from("payment-proofs").getPublicUrl(data.path);
  return urlData.publicUrl;
}

// ─── MEDICAL LICENSE UPLOAD ────────────────────────────────────────────────────

export async function uploadMedicalLicense(
  userId: string,
  file: { name: string; type: string; uri: string }
): Promise<string> {
  const fileName = `${userId}/license_${Date.now()}_${file.name}`;
  const blob = await fetch(file.uri).then((r) => r.blob());
  const { data, error } = await supabase.storage
    .from("medical-licenses")
    .upload(fileName, blob, { contentType: file.type, upsert: true });
  if (error) throw error;
  await supabase
    .from("doctors")
    .update({
      licenseFile: { path: data.path, name: file.name, type: file.type },
      updatedAt: new Date().toISOString(),
    })
    .eq("userId", userId);
  return data.path;
}

// ─── APPOINTMENTS ─────────────────────────────────────────────────────────────
// The `appointments` table uses camelCase column names:
// patientId, doctorId, doctorUserId, doctorName, serviceType, consultationFee, etc.

export async function createAppointment(appt: {
  patientId: string;
  patientName?: string;
  patientEmail?: string;
  doctorId?: string;
  doctorUserId?: string;
  doctorName?: string;
  specialty?: string;
  date: string;
  serviceType?: string;
  consultationFee?: number;
  platformFee?: number;
  totalPrice?: number;
  notes?: string;
  telebirrMerchant?: string;
  cbeAccount?: string;
  paymentProofUrl?: string;
  paymentMethod?: string;
  transactionId?: string;
  senderName?: string;
}) {
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      ...appt,
      status: "pending",
      paymentStatus: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getAppointmentsForClient(patientId: string) {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("patientId", patientId)
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getAppointmentsForProvider(doctorUserId: string) {
  // Only return appointments whose payment has been verified by admin.
  // Appointments with paymentStatus "pending" (awaiting admin review) or
  // "rejected" are not visible to providers — they appear only in the
  // admin Payment Review panel until approved.
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("doctorUserId", doctorUserId)
    .eq("paymentStatus", "verified")
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateAppointmentStatus(appointmentId: string, status: string) {
  const { error } = await supabase
    .from("appointments")
    .update({ status, updatedAt: new Date().toISOString() })
    .eq("id", appointmentId);
  if (error) throw error;
}

// Legacy alias
export async function updateBookingStatus(appointmentId: string, status: string) {
  return updateAppointmentStatus(appointmentId, status);
}

// ─── PROVIDER STATS ────────────────────────────────────────────────────────────

export async function getProviderStats(userId: string) {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [allRes, monthRes] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, totalPrice, consultationFee")
      .eq("doctorUserId", userId)
      .eq("status", "completed"),
    supabase
      .from("appointments")
      .select("id, totalPrice, consultationFee")
      .eq("doctorUserId", userId)
      .gte("createdAt", firstOfMonth),
  ]);

  const all = allRes.data ?? [];
  const month = monthRes.data ?? [];

  return {
    totalClients: all.length,
    thisMonth: month.length,
    avgRating: "4.8",
    totalEarnings: all.reduce((s: number, b: any) => s + (b.totalPrice ?? b.consultationFee ?? 0), 0),
    monthEarnings: month.reduce((s: number, b: any) => s + (b.totalPrice ?? b.consultationFee ?? 0), 0),
  };
}

// ─── RADIOLOGY (using medicalRecords table) ───────────────────────────────────

export async function submitRadiologyCase(caseData: {
  submitted_by: string;
  patient_name: string;
  patient_age: number;
  patient_gender: string;
  scan_type: string;
  body_part: string;
  urgency: string;
  symptoms?: string;
  assigned_radiologist_name?: string;
  scan_image_uri?: string | null;
  /** MP4 or other video file URI to upload alongside or instead of the image */
  scan_video_uri?: string | null;
  /** Original filename of the video (used for extension detection) */
  scan_video_name?: string | null;
}) {
  let fileUrl: string | null = null;

  // Upload image scan (if provided)
  if (caseData.scan_image_uri) {
    try {
      const ext = caseData.scan_image_uri.split(".").pop()?.split("?")[0] ?? "jpg";
      const fileName = `${caseData.submitted_by}/${Date.now()}_scan.${ext}`;
      const blob = await fetch(caseData.scan_image_uri).then((r) => r.blob());
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("radiology-scans")
        .upload(fileName, blob, { contentType: `image/${ext}`, upsert: true });
      if (!uploadError) fileUrl = uploadData.path;
    } catch {}
  }

  // Upload video scan (MP4 / video/*) — overwrites fileUrl so the video is the primary attachment
  if (caseData.scan_video_uri) {
    try {
      const ext = (caseData.scan_video_name ?? caseData.scan_video_uri).split(".").pop()?.split("?")[0] ?? "mp4";
      const contentType = ext === "mp4" ? "video/mp4" : `video/${ext}`;
      const fileName = `${caseData.submitted_by}/${Date.now()}_scan.${ext}`;
      const blob = await fetch(caseData.scan_video_uri).then((r) => r.blob());
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("radiology-scans")
        .upload(fileName, blob, { contentType, upsert: true });
      if (!uploadError) fileUrl = uploadData.path;
    } catch {}
  }

  const { data, error } = await supabase
    .from("medicalRecords")
    .insert({
      patientId: caseData.submitted_by,
      providerUserId: caseData.submitted_by,
      type: "image",
      title: `${caseData.scan_type} — ${caseData.body_part}`,
      fileUrl,
      patientName: caseData.patient_name,
      consultationType: caseData.scan_type,
      notes: [
        `Patient: ${caseData.patient_name}`,
        `Age: ${caseData.patient_age}`,
        `Gender: ${caseData.patient_gender}`,
        `Urgency: ${caseData.urgency}`,
        caseData.symptoms ? `Symptoms: ${caseData.symptoms}` : null,
        caseData.assigned_radiologist_name ? `Radiologist: ${caseData.assigned_radiologist_name}` : null,
      ].filter(Boolean).join(" | "),
      summary: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getRadiologyCases(userId: string) {
  const { data, error } = await supabase
    .from("medicalRecords")
    .select("*")
    .eq("patientId", userId)
    .eq("type", "image")
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Shape the radiology queue list + detail UI expects */
export interface RadioCase {
  id: string;
  patient: string;
  age: number;
  scan: string;
  urgency: string;
  status: string;
  submitted: string;
  findings: string;
  impression: string;
  recommendations: string;
  fileUrl?: string | null;
}

function parseNote(notes: string | null | undefined, key: string): string {
  if (!notes) return "";
  const match = notes.match(new RegExp(`${key}:\\s*([^|]+)`));
  return match ? match[1].trim() : "";
}

function dbRowToRadioCase(row: Record<string, any>): RadioCase {
  const notes: string = row.notes ?? "";
  const summary: string = row.summary ?? "pending";
  // Derive status from summary text
  let status = "pending";
  if (summary !== "pending" && summary.toLowerCase().includes("findings:")) status = "completed";
  else if (summary !== "pending") status = "in_review";

  // Parse urgency from notes e.g. "Urgency: emergency"
  const urgency = parseNote(notes, "Urgency") || "routine";
  const age = parseInt(parseNote(notes, "Age")) || 0;

  // Parse report fields if completed
  const findings = summary.match(/Findings:\s*(.*?)(?:\n|$)/)?.[1] ?? "";
  const impression = summary.match(/Impression:\s*(.*?)(?:\n|$)/)?.[1] ?? "";
  const recommendations = summary.match(/Recommendations:\s*(.*?)(?:\n|$)/)?.[1] ?? "";

  // Human-readable submitted time
  const created = row.createdAt ? new Date(row.createdAt) : null;
  const diffMs = created ? Date.now() - created.getTime() : 0;
  const diffMin = Math.floor(diffMs / 60000);
  const submitted =
    diffMin < 60 ? `${diffMin} min ago`
    : diffMin < 1440 ? `${Math.floor(diffMin / 60)} hours ago`
    : "Yesterday";

  return {
    id: row.id ?? "",
    patient: row.patientName ?? "Unknown",
    age,
    scan: row.consultationType ?? row.title ?? "Scan",
    urgency,
    status,
    submitted,
    findings,
    impression,
    recommendations,
    fileUrl: row.fileUrl ?? null,
  };
}

export async function getRadiologyQueue(_radiologistId: string): Promise<RadioCase[]> {
  const { data, error } = await supabase
    .from("medicalRecords")
    .select("*")
    .eq("type", "image")
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(dbRowToRadioCase);
}

export async function submitRadiologyReport(report: {
  case_id: string;
  radiologist_id: string;
  radiologist_name: string;
  findings: string;
  impression: string;
  recommendations?: string;
}) {
  const summary = [
    `Findings: ${report.findings}`,
    `Impression: ${report.impression}`,
    report.recommendations ? `Recommendations: ${report.recommendations}` : null,
  ].filter(Boolean).join("\n");

  const { error } = await supabase
    .from("medicalRecords")
    .update({
      summary,
      secureNote: `Reported by: ${report.radiologist_name}`,
      providerUserId: report.radiologist_id,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", report.case_id);
  if (error) throw error;
  return { id: report.case_id };
}

export async function getRadiologyReports(userId: string) {
  const { data, error } = await supabase
    .from("medicalRecords")
    .select("*")
    .eq("patientId", userId)
    .eq("type", "image")
    .not("summary", "eq", "pending")
    .order("updatedAt", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export async function createNotification(n: { user_id: string; title: string; body: string; type: string }) {
  try {
    const { error } = await supabase
      .from("notifications")
      .insert({ ...n, read: false, created_at: new Date().toISOString() });
    if (error) throw error;
  } catch {
    // notifications table may not exist
  }
}

export async function getNotifications(userId: string) {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function markNotificationsRead(userId: string) {
  try {
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId);
  } catch {}
}

// ─── REALTIME SUBSCRIPTIONS ───────────────────────────────────────────────────

export function subscribeToClientBookings(
  patientId: string,
  onUpdate: (appt: any, eventType: "INSERT" | "UPDATE" | "DELETE") => void
) {
  return supabase
    .channel(uniqueTopic(`appointments:patient:${patientId}`))
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "appointments", filter: `patientId=eq.${patientId}` },
      (payload) => onUpdate(payload.new ?? payload.old, payload.eventType as any)
    )
    .subscribe();
}

export function subscribeToProviderBookings(
  doctorUserId: string,
  onUpdate: (appt: any, eventType: "INSERT" | "UPDATE" | "DELETE") => void
) {
  return supabase
    .channel(uniqueTopic(`appointments:doctor:${doctorUserId}`))
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "appointments", filter: `doctorUserId=eq.${doctorUserId}` },
      (payload) => onUpdate(payload.new ?? payload.old, payload.eventType as any)
    )
    .subscribe();
}

export function subscribeToNotifications(userId: string, onNew: (notification: any) => void) {
  return supabase
    .channel(uniqueTopic(`notifications:${userId}`))
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
      (payload) => onNew(payload.new)
    )
    .subscribe();
}

export function subscribeToRadiologyCases(userId: string, onUpdate: (rec: any) => void) {
  return supabase
    .channel(uniqueTopic(`medical:${userId}`))
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "medicalRecords", filter: `patientId=eq.${userId}` },
      (payload) => onUpdate(payload.new)
    )
    .subscribe();
}

// ─── REVIEWS ──────────────────────────────────────────────────────────────────

export async function submitReview(review: {
  doctorId: string;
  patientId: string;
  patientName: string;
  rating: number;
  comment?: string;
}) {
  const { data, error } = await supabase
    .from("reviews")
    .insert({ ...review, status: "visible", createdAt: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── BANNERS ──────────────────────────────────────────────────────────────────
// Banner images live in the "banners" Supabase storage bucket.
// We fetch the list via the API server (which uses the service-role key and can
// list any bucket) rather than calling storage directly from the mobile client
// (anon key cannot list bucket contents without explicit RLS policies).

export async function getActiveBanners(): Promise<
  { id: string; title: string; message: string; promoCode: string; imageUrl?: string; linkUrl?: string }[]
> {
  try {
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    if (!domain) return [];
    const res = await fetch(`https://${domain}/api/banners`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// ─── INSTITUTIONS (Hospitals) ─────────────────────────────────────────────────

/** Real columns in the Supabase `institute_pulse` table:
 *  id, name, type, status, city, address, phone, email, licenseNo,
 *  totalDoctors, totalBeds, services, accreditations, createdAt, userId, updatedAt
 *  Extra fields below are kept for UI convenience but are stripped before upsert.
 */
export interface Institution {
  id?: string;
  userId?: string;
  name: string;
  type: "Government" | "Private" | "Mission" | string;
  /** UI-only alias; mapped to `type` on upsert. */
  category?: string;
  email?: string;
  address?: string;
  district?: string;
  city?: string;
  rating?: number;
  distanceKm?: number;
  open24h?: boolean;
  phone?: string;
  lat?: number;
  lng?: number;
  /** UI-only alias; mapped from `type` for the hospital list. */
  categories?: string[];
  services?: string[];
  color?: string;
  status?: "Pending" | "Active" | "Declined" | string;
  /** Uploaded license file URL. Saved to `licenseNo` if a dedicated `licenseUrl` column does not exist yet. */
  licenseUrl?: string;
  licenseNo?: string;
  totalDoctors?: number;
  totalBeds?: number;
  accreditations?: any;
}

export function institutionToHospital(inst: Institution): Hospital {
  const type: Hospital["type"] = inst.type === "Government" || inst.type === "Private" || inst.type === "Mission" ? inst.type : "Private";
  const categoryLabel = (inst.category ?? inst.type ?? "").toLowerCase();
  const categories: Hospital["categories"] =
    categoryLabel.includes("hospital") ? ["hospital", "emergency"]
    : categoryLabel.includes("clinic") || categoryLabel.includes("health") ? ["clinic"]
    : categoryLabel.includes("pharmacy") ? ["pharmacy"]
    : (inst.categories as any) ?? ["hospital"];
  return {
    id: inst.id ?? inst.userId ?? inst.name,
    name: inst.name,
    type,
    address: inst.address ?? "",
    district: inst.district ?? inst.city ?? "",
    city: inst.city ?? "",
    rating: inst.rating ?? 0,
    distanceKm: inst.distanceKm ?? 0,
    open24h: inst.open24h ?? false,
    phone: inst.phone ?? "",
    lat: inst.lat ?? 0,
    lng: inst.lng ?? 0,
    categories,
    services: inst.services ?? [],
    color: inst.color ?? "#315d93",
  };
}

export async function getInstitutions(): Promise<Institution[]> {
  const { data, error } = await supabase
    .from("institute_pulse")
    .select("*")
    .eq("status", "Active")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Institution[];
}

export async function getInstitutionByUserId(userId: string): Promise<Institution | null> {
  const { data, error } = await supabase
    .from("institute_pulse")
    .select("*")
    .eq("userId", userId)
    .maybeSingle();
  if (error) return null;
  return data ?? null;
}

export async function getInstitutionById(id: string): Promise<Institution | null> {
  const { data, error } = await supabase
    .from("institute_pulse")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return null;
  return data ?? null;
}

export async function getInstitutionTypes(): Promise<string[]> {
  const { data, error } = await supabase
    .from("institute_pulse")
    .select("type")
    .eq("status", "Active")
    .not("type", "is", null);
  if (error) return [];
  const set = new Set<string>();
  (data ?? []).forEach((row: any) => {
    const t = (row.type ?? "").toString().trim();
    if (t) set.add(t);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export async function upsertInstitution(inst: Institution) {
  // Only send columns that actually exist in institute_pulse. Unknown columns
  // cause a Supabase schema-cache error on upsert.
  const payload: Record<string, any> = {
    userId: inst.userId,
    name: inst.name,
    type: inst.category ?? inst.type ?? "Other",
    status: inst.status ?? "Pending",
    city: inst.city ?? null,
    address: inst.address ?? null,
    phone: inst.phone ?? null,
    email: inst.email ?? null,
    services: inst.services ?? [],
    totalDoctors: inst.totalDoctors ?? 0,
    totalBeds: inst.totalBeds ?? null,
  };
  if (inst.id) payload.id = inst.id;
  // Store the uploaded license URL. The real table currently has `licenseNo`
  // (text) as the only license-related column. Save the URL there until a
  // dedicated `licenseUrl` column is added via Supabase → SQL Editor:
  //   ALTER TABLE public.institute_pulse ADD COLUMN "licenseUrl" TEXT;
  const licenseUrl = inst.licenseUrl ?? inst.licenseNo;
  if (licenseUrl) {
    payload.licenseNo = licenseUrl;
  }
  const { error } = await supabase
    .from("institute_pulse")
    .upsert(payload, { onConflict: "userId" });
  if (error) throw error;
}

export async function uploadInstituteLicense(
  userId: string,
  file: { name: string; uri: string; type: string }
): Promise<string> {
  if (file.uri === "mock://license") return "";
  const ext = file.name.split(".").pop() ?? "pdf";
  const path = `institute-licenses/${userId}/license.${ext}`;
  const response = await fetch(file.uri);
  const blob = await response.blob();
  const { error } = await supabase.storage
    .from("medical-licenses")
    .upload(path, blob, { contentType: file.type, upsert: true });
  if (error) throw error;
  const { data: urlData } = supabase.storage
    .from("medical-licenses")
    .getPublicUrl(path);
  return urlData?.publicUrl ?? "";
}

// ─── EMERGENCY CONTACTS ───────────────────────────────────────────────────────

export interface EmergencyContact {
  id: string;
  name: string;
  phones: string[];
  description?: string;
  priority: "critical" | "high" | "medium" | "low" | string;
}

export async function getEmergencyContacts(): Promise<EmergencyContact[]> {
  const { data, error } = await supabase
    .from("emergency_contacts")
    .select("*")
    .order("priority", { ascending: true });
  if (error) throw error;
  return (data ?? []) as EmergencyContact[];
}

// ─── USER PROFILE (clients) ───────────────────────────────────────────────────

export async function updateClientProfile(userId: string, updates: { name?: string; phone?: string; avatar?: string }) {
  const { error } = await supabase.auth.updateUser({ data: updates });
  if (error) throw error;
}

// ─── REVIEWS ──────────────────────────────────────────────────────────────────

export async function getReviewsForDoctor(doctorId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("doctorId", doctorId)
    .eq("status", "visible")
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── BACKWARD-COMPAT ALIASES ──────────────────────────────────────────────────

export const getProfile = getDoctorByUserId;
export const getBookingsForClient = getAppointmentsForClient;
export const getBookingsForProvider = getAppointmentsForProvider;
