import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { AppState } from "react-native";
import { supabase } from "@/lib/supabase";

export type DoctorStatus = "Pending" | "Active" | "Disabled" | "Declined";
export type ProviderType = "Doctor" | "Nurse" | "Home Care" | "Physiotherapist" | "Healthcare Facility";
export type AppointmentStatus = "pending" | "scheduled" | "completed" | "cancelled" | "declined";

export interface LicenseFile {
  path: string;
  name?: string;
  uploadedAt?: string;
}

export interface Doctor {
  id: string;
  name: string;
  category: string;
  specialty: string;
  status: DoctorStatus;
  email: string;
  phone?: string;
  city?: string;
  consultationFee: number;
  experienceYears?: number;
  licenseNo: string;
  avatarUrl?: string;
  bio?: string;
  serviceModes: { video: boolean; audio: boolean; inPerson: boolean; homeVisit: boolean };
  licenseFile?: LicenseFile | null;
  createdAt: string;
}

export type PaymentStatus = "pending" | "verified" | "rejected";

export interface Appointment {
  id: string;
  doctorName: string;
  patientName: string;
  specialty: string;
  status: AppointmentStatus;
  consultationFee: number;
  platformFee: number;
  totalPrice: number;
  date: string;
  serviceType: string;
  paymentStatus: PaymentStatus;
  paymentProofUrl?: string | null;
  paymentMethod?: string | null;
  transactionId?: string | null;
  senderName?: string | null;
  createdAt: string;
}

export interface RevenueEntry {
  id?: string;
  month: string;
  year?: number;
  revenue: number;
  appointments: number;
  verifiedPayments?: number;
}

export type InstituteStatus = "Active" | "Pending" | "Suspended";
export type InstituteType = "Hospital" | "Clinic" | "Diagnostic Center" | "Pharmacy" | "Rehabilitation" | "Dental" | "Specialty Center";

export interface Institute {
  id: string;
  name: string;
  type: InstituteType;
  status: InstituteStatus;
  city: string;
  address: string;
  phone: string;
  email: string;
  licenseNo: string;
  /** Full public URL of the certificate uploaded by the institute app, if any. */
  certificateUrl?: string;
  totalDoctors: number;
  totalBeds?: number;
  services: string[];
  accreditations?: string[];
  createdAt: string;
}

export type BannerType = "photo" | "image" | "promo" | "alert" | "info";
export interface Banner {
  id: string;
  title: string;
  message: string;
  type: BannerType;
  isActive: boolean;
  priority: number;
  promoCode?: string;
  linkUrl?: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  displayDuration: number;
  targetAudience?: "All" | "Patients" | "Providers";
  createdAt: string;
  expiresAt?: string;
}

export type NotificationType =
  | "payment_proof"
  | "license_review"
  | "appointment_request"
  | "urgent_case"
  | "info";

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  read: boolean;
  data: Record<string, unknown> | null;
  createdAt: string;
}

export type ReviewStatus = "visible" | "pinned" | "banned" | "shadow_banned";
export interface Review {
  id: string;
  doctorId: string;
  doctorName: string;
  patientName: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  createdAt: string;
}

export interface Patient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  status: "active" | "suspended";
  totalAppointments: number;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorName: string;
  action: string;
  objectType: string;
  type: "User" | "Admin" | "System";
  timestamp: string;
}

export interface TeleradiologyCase {
  id: string;
  caseId: string;
  patientName: string;
  radiologistName?: string;
  modality: string;
  bodyPart: string;
  status: "pending" | "in-review" | "completed" | "urgent";
  priority?: string;
  notes?: string;
  /** True when the case has a scan file stored in the radiology-scans bucket. */
  hasScanFile?: boolean;
  createdAt: string;
}

export interface PlatformSettings {
  platformFee: number;
  cancellationNoticePeriodHours: number;
  cancellationPenaltyFee: number;
  reminderCadence: "weekly" | "daily" | "same-day";
  paymentAccountNumber?: string;
  paymentMethod?: string;
}

