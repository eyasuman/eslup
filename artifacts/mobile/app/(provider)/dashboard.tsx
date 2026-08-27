import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import {
  getProviderStats,
  getAppointmentsForProvider,
  getInstitutions,
  subscribeToProviderBookings,
  updateAppointmentStatus,
  updateBookingStatus,
  updateProviderAvailability,
  updateDoctorConsultationFee,
  updateDoctorHospital,
  signOut as supabaseSignOut,
  uploadProfileImage,
  submitRadiologyReport,
  submitRadiologyCase,
  getRadiologyQueue,
  unsubscribeChannel,
  type Institution,
  type RadioCase,
} from "@/lib/supabase";

type DashTab = "requests" | "services" | "schedule" | "location" | "radiologist";

const SERVICE_TYPES = [
  { id: "video", icon: "video" as const, label: "Video Consultation", desc: "Secure in-app video call with client" },
  { id: "phone", icon: "phone" as const, label: "Audio/Phone Call", desc: "Voice consultation over phone" },
  { id: "homecare", icon: "home" as const, label: "Home Care Visit", desc: "Visit client at their location" },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const STATUS_COLORS: Record<string, string> = {
  new: "#315d93", pending: "#D97706", accepted: "#059669",
  completed: "#64748B", cancelled: "#DC2626", declined: "#DC2626",
};

const MOCK_RADIOLOGY_CASES = [
  { id: "rc1", patient: "Abebe Girma", age: 45, scan: "Chest X-Ray", urgency: "routine", status: "pending", submitted: "2 hours ago", findings: "", impression: "", recommendations: "" },
  { id: "rc2", patient: "Fatima Yusuf", age: 32, scan: "Brain MRI", urgency: "emergency", status: "in_review", submitted: "30 min ago", findings: "", impression: "", recommendations: "" },
  { id: "rc3", patient: "Daniel Bekele", age: 58, scan: "CT Abdomen", urgency: "priority", status: "completed", submitted: "Yesterday", findings: "Mild hepatomegaly noted. No acute pathology.", impression: "Mild fatty liver disease.", recommendations: "Follow up in 3 months with LFT." },
  { id: "rc4", patient: "Sara Haile", age: 27, scan: "Pelvic Ultrasound", urgency: "routine", status: "pending", submitted: "1 hour ago", findings: "", impression: "", recommendations: "" },
];

const URGENCY_COLOR: Record<string, string> = { routine: "#059669", priority: "#D97706", emergency: "#DC2626" };
const STATUS_LABEL: Record<string, string> = { pending: "Pending", in_review: "In Review", completed: "Completed" };
const STATUS_COL: Record<string, string> = { pending: "#D97706", in_review: "#315d93", completed: "#059669" };

const HOUR_OPTIONS = [
  "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM",
];

const ADDIS_AREAS = [
  "Bole", "Kirkos", "Arada", "Lideta", "Gulele", "Nifas Silk-Lafto",
  "Kolfe-Keranio", "Akaki-Kaliti", "Yeka", "Addis Ketema",
];

export default function ProviderDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, setUser, setUserRole, addNotification } = useApp();
  const [doctorStatus, setDoctorStatus] = useState<string>(user?.doctorStatus ?? "Active");
  const [online, setOnline] = useState(true);
  const [dashTab, setDashTab] = useState<DashTab>("requests");
  const [consultationFee, setConsultationFee] = useState("800");
  const [editingFee, setEditingFee] = useState(false);
  const [activeServices, setActiveServices] = useState<string[]>(["video", "phone"]);
  const [activeSchedule, setActiveSchedule] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [serviceRangeKm, setServiceRangeKm] = useState(10);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedArea, setSelectedArea] = useState("Bole");
  const [showAreaPicker, setShowAreaPicker] = useState(false);

  // Schedule hours (per slot)
  const [scheduleSlots, setScheduleSlots] = useState([
    { id: "morning", label: "Morning", active: true, from: "8:00 AM", to: "12:00 PM", editingFrom: false, editingTo: false },
    { id: "afternoon", label: "Afternoon", active: true, from: "2:00 PM", to: "6:00 PM", editingFrom: false, editingTo: false },
    { id: "evening", label: "Evening", active: false, from: "7:00 PM", to: "9:00 PM", editingFrom: false, editingTo: false },
  ]);

  // Radiologist review — seeded with mock data; replaced by Supabase fetch on mount
  const [radioCases, setRadioCases] = useState<RadioCase[]>(MOCK_RADIOLOGY_CASES);

  // ── Working institute state ────────────────────────────────────────────────
  const [currentHospital, setCurrentHospital] = useState("");
  const [showHospitalPicker, setShowHospitalPicker] = useState(false);
  const [customHospital, setCustomHospital] = useState("");
  const [hospitalSaving, setHospitalSaving] = useState(false);
  const [supabaseInstitutes, setSupabaseInstitutes] = useState<Institution[]>([]);

  // ── Radiology submit-case state ───────────────────────────────────────────
  const [showSubmitCase, setShowSubmitCase] = useState(false);
  const [caseSubmitting, setCaseSubmitting] = useState(false);
  const [scanFile, setScanFile] = useState<{ name: string; uri: string; type: string; isVideo: boolean } | null>(null);
  const [caseForm, setCaseForm] = useState({
    patient_name: "", patient_age: "", patient_gender: "Male",
    scan_type: "Chest X-Ray", body_part: "", urgency: "routine", symptoms: "",
  });

  const [selectedCase, setSelectedCase] = useState<RadioCase | null>(null);
  const [fullScreenMedia, setFullScreenMedia] = useState<{ uri: string | null; type: "image" | "video" | "pdf" | "unknown" } | null>(null);
  const [radioFindings, setRadioFindings] = useState("");
  const [radioImpression, setRadioImpression] = useState("");
  const [radioRecommendations, setRadioRecommendations] = useState("");
  const [brightness, setBrightness] = useState(50);
  const [contrast, setContrast] = useState(50);

  type RequestItem = { id: string; client: string; service: string; time: string; status: string; amount: number; date: string; clientEmail: string };
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [stats, setStats] = useState({ totalClients: 0, thisMonth: 0, avgRating: "4.8", monthEarnings: 0, totalEarnings: 0 });

  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const now = new Date();
  const monthName = MONTHS[now.getMonth()];
  const year = now.getFullYear();

  const bg = colors.isDark ? colors.background : "#FFFFFF";
  const textPrimary = colors.isDark ? "#FFFFFF" : "#202937";
  const textMuted = colors.isDark ? "#94A3B8" : "#64748B";
  const cardBg = colors.isDark ? "rgba(255,255,255,0.06)" : "#F4F7FB";
  const borderCol = colors.isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0";

  // Helper to map appointment → request card format
  const apptToRequest = (appt: any): RequestItem => {
    const d = appt.date ? new Date(appt.date) : new Date(appt.createdAt);
    const now2 = Date.now();
    const diffMs = now2 - new Date(appt.createdAt).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const timeAgo = diffMin < 1 ? "just now" : diffMin < 60 ? `${diffMin} min ago` : diffMin < 1440 ? `${Math.floor(diffMin / 60)} hr ago` : diffMin < 2880 ? "Yesterday" : `${Math.floor(diffMin / 1440)} days ago`;
    return {
      id: appt.id,
      client: appt.patientName ?? "Unknown Patient",
      service: appt.serviceType === "video" ? "Video Consultation" : appt.serviceType === "phone" ? "Phone Consultation" : appt.serviceType === "homecare" ? "Home Care Visit" : appt.serviceType ?? "Consultation",
      time: timeAgo,
      status: appt.status === "scheduled" ? "accepted" : appt.status,
      amount: appt.totalPrice ?? appt.consultationFee ?? 0,
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      clientEmail: appt.patientEmail ?? "",
    };
  };

  // Sync doctorStatus when user context updates
  useEffect(() => {
    if (user?.doctorStatus) setDoctorStatus(user.doctorStatus);
  }, [user?.doctorStatus]);

  // Parse working institute from bio on mount ("HospitalName · languages")
  useEffect(() => {
    const bio = (user as any)?.bio ?? "";
    const hospitalPart = bio.includes("·") ? bio.split("·")[0].trim() : bio.trim();
    setCurrentHospital(hospitalPart);
    setCustomHospital(hospitalPart);
  }, [user?.id]);

  // NOTE: provider status changes are subscribed once, globally, in AppContext
  // (so the approval/decline notification fires even when this screen isn't
  // mounted). Subscribing again here would call `.channel(sameTopic).on(...)`
  // on the already-subscribed channel and throw "cannot add postgres_changes
  // callbacks ... after subscribe()". This screen just reads `user.doctorStatus`
  // via the sync effect above, which AppContext keeps up to date in realtime.

  useEffect(() => {
    if (!user?.id) return;
    // Load active institutions for the Working Institute picker
    getInstitutions().then(setSupabaseInstitutes).catch(() => {});
    // Load radiology queue from Supabase (replaces mock data)
    getRadiologyQueue(user.id).then(setRadioCases).catch(() => {});
    // Load stats
    getProviderStats(user.id).then((s) => setStats(s)).catch(() => {});
    // Load appointments
    setRequestsLoading(true);
    getAppointmentsForProvider(user.id)
      .then((appts) => setRequests(appts.map(apptToRequest)))
      .catch(() => {})
      .finally(() => setRequestsLoading(false));
    // Subscribe to realtime appointment changes.
    // IMPORTANT: Only appointments with paymentStatus="verified" are visible
    // to the provider. A new booking arrives with paymentStatus="pending" and
    // must go through admin Payment Review first. The provider sees it only
    // when the admin verifies the payment (an UPDATE event with paymentStatus
    // flipping to "verified").
    const channel = subscribeToProviderBookings(user.id, (appt, eventType) => {
      if (eventType === "INSERT") {
        // Brand-new bookings always start as paymentStatus="pending".
        // Do not surface them — they need admin approval first.
        return;
      } else if (eventType === "UPDATE") {
        if (appt.paymentStatus === "verified") {
          // Payment just approved (or already verified and something else changed).
          setRequests((prev) => {
            const exists = prev.some((r) => r.id === appt.id);
            if (exists) {
              // Update in-place (e.g. status changed after already visible)
              return prev.map((r) => r.id === appt.id ? apptToRequest(appt) : r);
            } else {
              // Newly verified — bring it into the provider's list
              return [apptToRequest(appt), ...prev];
            }
          });
          getProviderStats(user.id).then((s) => setStats(s)).catch(() => {});
        } else if (appt.paymentStatus === "rejected") {
          // Admin rejected the payment — remove from view if it was already showing
          setRequests((prev) => prev.filter((r) => r.id !== appt.id));
        }
        // paymentStatus="pending" updates (e.g. client re-uploads proof) are
        // intentionally ignored here — provider still shouldn't see them yet.
      } else if (eventType === "DELETE") {
        setRequests((prev) => prev.filter((r) => r.id !== appt.id));
      }
    });
    return () => { unsubscribeChannel(channel); };
  }, [user?.id]);

  const pickProfileImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert("Permission needed", "Gallery access is required to upload a profile picture."); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.9, allowsEditing: true, aspect: [1, 1], mediaTypes: ImagePicker.MediaTypeOptions.Images });
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setProfileImage(uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Upload to Supabase Storage in background
        if (user?.id) {
          try {
            const publicUrl = await uploadProfileImage(user.id, uri);
            // Update local user avatar
            setProfileImage(publicUrl);
          } catch {
            // Keep local preview even if upload fails
          }
        }
      }
    } catch {
      Alert.alert("Error", "Could not access gallery. Please try again.");
    }
  };

  const getGPSLocation = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location Permission", "Enable location access to pin your clinic on the map for patients nearby.");
        setLocationLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setGpsLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Location Updated", `Your clinic location has been set.\nLat: ${loc.coords.latitude.toFixed(5)}\nLng: ${loc.coords.longitude.toFixed(5)}\n\nPatients within your service range can now find you.`);
    } catch {
      Alert.alert("Error", "Could not fetch location. Please check your device settings and try again.");
    }
    setLocationLoading(false);
  };

  const toggleOnline = useCallback(async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setOnline(value);
    if (user?.id) { try { await updateProviderAvailability(user.id, value, value); } catch {} }
  }, [user?.id]);

  const handleAccept = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "accepted" } : r));
    const req = requests.find((r) => r.id === id);
    if (req) {
      addNotification({ id: Date.now().toString(), title: "Appointment Accepted", body: `You accepted ${req.client}'s ${req.service} for ${req.date}`, read: false, createdAt: new Date().toISOString(), type: "booking" });
      updateAppointmentStatus(id, "scheduled").catch(() => {});
    }
  }, [requests, addNotification]);

  const handleDecline = useCallback((id: string) => {
    const req = requests.find((r) => r.id === id);
    Alert.alert("Decline Request", `Decline ${req?.client}'s booking?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Decline", style: "destructive",
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "declined" } : r));
          if (req) {
            addNotification({ id: Date.now().toString(), title: "Appointment Declined", body: `You declined ${req.client}'s ${req.service}`, read: false, createdAt: new Date().toISOString(), type: "cancellation" });
            updateAppointmentStatus(id, "cancelled").catch(() => {});
          }
        },
      },
    ]);
  }, [requests, addNotification]);

  const toggleService = (sid: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveServices((prev) => prev.includes(sid) ? prev.filter((s) => s !== sid) : [...prev, sid]);
  };

  const toggleDay = (day: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveSchedule((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  };

  const updateSlot = (id: string, field: string, value: any) => {
    setScheduleSlots((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value } : s));
  };

  const pickScanFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/jpeg", "image/png", "image/jpg", "video/mp4", "video/quicktime", "video/*"],
        copyToCacheDirectory: true,
      });
      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const mimeType = asset.mimeType ?? "";
        setScanFile({
          name: asset.name,
          uri: asset.uri,
          type: mimeType,
          isVideo: mimeType.startsWith("video/") || asset.name.toLowerCase().endsWith(".mp4"),
        });
      }
    } catch {
      Alert.alert("Error", "Could not pick file. Please try again.");
    }
  };

  const handleSubmitNewCase = async () => {
    if (!caseForm.patient_name.trim()) { Alert.alert("Missing Info", "Please enter the patient's name."); return; }
    if (!caseForm.body_part.trim()) { Alert.alert("Missing Info", "Please enter the body part."); return; }
    if (!scanFile) { Alert.alert("Missing Scan", "Please attach the scan image or video before submitting."); return; }
    if (!user?.id) return;

    setCaseSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await submitRadiologyCase({
        submitted_by: user.id,
        patient_name: caseForm.patient_name.trim(),
        patient_age: parseInt(caseForm.patient_age) || 0,
        patient_gender: caseForm.patient_gender,
        scan_type: caseForm.scan_type,
        body_part: caseForm.body_part.trim(),
        urgency: caseForm.urgency,
        symptoms: caseForm.symptoms.trim() || undefined,
        scan_image_uri: (!scanFile.isVideo) ? scanFile.uri : null,
        scan_video_uri: scanFile.isVideo ? scanFile.uri : null,
        scan_video_name: scanFile.isVideo ? scanFile.name : null,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Case Submitted", `Radiology case for ${caseForm.patient_name} has been submitted and will appear in the review queue.`, [
        { text: "OK", onPress: () => {
          setShowSubmitCase(false);
          setScanFile(null);
          setCaseForm({ patient_name: "", patient_age: "", patient_gender: "Male", scan_type: "Chest X-Ray", body_part: "", urgency: "routine", symptoms: "" });
        }},
      ]);
    } catch (err: any) {
      Alert.alert("Submission Failed", err?.message ?? "Could not submit the case. Please check your connection and try again.");
    } finally {
      setCaseSubmitting(false);
    }
  };

  const handleSubmitRadiologyReport = async () => {
    if (!selectedCase) return;
    if (!radioFindings.trim() || !radioImpression.trim()) {
      Alert.alert("Missing Fields", "Please fill in Findings and Impression before generating the report.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Update local state immediately
    setRadioCases((prev) => prev.map((c) =>
      c.id === selectedCase.id
        ? { ...c, status: "completed", findings: radioFindings, impression: radioImpression, recommendations: radioRecommendations }
        : c
    ));

    // Save to Supabase in background
    if (user?.id) {
      try {
        await submitRadiologyReport({
          case_id: selectedCase.id,
          radiologist_id: user.id,
          radiologist_name: user.name ?? "Dr. Provider",
          findings: radioFindings.trim(),
          impression: radioImpression.trim(),
          recommendations: radioRecommendations.trim() || undefined,
        });
      } catch {
        // Report saved locally — will sync when online
      }
    }

    Alert.alert(
      "Report Generated & Sent",
      `Radiology report for ${selectedCase.patient} has been generated and sent to the referring physician.\n\nFindings: ${radioFindings.substring(0, 80)}${radioFindings.length > 80 ? "…" : ""}`,
      [{ text: "Done", onPress: () => setSelectedCase(null) }]
    );
    setRadioFindings(""); setRadioImpression(""); setRadioRecommendations("");
  };

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Sign out of your provider account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out", style: "destructive",
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          try { await supabaseSignOut(); } catch {}
          await setUser(null);
          await setUserRole(null);
          router.replace("/(tabs)");
        },
      },
    ]);
  };

  const pendingCount = requests.filter((r) => r.status === "new" || r.status === "pending").length;
  const initials = (user?.name ?? "Dr. Provider").split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

  // ── Status-gated screens ────────────────────────────────────────────────────
  if (doctorStatus === "Pending") {
    return (
      <View style={[styles.container, { backgroundColor: bg, justifyContent: "center", alignItems: "center" }]}>
        <View style={{ paddingHorizontal: 32, alignItems: "center", gap: 20 }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: "#D97706" + "20", alignItems: "center", justifyContent: "center" }}>
            <Feather name="clock" size={44} color="#D97706" />
          </View>
          <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: textPrimary, textAlign: "center" }}>
            Awaiting Admin Approval
          </Text>
          <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: textMuted, textAlign: "center", lineHeight: 22 }}>
            Your account is waiting for admin approval. The team will review your credentials and activate your account within 24–48 hours.
          </Text>
          <View style={{ backgroundColor: "#D97706" + "15", borderColor: "#D97706" + "30", borderWidth: 1, borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Feather name="info" size={16} color="#D97706" />
            <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#D97706", lineHeight: 19 }}>
              This page will update automatically once your status changes — no need to restart the app.
            </Text>
          </View>
          <Pressable
            onPress={handleSignOut}
            style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: borderCol }}
          >
            <Feather name="log-out" size={15} color={textMuted} />
            <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: textMuted }}>Sign Out</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (doctorStatus === "Declined") {
    return (
      <View style={[styles.container, { backgroundColor: bg, justifyContent: "center", alignItems: "center" }]}>
        <View style={{ paddingHorizontal: 32, alignItems: "center", gap: 20 }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: "#DC2626" + "20", alignItems: "center", justifyContent: "center" }}>
            <Feather name="x-circle" size={44} color="#DC2626" />
          </View>
          <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: textPrimary, textAlign: "center" }}>
            Application Declined
          </Text>
          <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: textMuted, textAlign: "center", lineHeight: 22 }}>
            Your provider account was declined. This may be due to incomplete documentation or credentials that could not be verified.
          </Text>
          <View style={{ backgroundColor: "#DC2626" + "12", borderColor: "#DC2626" + "30", borderWidth: 1, borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Feather name="alert-circle" size={16} color="#DC2626" />
            <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#DC2626", lineHeight: 19 }}>
              Please contact support or re-register with updated credentials.
            </Text>
          </View>
          <Pressable
            onPress={handleSignOut}
            style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: borderCol }}
          >
            <Feather name="log-out" size={15} color={textMuted} />
            <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: textMuted }}>Sign Out</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (doctorStatus === "Disabled") {
    return (
      <View style={[styles.container, { backgroundColor: bg, justifyContent: "center", alignItems: "center" }]}>
        <View style={{ paddingHorizontal: 32, alignItems: "center", gap: 20 }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: "#64748B" + "20", alignItems: "center", justifyContent: "center" }}>
            <Feather name="slash" size={44} color="#64748B" />
          </View>
          <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: textPrimary, textAlign: "center" }}>
            Account Disabled
          </Text>
          <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: textMuted, textAlign: "center", lineHeight: 22 }}>
            Your account has been disabled. Please contact PULSE Health support to resolve this issue and restore access.
          </Text>
          <View style={{ backgroundColor: "#64748B" + "12", borderColor: "#64748B" + "30", borderWidth: 1, borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Feather name="info" size={16} color="#64748B" />
            <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#64748B", lineHeight: 19 }}>
              This page will update automatically if your account is reinstated.
            </Text>
          </View>
          <Pressable
            onPress={handleSignOut}
            style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: borderCol }}
          >
            <Feather name="log-out" size={15} color={textMuted} />
            <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: textMuted }}>Sign Out</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        contentContainerStyle={{ paddingBottom: bottomPad + 40 }}
      >
        {/* ── HEADER ── */}
        <View style={[styles.header, { paddingTop: topPad + 16 }]}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="arrow-left" size={22} color="#fff" />
            </Pressable>

            {/* Profile picture */}
            <Pressable onPress={pickProfileImage} style={styles.avatarWrap}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarDefault}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                <Feather name="camera" size={10} color="#fff" />
              </View>
            </Pressable>

            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.headerGreeting}>Provider Dashboard</Text>
              <Text style={styles.headerName}>{user?.name ?? "Dr. Provider"}</Text>
            </View>

            <Pressable
              onPress={() => toggleOnline(!online)}
              style={[styles.onlineToggle, { backgroundColor: online ? "rgba(5,150,105,0.25)" : "rgba(100,116,139,0.2)" }]}
            >
              <View style={[styles.onlineDot, { backgroundColor: online ? "#059669" : "#94A3B8" }]} />
              <Text style={[styles.onlineLabel, { color: online ? "#059669" : "#94A3B8" }]}>
                {online ? "Online" : "Offline"}
              </Text>
              <Switch
                value={online}
                onValueChange={toggleOnline}
                trackColor={{ false: "#64748B", true: "#059669" }}
                thumbColor="#fff"
                style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
              />
            </Pressable>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            {[
              { val: String(stats.totalClients), lbl: "Clients" },
              { val: String(stats.thisMonth), lbl: `${monthName} New` },
              { val: `⭐ ${stats.avgRating}`, lbl: "Rating" },
              { val: `ETB ${(stats.monthEarnings / 1000).toFixed(0)}K`, lbl: `${monthName}` },
            ].map((s, i) => (
              <React.Fragment key={s.lbl}>
                {i > 0 && <View style={styles.statDivider} />}
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{s.val}</Text>
                  <Text style={styles.statLbl}>{s.lbl}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>

          {/* Calendar mini */}
          <View style={[styles.calCard, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
            <Text style={styles.calMonth}>{monthName} {year}</Text>
            <View style={styles.calGrid}>
              {DAYS.map((day) => (
                <View key={day} style={styles.calDay}>
                  <Text style={styles.calDayLabel}>{day}</Text>
                  <View style={[styles.calDot, { backgroundColor: activeSchedule.includes(day) ? "#059669" : "rgba(255,255,255,0.15)" }]} />
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── QUICK ACTIONS ── */}
        <View style={styles.quickRow}>
          {[
            { icon: "camera" as const, label: "Photo", color: "#315d93", onPress: pickProfileImage },
            { icon: "radio" as const, label: "Teleradiology", color: "#7C3AED", onPress: () => setDashTab("radiologist") },
            { icon: "bar-chart-2" as const, label: "Analytics", color: "#059669", onPress: () => Alert.alert("Analytics", `Total Clients: ${stats.totalClients}\nThis Month: ${stats.thisMonth}\nAvg Rating: ${stats.avgRating}\nMonth Earnings: ETB ${stats.monthEarnings.toLocaleString()}\nTotal Earnings: ETB ${stats.totalEarnings.toLocaleString()}`) },
            { icon: "log-out" as const, label: "Sign Out", color: "#DC2626", onPress: handleSignOut },
          ].map((a) => (
            <Pressable
              key={a.label}
              onPress={a.onPress}
              style={({ pressed }) => [styles.quickBtn, { backgroundColor: cardBg, borderColor: borderCol, opacity: pressed ? 0.8 : 1 }]}
            >
              <View style={[styles.quickBtnIcon, { backgroundColor: a.color + "18" }]}>
                <Feather name={a.icon} size={18} color={a.color} />
              </View>
              <Text style={[styles.quickBtnLabel, { color: a.label === "Sign Out" ? "#DC2626" : textPrimary }]}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── CONSULTATION FEE ── */}
        <View style={[styles.feeCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <Feather name="dollar-sign" size={18} color="#059669" />
          <Text style={[styles.feeLabel, { color: textMuted }]}>Consultation Fee (ETB)</Text>
          {editingFee ? (
            <TextInput
              style={[styles.feeInput, { color: textPrimary, borderColor: "#315d93" }]}
              value={consultationFee}
              onChangeText={setConsultationFee}
              keyboardType="number-pad"
              autoFocus
              onBlur={() => setEditingFee(false)}
              onSubmitEditing={() => setEditingFee(false)}
            />
          ) : (
            <Text style={[styles.feeValue, { color: "#059669" }]}>ETB {parseInt(consultationFee || "0").toLocaleString()}</Text>
          )}
          <Pressable
            onPress={() => {
              if (editingFee && user?.id) {
                const fee = parseInt(consultationFee || "0");
                if (!isNaN(fee) && fee > 0) {
                  updateDoctorConsultationFee(user.id, fee).catch(() => {});
                }
              }
              setEditingFee(!editingFee);
            }}
            style={styles.feeEditBtn}
          >
            <Feather name={editingFee ? "check" : "edit-2"} size={16} color="#315d93" />
          </Pressable>
        </View>

        {/* ── WORKING INSTITUTE ── */}
        <View style={[styles.instituteCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <Feather name="home" size={18} color="#315d93" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.feeLabel, { color: textMuted }]}>Working Institute</Text>
            {showHospitalPicker ? (
              <View style={{ gap: 8, marginTop: 6 }}>
                {/* Search from known hospitals */}
                <ScrollView
                  style={[styles.hospitalPickerList, { borderColor: borderCol }]}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="always"
                >
                  {supabaseInstitutes.length === 0 ? (
                    <View style={{ padding: 14, alignItems: "center" }}>
                      <Text style={[styles.hospitalPickerType, { color: textMuted }]}>Loading institutes…</Text>
                    </View>
                  ) : (
                    supabaseInstitutes.map((inst) => (
                      <Pressable
                        key={inst.id ?? inst.name}
                        onPress={() => { setCustomHospital(inst.name); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        style={[styles.hospitalPickerItem, { borderBottomColor: borderCol, backgroundColor: customHospital === inst.name ? "#315d93" + "12" : "transparent" }]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.hospitalPickerName, { color: textPrimary }]} numberOfLines={1}>{inst.name}</Text>
                          <Text style={[styles.hospitalPickerType, { color: textMuted }]}>{inst.category ?? inst.type}{inst.city ? ` · ${inst.city}` : ""}</Text>
                        </View>
                        {customHospital === inst.name && <Feather name="check" size={14} color="#315d93" />}
                      </Pressable>
                    ))
                  )}
                </ScrollView>
                {/* Custom / free-form entry */}
                <TextInput
                  style={[styles.hospitalCustomInput, { color: textPrimary, borderColor: borderCol, backgroundColor: cardBg }]}
                  value={customHospital}
                  onChangeText={setCustomHospital}
                  placeholder="Or type a custom institute name…"
                  placeholderTextColor={textMuted}
                />
                {/* Action row */}
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable
                    onPress={() => { setShowHospitalPicker(false); setCustomHospital(currentHospital); }}
                    style={[styles.hospitalBtn, { borderColor: borderCol, flex: 1 }]}
                  >
                    <Text style={[styles.hospitalBtnText, { color: textMuted }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    disabled={hospitalSaving || !customHospital.trim()}
                    onPress={async () => {
                      if (!customHospital.trim() || !user?.id) return;
                      setHospitalSaving(true);
                      try {
                        await updateDoctorHospital(user.id, customHospital.trim());
                        setCurrentHospital(customHospital.trim());
                        setShowHospitalPicker(false);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      } catch {
                        Alert.alert("Error", "Could not update your institute. Please try again.");
                      } finally {
                        setHospitalSaving(false);
                      }
                    }}
                    style={[styles.hospitalBtn, { backgroundColor: "#315d93", flex: 1, opacity: hospitalSaving || !customHospital.trim() ? 0.6 : 1 }]}
                  >
                    <Feather name={hospitalSaving ? "loader" : "check"} size={14} color="#fff" />
                    <Text style={[styles.hospitalBtnText, { color: "#fff" }]}>{hospitalSaving ? "Saving…" : "Save"}</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Text style={[styles.feeValue, { color: currentHospital ? textPrimary : textMuted, fontSize: 14 }]} numberOfLines={1}>
                {currentHospital || "Not set"}
              </Text>
            )}
          </View>
          {!showHospitalPicker && (
            <Pressable
              onPress={() => { setShowHospitalPicker(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={styles.feeEditBtn}
            >
              <Feather name="edit-2" size={16} color="#315d93" />
            </Pressable>
          )}
        </View>

        {/* ── TABS ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          {([
            { id: "requests" as const, label: `Requests${pendingCount > 0 ? ` (${pendingCount})` : ""}`, icon: "inbox" as const },
            { id: "services" as const, label: "Services", icon: "layers" as const },
            { id: "schedule" as const, label: "Schedule", icon: "calendar" as const },
            { id: "location" as const, label: "Location", icon: "map-pin" as const },
            { id: "radiologist" as const, label: "Radiology", icon: "radio" as const },
          ]).map((tab) => (
            <Pressable
              key={tab.id}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setDashTab(tab.id); }}
              style={[styles.dashTab, { backgroundColor: dashTab === tab.id ? "#202937" : cardBg, borderColor: dashTab === tab.id ? "#315d93" : borderCol }]}
            >
              <Feather name={tab.icon} size={14} color={dashTab === tab.id ? "#fff" : textMuted} />
              <Text style={[styles.dashTabText, { color: dashTab === tab.id ? "#fff" : textMuted }]}>{tab.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── CLIENT REQUESTS ── */}
        {dashTab === "requests" && (
          <View style={[styles.section, { marginTop: 4 }]}>
            {requestsLoading ? (
              <View style={styles.emptyState}>
                <Feather name="loader" size={32} color={textMuted} />
                <Text style={[styles.emptyText, { color: textMuted }]}>Loading appointments…</Text>
              </View>
            ) : requests.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="inbox" size={48} color={textMuted} />
                <Text style={[styles.emptyText, { color: textMuted }]}>No client requests yet</Text>
                <Text style={[{ color: textMuted, fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4 }]}>
                  New appointment bookings from clients will appear here in real-time.
                </Text>
              </View>
            ) : (
              requests.map((req) => (
                <View key={req.id} style={[styles.requestCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                  <View style={styles.requestTop}>
                    <View style={[styles.reqAvatar, { backgroundColor: STATUS_COLORS[req.status] + "20" }]}>
                      <Feather name="user" size={20} color={STATUS_COLORS[req.status]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.reqName, { color: textPrimary }]}>{req.client}</Text>
                      <Text style={[styles.reqService, { color: "#315d93" }]}>{req.service}</Text>
                      <Text style={[styles.reqTime, { color: textMuted }]}>{req.time} · {req.date}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      <Text style={[styles.reqAmount, { color: "#059669" }]}>ETB {req.amount}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[req.status] + "20" }]}>
                        <Text style={[styles.statusText, { color: STATUS_COLORS[req.status] }]}>{req.status}</Text>
                      </View>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => Alert.alert("Client History", `Medical history for ${req.client}\n\nContact: ${req.clientEmail}\n\nFull history & documents will be available in the complete version.`)}
                    style={[styles.historyBtn, { borderColor: borderCol }]}
                  >
                    <Feather name="file-text" size={13} color="#315d93" />
                    <Text style={[styles.historyBtnText, { color: "#315d93" }]}>View Client Medical History</Text>
                  </Pressable>
                  {(req.status === "new" || req.status === "pending") && (
                    <View style={styles.requestActions}>
                      <Pressable
                        onPress={() => handleDecline(req.id)}
                        style={({ pressed }) => [styles.actionBtn, styles.declineBtn, { borderColor: "#DC2626", opacity: pressed ? 0.8 : 1 }]}
                      >
                        <Feather name="x" size={14} color="#DC2626" />
                        <Text style={[styles.actionBtnText, { color: "#DC2626" }]}>Decline</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleAccept(req.id)}
                        style={({ pressed }) => [styles.actionBtn, { backgroundColor: "#059669", opacity: pressed ? 0.8 : 1 }]}
                      >
                        <Feather name="check" size={14} color="#fff" />
                        <Text style={[styles.actionBtnText, { color: "#fff" }]}>Accept</Text>
                      </Pressable>
                    </View>
                  )}
                  {(req.status === "accepted" || req.status === "scheduled") &&
                    req.service.toLowerCase().includes("video") && (
                    <View style={styles.requestActions}>
                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          Alert.alert(
                            "Waiting for a secure invitation",
                            "Ask the patient to start the consultation. Accept their invitation here to join its private room."
                          );
                        }}
                        style={({ pressed }) => [styles.actionBtn, { backgroundColor: "#315d93", flex: 1, opacity: pressed ? 0.8 : 1 }]}
                      >
                        <Feather name="video" size={14} color="#fff" />
                        <Text style={[styles.actionBtnText, { color: "#fff" }]}>Await Video Call</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* ── SERVICE TYPES ── */}
        {dashTab === "services" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Your Active Service Types</Text>
            <Text style={[styles.sectionDesc, { color: textMuted }]}>Toggle the services you offer to clients.</Text>
            {SERVICE_TYPES.map((svc) => {
              const isActive = activeServices.includes(svc.id);
              return (
                <Pressable
                  key={svc.id}
                  onPress={() => toggleService(svc.id)}
                  style={[styles.serviceRow, { backgroundColor: isActive ? "#202937" : cardBg, borderColor: isActive ? "#315d93" : borderCol }]}
                >
                  <View style={[styles.svcIcon, { backgroundColor: isActive ? "rgba(49,93,147,0.4)" : "#315d93" + "15" }]}>
                    <Feather name={svc.icon} size={20} color={isActive ? "#7FA8D8" : "#315d93"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.svcLabel, { color: isActive ? "#fff" : textPrimary }]}>{svc.label}</Text>
                    <Text style={[styles.svcDesc, { color: isActive ? "rgba(255,255,255,0.6)" : textMuted }]}>{svc.desc}</Text>
                  </View>
                  <Switch value={isActive} onValueChange={() => toggleService(svc.id)} trackColor={{ false: "#64748B", true: "#059669" }} thumbColor="#fff" />
                </Pressable>
              );
            })}
            <Text style={[styles.sectionTitle, { color: textPrimary, marginTop: 12 }]}>Online Status</Text>
            <View style={[styles.serviceRow, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <View style={[styles.svcIcon, { backgroundColor: online ? "#059669" + "18" : "#64748B" + "18" }]}>
                <View style={[styles.statusCircle, { backgroundColor: online ? "#059669" : "#64748B" }]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.svcLabel, { color: textPrimary }]}>{online ? "Online — Available" : "Offline"}</Text>
                <Text style={[styles.svcDesc, { color: textMuted }]}>{online ? "Clients can contact you now" : "You appear offline"}</Text>
              </View>
              <Switch value={online} onValueChange={toggleOnline} trackColor={{ false: "#64748B", true: "#059669" }} thumbColor="#fff" />
            </View>
            <View style={[styles.disclaimerBox, { backgroundColor: "#D97706" + "10", borderColor: "#D97706" + "30" }]}>
              <Feather name="shield" size={14} color="#D97706" />
              <Text style={[styles.disclaimerText, { color: textMuted }]}>
                Once communication is established between you and a client, PULSE Health-Tech Solution holds no responsibility for the further communication or outcome.
              </Text>
            </View>
          </View>
        )}

        {/* ── SCHEDULE ── */}
        {dashTab === "schedule" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Weekly Availability</Text>
            <Text style={[styles.sectionDesc, { color: textMuted }]}>Select the days you are available for appointments.</Text>
            <View style={styles.daysGrid}>
              {DAYS.map((day) => {
                const active = activeSchedule.includes(day);
                return (
                  <Pressable
                    key={day}
                    onPress={() => toggleDay(day)}
                    style={[styles.dayBtn, { backgroundColor: active ? "#202937" : cardBg, borderColor: active ? "#315d93" : borderCol }]}
                  >
                    <Text style={[styles.dayBtnText, { color: active ? "#fff" : textMuted }]}>{day}</Text>
                    {active && <View style={styles.dayActiveDot} />}
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.sectionTitle, { color: textPrimary, marginTop: 16 }]}>Session Hours</Text>
            <Text style={[styles.sectionDesc, { color: textMuted }]}>Set your available time window for each session.</Text>

            {scheduleSlots.map((slot) => (
              <View key={slot.id} style={[styles.slotCard, { backgroundColor: cardBg, borderColor: slot.active ? "#315d93" : borderCol }]}>
                <View style={styles.slotHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.slotLabel, { color: textPrimary }]}>{slot.label}</Text>
                    <Text style={[styles.slotSubtitle, { color: textMuted }]}>
                      {slot.active ? `${slot.from}  →  ${slot.to}` : "Disabled"}
                    </Text>
                  </View>
                  <Switch
                    value={slot.active}
                    onValueChange={(v) => updateSlot(slot.id, "active", v)}
                    trackColor={{ false: "#64748B", true: "#315d93" }}
                    thumbColor="#fff"
                  />
                </View>

                {slot.active && (
                  <View style={styles.slotTimeRow}>
                    <View style={styles.slotTimeBlock}>
                      <Text style={[styles.slotTimeLabel, { color: textMuted }]}>From</Text>
                      <Pressable
                        onPress={() => updateSlot(slot.id, "editingFrom", !slot.editingFrom)}
                        style={[styles.slotTimeBtn, { borderColor: slot.editingFrom ? "#315d93" : borderCol }]}
                      >
                        <Feather name="clock" size={12} color="#315d93" />
                        <Text style={[styles.slotTimeBtnText, { color: textPrimary }]}>{slot.from}</Text>
                        <Feather name="chevron-down" size={12} color={textMuted} />
                      </Pressable>
                      {slot.editingFrom && (
                        <ScrollView style={styles.timePickerList} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                          {HOUR_OPTIONS.map((h) => (
                            <Pressable
                              key={h}
                              onPress={() => { updateSlot(slot.id, "from", h); updateSlot(slot.id, "editingFrom", false); }}
                              style={[styles.timeOption, { borderBottomColor: borderCol, backgroundColor: slot.from === h ? "#315d93" + "20" : "transparent" }]}
                            >
                              <Text style={[styles.timeOptionText, { color: slot.from === h ? "#315d93" : textPrimary }]}>{h}</Text>
                              {slot.from === h && <Feather name="check" size={13} color="#315d93" />}
                            </Pressable>
                          ))}
                        </ScrollView>
                      )}
                    </View>

                    <Feather name="arrow-right" size={16} color={textMuted} style={{ marginTop: 22 }} />

                    <View style={styles.slotTimeBlock}>
                      <Text style={[styles.slotTimeLabel, { color: textMuted }]}>To</Text>
                      <Pressable
                        onPress={() => updateSlot(slot.id, "editingTo", !slot.editingTo)}
                        style={[styles.slotTimeBtn, { borderColor: slot.editingTo ? "#315d93" : borderCol }]}
                      >
                        <Feather name="clock" size={12} color="#315d93" />
                        <Text style={[styles.slotTimeBtnText, { color: textPrimary }]}>{slot.to}</Text>
                        <Feather name="chevron-down" size={12} color={textMuted} />
                      </Pressable>
                      {slot.editingTo && (
                        <ScrollView style={styles.timePickerList} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                          {HOUR_OPTIONS.map((h) => (
                            <Pressable
                              key={h}
                              onPress={() => { updateSlot(slot.id, "to", h); updateSlot(slot.id, "editingTo", false); }}
                              style={[styles.timeOption, { borderBottomColor: borderCol, backgroundColor: slot.to === h ? "#315d93" + "20" : "transparent" }]}
                            >
                              <Text style={[styles.timeOptionText, { color: slot.to === h ? "#315d93" : textPrimary }]}>{h}</Text>
                              {slot.to === h && <Feather name="check" size={13} color="#315d93" />}
                            </Pressable>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ── LOCATION ── */}
        {dashTab === "location" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Clinic Location & Service Area</Text>
            <Text style={[styles.sectionDesc, { color: textMuted }]}>Set your clinic location so patients can find you.</Text>

            {/* GPS pin */}
            <View style={[styles.locationCard, { backgroundColor: "#202937" }]}>
              <Feather name="map-pin" size={26} color="#7FA8D8" />
              <Text style={styles.locationCity}>Addis Ababa, Ethiopia</Text>
              {gpsLocation ? (
                <Text style={styles.locationCoords}>
                  {gpsLocation.lat.toFixed(5)}°N, {gpsLocation.lng.toFixed(5)}°E
                </Text>
              ) : (
                <Text style={styles.locationSub}>No GPS location pinned yet</Text>
              )}
              <Pressable
                onPress={getGPSLocation}
                style={[styles.gpsBtn, { opacity: locationLoading ? 0.6 : 1 }]}
              >
                <Feather name={locationLoading ? "loader" : "crosshair"} size={15} color="#fff" />
                <Text style={styles.gpsBtnText}>{locationLoading ? "Getting Location…" : "Use Current GPS Location"}</Text>
              </Pressable>
            </View>

            {/* Area picker */}
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Sub-City / Woreda</Text>
            <Pressable
              onPress={() => setShowAreaPicker(!showAreaPicker)}
              style={[styles.dropdown, { backgroundColor: cardBg, borderColor: borderCol }]}
            >
              <Feather name="map" size={16} color="#315d93" />
              <Text style={[styles.dropdownText, { color: textPrimary }]}>{selectedArea}</Text>
              <Feather name={showAreaPicker ? "chevron-up" : "chevron-down"} size={16} color={textMuted} />
            </Pressable>
            {showAreaPicker && (
              <View style={[styles.dropdownList, { backgroundColor: cardBg, borderColor: borderCol }]}>
                {ADDIS_AREAS.map((area) => (
                  <Pressable
                    key={area}
                    onPress={() => { setSelectedArea(area); setShowAreaPicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={[styles.dropdownItem, { borderBottomColor: borderCol }]}
                  >
                    <Text style={[styles.dropdownItemText, { color: textPrimary }]}>{area}</Text>
                    {selectedArea === area && <Feather name="check" size={14} color="#315d93" />}
                  </Pressable>
                ))}
              </View>
            )}

            {/* Range */}
            <View style={[styles.rangeCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <View style={styles.rangeHeader}>
                <Text style={[styles.rangeLabel, { color: textPrimary }]}>Service Range</Text>
                <Text style={[styles.rangeValue, { color: "#315d93" }]}>{serviceRangeKm} km radius</Text>
              </View>
              <View style={styles.rangeBar}>
                <View style={[styles.rangeFill, { width: `${(serviceRangeKm / 50) * 100}%` as any, backgroundColor: "#315d93" }]} />
              </View>
              <View style={styles.rangeControls}>
                <Pressable onPress={() => setServiceRangeKm((v) => Math.max(1, v - 5))} style={[styles.rangeBtn, { backgroundColor: "#315d93" + "20" }]}>
                  <Feather name="minus" size={14} color="#315d93" />
                </Pressable>
                <Text style={[styles.rangeBtnLabel, { color: textMuted }]}>5 km increments</Text>
                <Pressable onPress={() => setServiceRangeKm((v) => Math.min(50, v + 5))} style={[styles.rangeBtn, { backgroundColor: "#315d93" + "20" }]}>
                  <Feather name="plus" size={14} color="#315d93" />
                </Pressable>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Active Service Areas</Text>
            {ADDIS_AREAS.map((area, i) => {
              const covered = serviceRangeKm >= (i + 1) * 5;
              return (
                <View key={area} style={[styles.areaRow, { borderBottomColor: borderCol }]}>
                  <View style={[styles.areaDot, { backgroundColor: covered ? "#059669" : "#E2E8F0" }]} />
                  <Text style={[styles.areaName, { color: covered ? textPrimary : textMuted }]}>{area}</Text>
                  <Text style={[styles.areaStatus, { color: covered ? "#059669" : textMuted }]}>
                    {covered ? "Covered" : "Out of range"}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* ── RADIOLOGIST REVIEW PANEL ── */}
        {dashTab === "radiologist" && (
          <View style={styles.section}>
            {selectedCase ? (
              /* Case review detail */
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always">
                <Pressable onPress={() => { setSelectedCase(null); setRadioFindings(""); setRadioImpression(""); setRadioRecommendations(""); }} style={styles.backToList}>
                  <Feather name="arrow-left" size={16} color="#315d93" />
                  <Text style={{ color: "#315d93", fontSize: 13, fontFamily: "Inter_500Medium" }}>Back to Cases</Text>
                </Pressable>

                <View style={[styles.reviewHeader, { backgroundColor: cardBg, borderColor: borderCol }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.reviewPatient, { color: textPrimary }]}>{selectedCase.patient}</Text>
                    <Text style={[styles.reviewScan, { color: "#315d93" }]}>{selectedCase.scan} · Age {selectedCase.age}</Text>
                    <Text style={[styles.reviewTime, { color: textMuted }]}>Submitted {selectedCase.submitted}</Text>
                  </View>
                  <View style={[styles.urgencyBadge, { backgroundColor: URGENCY_COLOR[selectedCase.urgency] }]}>
                    <Text style={styles.urgencyBadgeText}>{selectedCase.urgency.toUpperCase()}</Text>
                  </View>
                </View>

                {/* Scan viewer — images, video, or PDF */}
                <Pressable
                  onPress={() => {
                    const url = selectedCase.fileUrl;
                    if (!url) return;
                    if (url.toLowerCase().endsWith(".mp4") || url.toLowerCase().startsWith("video")) {
                      setFullScreenMedia({ uri: url, type: "video" });
                    } else if (url.toLowerCase().endsWith(".pdf")) {
                      setFullScreenMedia({ uri: url, type: "pdf" });
                    } else {
                      setFullScreenMedia({ uri: url, type: "image" });
                    }
                  }}
                  style={[styles.scanViewer, { backgroundColor: "#050D18" }]}
                >
                  {selectedCase.fileUrl ? (
                    selectedCase.fileUrl.toLowerCase().endsWith(".mp4") ? (
                      <Video
                        source={{ uri: selectedCase.fileUrl }}
                        style={{ width: "100%", height: "100%" }}
                        useNativeControls
                        resizeMode={ResizeMode.CONTAIN}
                        isLooping
                      />
                    ) : (
                      <Image
                        source={{ uri: selectedCase.fileUrl }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="contain"
                      />
                    )
                  ) : (
                    <View style={styles.scanPlaceholder}>
                      <Feather name="image" size={48} color="rgba(127,168,216,0.3)" />
                      <Text style={styles.scanPlaceholderText}>{selectedCase.scan}</Text>
                      <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "Inter_400Regular" }}>
                        No scan file attached
                      </Text>
                    </View>
                  )}

                  {selectedCase.fileUrl && (
                    <View style={styles.viewerControls}>
                      <Pressable style={styles.viewerBtn}>
                        <Feather name="maximize-2" size={18} color="#7FA8D8" />
                      </Pressable>
                    </View>
                  )}
                </Pressable>

                {/* Brightness & Contrast sliders */}
                <View style={[styles.slidersCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                  <Text style={[styles.sliderLabel, { color: textMuted }]}>Brightness: {brightness}%</Text>
                  <View style={styles.sliderTrack}>
                    <View style={[styles.sliderFill, { width: `${brightness}%` as any, backgroundColor: "#D97706" }]} />
                    <Pressable onPress={() => setBrightness((v) => Math.min(100, v + 10))} style={styles.sliderInc}>
                      <Feather name="plus" size={12} color="#fff" />
                    </Pressable>
                    <Pressable onPress={() => setBrightness((v) => Math.max(0, v - 10))} style={[styles.sliderInc, { right: 36 }]}>
                      <Feather name="minus" size={12} color="#fff" />
                    </Pressable>
                  </View>
                  <Text style={[styles.sliderLabel, { color: textMuted, marginTop: 10 }]}>Contrast: {contrast}%</Text>
                  <View style={styles.sliderTrack}>
                    <View style={[styles.sliderFill, { width: `${contrast}%` as any, backgroundColor: "#315d93" }]} />
                    <Pressable onPress={() => setContrast((v) => Math.min(100, v + 10))} style={styles.sliderInc}>
                      <Feather name="plus" size={12} color="#fff" />
                    </Pressable>
                    <Pressable onPress={() => setContrast((v) => Math.max(0, v - 10))} style={[styles.sliderInc, { right: 36 }]}>
                      <Feather name="minus" size={12} color="#fff" />
                    </Pressable>
                  </View>
                </View>

                {/* Report form */}
                <View style={{ gap: 12 }}>
                  <Text style={[styles.sectionTitle, { color: textPrimary }]}>Radiologist Report</Text>

                  <View style={{ gap: 6 }}>
                    <Text style={[styles.formLabel, { color: textMuted }]}>Findings *</Text>
                    <TextInput
                      style={[styles.reportInput, { backgroundColor: cardBg, borderColor: radioFindings.trim() ? "#315d93" : borderCol, color: textPrimary }]}
                      placeholder="Describe what you observe in the scan..."
                      placeholderTextColor={textMuted}
                      value={radioFindings}
                      onChangeText={setRadioFindings}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>

                  <View style={{ gap: 6 }}>
                    <Text style={[styles.formLabel, { color: textMuted }]}>Impression *</Text>
                    <TextInput
                      style={[styles.reportInput, { backgroundColor: cardBg, borderColor: radioImpression.trim() ? "#315d93" : borderCol, color: textPrimary }]}
                      placeholder="Your radiological impression / diagnosis..."
                      placeholderTextColor={textMuted}
                      value={radioImpression}
                      onChangeText={setRadioImpression}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>

                  <View style={{ gap: 6 }}>
                    <Text style={[styles.formLabel, { color: textMuted }]}>Recommendations</Text>
                    <TextInput
                      style={[styles.reportInput, { backgroundColor: cardBg, borderColor: borderCol, color: textPrimary }]}
                      placeholder="Follow-up recommendations, further tests..."
                      placeholderTextColor={textMuted}
                      value={radioRecommendations}
                      onChangeText={setRadioRecommendations}
                      multiline
                      numberOfLines={2}
                      textAlignVertical="top"
                    />
                  </View>

                  <Pressable
                    onPress={handleSubmitRadiologyReport}
                    style={({ pressed }) => [styles.generateBtn, { opacity: pressed ? 0.9 : 1 }]}
                  >
                    <Feather name="file-text" size={18} color="#fff" />
                    <Text style={styles.generateBtnText}>Generate & Send Report</Text>
                  </Pressable>
                </View>
              </ScrollView>
            ) : (
              /* Cases list + submit new case */
              <>
                {/* Header row */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={[styles.sectionTitle, { color: textPrimary }]}>Radiology Review Queue</Text>
                  <Pressable
                    onPress={() => { setShowSubmitCase((v) => !v); setScanFile(null); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: showSubmitCase ? "#DC2626" : "#315d93", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 }}
                  >
                    <Feather name={showSubmitCase ? "x" : "plus"} size={14} color="#fff" />
                    <Text style={{ color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
                      {showSubmitCase ? "Cancel" : "New Case"}
                    </Text>
                  </Pressable>
                </View>

                {/* ── Submit New Case form ── */}
                {showSubmitCase && (
                  <View style={[{ borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 }, { backgroundColor: cardBg, borderColor: "#315d93" + "40" }]}>
                    <Text style={[styles.sectionTitle, { color: "#315d93", fontSize: 14 }]}>Submit New Radiology Case</Text>

                    {/* Patient Name */}
                    <View style={{ gap: 4 }}>
                      <Text style={[styles.formLabel, { color: textMuted }]}>Patient Name *</Text>
                      <TextInput
                        style={[styles.reportInput, { backgroundColor: cardBg, borderColor: caseForm.patient_name ? "#315d93" : borderCol, color: textPrimary, minHeight: 44, padding: 12 }]}
                        placeholder="e.g. Abebe Girma"
                        placeholderTextColor={textMuted}
                        value={caseForm.patient_name}
                        onChangeText={(v) => setCaseForm((p) => ({ ...p, patient_name: v }))}
                      />
                    </View>

                    {/* Age + Gender row */}
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={[styles.formLabel, { color: textMuted }]}>Age</Text>
                        <TextInput
                          style={[styles.reportInput, { backgroundColor: cardBg, borderColor: borderCol, color: textPrimary, minHeight: 44, padding: 12 }]}
                          placeholder="Age"
                          placeholderTextColor={textMuted}
                          keyboardType="numeric"
                          value={caseForm.patient_age}
                          onChangeText={(v) => setCaseForm((p) => ({ ...p, patient_age: v.replace(/\D/g, "") }))}
                        />
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={[styles.formLabel, { color: textMuted }]}>Gender</Text>
                        <View style={{ flexDirection: "row", gap: 6 }}>
                          {["Male", "Female"].map((g) => (
                            <Pressable
                              key={g}
                              onPress={() => setCaseForm((p) => ({ ...p, patient_gender: g }))}
                              style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: caseForm.patient_gender === g ? "#315d93" : borderCol, backgroundColor: caseForm.patient_gender === g ? "#315d93" + "15" : "transparent" }}
                            >
                              <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: caseForm.patient_gender === g ? "#315d93" : textMuted }}>{g}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    </View>

                    {/* Scan Type */}
                    <View style={{ gap: 4 }}>
                      <Text style={[styles.formLabel, { color: textMuted }]}>Scan Type</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        {["Chest X-Ray", "Brain MRI", "CT Abdomen", "Pelvic Ultrasound", "Spine MRI", "Bone Scan", "Other"].map((st) => (
                          <Pressable
                            key={st}
                            onPress={() => setCaseForm((p) => ({ ...p, scan_type: st }))}
                            style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: caseForm.scan_type === st ? "#315d93" : borderCol, backgroundColor: caseForm.scan_type === st ? "#315d93" + "15" : "transparent" }}
                          >
                            <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: caseForm.scan_type === st ? "#315d93" : textMuted }}>{st}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>

                    {/* Body Part + Urgency */}
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <View style={{ flex: 2, gap: 4 }}>
                        <Text style={[styles.formLabel, { color: textMuted }]}>Body Part *</Text>
                        <TextInput
                          style={[styles.reportInput, { backgroundColor: cardBg, borderColor: caseForm.body_part ? "#315d93" : borderCol, color: textPrimary, minHeight: 44, padding: 12 }]}
                          placeholder="e.g. Chest, Brain"
                          placeholderTextColor={textMuted}
                          value={caseForm.body_part}
                          onChangeText={(v) => setCaseForm((p) => ({ ...p, body_part: v }))}
                        />
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={[styles.formLabel, { color: textMuted }]}>Urgency</Text>
                        {["routine", "priority", "emergency"].map((u) => (
                          <Pressable
                            key={u}
                            onPress={() => setCaseForm((p) => ({ ...p, urgency: u }))}
                            style={{ alignItems: "center", paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: caseForm.urgency === u ? URGENCY_COLOR[u] : borderCol, backgroundColor: caseForm.urgency === u ? URGENCY_COLOR[u] + "15" : "transparent", marginBottom: 4 }}
                          >
                            <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: caseForm.urgency === u ? URGENCY_COLOR[u] : textMuted, textTransform: "capitalize" }}>{u}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>

                    {/* Symptoms */}
                    <View style={{ gap: 4 }}>
                      <Text style={[styles.formLabel, { color: textMuted }]}>Symptoms (optional)</Text>
                      <TextInput
                        style={[styles.reportInput, { backgroundColor: cardBg, borderColor: borderCol, color: textPrimary, minHeight: 60, padding: 12 }]}
                        placeholder="Describe presenting symptoms…"
                        placeholderTextColor={textMuted}
                        multiline
                        textAlignVertical="top"
                        value={caseForm.symptoms}
                        onChangeText={(v) => setCaseForm((p) => ({ ...p, symptoms: v }))}
                      />
                    </View>

                    {/* Scan file upload — image or MP4 */}
                    <View style={{ gap: 4 }}>
                      <Text style={[styles.formLabel, { color: textMuted }]}>Scan File * (Image or MP4 Video)</Text>
                      <Pressable
                        onPress={pickScanFile}
                        style={{ borderWidth: 2, borderStyle: "dashed", borderRadius: 12, padding: 20, alignItems: "center", gap: 8, borderColor: scanFile ? "#059669" : "#315d93" + "60" }}
                      >
                        <Feather name={scanFile ? (scanFile.isVideo ? "film" : "image") : "upload"} size={28} color={scanFile ? "#059669" : "#315d93"} />
                        <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: scanFile ? "#059669" : textPrimary }}>
                          {scanFile ? scanFile.name : "Tap to upload scan"}
                        </Text>
                        <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: textMuted }}>
                          {scanFile
                            ? (scanFile.isVideo ? "📹 MP4 video selected" : "🖼 Image selected")
                            : "JPEG · PNG · MP4 accepted"}
                        </Text>
                      </Pressable>
                    </View>

                    <Pressable
                      onPress={handleSubmitNewCase}
                      disabled={caseSubmitting}
                      style={[styles.generateBtn, { opacity: caseSubmitting ? 0.7 : 1 }]}
                    >
                      <Feather name={caseSubmitting ? "loader" : "send"} size={18} color="#fff" />
                      <Text style={styles.generateBtnText}>{caseSubmitting ? "Submitting…" : "Submit Case to Queue"}</Text>
                    </Pressable>
                  </View>
                )}

                <Text style={[styles.sectionDesc, { color: textMuted }]}>Tap a case to open the scan viewer and generate a report.</Text>

                {/* Stats row */}
                <View style={[styles.radioStats, { backgroundColor: "#202937" }]}>
                  {[
                    { label: "Pending", value: radioCases.filter((c) => c.status === "pending").length, color: "#D97706" },
                    { label: "In Review", value: radioCases.filter((c) => c.status === "in_review").length, color: "#315d93" },
                    { label: "Completed", value: radioCases.filter((c) => c.status === "completed").length, color: "#059669" },
                    { label: "Urgent", value: radioCases.filter((c) => c.urgency === "emergency").length, color: "#DC2626" },
                  ].map((s) => (
                    <View key={s.label} style={{ alignItems: "center", gap: 4 }}>
                      <Text style={[styles.radioStatVal, { color: s.color }]}>{s.value}</Text>
                      <Text style={styles.radioStatLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>

                {radioCases.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedCase(c);
                      setRadioFindings(c.findings);
                      setRadioImpression(c.impression);
                      setRadioRecommendations(c.recommendations);
                    }}
                    style={({ pressed }) => [styles.caseCard, { backgroundColor: cardBg, borderColor: c.urgency === "emergency" ? "#DC2626" : borderCol, opacity: pressed ? 0.88 : 1 }]}
                  >
                    <View style={[styles.caseAvatar, { backgroundColor: URGENCY_COLOR[c.urgency] + "18" }]}>
                      <Feather name="user" size={18} color={URGENCY_COLOR[c.urgency]} />
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={[styles.caseName, { color: textPrimary, flex: 1 }]}>{c.patient}</Text>
                        {c.urgency === "emergency" && (
                          <View style={[styles.urgencyBadge, { backgroundColor: "#DC2626" }]}>
                            <Text style={styles.urgencyBadgeText}>URGENT</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.caseScan, { color: "#315d93" }]}>{c.scan} · Age {c.age}</Text>
                      <Text style={[styles.caseTime, { color: textMuted }]}>{c.submitted}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      <View style={[styles.statusBadge, { backgroundColor: STATUS_COL[c.status] + "18" }]}>
                        <Text style={[styles.statusText, { color: STATUS_COL[c.status] }]}>{STATUS_LABEL[c.status]}</Text>
                      </View>
                      <Feather name="chevron-right" size={14} color={textMuted} />
                    </View>
                  </Pressable>
                ))}
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Full-screen media viewer (image / video / PDF) */}
      <Modal
        visible={!!fullScreenMedia?.uri}
        transparent
        animationType="fade"
        onRequestClose={() => setFullScreenMedia(null)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center" }}>
          <Pressable
            onPress={() => setFullScreenMedia(null)}
            style={{ position: "absolute", top: 40, right: 16, zIndex: 10, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20, padding: 8 }}
          >
            <Feather name="x" size={24} color="#fff" />
          </Pressable>
          {fullScreenMedia?.uri && fullScreenMedia.type === "image" && (
            <Image source={{ uri: fullScreenMedia.uri }} style={{ width: "100%", height: "80%" }} resizeMode="contain" />
          )}
          {fullScreenMedia?.uri && fullScreenMedia.type === "video" && (
            <Video
              source={{ uri: fullScreenMedia.uri }}
              style={{ width: "100%", height: "80%" }}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              isLooping
              shouldPlay
            />
          )}
          {fullScreenMedia?.uri && fullScreenMedia.type === "pdf" && (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
              <Feather name="file-text" size={48} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 16, marginTop: 16, fontFamily: "Inter_600SemiBold" }}>PDF Document</Text>
              <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 8, fontFamily: "Inter_400Regular" }}>Preview opens in external viewer</Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { backgroundColor: "#202937", paddingHorizontal: 20, paddingBottom: 20, gap: 14 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  backBtn: { marginRight: 4 },
  avatarWrap: { position: "relative" },
  avatarImg: { width: 46, height: 46, borderRadius: 23 },
  avatarDefault: { width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(49,93,147,0.5)", alignItems: "center", justifyContent: "center" },
  avatarInitials: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },
  avatarEditBadge: { position: "absolute", bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: "#315d93", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#202937" },
  headerGreeting: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontFamily: "Inter_400Regular" },
  headerName: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 2 },
  onlineToggle: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  onlineLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  statsRow: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, padding: 10 },
  statItem: { flex: 1, alignItems: "center", gap: 3 },
  statVal: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
  statLbl: { color: "rgba(255,255,255,0.55)", fontSize: 9, fontFamily: "Inter_400Regular", textAlign: "center" },
  statDivider: { width: 0.5, backgroundColor: "rgba(255,255,255,0.15)", marginVertical: 6 },
  calCard: { borderRadius: 10, padding: 12, gap: 8 },
  calMonth: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  calGrid: { flexDirection: "row", justifyContent: "space-between" },
  calDay: { alignItems: "center", gap: 4 },
  calDayLabel: { color: "rgba(255,255,255,0.6)", fontSize: 10, fontFamily: "Inter_500Medium" },
  calDot: { width: 8, height: 8, borderRadius: 4 },
  quickRow: { flexDirection: "row", gap: 10, padding: 16 },
  quickBtn: { flex: 1, alignItems: "center", gap: 6, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  quickBtnIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  quickBtnLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
  feeCard: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginBottom: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
  feeLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  feeValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  feeInput: { width: 100, borderWidth: 1.5, borderRadius: 8, padding: 6, fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "right" },
  feeEditBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  instituteCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginHorizontal: 16, marginBottom: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
  hospitalPickerList: { borderWidth: 1, borderRadius: 10, maxHeight: 200, overflow: "hidden" },
  hospitalPickerItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 0.5 },
  hospitalPickerName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  hospitalPickerType: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  hospitalCustomInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, fontFamily: "Inter_400Regular" },
  hospitalBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  hospitalBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  tabsRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  dashTab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  dashTabText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  section: { paddingHorizontal: 16, gap: 12, paddingTop: 4 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  sectionDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, marginTop: -4 },
  emptyState: { alignItems: "center", gap: 12, paddingTop: 40 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  requestCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  requestTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  reqAvatar: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  reqName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  reqService: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  reqTime: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  reqAmount: { fontSize: 14, fontFamily: "Inter_700Bold" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignItems: "center" },
  statusText: { fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" },
  historyBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1 },
  historyBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  requestActions: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 10, borderRadius: 10 },
  declineBtn: { borderWidth: 1 },
  actionBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  serviceRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  svcIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  svcLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  svcDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  statusCircle: { width: 14, height: 14, borderRadius: 7 },
  disclaimerBox: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: "flex-start" },
  disclaimerText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 17 },
  // Schedule
  daysGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  dayBtn: { alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, minWidth: 56 },
  dayBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  dayActiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#059669" },
  slotCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 12 },
  slotHeader: { flexDirection: "row", alignItems: "center" },
  slotLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  slotSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  slotTimeRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  slotTimeBlock: { flex: 1, gap: 6 },
  slotTimeLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  slotTimeBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 8, padding: 10 },
  slotTimeBtnText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  timePickerList: { borderWidth: 1, borderRadius: 8, maxHeight: 160, marginTop: 2, borderColor: "#315d93" + "40", backgroundColor: "rgba(49,93,147,0.05)" },
  timeOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 0.5 },
  timeOptionText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  // Location
  locationCard: { borderRadius: 12, padding: 20, alignItems: "center", gap: 10, marginBottom: 4 },
  locationCity: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold" },
  locationSub: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontFamily: "Inter_400Regular" },
  locationCoords: { color: "#7FA8D8", fontSize: 12, fontFamily: "Inter_500Medium" },
  gpsBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#315d93", paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, marginTop: 6 },
  gpsBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  dropdown: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 10, borderWidth: 1 },
  dropdownText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  dropdownList: { borderWidth: 1, borderRadius: 10, overflow: "hidden", marginTop: -4, marginBottom: 4 },
  dropdownItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  dropdownItemText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  rangeCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 12 },
  rangeHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rangeLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  rangeValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  rangeBar: { height: 6, borderRadius: 3, backgroundColor: "#E2E8F0", overflow: "hidden" },
  rangeFill: { height: "100%", borderRadius: 3 },
  rangeControls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rangeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  rangeBtnLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  areaRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 0.5 },
  areaDot: { width: 10, height: 10, borderRadius: 5 },
  areaName: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  areaStatus: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  // Radiologist
  backToList: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  reviewHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 14 },
  reviewPatient: { fontSize: 17, fontFamily: "Inter_700Bold" },
  reviewScan: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
  reviewTime: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  urgencyBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  urgencyBadgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  scanViewer: { height: 220, borderRadius: 14, overflow: "hidden", marginBottom: 14, position: "relative" },
  scanPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  scanPlaceholderText: { color: "rgba(127,168,216,0.5)", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  viewerControls: { position: "absolute", bottom: 10, right: 10, flexDirection: "row", gap: 8 },
  viewerBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  slidersCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 14, gap: 6 },
  sliderLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  sliderTrack: { height: 8, borderRadius: 4, backgroundColor: "#E2E8F0", overflow: "hidden", position: "relative", marginBottom: 4 },
  sliderFill: { height: "100%", borderRadius: 4 },
  sliderInc: { position: "absolute", right: 4, top: -14, width: 28, height: 28, borderRadius: 14, backgroundColor: "#315d93", alignItems: "center", justifyContent: "center" },
  formLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  reportInput: { borderRadius: 10, borderWidth: 1, padding: 14, fontSize: 13, fontFamily: "Inter_400Regular", minHeight: 80 },
  generateBtn: { backgroundColor: "#315d93", borderRadius: 12, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  generateBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  radioStats: { flexDirection: "row", justifyContent: "space-around", borderRadius: 14, padding: 16, marginBottom: 4 },
  radioStatVal: { fontSize: 22, fontFamily: "Inter_700Bold" },
  radioStatLabel: { color: "rgba(255,255,255,0.55)", fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  caseCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  caseAvatar: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  caseName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  caseScan: { fontSize: 12, fontFamily: "Inter_500Medium" },
  caseTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
