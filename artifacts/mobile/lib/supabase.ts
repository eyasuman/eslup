import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { fetch as expoFetch } from "expo/fetch";
import { Platform } from "react-native";
import { Hospital } from "@/data/ethiopianHospitals";
import { isValidLocationCoordinates } from "@/lib/mapLocations";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

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
  profileImageUploadId?: string;
  licenseUploadId?: string;
  certificateUploadId?: string;
  certificateFile?: CertificateFileMetadata;
}

export async function getDoctorByUserId(userId: string) {
  const { data, error } = await supabase
    .from("doctors")
    .select("*")
    .eq("userId", userId)
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
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
  lat?: number;
  lng?: number;
}) {
  if (
    (doctor.lat != null || doctor.lng != null)
    && !isValidLocationCoordinates(doctor.lat, doctor.lng)
  ) {
    throw new Error("Provider location requires a valid latitude and longitude.");
  }
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

export async function updateDoctorLocation(userId: string, lat: number, lng: number) {
  if (!isValidLocationCoordinates(lat, lng)) {
    throw new Error("Provider location requires a valid latitude and longitude.");
  }
  const { error } = await supabase
    .from("doctors")
    .update({ lat, lng, updatedAt: new Date().toISOString() })
    .eq("userId", userId);
  if (error) throw error;
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

// ─── CATEGORIZED PRIVATE STORAGE ───────────────────────────────────────────────
export const PRIVATE_UPLOAD_BUCKET = "user-uploads";

export type UploadCategory =
  | "profile_image"
  | "payment_proof"
  | "provider_license"
  | "institute_license"
  | "certificate"
  | "radiology_image"
  | "radiology_video";

export type UploadableFile = {
  uri: string;
  name?: string;
  type?: string;
  size?: number;
};

export interface StoredUpload {
  id: string;
  ownerId: string;
  category: UploadCategory;
  bucket: string;
  storagePath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  relatedTable?: string | null;
  relatedId?: string | null;
  signedUrl: string;
  replacedUploadId?: string;
  cleanupPending?: boolean;
}

export interface CertificateFileMetadata {
  uploadId: string;
  path: string;
  name: string;
  type: string;
}

const UPLOAD_RULES: Record<UploadCategory, { maxBytes: number; mimePrefixes: string[]; mimeTypes?: string[] }> = {
  profile_image: { maxBytes: 10 * 1024 * 1024, mimePrefixes: ["image/"] },
  payment_proof: { maxBytes: 10 * 1024 * 1024, mimePrefixes: ["image/"] },
  provider_license: { maxBytes: 15 * 1024 * 1024, mimePrefixes: ["image/"], mimeTypes: ["application/pdf"] },
  institute_license: { maxBytes: 15 * 1024 * 1024, mimePrefixes: ["image/"], mimeTypes: ["application/pdf"] },
  certificate: { maxBytes: 15 * 1024 * 1024, mimePrefixes: ["image/"], mimeTypes: ["application/pdf"] },
  radiology_image: { maxBytes: 25 * 1024 * 1024, mimePrefixes: ["image/"], mimeTypes: ["application/pdf"] },
  radiology_video: { maxBytes: 200 * 1024 * 1024, mimePrefixes: ["video/"] },
};

function cleanFileName(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
  return cleaned.slice(-120) || "upload.bin";
}

function inferFileName(file: UploadableFile, category: UploadCategory) {
  if (file.name) return cleanFileName(file.name);
  const uriName = file.uri.split("/").pop()?.split("?")[0];
  if (uriName?.includes(".")) return cleanFileName(uriName);
  const extension = file.type?.split("/")[1]?.replace("jpeg", "jpg") || (category.includes("image") ? "jpg" : "bin");
  return `${category}.${extension}`;
}

function resolveMimeType(file: UploadableFile, responseType: string | null) {
  const candidate = (file.type || responseType || "").toLowerCase().split(";")[0].trim();
  if (candidate && candidate !== "application/octet-stream") return candidate;
  const fileName = (file.name || file.uri.split("/").pop() || "").toLowerCase().split("?")[0];
  const extensionMap: Record<string, string> = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".heic": "image/heic",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
  };
  const extension = Object.keys(extensionMap).find((suffix) => fileName.endsWith(suffix));
  return extension ? extensionMap[extension] : "application/octet-stream";
}

function validateUpload(category: UploadCategory, mimeType: string, size: number) {
  const rules = UPLOAD_RULES[category];
  const accepted = rules.mimePrefixes.some((prefix) => mimeType.startsWith(prefix))
    || rules.mimeTypes?.includes(mimeType);
  if (!accepted) {
    throw new Error(`This file type (${mimeType}) is not allowed for ${category.replace(/_/g, " ")}.`);
  }
  if (size <= 0) throw new Error("The selected file is empty.");
  if (size > rules.maxBytes) {
    throw new Error(`The selected file is too large. Maximum size is ${Math.round(rules.maxBytes / 1024 / 1024)} MB.`);
  }
}

export async function getSignedUploadUrl(uploadId: string, expiresIn = 15 * 60): Promise<string> {
  const { data: upload, error: metadataError } = await supabase
    .from("user_uploads")
    .select("bucket, storage_path, status")
    .eq("id", uploadId)
    .single();
  if (metadataError) throw metadataError;
  if (!upload || upload.status !== "active") throw new Error("This file is no longer available.");
  const { data, error } = await supabase.storage
    .from(upload.bucket)
    .createSignedUrl(upload.storage_path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

async function getSignedUploadDetails(uploadId: string, expiresIn = 15 * 60) {
  const { data: upload, error: metadataError } = await supabase
    .from("user_uploads")
    .select("bucket, storage_path, original_name, mime_type, status")
    .eq("id", uploadId)
    .single();
  if (metadataError) throw metadataError;
  if (!upload || upload.status !== "active") throw new Error("This file is no longer available.");
  const { data, error } = await supabase.storage
    .from(upload.bucket)
    .createSignedUrl(upload.storage_path, expiresIn);
  if (error) throw error;
  return {
    url: data.signedUrl,
    name: upload.original_name as string,
    mimeType: upload.mime_type as string,
  };
}

export async function linkUpload(uploadId: string, relatedTable: string, relatedId: string) {
  const { error } = await supabase
    .from("user_uploads")
    .update({ related_table: relatedTable, related_id: relatedId, updated_at: new Date().toISOString() })
    .eq("id", uploadId);
  if (error) throw error;
}

export async function deleteUpload(uploadId: string) {
  const { data: upload, error: fetchError } = await supabase
    .from("user_uploads")
    .select("bucket, storage_path")
    .eq("id", uploadId)
    .single();
  if (fetchError) throw fetchError;
  const { error: pendingError } = await supabase
    .from("user_uploads")
    .update({ status: "deletion_pending", updated_at: new Date().toISOString() })
    .eq("id", uploadId);
  if (pendingError) throw pendingError;
  const { error: storageError } = await supabase.storage.from(upload.bucket).remove([upload.storage_path]);
  if (storageError) throw storageError;
  const { error: metadataError } = await supabase
    .from("user_uploads")
    .update({ status: "deleted", deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", uploadId);
  if (metadataError) throw metadataError;
}

async function retryPendingUploadCleanup(ownerId: string) {
  const { data } = await supabase
    .from("user_uploads")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("status", "deletion_pending")
    .limit(10);
  for (const pending of data ?? []) {
    await deleteUpload(pending.id).catch(() => {});
  }
}

export async function uploadCategorizedFile(
  ownerId: string,
  category: UploadCategory,
  file: UploadableFile,
  options: { relatedTable?: string; relatedId?: string; replaceUploadId?: string } = {}
): Promise<StoredUpload> {
  if (!ownerId) throw new Error("You must be signed in to upload files.");
  if (!file.uri || file.uri.startsWith("mock://") || /^https?:\/\//i.test(file.uri)) {
    throw new Error("Please select a real file from this device.");
  }
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || userData.user?.id !== ownerId) {
    throw new Error("Your session does not match the file owner. Please sign in again.");
  }
  await retryPendingUploadCleanup(ownerId);

  const response = await expoFetch(file.uri);
  const body = await response.arrayBuffer();
  const mimeType = resolveMimeType(file, response.headers.get("content-type"));
  const sizeBytes = file.size ?? body.byteLength;
  validateUpload(category, mimeType, sizeBytes);

  const originalName = inferFileName(file, category);
  const storagePath = `${ownerId}/${category}/${Crypto.randomUUID()}-${originalName}`;
  const { error: uploadError } = await supabase.storage
    .from(PRIVATE_UPLOAD_BUCKET)
    .upload(storagePath, body, { contentType: mimeType, upsert: false, cacheControl: "3600" });
  if (uploadError) throw uploadError;

  const uploadId = Crypto.randomUUID();
  const { error: metadataError } = await supabase.from("user_uploads").insert({
    id: uploadId,
    owner_id: ownerId,
    category,
    bucket: PRIVATE_UPLOAD_BUCKET,
    storage_path: storagePath,
    original_name: originalName,
    mime_type: mimeType,
    size_bytes: sizeBytes,
    related_table: options.relatedTable ?? null,
    related_id: options.relatedId ?? null,
    status: "active",
  });
  if (metadataError) {
    await supabase.storage.from(PRIVATE_UPLOAD_BUCKET).remove([storagePath]);
    throw new Error(`The file was not saved because its metadata could not be recorded: ${metadataError.message}`);
  }

  try {
    const { data, error } = await supabase.storage
      .from(PRIVATE_UPLOAD_BUCKET)
      .createSignedUrl(storagePath, 15 * 60);
    if (error) throw error;
    if (options.replaceUploadId) {
      await deleteUpload(options.replaceUploadId);
    }
    return {
      id: uploadId,
      ownerId,
      category,
      bucket: PRIVATE_UPLOAD_BUCKET,
      storagePath,
      originalName,
      mimeType,
      sizeBytes,
      relatedTable: options.relatedTable,
      relatedId: options.relatedId,
      signedUrl: data.signedUrl,
    };
  } catch (error) {
    await deleteUpload(uploadId).catch(() => {});
    throw error;
  }
}

export async function uploadProfileImage(
  userId: string,
  imageUri: string,
  replaceUploadId?: string,
  fileName = "profile-image.jpg",
  mimeType = "image/jpeg"
): Promise<StoredUpload> {
  const upload = await uploadCategorizedFile(
    userId,
    "profile_image",
    { uri: imageUri, name: fileName, type: mimeType },
    { relatedTable: "doctors", relatedId: userId }
  );
  const { error } = await supabase
    .from("doctors")
    .update({ profileImageUploadId: upload.id, updatedAt: new Date().toISOString() })
    .eq("userId", userId);
  if (error) {
    await deleteUpload(upload.id).catch(() => {});
    throw error;
  }
  if (replaceUploadId && replaceUploadId !== upload.id) {
    try {
      await deleteUpload(replaceUploadId);
    } catch {
      return { ...upload, cleanupPending: true };
    }
  }
  return upload;
}

export async function uploadPaymentProof(
  userId: string,
  imageUri: string,
  fileName = "payment-proof.jpg",
  mimeType = "image/jpeg",
  appointmentId?: string
): Promise<StoredUpload> {
  return uploadCategorizedFile(
    userId,
    "payment_proof",
    { uri: imageUri, name: fileName, type: mimeType },
    { relatedTable: "appointments", relatedId: appointmentId }
  );
}

export async function uploadMedicalLicense(
  userId: string,
  file: { name: string; type: string; uri: string; size?: number }
): Promise<StoredUpload> {
  const { data: previous } = await supabase
    .from("user_uploads")
    .select("id")
    .eq("owner_id", userId)
    .eq("category", "provider_license")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const upload = await uploadCategorizedFile(userId, "provider_license", file, {
    relatedTable: "doctors",
    relatedId: userId,
  });
  const { error } = await supabase
    .from("doctors")
    .update({
      licenseUploadId: upload.id,
      licenseFile: { uploadId: upload.id, path: upload.storagePath, name: upload.originalName, type: upload.mimeType },
      updatedAt: new Date().toISOString(),
    })
    .eq("userId", userId);
  if (error) {
    await deleteUpload(upload.id).catch(() => {});
    throw error;
  }
  if (previous?.id && previous.id !== upload.id) {
    try {
      await deleteUpload(previous.id);
    } catch {
      return { ...upload, cleanupPending: true };
    }
  }
  return upload;
}

export async function uploadCertificate(
  userId: string,
  file: { name: string; type: string; uri: string; size?: number },
  replaceUploadId?: string
): Promise<StoredUpload> {
  let previousId = replaceUploadId;
  if (!previousId) {
    const { data: doctor, error: doctorError } = await supabase
      .from("doctors")
      .select("certificateUploadId")
      .eq("userId", userId)
      .single();
    if (doctorError) throw doctorError;
    previousId = doctor?.certificateUploadId ?? undefined;
  }
  // Older app versions could have an active certificate metadata row before the
  // doctor pointer existed. Preserve the same replacement behavior as licenses.
  if (!previousId) {
    const { data: previous, error: previousError } = await supabase
      .from("user_uploads")
      .select("id")
      .eq("owner_id", userId)
      .eq("category", "certificate")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (previousError) throw previousError;
    previousId = previous?.id;
  }
  const upload = await uploadCategorizedFile(userId, "certificate", file, {
    relatedTable: "doctors",
    relatedId: userId,
  });
  const certificateFile: CertificateFileMetadata = {
    uploadId: upload.id,
    path: upload.storagePath,
    name: upload.originalName,
    type: upload.mimeType,
  };
  const { error } = await supabase
    .from("doctors")
    .update({
      certificateUploadId: upload.id,
      certificateFile,
      updatedAt: new Date().toISOString(),
    })
    .eq("userId", userId);
  if (error) {
    await deleteUpload(upload.id).catch(() => {});
    throw error;
  }
  if (previousId && previousId !== upload.id) {
    try {
      await deleteUpload(previousId);
    } catch {
      return { ...upload, cleanupPending: true };
    }
  }
  return upload;
}

/** Returns the current provider certificate only when its upload is still active. */
export async function getProviderCertificate(userId: string): Promise<CertificateFileMetadata | null> {
  const { data: doctor, error: doctorError } = await supabase
    .from("doctors")
    .select("certificateUploadId, certificateFile")
    .eq("userId", userId)
    .maybeSingle();
  if (doctorError) throw doctorError;
  if (!doctor?.certificateUploadId) return null;
  const { data: upload, error: uploadError } = await supabase
    .from("user_uploads")
    .select("id, storage_path, original_name, mime_type, status")
    .eq("id", doctor.certificateUploadId)
    .maybeSingle();
  if (uploadError) throw uploadError;
  if (!upload || upload.status !== "active") return null;
  return {
    uploadId: upload.id,
    path: upload.storage_path,
    name: upload.original_name,
    type: upload.mime_type,
  };
}

// ─── APPOINTMENTS ─────────────────────────────────────────────────────────────
// The `appointments` table uses camelCase column names:
// patientId, doctorId, doctorUserId, doctorName, serviceType, consultationFee, etc.

export async function createAppointment(appt: {
  id?: string;
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
  paymentProofUploadId?: string;
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
  assigned_radiologist_id: string;
  assigned_radiologist_name?: string;
  scan_image_uri?: string | null;
  scan_image_name?: string | null;
  scan_image_type?: string | null;
  /** MP4 or other video file URI to upload alongside or instead of the image */
  scan_video_uri?: string | null;
  /** Original filename of the video (used for extension detection) */
  scan_video_name?: string | null;
  scan_video_type?: string | null;
}) {
  const recordId = Crypto.randomUUID();
  const { data: assignedReviewer, error: reviewerError } = await supabase
    .from("doctors")
    .select("userId")
    .eq("userId", caseData.assigned_radiologist_id)
    .eq("status", "Active")
    .or("specialty.ilike.%radio%,providerType.ilike.%radio%")
    .maybeSingle();
  if (reviewerError || !assignedReviewer) {
    throw new Error("The selected radiologist is not currently authorized to review scans.");
  }
  const sourceUri = caseData.scan_video_uri || caseData.scan_image_uri;
  if (!sourceUri) throw new Error("A radiology image, PDF, or video is required.");
  const isVideo = Boolean(caseData.scan_video_uri);
  const originalName = isVideo
    ? caseData.scan_video_name || "radiology-scan.mp4"
    : caseData.scan_image_name || sourceUri.split("/").pop()?.split("?")[0] || "radiology-scan.jpg";
  const upload = await uploadCategorizedFile(
    caseData.submitted_by,
    isVideo ? "radiology_video" : "radiology_image",
    {
      uri: sourceUri,
      name: originalName,
      type: isVideo ? caseData.scan_video_type || "video/mp4" : caseData.scan_image_type || undefined,
    },
    { relatedTable: "medicalRecords", relatedId: recordId }
  );

  const { data, error } = await supabase
    .from("medicalRecords")
    .insert({
      id: recordId,
      patientId: caseData.submitted_by,
      providerUserId: caseData.submitted_by,
      type: isVideo ? "video" : "image",
      title: `${caseData.scan_type} — ${caseData.body_part}`,
      fileUrl: upload.storagePath,
      fileUploadId: upload.id,
      assignedRadiologistId: caseData.assigned_radiologist_id,
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
  if (error) {
    await deleteUpload(upload.id).catch(() => {});
    throw error;
  }
  return { ...data, fileUrl: upload.signedUrl };
}

export async function getRadiologyCases(userId: string) {
  const { data, error } = await supabase
    .from("medicalRecords")
    .select("*")
    .eq("patientId", userId)
    .in("type", ["image", "video"])
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return Promise.all((data ?? []).map(async (row: any) => {
    if (!row.fileUploadId) return row;
    const file = await getSignedUploadDetails(row.fileUploadId).catch(() => null);
    return { ...row, fileUrl: file?.url ?? null, fileMimeType: file?.mimeType ?? null };
  }));
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
  fileType?: "image" | "video" | "pdf" | "unknown";
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
    fileType: row.fileMimeType === "application/pdf"
      ? "pdf"
      : row.fileMimeType?.startsWith("video/") || row.type === "video"
        ? "video"
        : "image",
  };
}

export async function getRadiologyQueue(radiologistId: string): Promise<RadioCase[]> {
  const { data, error } = await supabase
    .from("medicalRecords")
    .select("*")
    .eq("assignedRadiologistId", radiologistId)
    .in("type", ["image", "video"])
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return Promise.all((data ?? []).map(async (row: any) => {
    const file = row.fileUploadId
      ? await getSignedUploadDetails(row.fileUploadId).catch(() => null)
      : null;
    return dbRowToRadioCase({
      ...row,
      fileUrl: file?.url ?? null,
      fileMimeType: file?.mimeType ?? null,
    });
  }));
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
    .eq("id", report.case_id)
    .eq("assignedRadiologistId", report.radiologist_id)
    .select("id")
    .single();
  if (error) throw error;
  return { id: report.case_id };
}

export async function getRadiologyReports(userId: string) {
  const { data, error } = await supabase
    .from("medicalRecords")
    .select("*")
    .eq("patientId", userId)
    .in("type", ["image", "video"])
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
    // Try the Supabase `banners` table directly (anon key, no API server needed)
    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .eq("isActive", true)
      .order("order", { ascending: true });

    if (!error && data && data.length > 0) {
      return data.map((b: any, i: number) => ({
        id: String(b.id ?? b.order ?? i),
        title: b.title ?? "",
        message: b.message ?? b.subtitle ?? "",
        promoCode: b.promoCode ?? b.promo_code ?? "",
        imageUrl: b.imageUrl ?? b.image_url ?? undefined,
        linkUrl: b.linkUrl ?? b.link_url ?? undefined,
      }));
    }

    // Fallback: try the API server (requires SUPABASE_SERVICE_ROLE_KEY)
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    if (!domain) return [];
    const res = await fetch(`https://${domain}/api/banners`);
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json) ? json : [];
  } catch {
    return [];
  }
}

// ─── INSTITUTIONS (Hospitals) ─────────────────────────────────────────────────

/** Columns expected in the Supabase `institute_pulse` table:
 *  id, name, type, status, city, address, phone, email, licenseNo,
 *  totalDoctors, totalBeds, services, accreditations, createdAt, userId, updatedAt,
 *  lat, lng
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
  licenseUploadId?: string;
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
    lat: inst.lat,
    lng: inst.lng,
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
  if (error) throw error;
  return data ?? null;
}

export async function getInstitutionById(id: string): Promise<Institution | null> {
  const { data, error } = await supabase
    .from("institute_pulse")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/** Subscribe to the signed-in institute's application status changes. */
export function subscribeToInstituteStatusChanges(
  userId: string,
  onStatusChange: (newStatus: string, fullRecord: Institution) => void
) {
  return supabase
    .channel(uniqueTopic(`institute:status:${userId}`))
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "institute_pulse", filter: `userId=eq.${userId}` },
      (payload) => {
        const record = payload.new as Institution;
        if (record?.status) onStatusChange(record.status, record);
      }
    )
    .subscribe();
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
  if (
    (inst.lat != null || inst.lng != null)
    && !isValidLocationCoordinates(inst.lat, inst.lng)
  ) {
    throw new Error("Institute location requires a valid latitude and longitude.");
  }
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
  if (inst.licenseNo) payload.licenseNo = inst.licenseNo;
  if (inst.licenseUploadId) payload.licenseUploadId = inst.licenseUploadId;
  if (inst.lat != null && inst.lng != null) {
    payload.lat = inst.lat;
    payload.lng = inst.lng;
  }
  const { error } = await supabase
    .from("institute_pulse")
    .upsert(payload, { onConflict: "userId" });
  if (error) throw error;
}

export async function uploadInstituteLicense(
  userId: string,
  file: { name: string; uri: string; type: string; size?: number }
): Promise<StoredUpload> {
  const { data: previous } = await supabase
    .from("user_uploads")
    .select("id")
    .eq("owner_id", userId)
    .eq("category", "institute_license")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const upload = await uploadCategorizedFile(userId, "institute_license", file, {
    relatedTable: "institute_pulse",
    relatedId: userId,
  });
  return { ...upload, replacedUploadId: previous?.id };
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