function getApiBase(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return `${configured.replace(/\/api\/?$/, "").replace(/\/$/, "")}/api/admin/network`;
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}/api/admin/network`;
  if (__DEV__) return "http://localhost/api/admin/network";
  throw new Error("API is not configured. Set EXPO_PUBLIC_API_URL or EXPO_PUBLIC_DOMAIN.");
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const base = getApiBase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Your session has expired. Please sign in again.");
  const res = await fetch(`${base}${path}`, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, ...(options?.headers ?? {}) },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} failed (${res.status}): ${text}`);
  }
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

interface DataContextType {
  doctors: Doctor[];
  appointments: Appointment[];
  revenue: RevenueEntry[];
  institutes: Institute[];
  banners: Banner[];
  reviews: Review[];
  patients: Patient[];
  auditLogs: AuditLog[];
  teleradiologyCases: TeleradiologyCase[];
  settings: PlatformSettings;
  notifications: NotificationItem[];
  notificationsUnread: number;
  updateDoctorStatus: (id: string, status: DoctorStatus) => Promise<void>;
  getDoctorLicenseUrl: (id: string) => Promise<{ url: string; name: string | null }>;
  deleteProvider: (id: string) => Promise<void>;
  addInstitute: (inst: Omit<Institute, "id" | "createdAt">) => Promise<void>;
  updateInstituteStatus: (id: string, status: InstituteStatus) => Promise<void>;
  deleteInstitute: (id: string) => Promise<void>;
  addBanner: (b: Omit<Banner, "id" | "createdAt">) => Promise<void>;
  toggleBanner: (id: string) => Promise<void>;
  deleteBanner: (id: string) => Promise<void>;
  uploadBannerImage: (base64: string, contentType: string, filename?: string) => Promise<string>;
  updateReviewStatus: (id: string, status: ReviewStatus) => Promise<void>;
  updatePaymentStatus: (id: string, status: PaymentStatus) => Promise<void>;
  togglePatientStatus: (id: string) => Promise<void>;
  updateCaseStatus: (id: string, status: TeleradiologyCase["status"]) => Promise<void>;
  updateSettings: (s: PlatformSettings) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  isLoading: boolean;
  refresh: () => void;
}

const DataContext = createContext<DataContextType | null>(null);

const NOTIFICATION_TYPES: Record<string, { label: string; icon: any }> = {
  payment_proof: { label: "Payment Proofs", icon: "credit-card" },
  license_review: { label: "License Reviews", icon: "file-text" },
  appointment_request: { label: "Appointments", icon: "calendar" },
  urgent_case: { label: "Urgent Cases", icon: "alert-triangle" },
  info: { label: "Information", icon: "info" },
};

const DEFAULT_SETTINGS: PlatformSettings = {
  platformFee: 10,
  cancellationNoticePeriodHours: 24,
  cancellationPenaltyFee: 50,
  reminderCadence: "daily",
  paymentAccountNumber: "",
  paymentMethod: "Bank Transfer",
};

