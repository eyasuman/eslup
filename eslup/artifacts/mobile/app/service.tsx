import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SPECIALTIES_BY_CATEGORY, type ServiceCategoryId } from "@/data/providerCategories";
import { useColors } from "@/hooks/useColors";

const SERVICE_META: Record<string, { title: string; icon: string; color: string; desc: string }> = {
  doctors: { title: "Doctors", icon: "user", color: "#315d93", desc: "Find specialist doctors across all medical fields" },
  nurses: { title: "Nurses", icon: "heart", color: "#059669", desc: "Connect with qualified nursing professionals" },
  homecare: { title: "Home Care", icon: "home", color: "#D97706", desc: "In-home medical care tailored for you" },
  physiotherapy: { title: "Physiotherapy", icon: "zap", color: "#7C3AED", desc: "Rehabilitation and physical therapy experts" },
  health_institutions: { title: "Health Institutions", icon: "activity", color: "#DC2626", desc: "Hospitals, clinics, and medical facilities" },
};

const SPECIALTY_ICONS: Record<string, string> = {
  "General Practitioner": "user",
  "Cardiologist": "heart",
  "Dermatologist": "sun",
  "Neurologist": "zap",
  "Pediatrician": "smile",
  "OB-GYN": "heart",
  "Orthopedic Surgeon": "scissors",
  "Psychiatrist": "cloud",
  "Gastroenterologist": "wind",
  "Oncologist": "alert-circle",
  "Pulmonologist": "feather",
  "Endocrinologist": "droplet",
  "Rheumatologist": "shield",
  "Ophthalmologist": "eye",
  "ENT Specialist": "volume-2",
  "Registered Nurse": "heart",
  "Nurse Practitioner": "user-check",
  "Clinical Nurse Specialist": "award",
  "Licensed Practical Nurse": "clipboard",
  "Emergency Nurse": "alert-triangle",
  "Pediatric Nurse": "smile",
  "Surgical Nurse": "scissors",
  "Critical Care Nurse": "activity",
  "Skilled Nursing Care": "heart",
  "Personal Care": "user",
  "Companion Care": "users",
  "Post-Surgery Care": "thermometer",
  "Elderly Care": "home",
  "Disability Support": "shield",
  "Palliative Care": "cloud",
  "Respite Care": "clock",
  "Sports Therapy": "zap",
  "Orthopedic Rehab": "scissors",
  "Neurological Rehab": "zap",
  "Cardiac Rehab": "heart",
  "Pediatric PT": "smile",
  "Geriatric PT": "home",
  "Aquatic Therapy": "droplet",
  "Pain Management": "shield",
  "General Hospital": "activity",
  "Specialty Clinic": "star",
  "Diagnostic Center": "search",
  "Emergency Room": "alert-triangle",
  "Maternity Center": "heart",
  "Mental Health Facility": "cloud",
  "Rehabilitation Center": "zap",
  "Medical Lab": "clipboard",
};

export default function ServiceScreen() {
  const { type } = useLocalSearchParams<{ type: ServiceCategoryId }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const meta = SERVICE_META[type ?? ""] ?? SERVICE_META.doctors;
  const specialties = SPECIALTIES_BY_CATEGORY[type as ServiceCategoryId] ?? SPECIALTIES_BY_CATEGORY.doctors;

  const bg = colors.isDark ? colors.background : "#FFFFFF";
  const textPrimary = colors.isDark ? "#FFFFFF" : "#202937";
  const textMuted = colors.isDark ? "#94A3B8" : "#64748B";
  const cardBg = colors.isDark ? "rgba(255,255,255,0.06)" : "#F4F7FB";
  const borderCol = colors.isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0";

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: "#202937" }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerContent}>
          <View style={[styles.serviceIcon, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
            <Feather name={meta.icon as any} size={28} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>{meta.title}</Text>
          <Text style={styles.headerDesc}>{meta.desc}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: bottomPad + 110 }}
      >
        <Text style={[styles.subtitle, { color: textMuted }]}>Select a specialization to find providers</Text>

        <View style={styles.grid}>
          {specialties.map((spec) => {
            const iconName = SPECIALTY_ICONS[spec] ?? "activity";
            return (
              <Pressable
                key={spec}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({ pathname: "/specialist-list", params: { specialty: spec, category: type } });
                }}
                style={({ pressed }) => [
                  styles.specCard,
                  { backgroundColor: cardBg, borderColor: borderCol, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <View style={[styles.specIconWrap, { backgroundColor: meta.color + "18" }]}>
                  <Feather name={iconName as any} size={22} color={meta.color} />
                </View>
                <Text style={[styles.specLabel, { color: textPrimary }]} numberOfLines={2}>
                  {spec}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  backBtn: { marginBottom: 16 },
  headerContent: { alignItems: "flex-start", gap: 8 },
  serviceIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#fff", fontSize: 28, fontFamily: "Inter_700Bold" },
  headerDesc: { color: "rgba(255,255,255,0.75)", fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  specCard: {
    width: "47%",
    borderRadius: 15,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    alignItems: "flex-start",
  },
  specIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  specLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", lineHeight: 18 },
});
