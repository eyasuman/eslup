import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getDoctorByUserId } from "@/lib/supabase";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { isValidLocationCoordinates } from "@/lib/mapLocations";

export default function ProviderDetailScreen() {
  const params = useLocalSearchParams<{
    doctorId?: string;
    id?: string;
    doctorName?: string;
    initialTab?: "about" | "services" | "location";
  }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useApp();
  const initialTab = (params.initialTab as "about" | "services" | "location") ?? "about";
  const [activeTab, setActiveTab] = useState<"about" | "services" | "location">(
    ["about", "services", "location"].includes(initialTab) ? initialTab : "about"
  );
  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const userId = params.doctorId ?? params.id ?? "";

  useEffect(() => {
    if (!userId) {
      setFetchError("No provider ID supplied.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setFetchError(null);
    getDoctorByUserId(userId)
      .then((data) => setDoctor(data))
      .catch((err) => {
        setFetchError(err?.message ?? "Could not load provider profile.");
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const bg = colors.isDark ? colors.background : "#FFFFFF";
  const textPrimary = colors.isDark ? "#FFFFFF" : "#202937";
  const textMuted = colors.isDark ? "#B8C5D6" : "#64748B";
  const cardBg = colors.isDark ? "rgba(255,255,255,0.10)" : "#F4F7FB";
  const borderCol = colors.isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0";

  const hasVideo = doctor?.serviceModes?.video === true;
  const hasAudio = doctor?.serviceModes?.audio === true;
  const hasInPerson = doctor?.serviceModes?.inPerson === true;
  const hasHomeVisit = doctor?.serviceModes?.homeVisit === true;
  const isAvailable = hasVideo || hasAudio || hasInPerson || hasHomeVisit ||
    (doctor?.availability && doctor.availability.length > 0);

  const initials = doctor
    ? (doctor.name ?? "").split(" ").slice(0, 2).map((n: string) => n[0]).join("")
    : (params.doctorName ?? "").split(" ").slice(0, 2).map((n) => n[0]).join("");

  const goBook = (serviceType?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/booking",
      params: {
        doctorId: doctor?.userId ?? userId,
        doctorName: doctor?.name ?? params.doctorName ?? "Provider",
        specialty: doctor?.specialty ?? "",
        serviceType: serviceType ?? "",
      },
    });
  };

  const goVideoCall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!user) {
      Alert.alert("Sign in required", "Please sign in to start a video consultation.");
      return;
    }
    Alert.alert(
      "Appointment required",
      "Video consultations can only be joined from a verified video appointment.",
      [{ text: "Book video consultation", onPress: () => goBook("video") }, { text: "Cancel", style: "cancel" }],
    );
  };

  const goToMap = () => {
    if (!isValidLocationCoordinates(doctor?.lat, doctor?.lng)) {
      Alert.alert("Location unavailable", `${doctor?.name ?? "This provider"} has not added valid map coordinates yet.`);
      return;
    }
    router.push({
      pathname: "/(tabs)/healthcare" as any,
      params: {
        openMap: "1",
        selectedType: "provider",
        selectedId: doctor.userId ?? userId,
        selectedName: doctor.name ?? params.doctorName ?? "Healthcare Provider",
        selectedSubtitle: doctor.specialty ?? doctor.providerType ?? "Healthcare Provider",
        selectedCity: doctor.city ?? "",
        selectedLat: String(doctor.lat),
        selectedLng: String(doctor.lng),
      },
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bg, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#315d93" />
        <Text style={{ color: textMuted, fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 12 }}>
          Loading provider profile…
        </Text>
      </View>
    );
  }

  if (fetchError || !doctor) {
    return (
      <View style={[styles.container, { backgroundColor: bg, justifyContent: "center", alignItems: "center" }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { position: "absolute", top: topPad + 12, left: 16 }]}>
          <Feather name="arrow-left" size={22} color={textPrimary} />
        </Pressable>
        <Feather name="alert-circle" size={52} color="#DC2626" />
        <Text style={{ color: textPrimary, fontFamily: "Inter_700Bold", fontSize: 18, marginTop: 16, textAlign: "center" }}>
          Profile Not Found
        </Text>
        <Text style={{ color: textMuted, fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 8, textAlign: "center", paddingHorizontal: 32 }}>
          {fetchError ?? "Could not load this provider's profile."}
        </Text>
        <Pressable
          onPress={() => { setLoading(true); setFetchError(null); getDoctorByUserId(userId).then(setDoctor).catch((e) => setFetchError(e?.message ?? "Error")).finally(() => setLoading(false)); }}
          style={{ marginTop: 20, backgroundColor: "#315d93", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 }}
        >
          <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  const fee = doctor.consultationFee ? `ETB ${Number(doctor.consultationFee).toLocaleString()}` : "Contact for fee";

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.header, { paddingTop: topPad + 10 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </Pressable>

        <View style={styles.profileSection}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitials}>{initials || "DR"}</Text>
            </View>
            {isAvailable && <View style={styles.onlineDot} />}
          </View>
          <Text style={styles.docName}>{doctor.name}</Text>
          <Text style={styles.docSpec}>{doctor.specialty ?? doctor.providerType ?? "Healthcare Provider"}</Text>
          <Text style={styles.docHosp}>{doctor.city ?? "Addis Ababa"}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Feather name="clock" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.metaVal}>
                {doctor.experienceYears ? `${doctor.experienceYears}y exp` : "Experienced"}
              </Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={[styles.availBadge, { backgroundColor: isAvailable ? "#05966930" : "#64748B30" }]}>
              <View style={[styles.availDot, { backgroundColor: isAvailable ? "#059669" : "#64748B" }]} />
              <Text style={[styles.availText, { color: isAvailable ? "#059669" : "#94A3B8" }]}>
                {isAvailable ? "Available" : "Unavailable"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.profileTabs}>
          {(["about", "services", "location"] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.profileTab, activeTab === tab && styles.profileTabActive]}
            >
              <Text style={[styles.profileTabText, { color: activeTab === tab ? "#fff" : "rgba(255,255,255,0.5)" }]}>
                {tab === "about" ? "About" : tab === "services" ? "Services" : "Map"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: bottomPad + 100 }}
      >
        {activeTab === "about" && (
          <>
            {doctor.bio ? (
              <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Text style={[styles.cardTitle, { color: textPrimary }]}>Biography</Text>
                <Text style={[styles.bio, { color: textMuted }]}>{doctor.bio}</Text>
              </View>
            ) : null}

            <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <Text style={[styles.cardTitle, { color: textPrimary }]}>Details</Text>
              {[
                { icon: "map-pin" as const, label: "Location", value: doctor.city ?? "Addis Ababa" },
                doctor.licenseNo ? { icon: "award" as const, label: "License No.", value: doctor.licenseNo } : null,
                { icon: "dollar-sign" as const, label: "Consultation Fee", value: fee },
                doctor.experienceYears ? { icon: "clock" as const, label: "Experience", value: `${doctor.experienceYears} years` } : null,
                doctor.phone ? { icon: "phone" as const, label: "Phone", value: doctor.phone } : null,
              ]
                .filter(Boolean)
                .map((item: any) => (
                  <View key={item.label} style={[styles.detailRow, { borderBottomColor: borderCol }]}>
                    <View style={[styles.detailIcon, { backgroundColor: "#315d93" + "18" }]}>
                      <Feather name={item.icon} size={14} color="#315d93" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.detailLabel, { color: textMuted }]}>{item.label}</Text>
                      <Text style={[styles.detailValue, { color: textPrimary }]}>{item.value}</Text>
                    </View>
                  </View>
                ))}
            </View>

            <View style={[styles.disclaimerCard, { backgroundColor: colors.isDark ? "rgba(255,255,255,0.04)" : "#FFF7ED", borderColor: "#FED7AA" }]}>
              <Feather name="shield" size={16} color="#D97706" />
              <Text style={[styles.disclaimerText, { color: textMuted }]}>
                Once communication is established between you and this provider, PULSE Health-Tech Solution holds no responsibility for the further communication or outcome of that interaction.
              </Text>
            </View>
          </>
        )}

        {activeTab === "services" && (
          <>
            <Text style={[styles.cardTitle, { color: textPrimary }]}>Available Consultation Types</Text>

            {hasVideo && (
              <Pressable
                onPress={goVideoCall}
                style={({ pressed }) => [styles.serviceRow, { backgroundColor: "#202937", borderColor: "#315d93", opacity: pressed ? 0.9 : 1 }]}
              >
                <View style={[styles.serviceIcon, { backgroundColor: "#315d93" + "40" }]}>
                  <Feather name="video" size={22} color="#7FA8D8" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.serviceTitle, { color: "#fff" }]}>Video Consultation</Text>
                  <Text style={[styles.serviceDesc, { color: "rgba(255,255,255,0.55)" }]}>Secure in-app video call · No external apps</Text>
                  <Text style={{ color: "#7FA8D8", fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 3 }}>
                    {fee} · {isAvailable ? "Available Now" : "Book ahead"}
                  </Text>
                </View>
                <View style={[styles.liveTag, { backgroundColor: isAvailable ? "#059669" : "#64748B" }]}>
                  <Text style={styles.liveTagText}>{isAvailable ? "LIVE" : "BOOK"}</Text>
                </View>
              </Pressable>
            )}

            {hasAudio && (
              <Pressable
                onPress={() => goBook("phone")}
                style={({ pressed }) => [styles.serviceRow, { backgroundColor: cardBg, borderColor: borderCol, opacity: pressed ? 0.9 : 1 }]}
              >
                <View style={[styles.serviceIcon, { backgroundColor: "#059669" + "18" }]}>
                  <Feather name="phone" size={22} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.serviceTitle, { color: textPrimary }]}>Phone / Audio Consultation</Text>
                  <Text style={[styles.serviceDesc, { color: textMuted }]}>Voice consultation over phone call</Text>
                </View>
                <View style={[styles.availBadge, { backgroundColor: "#05966920" }]}>
                  <Text style={[styles.availText, { color: "#059669" }]}>Available</Text>
                </View>
              </Pressable>
            )}

            {hasInPerson && (
              <Pressable
                onPress={() => goBook("inPerson")}
                style={({ pressed }) => [styles.serviceRow, { backgroundColor: cardBg, borderColor: borderCol, opacity: pressed ? 0.9 : 1 }]}
              >
                <View style={[styles.serviceIcon, { backgroundColor: "#315d93" + "18" }]}>
                  <Feather name="activity" size={22} color="#315d93" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.serviceTitle, { color: textPrimary }]}>In-Person Visit</Text>
                  <Text style={[styles.serviceDesc, { color: textMuted }]}>Visit the clinic at their location</Text>
                </View>
                <View style={[styles.availBadge, { backgroundColor: "#05966920" }]}>
                  <Text style={[styles.availText, { color: "#059669" }]}>Available</Text>
                </View>
              </Pressable>
            )}

            {hasHomeVisit && (
              <Pressable
                onPress={() => goBook("homecare")}
                style={({ pressed }) => [styles.serviceRow, { backgroundColor: cardBg, borderColor: borderCol, opacity: pressed ? 0.9 : 1 }]}
              >
                <View style={[styles.serviceIcon, { backgroundColor: "#D97706" + "18" }]}>
                  <Feather name="home" size={22} color="#D97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.serviceTitle, { color: textPrimary }]}>Home Care Visit</Text>
                  <Text style={[styles.serviceDesc, { color: textMuted }]}>Provider visits you at your location</Text>
                </View>
                <View style={[styles.availBadge, { backgroundColor: "#05966920" }]}>
                  <Text style={[styles.availText, { color: "#059669" }]}>Available</Text>
                </View>
              </Pressable>
            )}

            {!hasVideo && !hasAudio && !hasInPerson && !hasHomeVisit && (
              <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol, alignItems: "center", paddingVertical: 24 }]}>
                <Feather name="info" size={28} color={textMuted} />
                <Text style={{ color: textMuted, fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 10, textAlign: "center" }}>
                  No services configured yet. Contact the provider directly.
                </Text>
              </View>
            )}

            <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <Text style={[styles.cardTitle, { color: textPrimary }]}>Current Status</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={[styles.statusCircle, { backgroundColor: isAvailable ? "#059669" : "#64748B" }]} />
                <Text style={[{ fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 }, { color: textPrimary }]}>
                  {isAvailable ? "Available — Ready for consultations" : "Currently unavailable"}
                </Text>
              </View>
            </View>
          </>
        )}

        {activeTab === "location" && doctor && (
          <View style={[styles.locationCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={[styles.locationIcon, { backgroundColor: isValidLocationCoordinates(doctor.lat, doctor.lng) ? "#315d9320" : "#64748B20" }]}>
              <Feather
                name={isValidLocationCoordinates(doctor.lat, doctor.lng) ? "map-pin" : "map"}
                size={30}
                color={isValidLocationCoordinates(doctor.lat, doctor.lng) ? "#315d93" : textMuted}
              />
            </View>
            <Text style={[styles.locationTitle, { color: textPrimary }]}>
              {isValidLocationCoordinates(doctor.lat, doctor.lng) ? doctor.city ?? "Provider location" : "Location unavailable"}
            </Text>
            <Text style={[styles.locationText, { color: textMuted }]}>
              {isValidLocationCoordinates(doctor.lat, doctor.lng)
                ? "Open the Pulse map to view this provider's exact clinic location."
                : "This provider has not added valid map coordinates yet."}
            </Text>
            {isValidLocationCoordinates(doctor.lat, doctor.lng) && (
              <Pressable onPress={goToMap} style={styles.openMapBtn}>
                <Feather name="map" size={16} color="#fff" />
                <Text style={styles.openMapText}>View in Pulse Map</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: bottomPad + 10, backgroundColor: bg, borderTopColor: borderCol }]}>
        <Pressable
          onPress={() => goBook()}
          style={({ pressed }) => [styles.bookBtn, { opacity: pressed ? 0.9 : 1 }]}
        >
          <Feather name="calendar" size={16} color="#fff" />
          <Text style={styles.bookBtnText}>Book · {fee}</Text>
        </Pressable>

        {hasVideo && (
          <Pressable
            onPress={goVideoCall}
            style={({ pressed }) => [styles.videoBtn, { opacity: pressed ? 0.9 : 1, borderColor: "#315d93" }]}
          >
            <Feather name="video" size={16} color="#315d93" />
            <Text style={styles.videoBtnText}>Video Call</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { backgroundColor: "#202937", paddingHorizontal: 20, paddingBottom: 0 },
  backBtn: { marginBottom: 16, width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  profileSection: { alignItems: "center", gap: 6, marginBottom: 16 },
  avatarWrap: { position: "relative" },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: "rgba(49,93,147,0.5)", alignItems: "center", justifyContent: "center" },
  avatarInitials: { color: "#fff", fontSize: 30, fontFamily: "Inter_700Bold" },
  onlineDot: { position: "absolute", bottom: 4, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: "#059669", borderWidth: 2, borderColor: "#202937" },
  docName: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold" },
  docSpec: { color: "#7FA8D8", fontSize: 14, fontFamily: "Inter_500Medium" },
  docHosp: { color: "rgba(255,255,255,0.55)", fontSize: 12, fontFamily: "Inter_400Regular" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 6 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaVal: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  metaDivider: { width: 1, height: 14, backgroundColor: "rgba(255,255,255,0.2)" },
  availBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  availDot: { width: 6, height: 6, borderRadius: 3 },
  availText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  profileTabs: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: "rgba(255,255,255,0.15)", marginTop: 6 },
  profileTab: { flex: 1, paddingVertical: 14, alignItems: "center" },
  profileTabActive: { borderBottomWidth: 3, borderBottomColor: "#315d93" },
  profileTabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  card: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 12 },
  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  bio: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 21 },
  detailRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 10, borderBottomWidth: 0.5 },
  detailIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 2 },
  detailLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  detailValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  disclaimerCard: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: "flex-start" },
  disclaimerText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 17 },
  serviceRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 14, borderWidth: 1 },
  serviceIcon: { width: 50, height: 50, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  serviceTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  serviceDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  liveTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  liveTagText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  statusCircle: { width: 12, height: 12, borderRadius: 6 },
  bottomBar: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 0.5 },
  bookBtn: { flex: 1, backgroundColor: "#315d93", borderRadius: 14, padding: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  bookBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  videoBtn: { flex: 1, backgroundColor: "transparent", borderRadius: 14, padding: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5 },
  videoBtnText: { color: "#315d93", fontSize: 14, fontFamily: "Inter_700Bold" },
  locationCard: { minHeight: 280, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", padding: 28 },
  locationIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  locationTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 16, textAlign: "center" },
  locationText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, textAlign: "center", marginTop: 6 },
  openMapBtn: { marginTop: 20, backgroundColor: "#315d93", borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  openMapText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
});
