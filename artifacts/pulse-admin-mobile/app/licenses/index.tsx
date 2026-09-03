import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useColors } from "@/hooks/useColors";
import { useData, Doctor } from "@/context/DataContext";
import { StatusBadge } from "@/components/StatusBadge";
import { ImageViewerModal } from "@/components/ImageViewerModal";

export default function LicensesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { doctors, updateDoctorStatus } = useData();
  const [filter, setFilter] = useState<"pending" | "active" | "all" | "missing">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);

  const counts = {
    pending: doctors.filter((d) => d.status === "Pending" && d.licenseFile).length,
    active: doctors.filter((d) => d.status === "Active" && d.licenseFile).length,
    missing: doctors.filter((d) => !d.licenseFile).length,
    all: doctors.length,
  };

  const filtered = doctors.filter((d) => {
    if (filter === "all") return true;
    if (filter === "missing") return !d.licenseFile;
    if (filter === "pending") return d.status === "Pending" && !!d.licenseFile;
    if (filter === "active") return d.status === "Active" && !!d.licenseFile;
    return true;
  });

  const handleDecision = (provider: Doctor, status: "Active" | "Declined") => {
    Alert.alert(
      status === "Active" ? "Verify License" : "Decline License",
      status === "Active"
        ? `Approve ${provider.name} and set their provider status to Active?`
        : `Decline ${provider.name}'s license review?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: status === "Declined" ? "destructive" : "default",
          onPress: async () => {
            setBusyId(provider.id);
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            try {
              await updateDoctorStatus(provider.id, status);
            } catch (err) {
              Alert.alert("Error", "Could not update provider status. Please try again.");
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  const topPt = Platform.OS === "web" ? 67 + 16 : insets.top + 16;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ImageViewerModal visible={!!viewUrl} uri={viewUrl} onClose={() => setViewUrl(null)} />
      <View style={[styles.topBar, { paddingTop: topPt, backgroundColor: colors.background }]}>
        <View style={styles.titleRow}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name="arrow-left" size={16} color={colors.foreground} />
          </Pressable>
          <View style={styles.titleGroup}>
            <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>ADMIN</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>License Review</Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: "#f59e0b22", borderColor: "#f59e0b33" }]}>
            <Text style={[styles.countText, { color: "#f59e0b" }]}>{counts.pending}</Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          {([
            { key: "pending", label: "Pending", count: counts.pending },
            { key: "active", label: "Active", count: counts.active },
            { key: "missing", label: "Missing", count: counts.missing },
            { key: "all", label: "All", count: counts.all },
          ] as const).map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: filter === f.key ? colors.primary : colors.card,
                  borderColor: filter === f.key ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.filterLabel, { color: filter === f.key ? "#fff" : colors.mutedForeground }]}>
                {f.label}{f.count !== undefined ? ` ${f.count}` : ""}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(d) => d.id}
        renderItem={({ item }) => (
          <LicenseCard
            provider={item}
            colors={colors}
            busy={busyId === item.id}
            onActivate={() => handleDecision(item, "Active")}
            onDecline={() => handleDecision(item, "Declined")}
            onViewImage={(url) => setViewUrl(url)}
          />
        )}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 24 : 30) },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!filtered.length}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="file-text" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No {filter === "all" ? "" : filter} licenses to review
            </Text>
          </View>
        }
      />
    </View>
  );
}

function LicenseCard({
  provider,
  colors,
  busy,
  onActivate,
  onDecline,
  onViewImage,
}: {
  provider: Doctor;
  colors: any;
  busy: boolean;
  onActivate: () => void;
  onDecline: () => void;
  onViewImage: (url: string) => void;
}) {
  const { getDoctorLicenseUrl } = useData();
  const [license, setLicense] = useState<{ url: string; name: string | null } | null>(null);
  const [loadingLicense, setLoadingLicense] = useState(false);
  const [licenseError, setLicenseError] = useState(false);

  useEffect(() => {
    if (!provider.licenseFile) return;
    let cancelled = false;
    setLoadingLicense(true);
    setLicenseError(false);
    getDoctorLicenseUrl(provider.id)
      .then((result) => {
        if (!cancelled) setLicense(result);
      })
      .catch(() => {
        if (!cancelled) setLicenseError(true);
      })
      .finally(() => {
        if (!cancelled) setLoadingLicense(false);
      });
    return () => { cancelled = true; };
  }, [provider.id, provider.licenseFile, getDoctorLicenseUrl]);

  const handleOpenDocument = async () => {
    if (!license?.url) return;
    try {
      await WebBrowser.openBrowserAsync(license.url);
    } catch (err) {
      Alert.alert("Error", "Could not open the license document.");
    }
  };

  const hasLicense = !!provider.licenseFile;

  return (
    <View style={[cardStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {hasLicense ? (
        loadingLicense ? (
          <View style={[cardStyles.preview, { backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" }]}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : license?.url ? (
          <Pressable onPress={() => license?.url && onViewImage(license.url)}>
            <Image source={{ uri: license.url }} style={cardStyles.preview} contentFit="contain" />
          </Pressable>
        ) : (
          <View style={[cardStyles.preview, { backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" }]}>
            <Feather name="file" size={28} color={colors.mutedForeground} />
            <Text style={[cardStyles.previewHint, { color: colors.mutedForeground }]}>
              {licenseError ? "Could not load preview" : "Preview unavailable"}
            </Text>
          </View>
        )
      ) : (
        <View style={[cardStyles.preview, { backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" }]}>
          <Feather name="upload-cloud" size={28} color={colors.mutedForeground} />
          <Text style={[cardStyles.previewHint, { color: colors.mutedForeground }]}>No license uploaded</Text>
        </View>
      )}

      <View style={cardStyles.body}>
        <View style={cardStyles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[cardStyles.providerName, { color: colors.foreground }]}>{provider.name}</Text>
            <Text style={[cardStyles.meta, { color: colors.mutedForeground }]}>
              {provider.specialty} · {provider.licenseNo || "No license number"}
            </Text>
          </View>
          <StatusBadge status={provider.status} size="md" />
        </View>

        {hasLicense && license?.name ? (
          <Text style={[cardStyles.fileName, { color: colors.mutedForeground }]} numberOfLines={1}>
            {license.name}
          </Text>
        ) : null}

        {hasLicense && license?.url && (
          <Pressable
            onPress={handleOpenDocument}
            style={({ pressed }) => [
              cardStyles.viewBtn,
              { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Feather name="external-link" size={12} color={colors.primary} />
            <Text style={[cardStyles.viewBtnText, { color: colors.primary }]}>View full document</Text>
          </Pressable>
        )}

        {provider.status === "Pending" && hasLicense && (
          <View style={cardStyles.actions}>
            <Pressable
              onPress={onDecline}
              disabled={busy}
              style={[
                cardStyles.actionBtn,
                { backgroundColor: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.25)" },
                busy && { opacity: 0.5 },
              ]}
            >
              <Feather name="x-circle" size={14} color="#ef4444" />
              <Text style={[cardStyles.actionText, { color: "#ef4444" }]}>Decline</Text>
            </Pressable>
            <Pressable
              onPress={onActivate}
              disabled={busy}
              style={[
                cardStyles.actionBtn,
                { backgroundColor: "rgba(16,185,129,0.1)", borderColor: "rgba(16,185,129,0.25)" },
                busy && { opacity: 0.5 },
              ]}
            >
              <Feather name="check-circle" size={14} color="#10b981" />
              <Text style={[cardStyles.actionText, { color: "#10b981" }]}>Activate</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, marginBottom: 12, overflow: "hidden" },
  preview: { width: "100%", height: 180, backgroundColor: "#f1f5f9" },
  previewHint: { fontSize: 11, marginTop: 8 },
  body: { padding: 14, gap: 10 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  providerName: { fontSize: 15, fontWeight: "700" },
  meta: { fontSize: 11, marginTop: 2 },
  fileName: { fontSize: 10, fontStyle: "italic" },
  viewBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  viewBtnText: { fontSize: 12, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 10, marginTop: 2 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 11, borderRadius: 10, borderWidth: 1 },
  actionText: { fontSize: 13, fontWeight: "700" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  titleGroup: { flex: 1 },
  eyebrow: { fontSize: 9, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" },
  title: { fontSize: 24, fontWeight: "700", letterSpacing: -0.5 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  countText: { fontSize: 13, fontWeight: "700" },
  filterRow: { flexDirection: "row", gap: 7, flexWrap: "wrap" },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterLabel: { fontSize: 11, fontWeight: "600" },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 14, fontWeight: "500" },
});
