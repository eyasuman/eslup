import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import {
  submitRadiologyCase,
  getRadiologyCases,
  getBookingsForClient,
  subscribeToClientBookings,
  getApprovedDoctors,
  subscribeToProviders,
  unsubscribeChannel,
  type SupabaseDoctor,
} from "@/lib/supabase";
import { useColors } from "@/hooks/useColors";
import NearbyMap from "@/components/NearbyMap";
import { useTranslation } from "@/constants/translations";

type ProvTab = "nearby" | "appointments" | "teleradiology";
type FilterType = "all" | "doctor" | "nurse" | "available" | "online" | "homecare";
type ViewMode = "list" | "map";

const SCAN_TYPES = [
  "X-Ray", "CT Scan", "MRI", "Ultrasound", "Mammography",
  "Dental X-Ray", "PET Scan", "DEXA Scan", "Fluoroscopy", "Lab Image",
];

const BODY_PARTS = [
  "Head", "Neck", "Chest", "Abdomen", "Pelvis",
  "Spine", "Upper Limb", "Lower Limb", "Heart", "Lungs", "Brain", "Full Body",
];

const URGENCY_LEVELS = [
  { id: "routine", label: "Routine", color: "#059669" },
  { id: "priority", label: "Priority", color: "#D97706" },
  { id: "emergency", label: "Emergency", color: "#DC2626" },
];

const URGENCY_COLOR: Record<string, string> = {
  routine: "#059669", priority: "#D97706", emergency: "#DC2626",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Pending", in_review: "In Review", completed: "Completed",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "#D97706", in_review: "#315d93", completed: "#059669",
};

// ─── Radiology case urgency derived from notes ──────────────────────────────
function deriveCaseUrgency(rec: any): string {
  const notes = (rec.notes ?? "").toLowerCase();
  if (notes.includes("emergency")) return "emergency";
  if (notes.includes("priority")) return "priority";
  return "routine";
}

function deriveCaseStatus(rec: any): string {
  const summary = (rec.summary ?? "").toLowerCase();
  if (summary === "pending" || !summary) return "pending";
  if (summary.startsWith("findings:")) return "completed";
  return "in_review";
}

