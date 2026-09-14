import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useColors } from "@/hooks/useColors";
import { useData, DoctorStatus } from "@/context/DataContext";
import { StatusBadge } from "@/components/StatusBadge";
import { Image } from "expo-image";
import { ImageViewerModal } from "@/components/ImageViewerModal";

export default function ProviderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { doctors, updateDoctorStatus, getDoctorLicenseUrl, deleteProvider, refresh } = useData();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoadingLicense, setIsLoadingLicense] = useState(false);
  const [licensePreview, setLicensePreview] = useState<{ url: string; name: string | null } | null>(null);
  const [licensePreviewError, setLicensePreviewError] = useState(false);
  const [viewUrl, setViewUrl] = useState<string | null>(null);

  const doctor = doctors.find((d) => d.id === id);

  useEffect(() => {
    if (!doctor?.licenseFile) {
      setLicensePreview(null);
      setLicensePreviewError(false);
      return;
    }
    let cancelled = false;
    setLicensePreviewError(false);
    getDoctorLicenseUrl(doctor.id)
      .then((result) => {
        if (!cancelled) setLicensePreview(result);
      })
      .catch(() => {
        if (!cancelled) setLicensePreviewError(true);
      });
    return () => { cancelled = true; };
  }, [doctor?.id, doctor?.licenseFile, getDoctorLicenseUrl]);

  if (!doctor) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>Provider not found</Text>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const handleViewLicense = async () => {
    if (licensePreview?.url) {
      await WebBrowser.openBrowserAsync(licensePreview.url);
      return;
    }
    setIsLoadingLicense(true);
    try {
      const { url } = await getDoctorLicenseUrl(doctor!.id);
      await WebBrowser.openBrowserAsync(url);
    } catch (err) {
      Alert.alert("Error", "Could not load the license document. Please try again.");
    } finally {
      setIsLoadingLicense(false);
    }
  };

  const handleStatusChange = (newStatus: DoctorStatus) => {
    Alert.alert(
      `${newStatus} Provider`,
      `Are you sure you want to set ${doctor.name} to ${newStatus}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: newStatus === "Declined" || newStatus === "Disabled" ? "destructive" : "default",
          onPress: async () => {
            setIsUpdating(true);
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await updateDoctorStatus(doctor.id, newStatus);
            setIsUpdating(false);
            Alert.alert("Updated", `Provider status set to ${newStatus}.`);
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Provider Permanently",
      `Are you sure you want to delete ${doctor.name}? This will remove their profile, license, and app account from Supabase and cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsUpdating(true);
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            try {
              await deleteProvider(doctor.id);
              refresh();
              router.back();
            } catch (err) {
              setIsUpdating(false);
              Alert.alert("Error", "Could not delete provider. They may have linked appointments or other records.");
            }
          },
        },
      ]
    );
  };

  const topPt = Platform.OS === "web" ? 67 + 16 : insets.top + 16;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPt, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 30) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <ImageViewerModal visible={!!viewUrl} uri={viewUrl} onClose={() => setViewUrl(null)} />
      <View style={styles.navRow}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Feather name="arrow-left" size={16} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.mutedForeground }]}>PROVIDER DETAIL</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.profileTop}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "30" }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {doctor.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <StatusBadge status={doctor.status} size="md" />
            <Text style={[styles.name, { color: colors.foreground }]}>{doctor.name}</Text>
            <Text style={[styles.specialty, { color: colors.mutedForeground }]}>
              {doctor.specialty} · {doctor.category}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.detailGrid}>
          <DetailItem icon="mail" label="Email" value={doctor.email} colors={colors} />
          {doctor.phone && <DetailItem icon="phone" label="Phone" value={doctor.phone} colors={colors} />}
          {doctor.city && <DetailItem icon="map-pin" label="City" value={doctor.city} colors={colors} />}
          <DetailItem icon="file-text" label="License" value={doctor.licenseNo} colors={colors} />
          {doctor.experienceYears !== undefined && (
            <DetailItem icon="award" label="Experience" value={`${doctor.experienceYears} years`} colors={colors} />
          )}
          <DetailItem icon="dollar-sign" label="Consultation Fee" value={`AED ${doctor.consultationFee}`} colors={colors} />
        </View>

        {doctor.bio ? (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View>
              <Text style={[styles.bioLabel, { color: colors.mutedForeground }]}>BIO</Text>
              <Text style={[styles.bio, { color: colors.foreground }]}>{doctor.bio}</Text>
            </View>
          </>
        ) : null}
      </View>

      <View style={[styles.modesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.verificationHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>License Verification</Text>
          {doctor.status === "Pending" && doctor.licenseFile && (
            <View style={[styles.pendingPill, { backgroundColor: "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.25)" }]}>
              <Feather name="clock" size={10} color="#f59e0b" />
              <Text style={styles.pendingPillText}>Awaiting review</Text>
            </View>
          )}
        </View>
        {doctor.licenseFile ? (
          <>
            {licensePreview?.url ? (
              <Pressable onPress={() => setViewUrl(licensePreview.url)}>
                <Image source={{ uri: licensePreview.url }} style={styles.licensePreview} contentFit="contain" />
              </Pressable>
            ) : licensePreviewError ? (
              <View style={[styles.licensePreview, { backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" }]}>
                <Feather name="file" size={28} color={colors.mutedForeground} />
                <Text style={[styles.previewHint, { color: colors.mutedForeground }]}>Preview unavailable</Text>
              </View>
            ) : (
              <View style={[styles.licensePreview, { backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" }]}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}
            <Pressable
              onPress={handleViewLicense}
              disabled={isLoadingLicense}
              style={({ pressed }) => [
                styles.licenseBtn,
                { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" },
                pressed && { opacity: 0.8 },
              ]}
            >
              {isLoadingLicense ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Feather name="file-text" size={14} color={colors.primary} />
              )}
              <Text style={[styles.licenseBtnText, { color: colors.primary }]}>
                {doctor.licenseFile.name ?? "View License Document"}
              </Text>
              <Feather name="external-link" size={12} color={colors.primary} />
            </Pressable>
          </>
        ) : (
          <View style={styles.noLicenseRow}>
            <Feather name="alert-circle" size={14} color={colors.mutedForeground} />
            <Text style={[styles.noLicenseText, { color: colors.mutedForeground }]}>
              No license document uploaded yet
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.modesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Service Modes</Text>
        <View style={styles.modesGrid}>
          <ModeItem label="Video" active={doctor.serviceModes.video} icon="video" colors={colors} />
          <ModeItem label="Audio" active={doctor.serviceModes.audio} icon="phone" colors={colors} />
          <ModeItem label="In-Person" active={doctor.serviceModes.inPerson} icon="user" colors={colors} />
          <ModeItem label="Home Visit" active={doctor.serviceModes.homeVisit} icon="home" colors={colors} />
        </View>
      </View>

      <View style={[styles.actionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Admin Actions</Text>
        <View style={styles.actionsGrid}>
          {doctor.status !== "Active" && (
            <ActionButton
              label="Activate"
              onPress={() => handleStatusChange("Active")}
              color="#10b981"
              icon="check-circle"
              disabled={isUpdating}
            />
          )}
          {doctor.status !== "Pending" && (
            <ActionButton
              label="Set Pending"
              onPress={() => handleStatusChange("Pending")}
              color="#f59e0b"
              icon="clock"
              disabled={isUpdating}
            />
          )}
          {doctor.status !== "Disabled" && (
            <ActionButton
              label="Disable"
              onPress={() => handleStatusChange("Disabled")}
              color="#94a3b8"
              icon="slash"
              disabled={isUpdating}
            />
          )}
          {doctor.status !== "Declined" && (
            <ActionButton
              label="Decline"
              onPress={() => handleStatusChange("Declined")}
              color="#ef4444"
              icon="x-circle"
              disabled={isUpdating}
            />
          )}
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Pressable
          onPress={handleDelete}
          disabled={isUpdating}
          style={({ pressed }) => [
            styles.deleteBtn,
            { backgroundColor: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.25)" },
            pressed && { opacity: 0.75 },
            isUpdating && { opacity: 0.5 },
          ]}
        >
          <Feather name="trash-2" size={14} color="#ef4444" />
          <Text style={[styles.deleteBtnText, { color: "#ef4444" }]}>Delete Provider Permanently</Text>
        </Pressable>
      </View>

      <View style={[styles.metaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.metaItem, { color: colors.mutedForeground }]}>
          Registered: {new Date(doctor.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </Text>
        <Text style={[styles.metaItem, { color: colors.mutedForeground }]}>ID: {doctor.id}</Text>
      </View>
    </ScrollView>
  );
}

function DetailItem({ icon, label, value, colors }: { icon: any; label: string; value: string; colors: any }) {
  return (
    <View style={detailStyles.item}>
      <View style={[detailStyles.iconWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <Feather name={icon} size={12} color={colors.mutedForeground} />
      </View>
      <View style={detailStyles.textWrap}>
        <Text style={[detailStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[detailStyles.value, { color: colors.foreground }]} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

function ModeItem({ label, active, icon, colors }: { label: string; active: boolean; icon: any; colors: any }) {
  return (
    <View
      style={[
        modeStyles.item,
        {
          backgroundColor: active ? colors.primary + "12" : colors.muted,
          borderColor: active ? colors.primary + "30" : colors.border,
        },
      ]}
    >
      <Feather name={icon} size={14} color={active ? colors.primary : colors.mutedForeground} />
      <Text style={[modeStyles.label, { color: active ? colors.primary : colors.mutedForeground }]}>
        {label}
      </Text>
      {active && (
        <View style={[modeStyles.dot, { backgroundColor: colors.primary }]} />
      )}
    </View>
  );
}

function ActionButton({ label, onPress, color, icon, disabled }: any) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        actionStyles.btn,
        { backgroundColor: color + "14", borderColor: color + "30" },
        pressed && { opacity: 0.75 },
        disabled && { opacity: 0.5 },
      ]}
    >
      <Feather name={icon} size={14} color={color} />
      <Text style={[actionStyles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

const detailStyles = StyleSheet.create({
  item: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: { flex: 1 },
  label: { fontSize: 9, fontFamily: "Inter_400Regular", letterSpacing: 0.5, textTransform: "uppercase" },
  value: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 1 },
});

const modeStyles = StyleSheet.create({
  item: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  label: { fontSize: 11, fontFamily: "Inter_500Medium", flex: 1 },
  dot: { width: 5, height: 5, borderRadius: 3 },
});

const actionStyles = StyleSheet.create({
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
  },
  label: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  notFoundText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  backBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontSize: 9,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  profileCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  profileTop: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  profileInfo: { flex: 1, gap: 4 },
  name: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  specialty: { fontSize: 12, fontFamily: "Inter_400Regular" },
  divider: { height: 1 },
  detailGrid: { gap: 10 },
  bioLabel: {
    fontSize: 9,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  bio: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  modesCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  modesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  actionsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  verificationHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pendingPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  pendingPillText: { fontSize: 9, fontWeight: "700", color: "#f59e0b", letterSpacing: 0.3 },
  licenseBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  licenseBtnText: { flex: 1, fontSize: 13, fontWeight: "600" },
  licensePreview: { width: "100%", height: 180, borderRadius: 12, backgroundColor: "#f1f5f9" },
  previewHint: { fontSize: 11, marginTop: 8 },
  noLicenseRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  noLicenseText: { fontSize: 12 },
  metaCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  metaItem: { fontSize: 10, fontFamily: "Inter_400Regular", letterSpacing: 0.2 },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    marginTop: 4,
  },
  deleteBtnText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
});
