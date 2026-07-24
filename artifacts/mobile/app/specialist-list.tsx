import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CATEGORY_TO_PROVIDER_TYPE, type ServiceCategoryId } from "@/data/providerCategories";
import { getApprovedDoctors, subscribeToProviders, unsubscribeChannel, type SupabaseDoctor } from "@/lib/supabase";
import { useColors } from "@/hooks/useColors";

// Haversine distance in km between two lat/lng points
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function SpecialistListScreen() {
  const { specialty, category, nearbyLat, nearbyLng } = useLocalSearchParams<{
    specialty: string;
    category: ServiceCategoryId;
    nearbyLat: string;
    nearbyLng: string;
  }>();

  const isNearbyMode = !!(nearbyLat && nearbyLng);
  const userLat = nearbyLat ? parseFloat(nearbyLat) : null;
  const userLng = nearbyLng ? parseFloat(nearbyLng) : null;

  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [sortBy, setSortBy] = useState<"price" | "experience" | "distance">(
    isNearbyMode ? "distance" : "experience"
  );
  const [modeFilter, setModeFilter] = useState<"video" | "phone" | "homecare" | null>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [providers, setProviders] = useState<SupabaseDoctor[]>([]);
  const [loading, setLoading] = useState(true);

  const bg = colors.isDark ? colors.background : "#FFFFFF";
  const textPrimary = colors.isDark ? "#FFFFFF" : "#202937";
  const textMuted = colors.isDark ? "#B8C5D6" : "#64748B";
  const cardBg = colors.isDark ? "rgba(255,255,255,0.10)" : "#F4F7FB";
  const borderCol = colors.isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0";

  // ── Fetch real approved providers from Supabase + realtime ────────────────
  useEffect(() => {
    setLoading(true);
    getApprovedDoctors()
      .then((data) => setProviders(data as SupabaseDoctor[]))
      .catch(() => {})
      .finally(() => setLoading(false));

    const channel = subscribeToProviders((payload: any) => {
      const updated = payload.new as SupabaseDoctor;
      if (!updated?.userId) return;
      if (updated.status === "Active") {
        setProviders((prev) => {
          const exists = prev.find((d) => d.userId === updated.userId);
          return exists
            ? prev.map((d) => (d.userId === updated.userId ? { ...d, ...updated } : d))
            : [updated, ...prev];
        });
      } else {
        setProviders((prev) => prev.filter((d) => d.userId !== updated.userId));
      }
    });

    return () => { unsubscribeChannel(channel); };
  }, []);

  const providerType = category ? CATEGORY_TO_PROVIDER_TYPE[category] : undefined;

  const doctors = useMemo(() => {
    let list = providerType
      ? providers.filter((d) => (d.providerType ?? "").toLowerCase() === providerType.toLowerCase())
      : providers;

    if (specialty) {
      const bySpecialty = list.filter((d) => (d.specialty ?? "").toLowerCase() === specialty.toLowerCase());
      if (bySpecialty.length > 0) list = bySpecialty;
    }

    if (modeFilter) {
      list = list.filter((d) => {
        if (modeFilter === "video") return d.serviceModes?.video === true;
        if (modeFilter === "phone") return d.serviceModes?.audio === true;
        return d.serviceModes?.homeVisit === true;
      });
    }

    return [...list].sort((a, b) => {
      if (sortBy === "distance" && userLat !== null && userLng !== null) {
        const dA = a.lat && a.lng ? haversineKm(userLat, userLng, a.lat, a.lng) : 9999;
        const dB = b.lat && b.lng ? haversineKm(userLat, userLng, b.lat, b.lng) : 9999;
        return dA - dB;
      }
      if (sortBy === "price") return (a.consultationFee ?? 0) - (b.consultationFee ?? 0);
      return (b.experienceYears ?? 0) - (a.experienceYears ?? 0);
    });
  }, [providers, providerType, specialty, sortBy, modeFilter, userLat, userLng]);

  const MODE_FILTERS = [
    { id: "video" as const, label: "Video", icon: "video" as const },
    { id: "phone" as const, label: "Audio", icon: "phone" as const },
    { id: "homecare" as const, label: "Home Care", icon: "home" as const },
  ];

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: "#202937", paddingHorizontal: 20, paddingBottom: 20 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        {isNearbyMode ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <Feather name="map-pin" size={18} color="#6EE7B7" />
              <Text style={styles.headerTitle}>Near You</Text>
            </View>
            <Text style={styles.headerSub}>
              {doctors.length} provider{doctors.length !== 1 ? "s" : ""} · sorted by distance
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.headerTitle}>{specialty ?? "All Providers"}</Text>
            <Text style={styles.headerSub}>{doctors.length} provider{doctors.length !== 1 ? "s" : ""} found</Text>
          </>
        )}

        {/* Sort Options */}
        <View style={styles.sortRow}>
          {(isNearbyMode
            ? (["distance", "experience", "price"] as const)
            : (["experience", "price"] as const)
          ).map((s) => (
            <Pressable
              key={s}
              onPress={() => setSortBy(s)}
              style={[
                styles.sortChip,
                { backgroundColor: sortBy === s ? "#315d93" : "rgba(255,255,255,0.12)" },
              ]}
            >
              <Text style={[styles.sortChipText, { color: sortBy === s ? "#fff" : "rgba(255,255,255,0.7)" }]}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Consultation Mode Filter */}
        <View style={[styles.sortRow, { marginTop: 8 }]}>
          {MODE_FILTERS.map((m) => {
            const isSelected = modeFilter === m.id;
            return (
              <Pressable
                key={m.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setModeFilter(isSelected ? null : m.id);
                }}
                style={[
                  styles.sortChip,
                  styles.modeChip,
                  { backgroundColor: isSelected ? "#315d93" : "rgba(255,255,255,0.12)" },
                ]}
              >
                <Feather name={m.icon} size={12} color={isSelected ? "#fff" : "rgba(255,255,255,0.7)"} />
                <Text style={[styles.sortChipText, { color: isSelected ? "#fff" : "rgba(255,255,255,0.7)" }]}>
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 }}>
          <ActivityIndicator size="large" color="#315d93" />
          <Text style={{ color: textMuted, fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 12 }}>
            Loading providers…
          </Text>
        </View>
      ) : doctors.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, paddingHorizontal: 32 }}>
          <Feather name="users" size={44} color={textMuted} />
          <Text style={{ color: textPrimary, fontFamily: "Inter_700Bold", fontSize: 16, marginTop: 16, textAlign: "center" }}>
            No providers yet
          </Text>
          <Text style={{ color: textMuted, fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 6, textAlign: "center" }}>
            No approved providers in this category right now. Please check back soon.
          </Text>
        </View>
      ) : (
        <FlatList
          data={doctors}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: bottomPad + 110 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isOnline = item.serviceModes?.video === true || item.serviceModes?.audio === true;
            const isAvailable =
              item.serviceModes?.inPerson === true ||
              item.serviceModes?.video === true ||
              (item.availability && item.availability.length > 0);

            const consultationTags: { id: "video" | "phone" | "homecare"; icon: "video" | "phone" | "home" }[] = [];
            if (item.serviceModes?.video) consultationTags.push({ id: "video", icon: "video" });
            if (item.serviceModes?.audio) consultationTags.push({ id: "phone", icon: "phone" });
            if (item.serviceModes?.homeVisit) consultationTags.push({ id: "homecare", icon: "home" });

            return (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({ pathname: "/provider-detail", params: { id: item.userId, doctorName: item.name } });
                }}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: cardBg, borderColor: borderCol, opacity: pressed ? 0.88 : 1 },
                ]}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.avatar, { backgroundColor: "#315d93" + "20" }]}>
                    <Feather name="user" size={30} color="#315d93" />
                    {isOnline && <View style={styles.onlineDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.docName, { color: textPrimary }]}>{item.name}</Text>
                    <Text style={[styles.docSpec, { color: "#315d93" }]}>
                      {item.specialty ?? item.providerType ?? "Healthcare Provider"}
                    </Text>
                    <View style={styles.locRow}>
                      <Feather name="map-pin" size={11} color={textMuted} />
                      <Text style={[styles.locText, { color: textMuted }]}>
                        {item.city ?? "Addis Ababa"}
                        {item.experienceYears ? ` · ${item.experienceYears} yrs exp` : ""}
                      </Text>
                    </View>
                  </View>
                </View>

                {item.bio ? (
                  <Text style={[styles.bio, { color: textMuted }]} numberOfLines={2}>{item.bio}</Text>
                ) : null}

                <View style={styles.cardMeta}>
                  {item.consultationFee != null ? (
                    <Text style={[styles.price, { color: "#059669" }]}>
                      ETB {Number(item.consultationFee).toLocaleString()}
                    </Text>
                  ) : (
                    <Text style={[styles.price, { color: textMuted }]}>Contact for fee</Text>
                  )}
                  <View style={{ flex: 1 }} />
                  <View style={[styles.availBadge, { backgroundColor: isAvailable ? "#059669" + "20" : "#64748B" + "20" }]}>
                    <Text style={[styles.availText, { color: isAvailable ? "#059669" : "#64748B" }]}>
                      {isAvailable ? "Available" : "Busy"}
                    </Text>
                  </View>
                </View>

                {consultationTags.length > 0 && (
                  <View style={styles.tags}>
                    {consultationTags.map((ct) => (
                      <View key={ct.id} style={[styles.tag, { backgroundColor: "#315d93" + "12", borderColor: "#315d93" + "25" }]}>
                        <Feather name={ct.icon} size={10} color="#315d93" />
                        <Text style={[styles.tagText, { color: "#315d93" }]}>{ct.id}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push({ pathname: "/booking", params: { doctorId: item.userId, doctorName: item.name, specialty: item.specialty ?? "" } });
                  }}
                  style={styles.bookBtn}
                >
                  <Text style={styles.bookBtnText}>Book Now</Text>
                </Pressable>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {},
  backBtn: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  backText: { color: "rgba(255,255,255,0.8)", fontSize: 15, fontFamily: "Inter_500Medium" },
  headerTitle: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { color: "rgba(255,255,255,0.65)", fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 12 },
  sortRow: { flexDirection: "row", gap: 8 },
  sortChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  modeChip: { flexDirection: "row", alignItems: "center", gap: 6 },
  sortChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  card: { borderRadius: 15, borderWidth: 1, padding: 16, gap: 10 },
  cardTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  onlineDot: { position: "absolute", bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: "#059669", borderWidth: 2, borderColor: "#fff" },
  docName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  docSpec: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
  locRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  locText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  bio: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  price: { fontSize: 14, fontFamily: "Inter_700Bold" },
  availBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  availText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  tagText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  bookBtn: { backgroundColor: "#315d93", borderRadius: 12, padding: 12, alignItems: "center", marginTop: 2 },
  bookBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
});