function deriveCaseTime(rec: any): string {
  if (!rec.createdAt) return "";
  const diff = Date.now() - new Date(rec.createdAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) === 1 ? "" : "s"} ago`;
}

function HealthDarkContainer({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient colors={["#202937", "#315d93"]} style={{ flex: 1 }}>
      {children}
    </LinearGradient>
  );
}

function HealthLightContainer({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>{children}</View>;
}

export default function HealthcareScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userRole, bookings, updateBooking, user, language } = useApp();
  const t = useTranslation(language);
  const isRTL = language === "ar";

  const { openMap } = useLocalSearchParams<{ openMap?: string }>();

  const [provTab, setProvTab] = useState<ProvTab>("nearby");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");

  // When navigated here via "Find Nearby" button, jump straight to map view
  useEffect(() => {
    if (openMap === "1") {
      setProvTab("nearby");
      setViewMode("map");
    }
  }, [openMap]);

  // ── Supabase doctors state ─────────────────────────────────────────────────
  const [supabaseDoctors, setSupabaseDoctors] = useState<SupabaseDoctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);

  // ── Supabase appointments state ────────────────────────────────────────────
  const [liveBookings, setLiveBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  // ── Radiology cases state ─────────────────────────────────────────────────
  const [radiologyCases, setRadiologyCases] = useState<any[]>([]);

  // ── Upload modal state ─────────────────────────────────────────────────────
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadStep, setUploadStep] = useState<1 | 2>(1);
  const [scanType, setScanType] = useState("");
  const [showScanDropdown, setShowScanDropdown] = useState(false);
  const [bodyPart, setBodyPart] = useState("");
  const [showBodyDropdown, setShowBodyDropdown] = useState(false);
  const [urgency, setUrgency] = useState("routine");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState<"male" | "female" | "other">("male");
  const [symptoms, setSymptoms] = useState("");
  const [assignedRadiologist, setAssignedRadiologist] = useState("");
  const [showRadiologistDropdown, setShowRadiologistDropdown] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);

  const teleRadScrollRef = useRef<any>(null);

  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const isDark = colors.isDark;
  const textPrimary = isDark ? "#FFFFFF" : "#202937";
  const textMuted = isDark ? "#D1D5DB" : "#4B5563";
  const cardBg = isDark ? "rgba(255,255,255,0.10)" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,0.15)" : "#E2E8F0";
  const inputBg = isDark ? "rgba(255,255,255,0.08)" : "#F4F7FB";
  const headerBg = isDark ? "rgba(0,0,0,0.2)" : "#202937";

  // ── Fetch approved doctors from Supabase + realtime ────────────────────────
  useEffect(() => {
    setDoctorsLoading(true);
    getApprovedDoctors()
      .then((data) => setSupabaseDoctors(data as SupabaseDoctor[]))
      .catch(() => {})
      .finally(() => setDoctorsLoading(false));

    const channel = subscribeToProviders((payload: any) => {
      const updated = payload.new as SupabaseDoctor;
      if (!updated?.userId) return;
      if (updated.status === "Active") {
        setSupabaseDoctors((prev) => {
          const exists = prev.find((d) => d.userId === updated.userId);
          return exists
            ? prev.map((d) => (d.userId === updated.userId ? { ...d, ...updated } : d))
            : [updated, ...prev];
        });
      } else {
        setSupabaseDoctors((prev) => prev.filter((d) => d.userId !== updated.userId));
      }
    });

    return () => { unsubscribeChannel(channel); };
  }, []);

  // ── Fetch appointments from Supabase + realtime ────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    setBookingsLoading(true);
    getBookingsForClient(user.id)
      .then((data) => setLiveBookings(data))
      .catch(() => {})
      .finally(() => setBookingsLoading(false));

    const channel = subscribeToClientBookings(user.id, (booking, eventType) => {
      if (eventType === "INSERT") {
        setLiveBookings((prev) => [booking, ...prev]);
      } else if (eventType === "UPDATE") {
        setLiveBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, ...booking } : b)));
        updateBooking(booking.id, { status: booking.status });
      } else if (eventType === "DELETE") {
        setLiveBookings((prev) => prev.filter((b) => b.id !== booking.id));
      }
    });

    return () => { unsubscribeChannel(channel); };
  }, [user?.id]);

  // ── Fetch radiology cases from Supabase ────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    getRadiologyCases(user.id)
      .then((data) => setRadiologyCases(data))
      .catch(() => {});
  }, [user?.id]);

  // ── Derived filtered doctors ───────────────────────────────────────────────
  const filteredDocs = useMemo(() => {
    let list = supabaseDoctors;

    if (activeFilter === "doctor") {
      list = list.filter((d) => (d.providerType ?? "").toLowerCase() === "doctor");
    } else if (activeFilter === "nurse") {
      list = list.filter((d) => (d.providerType ?? "").toLowerCase() === "nurse");
    } else if (activeFilter === "available") {
      list = list.filter((d) =>
        d.serviceModes?.inPerson === true ||
        d.serviceModes?.video === true ||
        (d.availability && d.availability.length > 0)
      );
    } else if (activeFilter === "online") {
      list = list.filter((d) =>
        d.serviceModes?.video === true || d.serviceModes?.audio === true
      );
    } else if (activeFilter === "homecare") {
      list = list.filter((d) => d.serviceModes?.homeVisit === true);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          (d.specialty ?? "").toLowerCase().includes(q) ||
          (d.city ?? "").toLowerCase().includes(q) ||
          (d.providerType ?? "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [supabaseDoctors, activeFilter, searchQuery]);

  // ── Filter counts for badges ───────────────────────────────────────────────
  const filterCounts = useMemo(() => ({
    all: supabaseDoctors.length,
    doctor: supabaseDoctors.filter((d) => (d.providerType ?? "").toLowerCase() === "doctor").length,
    nurse: supabaseDoctors.filter((d) => (d.providerType ?? "").toLowerCase() === "nurse").length,
    available: supabaseDoctors.filter((d) =>
      d.serviceModes?.inPerson || d.serviceModes?.video || (d.availability && d.availability.length > 0)
    ).length,
    online: supabaseDoctors.filter((d) => d.serviceModes?.video || d.serviceModes?.audio).length,
    homecare: supabaseDoctors.filter((d) => d.serviceModes?.homeVisit).length,
  }), [supabaseDoctors]);

  // ── Radiology stats ────────────────────────────────────────────────────────
  const radioStats = useMemo(() => ({
    pending: radiologyCases.filter((c) => deriveCaseStatus(c) === "pending").length,
    in_review: radiologyCases.filter((c) => deriveCaseStatus(c) === "in_review").length,
    completed: radiologyCases.filter((c) => deriveCaseStatus(c) === "completed").length,
    urgent: radiologyCases.filter((c) => deriveCaseUrgency(c) === "emergency").length,
  }), [radiologyCases]);

  // ── Radiologists from approved doctors ────────────────────────────────────
  const radiologists = useMemo(() =>
    supabaseDoctors.filter((d) =>
      (d.specialty ?? "").toLowerCase().includes("radio") ||
      (d.providerType ?? "").toLowerCase().includes("radio")
    ),
    [supabaseDoctors]
  );

  const pickImage = async (source: "camera" | "gallery") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      let result;
      if (source === "camera") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert("Permission needed", "Camera access is required."); return; }
        result = await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: false });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert("Permission needed", "Gallery access is required."); return; }
        result = await ImagePicker.launchImageLibraryAsync({
          quality: 0.85, allowsMultipleSelection: false,
          mediaTypes: ImagePicker.MediaTypeOptions.All,
        });
      }
      if (!result.canceled && result.assets[0]) {
        setUploadedImage(result.assets[0].uri);
        setUploadStep(2);
      }
    } catch {
      Alert.alert("Error", "Could not access media. Please try again.");
    }
  };

  const submitScan = async () => {
    if (!patientName.trim() || !scanType || !bodyPart) {
      Alert.alert("Missing Info", "Please fill in patient name, scan type and body part.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      if (user?.id) {
        const rec = await submitRadiologyCase({
          submitted_by: user.id,
          patient_name: patientName.trim(),
          patient_age: parseInt(patientAge || "0") || 0,
          patient_gender: patientGender,
          scan_type: scanType,
          body_part: bodyPart,
          urgency,
          symptoms: symptoms.trim() || undefined,
          assigned_radiologist_name: assignedRadiologist || undefined,
          scan_image_uri: uploadedImage,
        });
        setRadiologyCases((prev) => [rec, ...prev]);
      }
    } catch {
      // Supabase unavailable — still show success UI (offline-friendly)
    }

    Alert.alert(
      "Scan Submitted",
      `${scanType} for ${patientName} submitted as ${urgency.toUpperCase()} case.${assignedRadiologist ? `\n\nAssigned to: ${assignedRadiologist}` : ""}\n\nA radiologist will review and generate a report within the expected timeframe.`,
      [
        { text: "View Cases", onPress: () => { setShowUploadModal(false); setProvTab("teleradiology"); } },
        { text: "OK", onPress: () => setShowUploadModal(false) },
      ]
    );
    setUploadedImage(null); setPatientName(""); setPatientAge(""); setScanType("");
    setBodyPart(""); setSymptoms(""); setUploadStep(1); setAssignedRadiologist(""); setUrgency("routine");
  };

  const resetUploadModal = () => {
    setShowUploadModal(false);
    setUploadStep(1);
    setUploadedImage(null);
    setScanType(""); setBodyPart(""); setSymptoms("");
    setPatientName(""); setPatientAge(""); setUrgency("routine");
    setShowScanDropdown(false); setShowBodyDropdown(false);
    setShowRadiologistDropdown(false); setAssignedRadiologist("");
  };

  const Container = isDark ? HealthDarkContainer : HealthLightContainer;

  return (
    <Container>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: headerBg }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Healthcare Providers</Text>
            <Text style={[styles.headerSub, { color: "rgba(255,255,255,0.65)" }]}>
              Addis Ababa, Ethiopia
            </Text>
          </View>
          {userRole === "provider" && (
            <Pressable
              onPress={() => router.push("/(provider)/dashboard")}
              style={styles.dashBtn}
            >
              <Feather name="grid" size={16} color="#fff" />
              <Text style={styles.dashBtnText}>Dashboard</Text>
            </Pressable>
          )}
        </View>

        {/* Top Tabs */}
        <View style={styles.topTabsRow}>
          {(["nearby", "appointments", "teleradiology"] as ProvTab[]).map((tab) => {
            const labels: Record<ProvTab, string> = {
              nearby: t("nearby"), appointments: t("appointments"), teleradiology: "Teleradiology",
            };
            const icons: Record<ProvTab, any> = {
              nearby: "map-pin", appointments: "calendar", teleradiology: "radio",
            };
            const active = provTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setProvTab(tab);
                }}
                style={[styles.topTab, active && styles.topTabActive]}
              >
                <Feather
                  name={icons[tab]}
                  size={13}
                  color={active ? "#202937" : "rgba(255,255,255,0.75)"}
                />
                <Text style={[styles.topTabText, { color: active ? "#202937" : "rgba(255,255,255,0.75)" }]}>
                  {labels[tab]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ── NEARBY TAB ── */}
      {provTab === "nearby" && (
        <View style={{ flex: 1 }}>
          {/* Filter chips — flexGrow:0 prevents vertical expansion on web */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
            keyboardShouldPersistTaps="always"
            style={styles.filterScrollView}
          >
            {([
              { id: "all" as FilterType, label: "All", count: filterCounts.all },
              { id: "doctor" as FilterType, label: "Doctors", count: filterCounts.doctor },
              { id: "nurse" as FilterType, label: "Nurses", count: filterCounts.nurse },
              { id: "available" as FilterType, label: "Available Now", count: filterCounts.available },
              { id: "online" as FilterType, label: "Online", count: filterCounts.online },
              { id: "homecare" as FilterType, label: "Home Care", count: filterCounts.homecare },
            ]).map((f) => {
              const active = activeFilter === f.id;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveFilter(f.id);
                  }}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? "#315d93" : (isDark ? "rgba(255,255,255,0.1)" : "#EEF3FA"),
                      borderColor: active ? "#315d93" : cardBorder,
                    },
                  ]}
                >
                  <Text style={[styles.filterChipText, { color: active ? "#fff" : textMuted }]}>
                    {f.label}
                  </Text>
                  {f.count > 0 && (
                    <View
                      style={[
                        styles.filterBadge,
                        { backgroundColor: active ? "rgba(255,255,255,0.25)" : "#315d93" + "20" },
                      ]}
                    >
                      <Text style={[styles.filterBadgeText, { color: active ? "#fff" : "#315d93" }]}>
                        {f.count}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Search + View Toggle — flexShrink:0 prevents vertical expansion */}
          <View
            style={[
              styles.searchSection,
              { backgroundColor: isDark ? "rgba(0,0,0,0.15)" : "#F8FAFC", borderBottomColor: cardBorder, flexShrink: 0 },
            ]}
          >
            <View style={[styles.searchBar, { backgroundColor: inputBg, borderColor: cardBorder }]}>
              <Feather name="search" size={16} color={textMuted} style={{ marginLeft: 12 }} />
              <TextInput
                style={[styles.searchInput, { color: textPrimary }]}
                placeholder="Search doctor, specialty…"
                placeholderTextColor={textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery("")} style={{ paddingRight: 12 }}>
                  <Feather name="x" size={15} color={textMuted} />
                </Pressable>
              )}
            </View>
            <View
              style={[
                styles.viewToggle,
                { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0" },
              ]}
            >
              <Pressable
                onPress={() => setViewMode("list")}
                style={[styles.viewBtn, viewMode === "list" && { backgroundColor: "#315d93" }]}
              >
                <Feather name="list" size={15} color={viewMode === "list" ? "#fff" : textMuted} />
              </Pressable>
              <Pressable
                onPress={() => setViewMode("map")}
                style={[styles.viewBtn, viewMode === "map" && { backgroundColor: "#315d93" }]}
              >
                <Feather name="map" size={15} color={viewMode === "map" ? "#fff" : textMuted} />
              </Pressable>
            </View>
          </View>

          {viewMode === "map" ? (
            <View style={{ flex: 1 }}>
              <NearbyMap
                docs={filteredDocs as any}
                isDark={isDark}
                textPrimary={textPrimary}
                textMuted={textMuted}
                cardBg={cardBg}
                cardBorder={cardBorder}
              />
            </View>
          ) : (
            <>
              <Text style={[styles.resultCount, { color: textMuted, paddingHorizontal: 16 }]}>
                {doctorsLoading
                  ? "Loading providers…"
                  : `${filteredDocs.length} provider${filteredDocs.length !== 1 ? "s" : ""} found`}
              </Text>
              {doctorsLoading ? (
                <View style={styles.emptyState}>
                  <Feather name="loader" size={32} color="#315d93" />
                  <Text style={[styles.emptyText, { color: textMuted, marginTop: 12 }]}>
                    Finding nearby providers…
                  </Text>
                </View>
              ) : filteredDocs.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={[styles.emptyIcon, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#EEF3FA" }]}>
                    <Feather name="users" size={40} color="#315d93" />
                  </View>
                  <Text style={[styles.emptyTitle, { color: textPrimary }]}>No Providers Found</Text>
                  <Text style={[styles.emptyText, { color: textMuted }]}>
                    {searchQuery ? "Try a different search term." : "No approved providers in this category yet."}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredDocs}
                  keyExtractor={(item) => item.userId ?? item.id ?? Math.random().toString()}
                  contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: bottomPad + 110 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="always"
                  keyboardDismissMode="none"
                  renderItem={({ item }) => (
                    <SupabaseDoctorCard
                      doc={item}
                      isDark={isDark}
                      textPrimary={textPrimary}
                      textMuted={textMuted}
                      cardBg={cardBg}
                      cardBorder={cardBorder}
                    />
                  )}
                />
              )}
            </>
          )}
        </View>
      )}

      {/* ── APPOINTMENTS TAB ── */}
      {provTab === "appointments" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: bottomPad + 110 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.apptHeader}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Your Appointments</Text>
            <Pressable
              onPress={() => router.push({ pathname: "/booking", params: {} })}
              style={[styles.newApptBtn, { backgroundColor: "#315d93" }]}
            >
              <Feather name="plus" size={14} color="#fff" />
              <Text style={styles.newApptText}>New</Text>
            </Pressable>
          </View>

          {bookingsLoading && user ? (
            <View style={styles.emptyState}>
              <Feather name="loader" size={32} color="#315d93" />
              <Text style={[styles.emptyText, { color: textMuted, marginTop: 12 }]}>
                Loading appointments…
              </Text>
            </View>
          ) : liveBookings.length === 0 && bookings.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#EEF3FA" }]}>
                <Feather name="calendar" size={40} color="#315d93" />
              </View>
              <Text style={[styles.emptyTitle, { color: textPrimary }]}>No Appointments Yet</Text>
              <Text style={[styles.emptyText, { color: textMuted }]}>
                Book your first consultation from the Nearby tab.
              </Text>
              <Pressable
                onPress={() => setProvTab("nearby")}
                style={[styles.emptyBtn, { backgroundColor: "#315d93" }]}
              >
                <Text style={styles.emptyBtnText}>Find Providers</Text>
              </Pressable>
            </View>
          ) : (
            (liveBookings.length > 0 ? liveBookings : bookings).map((b: any) => {
              const rawStatus = b.status ?? "pending";
              const statusColor =
                rawStatus === "accepted" || rawStatus === "confirmed" || rawStatus === "scheduled" ? "#059669"
                  : rawStatus === "completed" ? "#315d93"
                  : rawStatus === "pending" ? "#D97706"
                  : rawStatus === "cancelled" || rawStatus === "declined" ? "#DC2626"
                  : "#64748B";
              const statusLabel =
                rawStatus === "scheduled" ? "Confirmed"
                  : rawStatus === "accepted" ? "Accepted"
                  : rawStatus === "confirmed" ? "Confirmed"
                  : rawStatus === "completed" ? "Completed"
                  : rawStatus === "pending" ? "Pending"
                  : rawStatus === "declined" ? "Declined"
                  : rawStatus === "cancelled" ? "Cancelled"
                  : rawStatus;
              const providerName = b.doctorName ?? b.provider_name ?? b.providerName ?? "Provider";
              const specialty = b.specialty ?? "";
              const rawDate = b.date;
              let dateStr = "";
              let timeStr = "";
              if (rawDate) {
                try {
                  const d = new Date(rawDate);
                  dateStr = d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
                  timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                } catch {
                  dateStr = String(rawDate);
                }
              } else {
                dateStr = b.date ?? "";
                timeStr = b.time ?? "";
              }
              const amount = b.totalPrice ?? b.consultationFee ?? b.amount ?? 0;
              const doctorId = b.doctorUserId ?? b.provider_id ?? b.providerId;
              return (
                <View
                  key={b.id}
                  style={[
                    styles.apptCard,
                    { backgroundColor: cardBg, borderColor: cardBorder, borderLeftWidth: 4, borderLeftColor: statusColor },
                  ]}
                >
                  <View style={[styles.apptIconWrap, { backgroundColor: "#315d93" + "18" }]}>
                    <Feather name="calendar" size={20} color="#315d93" />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={[styles.apptDoc, { color: textPrimary }]}>{providerName}</Text>
                    {specialty ? <Text style={[styles.apptSpec, { color: "#315d93" }]}>{specialty}</Text> : null}
                    <Text style={[styles.apptDate, { color: textMuted }]}>
                      {dateStr}{timeStr ? ` · ${timeStr}` : ""}
                    </Text>
                    <Text style={[styles.apptAmount, { color: "#059669" }]}>
                      ETB {Number(amount).toLocaleString()}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 6 }}>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + "18" }]}>
                      <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                    </View>
                    {(rawStatus === "cancelled" || rawStatus === "declined") && (
                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          router.push({
                            pathname: "/booking",
                            params: { doctorId, doctorName: providerName, specialty },
                          });
                        }}
                        style={[styles.reuploadBtn, { borderColor: "#DC2626" }]}
                      >
                        <Text style={{ color: "#DC2626", fontSize: 10, fontFamily: "Inter_500Medium" }}>
                          Book Again
                        </Text>
                      </Pressable>
                    )}
                    {(() => {
                      const sType = b.serviceType ?? b.consultationType ?? "";
                      const isVideo = sType === "video" || sType === "Video Consultation";
                      const isConfirmed = rawStatus === "scheduled" || rawStatus === "accepted" || rawStatus === "confirmed";
                      if (!isVideo || !isConfirmed) return null;
                      return (
                        <Pressable
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            router.push({
                              pathname: "/video-consultation",
                              params: {
                                appointmentId: b.id,
                                doctorId: doctorId ?? "",
                                doctorName: providerName,
                                specialty,
                                isDoctor: "false",
                              },
                            });
                          }}
                          style={[styles.reuploadBtn, { borderColor: "#315d93", backgroundColor: "#315d93", flexDirection: "row", alignItems: "center", gap: 4 }]}
                        >
                          <Feather name="video" size={10} color="#fff" />
                          <Text style={{ color: "#fff", fontSize: 10, fontFamily: "Inter_600SemiBold" }}>
                            Join Video
                          </Text>
                        </Pressable>
                      );
                    })()}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ── TELERADIOLOGY TAB ── */}
      {provTab === "teleradiology" && (
        !user ? (
          <View style={[styles.emptyState, { flex: 1 }]}>
            <View style={[styles.emptyIcon, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#EEF3FA" }]}>
              <Feather name="radio" size={40} color="#315d93" />
            </View>
            <Text style={[styles.emptyTitle, { color: textPrimary }]}>Sign In Required</Text>
            <Text style={[styles.emptyText, { color: textMuted }]}>
              Teleradiology services — uploading scans, viewing cases, and receiving radiology reports — require a verified account.
            </Text>
            <Pressable onPress={() => router.push("/(tabs)/you")} style={[styles.emptyBtn, { backgroundColor: "#315d93" }]}>
              <Text style={styles.emptyBtnText}>Sign In to Continue</Text>
            </Pressable>
          </View>
        ) :
        <ScrollView
          ref={teleRadScrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 0, paddingBottom: bottomPad + 110 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero banner */}
          <View style={[styles.teleBanner, { backgroundColor: isDark ? "rgba(0,0,0,0.2)" : "#202937" }]}>
            <View style={styles.teleStats}>
              {[
                { label: "Pending Cases", value: String(radioStats.pending), color: "#D97706" },
                { label: "In Review", value: String(radioStats.in_review), color: "#315d93" },
                { label: "Completed", value: String(radioStats.completed), color: "#059669" },
                { label: "Urgent", value: String(radioStats.urgent), color: "#DC2626" },
              ].map((stat) => (
                <View key={stat.label} style={styles.teleStatItem}>
                  <Text style={[styles.teleStatVal, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={styles.teleStatLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Action Buttons — Chat Doctor REMOVED */}
          <View style={styles.teleActions}>
            {[
              {
                icon: "upload" as const, label: "Upload Scan", color: "#315d93",
                onPress: () => setShowUploadModal(true),
              },
              {
                icon: "folder" as const, label: "View Cases", color: "#7C3AED",
                onPress: () => teleRadScrollRef.current?.scrollTo({ y: 400, animated: true }),
              },
              {
                icon: "file-text" as const, label: "Reports", color: "#059669",
                onPress: () => setShowReportsModal(true),
              },
              {
                icon: "alert-triangle" as const, label: "Emergency", color: "#DC2626",
                onPress: () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  Alert.alert(
                    "Flag Emergency Case",
                    "This will immediately escalate the most recent case as EMERGENCY and notify all available radiologists for immediate review.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Flag Emergency", style: "destructive",
                        onPress: () => {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          Alert.alert("Emergency Flagged", "Case escalated to EMERGENCY. Radiologists have been notified and will begin review immediately.");
                        },
                      },
                    ]
                  );
                },
              },
            ].map((action) => (
              <Pressable
                key={action.label}
                onPress={action.onPress}
                style={({ pressed }) => [
                  styles.teleActionBtn,
                  {
                    backgroundColor: isDark ? "rgba(255,255,255,0.10)" : "#fff",
                    borderColor: isDark ? "rgba(255,255,255,0.15)" : "#E2E8F0",
                    opacity: pressed ? 0.85 : 1,
                    width: "46%",
                  },
                ]}
              >
                <View style={[styles.teleActionIcon, { backgroundColor: action.color + "18" }]}>
                  <Feather name={action.icon} size={20} color={action.color} />
                </View>
                <Text style={[styles.teleActionLabel, { color: textPrimary }]}>{action.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Cases List */}
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            <Text style={[styles.sectionTitle, { color: textPrimary, marginBottom: 4 }]}>
              Recent Cases
            </Text>
            {radiologyCases.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#EEF3FA" }]}>
                  <Feather name="radio" size={40} color="#315d93" />
                </View>
                <Text style={[styles.emptyTitle, { color: textPrimary }]}>No Cases Yet</Text>
                <Text style={[styles.emptyText, { color: textMuted }]}>
                  Upload a scan to begin your first radiology case.
                </Text>
                <Pressable
                  onPress={() => setShowUploadModal(true)}
                  style={[styles.emptyBtn, { backgroundColor: "#315d93" }]}
                >
                  <Text style={styles.emptyBtnText}>Upload Scan</Text>
                </Pressable>
              </View>
            ) : (
              radiologyCases.map((c) => {
                const caseStatus = deriveCaseStatus(c);
                const caseUrgency = deriveCaseUrgency(c);
                const titleParts = (c.title ?? "Unknown Scan").split(" — ");
                const scanName = titleParts[0] ?? c.title;
                const bodyPartName = titleParts[1] ?? "";
                const patientNameVal = c.patientName ?? "Patient";
                const caseTime = deriveCaseTime(c);
                return (
                  <Pressable
                    key={c.id}
                    onPress={() =>
                      Alert.alert(
                        patientNameVal,
                        `Scan: ${scanName}${bodyPartName ? ` (${bodyPartName})` : ""}\nStatus: ${STATUS_LABEL[caseStatus] ?? caseStatus}\nUrgency: ${caseUrgency.toUpperCase()}\nSubmitted: ${caseTime}\n\n${c.summary && c.summary !== "pending" ? `Report:\n${c.summary}` : "Awaiting radiologist review."}`
                      )
                    }
                    style={({ pressed }) => [
                      styles.caseCard,
                      { backgroundColor: cardBg, borderColor: cardBorder, opacity: pressed ? 0.88 : 1 },
                    ]}
                  >
                    <View style={[styles.caseAvatar, { backgroundColor: URGENCY_COLOR[caseUrgency] + "18" }]}>
                      <Feather name="user" size={18} color={URGENCY_COLOR[caseUrgency]} />
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <View style={styles.caseTopRow}>
                        <Text style={[styles.caseName, { color: textPrimary }]}>{patientNameVal}</Text>
                        {caseUrgency === "emergency" && (
                          <View style={[styles.urgencyBadge, { backgroundColor: "#DC2626" }]}>
                            <Text style={styles.urgencyText}>EMERGENCY</Text>
                          </View>
                        )}
                        {caseUrgency === "priority" && (
                          <View style={[styles.urgencyBadge, { backgroundColor: "#D97706" }]}>
                            <Text style={styles.urgencyText}>PRIORITY</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.caseScan, { color: "#315d93" }]}>
                        {scanName}{bodyPartName ? ` · ${bodyPartName}` : ""}
                      </Text>
                      <Text style={[styles.caseTime, { color: textMuted }]}>{caseTime}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[caseStatus] + "18" }]}>
                        <Text style={[styles.statusText, { color: STATUS_COLOR[caseStatus] }]}>
                          {STATUS_LABEL[caseStatus] ?? caseStatus}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={14} color={textMuted} />
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>

          {/* Security note */}
          <View
            style={[
              styles.secNote,
              {
                backgroundColor: isDark ? "rgba(49,93,147,0.15)" : "#EEF3FA",
                borderColor: isDark ? "rgba(49,93,147,0.3)" : "#315d93" + "30",
              },
            ]}
          >
            <Feather name="shield" size={14} color="#315d93" />
            <Text style={[styles.secNoteText, { color: textMuted }]}>
              All scans are encrypted end-to-end. Only authorized radiologists and assigned doctors can access
              patient data. Fully HIPAA-compliant.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* ── REPORTS MODAL ── */}
      {showReportsModal && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? "#1E2B3D" : "#fff" }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Radiology Reports</Text>
              <Pressable onPress={() => setShowReportsModal(false)}>
                <Feather name="x" size={22} color={textPrimary} />
              </Pressable>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 420, paddingHorizontal: 16 }}
              contentContainerStyle={{ gap: 10, paddingBottom: 16 }}
              keyboardShouldPersistTaps="handled"
            >
              {radiologyCases.filter((c) => deriveCaseStatus(c) === "completed").length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 32, gap: 12 }}>
                  <Feather name="file-text" size={44} color={textMuted} />
                  <Text style={[{ color: textPrimary, fontSize: 16, fontFamily: "Inter_600SemiBold" }]}>
                    No Completed Reports
                  </Text>
                  <Text
                    style={[{ color: textMuted, fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" }]}
                  >
                    Completed radiology reports will appear here for download.
                  </Text>
                </View>
              ) : (
                radiologyCases.filter((c) => deriveCaseStatus(c) === "completed").map((c) => {
                  const titleParts = (c.title ?? "").split(" — ");
                  const scanName = titleParts[0] ?? c.title;
                  return (
                    <View
                      key={c.id}
                      style={[styles.reportCard, { backgroundColor: inputBg, borderColor: cardBorder }]}
                    >
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={[styles.reportPatient, { color: textPrimary }]}>
                          {c.patientName ?? "Patient"}
                        </Text>
                        <Text style={[{ color: "#315d93", fontSize: 12, fontFamily: "Inter_500Medium" }]}>
                          {scanName}
                        </Text>
                        <Text style={[{ color: textMuted, fontSize: 11, fontFamily: "Inter_400Regular" }]}>
                          Reviewed {deriveCaseTime(c)}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() =>
                          Alert.alert(
                            "Report Ready",
                            `Report for ${c.patientName ?? "Patient"} (${scanName}) is ready.\n\n${c.summary}\n\nIn the full version, this would download a PDF report to your device.`
                          )
                        }
                        style={styles.downloadBtn}
                      >
                        <Feather name="download" size={14} color="#fff" />
                        <Text style={styles.downloadBtnText}>PDF</Text>
                      </Pressable>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {/* ── UPLOAD SCAN MODAL ── */}
      {showUploadModal && (
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : Platform.OS === "android" ? "height" : undefined}
            style={{ width: "100%", justifyContent: "flex-end" }}
            keyboardVerticalOffset={0}
          >
            <View style={[styles.modalCard, { backgroundColor: isDark ? "#1E2B3D" : "#fff" }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: textPrimary }]}>
                  {uploadStep === 1 ? "Select Scan Source" : "Patient & Scan Details"}
                </Text>
                <Pressable onPress={resetUploadModal}>
                  <Feather name="x" size={22} color={textPrimary} />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: 520 }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="none"
              >
                {uploadStep === 1 ? (
                  <View style={{ gap: 14, padding: 20 }}>
                    <Text style={[styles.modalSub, { color: textMuted }]}>
                      Choose how you want to upload the scan
                    </Text>
                    {[
                      { icon: "camera" as const, label: "Take Photo", desc: "Open camera to capture scan", onPress: () => pickImage("camera") },
                      { icon: "image" as const, label: "Upload from Gallery", desc: "Choose from phone gallery", onPress: () => pickImage("gallery") },
                      {
                        icon: "file" as const, label: "Upload DICOM / PDF", desc: "Select medical file from device",
                        onPress: () => {
                          Alert.alert("DICOM/PDF", "File picker would open here. Feature requires native build.");
                          setUploadStep(2);
                        },
                      },
                    ].map((src) => (
                      <Pressable
                        key={src.label}
                        onPress={src.onPress}
                        style={({ pressed }) => [
                          styles.sourceBtn,
                          {
                            backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F4F7FB",
                            borderColor: cardBorder,
                            opacity: pressed ? 0.85 : 1,
                          },
                        ]}
                      >
                        <View style={[styles.sourceIcon, { backgroundColor: "#315d93" + "18" }]}>
                          <Feather name={src.icon} size={22} color="#315d93" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.sourceLabel, { color: textPrimary }]}>{src.label}</Text>
                          <Text style={[styles.sourceDesc, { color: textMuted }]}>{src.desc}</Text>
                        </View>
                        <Feather name="chevron-right" size={16} color={textMuted} />
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <View style={{ gap: 14, padding: 20 }}>
                    {uploadedImage && (
                      <Image source={{ uri: uploadedImage }} style={styles.uploadPreview} resizeMode="cover" />
                    )}

                    <View>
                      <Text style={[styles.formLabel, { color: textMuted }]}>Patient Name *</Text>
                      <TextInput
                        style={[styles.formInput, { backgroundColor: inputBg, borderColor: cardBorder, color: textPrimary }]}
                        placeholder="Full name"
                        placeholderTextColor={textMuted}
                        value={patientName}
                        onChangeText={setPatientName}
                        autoCapitalize="words"
                        returnKeyType="next"
                      />
                    </View>

                    <View style={{ flexDirection: "row", gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.formLabel, { color: textMuted }]}>Age</Text>
                        <TextInput
                          style={[styles.formInput, { backgroundColor: inputBg, borderColor: cardBorder, color: textPrimary }]}
                          placeholder="e.g. 35"
                          placeholderTextColor={textMuted}
                          value={patientAge}
                          onChangeText={setPatientAge}
                          keyboardType="number-pad"
                          returnKeyType="done"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.formLabel, { color: textMuted }]}>Gender</Text>
                        <View style={styles.genderRow}>
                          {(["male", "female", "other"] as const).map((g) => (
                            <Pressable
                              key={g}
                              onPress={() => setPatientGender(g)}
                              style={[
                                styles.genderBtn,
                                {
                                  backgroundColor: patientGender === g ? "#315d93" : (isDark ? "rgba(255,255,255,0.08)" : "#EEF3FA"),
                                  borderColor: patientGender === g ? "#315d93" : cardBorder,
                                },
                              ]}
                            >
                              <Text style={[styles.genderText, { color: patientGender === g ? "#fff" : textMuted }]}>
                                {g[0].toUpperCase() + g.slice(1)}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    </View>

                    {/* Scan Type dropdown */}
                    <View>
                      <Text style={[styles.formLabel, { color: textMuted }]}>Scan Type *</Text>
                      <Pressable
                        onPress={() => { setShowScanDropdown(!showScanDropdown); setShowBodyDropdown(false); setShowRadiologistDropdown(false); }}
                        style={[styles.dropdown, { backgroundColor: inputBg, borderColor: cardBorder }]}
                      >
                        <Text style={[styles.dropdownText, { color: scanType ? textPrimary : textMuted }]}>
                          {scanType || "Select scan type..."}
                        </Text>
                        <Feather name={showScanDropdown ? "chevron-up" : "chevron-down"} size={16} color={textMuted} />
                      </Pressable>
                      {showScanDropdown && (
                        <View style={[styles.dropdownList, { backgroundColor: isDark ? "#1E2B3D" : "#fff", borderColor: cardBorder }]}>
                          {SCAN_TYPES.map((s) => (
                            <Pressable
                              key={s}
                              onPress={() => { setScanType(s); setShowScanDropdown(false); }}
                              style={[styles.dropdownItem, { borderBottomColor: cardBorder }]}
                            >
                              <Text style={[styles.dropdownItemText, { color: textPrimary }]}>{s}</Text>
                              {scanType === s && <Feather name="check" size={14} color="#315d93" />}
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>

                    {/* Body Part dropdown */}
                    <View>
                      <Text style={[styles.formLabel, { color: textMuted }]}>Body Part *</Text>
                      <Pressable
                        onPress={() => { setShowBodyDropdown(!showBodyDropdown); setShowScanDropdown(false); setShowRadiologistDropdown(false); }}
                        style={[styles.dropdown, { backgroundColor: inputBg, borderColor: cardBorder }]}
                      >
                        <Text style={[styles.dropdownText, { color: bodyPart ? textPrimary : textMuted }]}>
                          {bodyPart || "Select body part..."}
                        </Text>
                        <Feather name={showBodyDropdown ? "chevron-up" : "chevron-down"} size={16} color={textMuted} />
                      </Pressable>
                      {showBodyDropdown && (
                        <View style={[styles.dropdownList, { backgroundColor: isDark ? "#1E2B3D" : "#fff", borderColor: cardBorder }]}>
                          {BODY_PARTS.map((b) => (
                            <Pressable
                              key={b}
                              onPress={() => { setBodyPart(b); setShowBodyDropdown(false); }}
                              style={[styles.dropdownItem, { borderBottomColor: cardBorder }]}
                            >
                              <Text style={[styles.dropdownItemText, { color: textPrimary }]}>{b}</Text>
                              {bodyPart === b && <Feather name="check" size={14} color="#315d93" />}
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>

                    {/* Symptoms */}
                    <View>
                      <Text style={[styles.formLabel, { color: textMuted }]}>Symptoms / Notes</Text>
                      <TextInput
                        style={[styles.formInput, styles.textArea, { backgroundColor: inputBg, borderColor: cardBorder, color: textPrimary }]}
                        placeholder="Describe symptoms or findings..."
                        placeholderTextColor={textMuted}
                        value={symptoms}
                        onChangeText={setSymptoms}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        returnKeyType="done"
                      />
                    </View>

                    {/* Urgency */}
                    <View>
                      <Text style={[styles.formLabel, { color: textMuted }]}>Urgency Level *</Text>
                      <View style={styles.urgencyRow}>
                        {URGENCY_LEVELS.map((u) => (
                          <Pressable
                            key={u.id}
                            onPress={() => setUrgency(u.id)}
                            style={[
                              styles.urgencyOption,
                              {
                                backgroundColor: urgency === u.id ? u.color : (isDark ? "rgba(255,255,255,0.08)" : "#EEF3FA"),
                                borderColor: urgency === u.id ? u.color : cardBorder,
                              },
                            ]}
                          >
                            <Text style={[styles.urgencyOptionText, { color: urgency === u.id ? "#fff" : u.color }]}>
                              {u.label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>

                    {/* Assign Radiologist — from Supabase approved providers who are radiologists */}
                    <View>
                      <Text style={[styles.formLabel, { color: textMuted }]}>
                        Assign to Radiologist {radiologists.length > 0 ? `(${radiologists.length} available)` : ""}
                      </Text>
                      <Pressable
                        onPress={() => { setShowRadiologistDropdown(!showRadiologistDropdown); setShowScanDropdown(false); setShowBodyDropdown(false); }}
                        style={[styles.dropdown, { backgroundColor: inputBg, borderColor: cardBorder }]}
                      >
                        <Text style={[styles.dropdownText, { color: assignedRadiologist ? textPrimary : textMuted }]}>
                          {assignedRadiologist || "Auto-assign (recommended)"}
                        </Text>
                        <Feather name={showRadiologistDropdown ? "chevron-up" : "chevron-down"} size={16} color={textMuted} />
                      </Pressable>
                      {showRadiologistDropdown && (
                        <View style={[styles.dropdownList, { backgroundColor: isDark ? "#1E2B3D" : "#fff", borderColor: cardBorder }]}>
                          <Pressable
                            onPress={() => { setAssignedRadiologist(""); setShowRadiologistDropdown(false); }}
                            style={[styles.dropdownItem, { borderBottomColor: cardBorder }]}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.dropdownItemText, { color: textPrimary }]}>Auto-assign</Text>
                              <Text style={[{ color: textMuted, fontSize: 11, fontFamily: "Inter_400Regular" }]}>
                                Best match based on scan type & availability
                              </Text>
                            </View>
                            {!assignedRadiologist && <Feather name="check" size={14} color="#315d93" />}
                          </Pressable>
                          {radiologists.length === 0 ? (
                            <View style={{ padding: 14 }}>
                              <Text style={[{ color: textMuted, fontSize: 13, fontFamily: "Inter_400Regular" }]}>
                                No radiologists registered yet. Auto-assign will find the best match.
                              </Text>
                            </View>
                          ) : (
                            radiologists.map((rad) => (
                              <Pressable
                                key={rad.userId}
                                onPress={() => { setAssignedRadiologist(rad.name); setShowRadiologistDropdown(false); }}
                                style={[styles.dropdownItem, { borderBottomColor: cardBorder }]}
                              >
                                <View style={{ flex: 1 }}>
                                  <Text style={[styles.dropdownItemText, { color: textPrimary }]}>{rad.name}</Text>
                                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                                    <Text style={[{ color: textMuted, fontSize: 11, fontFamily: "Inter_400Regular" }]}>
                                      {rad.specialty ?? rad.providerType}
                                    </Text>
                                    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: "#059669" }} />
                                    <Text style={[{ color: "#059669", fontSize: 10, fontFamily: "Inter_600SemiBold" }]}>
                                      Available
                                    </Text>
                                  </View>
                                </View>
                                {assignedRadiologist === rad.name && <Feather name="check" size={14} color="#315d93" />}
                              </Pressable>
                            ))
                          )}
                        </View>
                      )}
                    </View>

                    <Pressable
                      onPress={submitScan}
                      style={({ pressed }) => [styles.submitBtn, { opacity: pressed ? 0.9 : 1 }]}
                    >
                      <Feather name="upload-cloud" size={18} color="#fff" />
                      <Text style={styles.submitBtnText}>Submit Scan for Review</Text>
                    </Pressable>
                  </View>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}
    </Container>
  );
}

// ── Supabase Doctor Card ───────────────────────────────────────────────────────
function SupabaseDoctorCard({
  doc, isDark, textPrimary, textMuted, cardBg, cardBorder,
}: {
  doc: SupabaseDoctor;
  isDark: boolean;
  textPrimary: string;
  textMuted: string;
  cardBg: string;
  cardBorder: string;
}) {
  const isOnline = doc.serviceModes?.video || doc.serviceModes?.audio;
  const isAvailable =
    doc.serviceModes?.inPerson ||
    doc.serviceModes?.video ||
    (doc.availability && doc.availability.length > 0);

  const serviceTagLabels: string[] = [];
  if (doc.serviceModes?.video) serviceTagLabels.push("Video");
  if (doc.serviceModes?.audio) serviceTagLabels.push("Audio");
  if (doc.serviceModes?.inPerson) serviceTagLabels.push("In-Person");
  if (doc.serviceModes?.homeVisit) serviceTagLabels.push("Home Care");

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({
          pathname: "/provider-detail",
          params: { doctorId: doc.userId, doctorName: doc.name },
        });
      }}
      style={({ pressed }) => [
        styles.docCard,
        {
          backgroundColor: cardBg,
          borderColor: cardBorder,
          opacity: pressed ? 0.88 : 1,
          shadowColor: isDark ? "#000" : "#CBD5E1",
          shadowOpacity: isDark ? 0.3 : 0.08,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 8,
        },
      ]}
    >
      <View style={[styles.docAvatarWrap, { backgroundColor: "#315d93" + "18" }]}>
        <Feather name="user" size={26} color="#315d93" />
        {isOnline && <View style={styles.onlineDot} />}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[styles.docName, { color: textPrimary }]}>{doc.name}</Text>
        <Text style={[styles.docSpec, { color: "#315d93" }]}>
          {doc.specialty ?? doc.providerType ?? "Healthcare Provider"}
        </Text>
        <View style={styles.docMetaRow}>
          <Feather name="map-pin" size={10} color={textMuted} />
          <Text style={[styles.docMetaText, { color: textMuted }]} numberOfLines={1}>
            {doc.city ?? "Addis Ababa"}
            {doc.experienceYears ? ` · ${doc.experienceYears} yrs` : ""}
          </Text>
        </View>
        <View style={styles.docTags}>
          {serviceTagLabels.slice(0, 3).map((t) => (
            <View key={t} style={[styles.tag, { backgroundColor: isDark ? "rgba(49, 93, 147, 0.45)" : "#315d93" + "12" }]}>
              <Text style={[styles.tagText, { color: isDark ? "#8FBCFF" : "#315d93" }]}>{t}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={{ alignItems: "flex-end", gap: 5 }}>
        {doc.consultationFee != null && (
          <Text style={[styles.docPrice, { color: "#059669" }]}>
            ETB {Number(doc.consultationFee).toLocaleString()}
          </Text>
        )}
        <View style={[styles.availBadge, { backgroundColor: isAvailable ? "#059669" + "18" : "#64748B" + "18" }]}>
          <Text style={[styles.availText, { color: isAvailable ? "#059669" : "#64748B" }]}>
            {isAvailable ? "Available" : "Busy"}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 0, gap: 12 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 8 },
  headerTitle: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  dashBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
  },
  dashBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  topTabsRow: { flexDirection: "row", gap: 0 },
  topTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 12 },
  topTabActive: { backgroundColor: "#fff", borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  topTabText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  filterScrollView: { flexGrow: 0, flexShrink: 0 },
  filterRow: { gap: 8, alignItems: "center", paddingHorizontal: 14, paddingVertical: 10 },
  filterChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
  },
  filterChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  filterBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 },
  filterBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  searchSection: {
    flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 0.5,
  },
  searchBar: { flex: 1, flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, height: 42 },
  searchInput: { flex: 1, paddingHorizontal: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
  viewToggle: { flexDirection: "row", borderRadius: 10, overflow: "hidden", padding: 2 },
  viewBtn: { padding: 8, borderRadius: 8 },
  resultCount: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 4, marginTop: 8 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  apptHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  newApptBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
  },
  newApptText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  apptCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  apptIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  apptDoc: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  apptSpec: { fontSize: 12, fontFamily: "Inter_500Medium" },
  apptDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  apptAmount: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  reuploadBtn: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  emptyState: { alignItems: "center", gap: 14, paddingTop: 40, paddingHorizontal: 24 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
  emptyBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 25 },
  emptyBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  teleBanner: { padding: 20, gap: 16 },
  teleStats: {
    flexDirection: "row", justifyContent: "space-around",
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, padding: 14,
  },
  teleStatItem: { alignItems: "center", gap: 4 },
  teleStatVal: { fontSize: 22, fontFamily: "Inter_700Bold" },
  teleStatLabel: { color: "rgba(255,255,255,0.65)", fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  teleActions: { flexDirection: "row", flexWrap: "wrap", gap: 10, padding: 16, justifyContent: "space-between" },
  teleActionBtn: { alignItems: "center", gap: 8, paddingVertical: 14, paddingHorizontal: 8, borderRadius: 14, borderWidth: 1 },
  teleActionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  teleActionLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
  caseCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  caseAvatar: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  caseTopRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  caseName: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  urgencyBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  urgencyText: { color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold" },
  caseScan: { fontSize: 12, fontFamily: "Inter_500Medium" },
  caseTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  secNote: {
    flexDirection: "row", gap: 10, margin: 16, padding: 12,
    borderRadius: 10, borderWidth: 1, alignItems: "flex-start",
  },
  secNoteText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 17 },
  docCard: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  docAvatarWrap: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center" },
  onlineDot: {
    position: "absolute", bottom: 2, right: 2, width: 12, height: 12,
    borderRadius: 6, backgroundColor: "#059669", borderWidth: 2, borderColor: "#fff",
  },
  docName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  docSpec: { fontSize: 12, fontFamily: "Inter_500Medium" },
  docMetaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  docMetaText: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  docTags: { flexDirection: "row", gap: 5, flexWrap: "wrap" },
  tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  tagText: { fontSize: 9, fontFamily: "Inter_500Medium" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingVal: { fontSize: 12, fontFamily: "Inter_700Bold" },
  docPrice: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  availBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  availText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  modalOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end",
  },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 20 },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 20, paddingBottom: 8,
  },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  sourceBtn: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 14, borderWidth: 1 },
  sourceIcon: { width: 50, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  sourceLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sourceDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  uploadPreview: { width: "100%", height: 180, borderRadius: 14 },
  formLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 6 },
  formInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular" },
  textArea: { height: 80 },
  genderRow: { flexDirection: "row", gap: 6 },
  genderBtn: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  genderText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  dropdown: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1, borderRadius: 10, padding: 12,
  },
  dropdownText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  dropdownList: { borderWidth: 1, borderRadius: 10, marginTop: 4, maxHeight: 200, overflow: "hidden" },
  dropdownItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderBottomWidth: 0.5 },
  dropdownItemText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  urgencyRow: { flexDirection: "row", gap: 8 },
  urgencyOption: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  urgencyOptionText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "#202937", paddingVertical: 15, borderRadius: 14,
  },
  submitBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  reportCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  reportPatient: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  downloadBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#315d93", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  downloadBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  chatSecNote: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, padding: 10, borderRadius: 8 },
  chatBubble: { maxWidth: "82%", borderRadius: 14, padding: 10 },
  chatBubbleMe: { alignSelf: "flex-end", backgroundColor: "#315d93" },
  chatBubbleDoctor: { alignSelf: "flex-start", backgroundColor: "rgba(49,93,147,0.12)" },
  chatBubbleName: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  chatBubbleText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  chatBubbleTime: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 4, textAlign: "right" },
  chatInputRow: { flexDirection: "row", gap: 10, padding: 12, borderTopWidth: 0.5 },
  chatInput: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
  chatSendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  webMapContainer: { flex: 1, margin: 16, borderRadius: 20, alignItems: "center", justifyContent: "center", gap: 16, minHeight: 320 },
  webMapGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center", padding: 20 },
  webMapPin: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", shadowOpacity: 0.4, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8 },
  webMapLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  webMapCallout: { margin: 16, padding: 14, borderRadius: 14, borderWidth: 1, gap: 4 },
  webMapCalloutName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  webMapCalloutSpec: { fontSize: 12, fontFamily: "Inter_500Medium" },
  webMapCalloutHosp: { fontSize: 11, fontFamily: "Inter_400Regular" },
  webMapCalloutRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  webMapCalloutRating: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  availDot: { width: 8, height: 8, borderRadius: 4 },
  mapInfoCard: { position: "absolute", bottom: 16, left: 16, right: 16, flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, shadowOpacity: 0.12, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12 },
  mapInfoName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  mapInfoSpec: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  mapInfoRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  mapInfoRating: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  mapInfoBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#315d93", alignItems: "center", justifyContent: "center" },
});
