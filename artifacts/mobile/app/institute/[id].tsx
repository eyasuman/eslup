import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ADDIS_HOSPITALS } from "@/data/ethiopianHospitals";
import { getApprovedDoctors, type SupabaseDoctor } from "@/lib/supabase";
import { useColors } from "@/hooks/useColors";

export default function InstituteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const topPad    = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const isDark      = colors.isDark;
  const bg          = isDark ? colors.background : "#FFFFFF";
  const textPrimary = isDark ? "#FFFFFF" : "#202937";
  const textMuted   = isDark ? "#94A3B8" : "#64748B";
  const cardBg      = isDark ? "rgba(255,255,255,0.06)" : "#F4F7FB";
  const borderCol   = isDark ? "rgba(255,255,255,0.10)" : "#E2E8F0";

  // Resolve hospital from local data (institutions table not yet created)
  const hospital = ADDIS_HOSPITALS.find((h) => h.id === id) ?? null;

  const [doctors, setDoctors] = useState<SupabaseDoctor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hospital) { setLoading(false); return; }
    setLoading(true);
    getApprovedDoctors()
      .then((all) => {
        // Bio is stored as "HospitalName · languages" at registration time.
        // Extract the hospital part (everything before " · ") and match exactly.
        const instituteName = hospital.name.toLowerCase().trim();
        const matched = all.filter((d) => {
          const bioHospital = (d.bio ?? "").split("·")[0].toLowerCase().trim();
          return bioHospital === instituteName;
        });
        setDoctors(matched);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hospital?.id]);

  if (!hospital) {
    return (
      <View style={[styles.container, { backgroundColor: bg, alignItems: "center", justifyContent: "center" }]}>
        <Feather name="alert-circle" size={40} color={textMuted} />
        <Text style={{ color: textPrimary, fontFamily: "Inter_700Bold", fontSize: 16, marginTop: 12 }}>
          Institute not found
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: "#315d93", fontFamily: "Inter_600SemiBold" }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const initials = hospital.name.split(" ").slice(0, 2).map((w) => w[0]).join("");

  const openMap = () => {
    const label = encodeURIComponent(hospital.name);
    const url = Platform.select({
      ios:     `maps:0,0?q=${label}@${hospital.lat},${hospital.lng}`,
      android: `geo:${hospital.lat},${hospital.lng}?q=${hospital.lat},${hospital.lng}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${hospital.lat},${hospital.lng}`,
    });
    Linking.openURL(url!).catch(() =>
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${hospital.lat},${hospital.lng}`)
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: hospital.color ?? "#202937" }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.heroRow}>
          <View style={[styles.logoCircle, { backgroundColor: "rgba(255,255,255,0.20)" }]}>
            <Text style={styles.logoInitials}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.hospName} numberOfLines={2}>{hospital.name}</Text>
            <View style={styles.typePill}>
              <Text style={styles.typeText}>{hospital.type}</Text>
            </View>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Feather name="star" size={13} color="#FCD34D" />
            <Text style={styles.statText}>{hospital.rating} Rating</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Feather name="navigation" size={13} color="rgba(255,255,255,0.8)" />
            <Text style={styles.statText}>{hospital.distanceKm} km away</Text>
          </View>
          {hospital.open24h && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Feather name="clock" size={13} color="#6EE7B7" />
                <Text style={[styles.statText, { color: "#6EE7B7" }]}>Open 24/7</Text>
              </View>
            </>
          )}
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              const phone = hospital.phone.replace(/\s/g, "");
              Linking.openURL(`tel:${phone}`).catch(() => {});
            }}
            style={styles.actionBtn}
          >
            <Feather name="phone" size={14} color="#fff" />
            <Text style={styles.actionBtnText}>Call</Text>
          </Pressable>
          <Pressable onPress={openMap} style={[styles.actionBtn, { backgroundColor: "rgba(255,255,255,0.18)" }]}>
            <Feather name="map-pin" size={14} color="#fff" />
            <Text style={styles.actionBtnText}>Directions</Text>
          </Pressable>
        </View>

        {/* Services chips */}
        {hospital.services?.length > 0 && (
          <View style={styles.servicesRow}>
            {hospital.services.slice(0, 5).map((s) => (
              <View key={s} style={styles.serviceChip}>
                <Text style={styles.serviceChipText}>{s}</Text>
              </View>
            ))}
            {hospital.services.length > 5 && (
              <View style={styles.serviceChip}>
                <Text style={styles.serviceChipText}>+{hospital.services.length - 5} more</Text>
              </View>
            )}
          </View>
        )}

        {/* Section label */}
        <View style={styles.sectionLabelRow}>
          <Feather name="users" size={14} color="rgba(255,255,255,0.85)" />
          <Text style={styles.sectionLabel}>
            {loading ? "Loading doctors…" : `${doctors.length} Doctor${doctors.length !== 1 ? "s" : ""} at this facility`}
          </Text>
        </View>
      </View>

      {/* ── Doctor List ── */}
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#315d93" />
        </View>
      ) : doctors.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Feather name="user-x" size={44} color={textMuted} />
          <Text style={{ color: textPrimary, fontFamily: "Inter_700Bold", fontSize: 16, marginTop: 16, textAlign: "center" }}>
            No doctors registered yet
          </Text>
          <Text style={{ color: textMuted, fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 6, textAlign: "center" }}>
            Doctors from this facility haven't joined the platform yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={doctors}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: bottomPad + 110 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isOnline = item.serviceModes?.video === true || item.serviceModes?.audio === true;
            const isAvailable =
              item.serviceModes?.inPerson === true ||
              item.serviceModes?.video === true ||
              (item.availability && item.availability.length > 0);

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
                  <View style={[styles.avatar, { backgroundColor: (hospital.color ?? "#315d93") + "20" }]}>
                    <Feather name="user" size={28} color={hospital.color ?? "#315d93"} />
                    {isOnline && <View style={styles.onlineDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.docName, { color: textPrimary }]}>{item.name}</Text>
                    <Text style={[styles.docSpec, { color: hospital.color ?? "#315d93" }]}>
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
                  <View style={[styles.availBadge, { backgroundColor: isAvailable ? "#059669" + "20" : "#64748B" + "20" }]}>
                    <Text style={[styles.availText, { color: isAvailable ? "#059669" : "#64748B" }]}>
                      {isAvailable ? "Available" : "Busy"}
                    </Text>
                  </View>
                </View>

                {item.bio ? (
                  <Text style={[styles.bio, { color: textMuted }]} numberOfLines={2}>{item.bio}</Text>
                ) : null}

                <View style={styles.cardFooter}>
                  {item.consultationFee != null ? (
                    <Text style={[styles.price, { color: "#059669" }]}>
                      ETB {Number(item.consultationFee).toLocaleString()}
                    </Text>
                  ) : (
                    <Text style={[styles.price, { color: textMuted }]}>Contact for fee</Text>
                  )}
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      router.push({ pathname: "/booking", params: { doctorId: item.userId, doctorName: item.name, specialty: item.specialty ?? "" } });
                    }}
                    style={[styles.bookBtn, { backgroundColor: hospital.color ?? "#202937" }]}
                  >
                    <Text style={styles.bookBtnText}>Book Now</Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  header:         { paddingHorizontal: 20, paddingBottom: 16 },
  backBtn:        { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  backText:       { color: "rgba(255,255,255,0.8)", fontSize: 15, fontFamily: "Inter_500Medium" },
  heroRow:        { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 },
  logoCircle:     { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  logoInitials:   { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold" },
  hospName:       { color: "#fff", fontSize: 19, fontFamily: "Inter_700Bold", lineHeight: 26 },
  typePill:       { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.20)", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  typeText:       { color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  statsRow:       { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  statItem:       { flexDirection: "row", alignItems: "center", gap: 4 },
  statText:       { color: "rgba(255,255,255,0.85)", fontSize: 12, fontFamily: "Inter_500Medium" },
  statDivider:    { width: 1, height: 12, backgroundColor: "rgba(255,255,255,0.25)" },
  actionRow:      { flexDirection: "row", gap: 10, marginBottom: 12 },
  actionBtn:      { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.25)", paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10 },
  actionBtnText:  { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  servicesRow:    { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 },
  serviceChip:    { backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  serviceChipText:{ color: "#fff", fontSize: 11, fontFamily: "Inter_500Medium" },
  sectionLabelRow:{ flexDirection: "row", alignItems: "center", gap: 6, borderTopWidth: 0.5, borderTopColor: "rgba(255,255,255,0.20)", paddingTop: 12 },
  sectionLabel:   { color: "rgba(255,255,255,0.85)", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  card:           { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  cardTop:        { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  avatar:         { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  onlineDot:      { position: "absolute", bottom: 2, right: 2, width: 11, height: 11, borderRadius: 6, backgroundColor: "#059669", borderWidth: 2, borderColor: "#fff" },
  docName:        { fontSize: 15, fontFamily: "Inter_700Bold" },
  docSpec:        { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  locRow:         { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  locText:        { fontSize: 11, fontFamily: "Inter_400Regular" },
  availBadge:     { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start" },
  availText:      { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  bio:            { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  cardFooter:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  price:          { fontSize: 14, fontFamily: "Inter_700Bold" },
  bookBtn:        { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10 },
  bookBtnText:    { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
});
