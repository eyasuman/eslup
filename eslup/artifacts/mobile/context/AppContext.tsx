import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  supabase,
  getDoctorByUserId,
  getInstitutionByUserId,
  getNotifications,
  markNotificationsRead,
  subscribeToNotifications,
  subscribeToClientBookings,
  subscribeToProviderStatusChanges,
  getAppointmentsForClient,
  getAppointmentsForProvider,
} from "@/lib/supabase";

export type UserRole = "client" | "provider" | "institute" | null;
export type Language = "en" | "am" | "om" | "ar" | "so";
export type ServiceType = "onsite" | "online" | "homecare";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  profileImageUploadId?: string;
  doctorStatus?: string;    // 'Pending' | 'Active' | 'Disabled' | 'Declined'
  instituteStatus?: string; // 'Pending' | 'Active' | 'Declined'
}

export interface Provider {
  id: string;
  name: string;
  specialty: string;
  serviceTypes: ServiceType[];
  rating: number;
  reviewCount: number;
  distance?: string;
  price: number;
  currency: string;
  available: boolean;
  onlineStatus: boolean;
  location?: string;
  phone?: string;
  email?: string;
  bio?: string;
  preferredContact?: string[];
  languages?: string[];
  licenseNumber?: string;
  avatar?: string;
}

export interface Booking {
  id: string;
  providerId: string;
  providerName: string;
  specialty: string;
  serviceType: ServiceType;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "scheduled" | "declined";
  date: string;
  time: string;
  amount: number;
  currency: string;
  rating?: number;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  type: "booking" | "approval" | "cancellation" | "info";
}

interface AppContextType {
  user: User | null;
  userRole: UserRole;
  setUserRole: (role: UserRole) => Promise<void>;
  setUser: (user: User | null) => Promise<void>;
  bookings: Booking[];
  addBooking: (booking: Booking) => Promise<void>;
  updateBooking: (id: string, updates: Partial<Booking>) => Promise<void>;
  notifications: Notification[];
  addNotification: (n: Notification) => void;
  markAllRead: () => void;
  unreadCount: number;
  isDark: boolean;
  toggleTheme: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  hasPickedLanguage: boolean | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  showAmbulance: boolean;
  setShowAmbulance: (v: boolean) => void;
  isSessionLoading: boolean;
}