export function DataProvider({ children }: { children: ReactNode }) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [revenue, setRevenue] = useState<RevenueEntry[]>([]);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [teleradiologyCases, setTeleradiologyCases] = useState<TeleradiologyCase[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const isFirstLoadRef = useRef(true);
  const prevPendingRef = useRef({ payments: -1, licenses: -1, appointments: -1, urgent: -1 });

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    const isFirst = isFirstLoadRef.current;
    if (isFirst) setIsLoading(true);
    isFirstLoadRef.current = false;

    async function loadAll() {
      try {
        const [
          fetchedDoctors,
          fetchedAppointments,
          fetchedRevenue,
          fetchedInstitutes,
          fetchedBanners,
          fetchedReviews,
          fetchedPatients,
          fetchedAudit,
          fetchedTeleradiology,
          fetchedSettings,
          fetchedNotifications,
        ] = await Promise.all([
          apiFetch<Doctor[]>("/providers"),
          apiFetch<Appointment[]>("/appointments"),
          apiFetch<RevenueEntry[]>("/revenue"),
          apiFetch<Institute[]>("/institutes"),
          apiFetch<Banner[]>("/banners"),
          apiFetch<Review[]>("/reviews"),
          apiFetch<Patient[]>("/patients"),
          apiFetch<AuditLog[]>("/audit"),
          apiFetch<TeleradiologyCase[]>("/teleradiology"),
          apiFetch<PlatformSettings & { id?: string }>("/settings"),
          apiFetch<NotificationItem[]>("/notifications").catch(() => [] as NotificationItem[]),
        ]);

        if (cancelled) return;
        setDoctors(fetchedDoctors);
        setAppointments(fetchedAppointments);
        setRevenue(fetchedRevenue);
        setInstitutes(fetchedInstitutes);
        setBanners(fetchedBanners);
        setReviews(fetchedReviews);
        setPatients(fetchedPatients);
        setAuditLogs(fetchedAudit);
        setTeleradiologyCases(fetchedTeleradiology);
        setNotifications(fetchedNotifications);
        const { id: _id, ...settingsData } = fetchedSettings as any;
        setSettings(settingsData);

        // ── Delta detection — POST new events to the API, which saves a
        //    notification record AND sends a real Expo push notification ───
        if (!isFirst) {
          const curr = {
            payments: (fetchedAppointments as any[]).filter((a) => a.paymentProofUrl && a.paymentStatus === "pending").length,
            licenses: (fetchedDoctors as any[]).filter((d) => d.status === "Pending" && d.licenseFile).length,
            appointments: (fetchedAppointments as any[]).filter((a) => a.status === "pending").length,
            urgent: (fetchedTeleradiology as any[]).filter((c) => c.status === "urgent").length,
          };
          const prev = prevPendingRef.current;
          if (prev.payments >= 0) {
            // Fire notifications for each category that increased
            if (curr.payments > prev.payments) {
              const delta = curr.payments - prev.payments;
              apiFetch("/notifications/in-app", {
                method: "POST",
                body: JSON.stringify({
                  title: "New Payment Proofs",
                  body: `${delta} new payment proof${delta > 1 ? "s" : ""} to verify`,
                  type: "payment_proof",
                }),
              }).catch(() => {});
            }
            if (curr.licenses > prev.licenses) {
              const delta = curr.licenses - prev.licenses;
              apiFetch("/notifications/in-app", {
                method: "POST",
                body: JSON.stringify({
                  title: "New License Reviews",
                  body: `${delta} new license${delta > 1 ? "s" : ""} to review`,
                  type: "license_review",
                }),
              }).catch(() => {});
            }
            if (curr.appointments > prev.appointments) {
              const delta = curr.appointments - prev.appointments;
              apiFetch("/notifications/in-app", {
                method: "POST",
                body: JSON.stringify({
                  title: "New Appointments",
                  body: `${delta} new appointment request${delta > 1 ? "s" : ""}`,
                  type: "appointment_request",
                }),
              }).catch(() => {});
            }
            if (curr.urgent > prev.urgent) {
              const delta = curr.urgent - prev.urgent;
              apiFetch("/notifications/in-app", {
                method: "POST",
                body: JSON.stringify({
                  title: "Urgent Radiology Cases",
                  body: `${delta} new urgent radiology case${delta > 1 ? "s" : ""}`,
                  type: "urgent_case",
                }),
              }).catch(() => {});
            }
          }
          prevPendingRef.current = curr;

          // Update badge with unread count from server
        } else {
          // First load — seed the ref so next poll can detect deltas
          prevPendingRef.current = {
            payments: (fetchedAppointments as any[]).filter((a) => a.paymentProofUrl && a.paymentStatus === "pending").length,
            licenses: (fetchedDoctors as any[]).filter((d) => d.status === "Pending" && d.licenseFile).length,
            appointments: (fetchedAppointments as any[]).filter((a) => a.status === "pending").length,
            urgent: (fetchedTeleradiology as any[]).filter((c) => c.status === "urgent").length,
          };
        }
      } catch (err) {
        console.error("Failed to load data from API:", err);
      } finally {
        if (!cancelled && isFirst) setIsLoading(false);
      }
    }

    loadAll();
    return () => { cancelled = true; };
  }, [refreshTick]);

  // Background sync: keep the admin console in sync with the live Supabase data
  // that the patient app also reads/writes. Refetch every 15s without blocking
  // the UI and whenever the app returns to the foreground.
  useEffect(() => {
    const id = setInterval(() => setRefreshTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        setRefreshTick((t) => t + 1);
      }
    });
    return () => subscription.remove();
  }, []);

  const updateDoctorStatus = useCallback(async (id: string, status: DoctorStatus) => {
    const updated = await apiFetch<Doctor>(`/providers/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setDoctors((prev) => prev.map((d) => (d.id === id ? updated : d)));
  }, []);

  const getDoctorLicenseUrl = useCallback(async (id: string) => {
    return apiFetch<{ url: string; name: string | null }>(`/providers/${id}/license-url`);
  }, []);

  const deleteProvider = useCallback(async (id: string) => {
    await apiFetch(`/providers/${id}`, { method: "DELETE" });
    setDoctors((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const addInstitute = async (inst: Omit<Institute, "id" | "createdAt">) => {
    const created = await apiFetch<Institute>("/institutes", {
      method: "POST",
      body: JSON.stringify(inst),
    });
    setInstitutes((prev) => [created, ...prev]);
  };

  const updateInstituteStatus = async (id: string, status: InstituteStatus) => {
    const updated = await apiFetch<Institute>(`/institutes/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setInstitutes((prev) => prev.map((i) => (i.id === id ? updated : i)));
  };

  const deleteInstitute = useCallback(async (id: string) => {
    await apiFetch(`/institutes/${id}`, { method: "DELETE" });
    setInstitutes((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const addBanner = async (b: Omit<Banner, "id" | "createdAt">) => {
    const created = await apiFetch<Banner>("/banners", {
      method: "POST",
      body: JSON.stringify(b),
    });
    setBanners((prev) => [...prev, created]);
  };

  const toggleBanner = async (id: string) => {
    const updated = await apiFetch<Banner>(`/banners/${id}/toggle`, {
      method: "PATCH",
    });
    setBanners((prev) => prev.map((b) => (b.id === id ? updated : b)));
  };

  const deleteBanner = async (id: string) => {
    await apiFetch(`/banners/${id}`, { method: "DELETE" });
    setBanners((prev) => prev.filter((b) => b.id !== id));
  };

  const uploadBannerImage = async (base64: string, contentType: string, filename?: string) => {
    const result = await apiFetch<{ url: string }>("/banners/upload-image", {
      method: "POST",
      body: JSON.stringify({ imageBase64: base64, contentType, filename }),
    });
    return result.url;
  };

  const updatePaymentStatus = async (id: string, status: PaymentStatus) => {
    const updated = await apiFetch<Appointment>(`/appointments/${id}/payment-status`, {
      method: "PATCH",
      body: JSON.stringify({ paymentStatus: status }),
    });
    setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
  };

  const updateReviewStatus = async (id: string, status: ReviewStatus) => {
    const updated = await apiFetch<Review>(`/reviews/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setReviews((prev) => prev.map((r) => (r.id === id ? updated : r)));
  };

  const togglePatientStatus = async (id: string) => {
    const updated = await apiFetch<Patient>(`/patients/${id}/toggle`, {
      method: "PATCH",
    });
    setPatients((prev) => prev.map((p) => (p.id === id ? updated : p)));
  };

  const updateCaseStatus = async (id: string, status: TeleradiologyCase["status"]) => {
    const updated = await apiFetch<TeleradiologyCase>(`/teleradiology/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setTeleradiologyCases((prev) => prev.map((c) => (c.id === id ? updated : c)));
  };

  const updateSettings = async (s: PlatformSettings) => {
    const updated = await apiFetch<PlatformSettings>("/settings", {
      method: "PUT",
      body: JSON.stringify(s),
    });
    const { id: _id, ...settingsData } = updated as any;
    setSettings(settingsData);
  };

  const markNotificationRead = useCallback(async (id: string) => {
    const updated = await apiFetch<NotificationItem>(`/notifications/${id}/read`, {
      method: "PATCH",
    });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    await apiFetch("/notifications/read-all", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const notificationsUnread = notifications.filter((n) => !n.read).length;

  return (
    <DataContext.Provider
      value={{
        doctors, appointments, revenue, institutes, banners, reviews,
        patients, auditLogs, teleradiologyCases, settings,
        notifications, notificationsUnread,
        updateDoctorStatus, getDoctorLicenseUrl, deleteProvider, addInstitute, updateInstituteStatus, deleteInstitute,
        addBanner, toggleBanner, deleteBanner, uploadBannerImage,
        updateReviewStatus, updatePaymentStatus, togglePatientStatus, updateCaseStatus, updateSettings,
        markNotificationRead, markAllNotificationsRead,
        isLoading, refresh,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