export const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [userRole, setUserRoleState] = useState<UserRole>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isDark, setIsDark] = useState(false);
  const [language, setLanguageState] = useState<Language>("en");
  const [hasPickedLanguage, setHasPickedLanguageState] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAmbulance, setShowAmbulance] = useState(true);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let notifUnsub: (() => void) | null = null;
    let apptUnsub: (() => void) | null = null;
    let provStatusUnsub: (() => void) | null = null;

    const restoreSession = async () => {
      try {
        const [darkRaw, langRaw, bookingsRaw, langPickedRaw] = await Promise.all([
          AsyncStorage.getItem("isDark"),
          AsyncStorage.getItem("language"),
          AsyncStorage.getItem("bookings"),
          AsyncStorage.getItem("hasPickedLanguage"),
        ]);
        if (darkRaw === "true") setIsDark(true);
        if (langRaw) setLanguageState(langRaw as Language);
        if (bookingsRaw) setBookings(JSON.parse(bookingsRaw));
        if (mounted) setHasPickedLanguageState(langPickedRaw === "true");

        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user && mounted) {
          // Determine role: provider > institute > client (check in order)
          let doctorProfile: any = null;
          let instituteProfile: any = null;
          try { doctorProfile = await getDoctorByUserId(session.user.id); } catch {}
          if (!doctorProfile) {
            try { instituteProfile = await getInstitutionByUserId(session.user.id); } catch {}
          }

          const role: UserRole = doctorProfile ? "provider" : instituteProfile ? "institute" : "client";
          const rawEmail = session.user.email ?? "";
          const isPhoneAuth = rawEmail.endsWith("@pulse.app");
          const name = doctorProfile?.name ?? instituteProfile?.name ?? session.user.user_metadata?.name ?? (isPhoneAuth ? "User" : rawEmail.split("@")[0]) ?? "User";
          const phone = session.user.user_metadata?.phone ?? (isPhoneAuth ? rawEmail.split("@")[0] : doctorProfile?.phone ?? instituteProfile?.phone ?? "");

          const restored: User = {
            id: session.user.id,
            name,
            email: isPhoneAuth ? "" : rawEmail,
            phone,
            role,
            avatar: undefined,
            profileImageUploadId: doctorProfile?.profileImageUploadId ?? undefined,
            doctorStatus: doctorProfile?.status ?? undefined,
            instituteStatus: instituteProfile?.status ?? undefined,
          };
          if (mounted) {
            setUserState(restored);
            setUserRoleState(role);
          }

          // Load appointments from Supabase (overrides/merges local cache)
          try {
            const remoteAppts = role === "provider"
              ? await getAppointmentsForProvider(session.user.id)
              : await getAppointmentsForClient(session.user.id);
            if (remoteAppts.length > 0 && mounted) {
              const mapped: Booking[] = remoteAppts.map((a: any) => ({
                id: a.id,
                providerId: a.doctorUserId ?? a.doctorId ?? "",
                providerName: a.doctorName ?? "",
                specialty: a.specialty ?? "",
                date: a.date ?? a.createdAt,
                time: a.date ? new Date(a.date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "",
                status: a.status ?? "pending",
                serviceType: (a.serviceType ?? "online") as any,
                amount: a.totalPrice ?? a.consultationFee ?? 0,
                currency: a.currency ?? "ETB",
                notes: a.notes ?? "",
                patientName: a.patientName ?? "",
                patientPhone: a.patientPhone ?? "",
              }));
              setBookings(mapped);
              await AsyncStorage.setItem("bookings", JSON.stringify(mapped));
            }
          } catch {}

          // Load notifications from Supabase
          try {
            const remoteNotifs = await getNotifications(session.user.id);
            if (remoteNotifs.length > 0 && mounted) {
              setNotifications(
                remoteNotifs.map((n: any) => ({
                  id: n.id,
                  title: n.title,
                  body: n.body,
                  read: n.read,
                  createdAt: n.created_at,
                  type: (n.type ?? "info") as Notification["type"],
                }))
              );
            }
          } catch {}

          // Realtime notifications
          if (mounted) {
            const notifChannel = subscribeToNotifications(session.user.id, (n: any) => {
              if (!mounted) return;
              setNotifications((prev) => [
                {
                  id: n.id,
                  title: n.title,
                  body: n.body,
                  read: false,
                  createdAt: n.created_at,
                  type: (n.type ?? "info") as Notification["type"],
                },
                ...prev,
              ]);
            });
            notifUnsub = () => notifChannel.unsubscribe();

            // Realtime appointment status changes → fire "Booking Confirmed"
            const apptChannel = subscribeToClientBookings(
              session.user.id,
              (appt: any, eventType: string) => {
                if (!mounted || eventType !== "UPDATE") return;
                const newStatus: string = appt?.status ?? "";
                if (newStatus === "confirmed" || newStatus === "completed") {
                  const providerName: string = appt?.doctorName ?? "your provider";
                  const dateStr: string = appt?.date
                    ? new Date(appt.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                    : "";
                  const timeStr: string = appt?.date
                    ? new Date(appt.date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                    : "";
                  setNotifications((prev) => [
                    {
                      id: `confirm-${appt.id}-${Date.now()}`,
                      title: "✅ Booking Confirmed",
                      body: `Your appointment with ${providerName}${dateStr ? ` on ${dateStr}` : ""}${timeStr ? ` at ${timeStr}` : ""} has been confirmed by the doctor and admin.`,
                      read: false,
                      createdAt: new Date().toISOString(),
                      type: "booking" as Notification["type"],
                    },
                    ...prev,
                  ]);
                  // Also sync local booking status
                  setBookings((prev) =>
                    prev.map((b) =>
                      b.providerId === appt.doctorUserId
                        ? { ...b, status: newStatus === "confirmed" ? "confirmed" : "completed" }
                        : b
                    )
                  );
                }
              }
            );
            apptUnsub = () => apptChannel.unsubscribe();

            // Realtime provider approval — always active so the notification
            // fires even when the dashboard screen is not mounted
            if (role === "provider") {
              const provChannel = subscribeToProviderStatusChanges(
                session.user.id,
                async (newStatus: string, fullRecord: any) => {
                  if (!mounted) return;
                  // Update the user object in context so the whole app reflects it
                  setUserState((prev) =>
                    prev ? { ...prev, doctorStatus: newStatus } : prev
                  );
                  await AsyncStorage.setItem(
                    "user",
                    JSON.stringify({ ...restored, doctorStatus: newStatus })
                  );
                  if (newStatus === "Active") {
                    const provName: string = fullRecord?.name ?? "Doctor";
                    setNotifications((prev) => [
                      {
                        id: `approval-${Date.now()}`,
                        title: "🎉 Account Approved!",
                        body: `Congratulations ${provName}! Your provider account has been approved. You are now listed in the Pulse providers directory and patients can book with you.`,
                        read: false,
                        createdAt: new Date().toISOString(),
                        type: "approval" as Notification["type"],
                      },
                      ...prev,
                    ]);
                  } else if (newStatus === "Declined") {
                    setNotifications((prev) => [
                      {
                        id: `declined-${Date.now()}`,
                        title: "❌ Application Declined",
                        body: "Your provider application was not approved at this time. Please contact support for more information.",
                        read: false,
                        createdAt: new Date().toISOString(),
                        type: "info" as Notification["type"],
                      },
                      ...prev,
                    ]);
                  }
                }
              );
              provStatusUnsub = () => provChannel.unsubscribe();
            }
          }
        } else if (mounted) {
          const userRaw = await AsyncStorage.getItem("user");
          const roleRaw = await AsyncStorage.getItem("userRole");
          if (userRaw) setUserState(JSON.parse(userRaw));
          if (roleRaw) setUserRoleState(roleRaw as UserRole);
        }
      } catch {
        try {
          const [userRaw, roleRaw] = await Promise.all([
            AsyncStorage.getItem("user"),
            AsyncStorage.getItem("userRole"),
          ]);
          if (userRaw && mounted) setUserState(JSON.parse(userRaw));
          if (roleRaw && mounted) setUserRoleState(roleRaw as UserRole);
        } catch {}
      } finally {
        if (mounted) setIsSessionLoading(false);
      }
    };

    restoreSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_IN" && session?.user) {
        let doctorProfile: any = null;
        let instituteProfile2: any = null;
        try { doctorProfile = await getDoctorByUserId(session.user.id); } catch {}
        if (!doctorProfile) {
          try { instituteProfile2 = await getInstitutionByUserId(session.user.id); } catch {}
        }

        const role: UserRole = doctorProfile ? "provider" : instituteProfile2 ? "institute" : "client";
        const rawEmail2 = session.user.email ?? "";
        const isPhoneAuth2 = rawEmail2.endsWith("@pulse.app");
        const name = doctorProfile?.name ?? instituteProfile2?.name ?? session.user.user_metadata?.name ?? (isPhoneAuth2 ? "User" : rawEmail2.split("@")[0]) ?? "User";
        const phone2 = session.user.user_metadata?.phone ?? (isPhoneAuth2 ? rawEmail2.split("@")[0] : doctorProfile?.phone ?? instituteProfile2?.phone ?? "");

        const newUser: User = {
          id: session.user.id,
          name,
          email: isPhoneAuth2 ? "" : rawEmail2,
          phone: phone2,
          role,
          avatar: undefined,
          profileImageUploadId: doctorProfile?.profileImageUploadId ?? undefined,
          doctorStatus: doctorProfile?.status ?? undefined,
          instituteStatus: instituteProfile2?.status ?? undefined,
        };
        setUserState(newUser);
        setUserRoleState(role);
        await AsyncStorage.setItem("user", JSON.stringify(newUser));
        await AsyncStorage.setItem("userRole", role ?? "client");
      }

      if (event === "SIGNED_OUT") {
        setUserState(null);
        setUserRoleState(null);
        setBookings([]);
        setNotifications([]);
        await AsyncStorage.multiRemove(["user", "userRole", "bookings"]);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (notifUnsub) notifUnsub();
      if (apptUnsub) apptUnsub();
      if (provStatusUnsub) provStatusUnsub();
    };
  }, []);

  const setUserRole = async (role: UserRole) => {
    setUserRoleState(role);
    if (role) await AsyncStorage.setItem("userRole", role);
    else await AsyncStorage.removeItem("userRole");
  };

  const setUser = async (u: User | null) => {
    setUserState(u);
    if (u) await AsyncStorage.setItem("user", JSON.stringify(u));
    else await AsyncStorage.removeItem("user");
  };

  const addBooking = async (booking: Booking) => {
    const updated = [...bookings, booking];
    setBookings(updated);
    await AsyncStorage.setItem("bookings", JSON.stringify(updated));
  };

  const updateBooking = async (id: string, updates: Partial<Booking>) => {
    const updated = bookings.map((b) => (b.id === id ? { ...b, ...updates } : b));
    setBookings(updated);
    await AsyncStorage.setItem("bookings", JSON.stringify(updated));
  };

  const addNotification = (n: Notification) => {
    setNotifications((prev) => [n, ...prev]);
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (user?.id) {
      try { await markNotificationsRead(user.id); } catch {}
    }
  };

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem("isDark", next ? "true" : "false");
  };

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    setHasPickedLanguageState(true);
    await Promise.all([
      AsyncStorage.setItem("language", lang),
      AsyncStorage.setItem("hasPickedLanguage", "true"),
    ]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AppContext.Provider
      value={{
        user,
        userRole,
        setUserRole,
        setUser,
        bookings,
        addBooking,
        updateBooking,
        notifications,
        addNotification,
        markAllRead,
        unreadCount,
        isDark,
        toggleTheme,
        language,
        setLanguage,
        hasPickedLanguage,
        searchQuery,
        setSearchQuery,
        showAmbulance,
        setShowAmbulance,
        isSessionLoading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
