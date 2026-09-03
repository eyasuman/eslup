import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useData, Appointment } from "@/context/DataContext";
import { ImageViewerModal } from "@/components/ImageViewerModal";

export default function PaymentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { appointments, updatePaymentStatus } = useData();
  const [filter, setFilter] = useState<"pending" | "verified" | "rejected" | "all">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);

  const filtered = appointments
    .filter((a) => a.paymentProofUrl)
    .filter((a) => (filter === "all" ? true : a.paymentStatus === filter));

  const counts = {
    pending: appointments.filter((a) => a.paymentProofUrl && a.paymentStatus === "pending").length,
    verified: appointments.filter((a) => a.paymentProofUrl && a.paymentStatus === "verified").length,
    rejected: appointments.filter((a) => a.paymentProofUrl && a.paymentStatus === "rejected").length,
  };

  const topPt = Platform.OS === "web" ? 67 + 16 : insets.top + 16;

  const handleDecision = (apt: Appointment, status: "verified" | "rejected") => {
    Alert.alert(
      status === "verified" ? "Verify Payment" : "Reject Payment",
      status === "verified"
        ? `Confirm the payment proof from ${apt.patientName} is valid? This unlocks their consultation.`
        : `Reject the payment proof from ${apt.patientName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: status === "rejected" ? "destructive" : "default",
          onPress: async () => {
            setBusyId(apt.id);
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            try {
              await updatePaymentStatus(apt.id, status);
            } catch (err) {
              Alert.alert("Error", "Could not update payment status. Please try again.");
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

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
            <Text style={[styles.title, { color: colors.foreground }]}>Payment Proofs</Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: "#f59e0b22", borderColor: "#f59e0b33" }]}>
            <Text style={[styles.countText, { color: "#f59e0b" }]}>{counts.pending}</Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          {([
            { key: "pending", label: "Pending", count: counts.pending },
            { key: "verified", label: "Verified", count: counts.verified },
            { key: "rejected", label: "Rejected", count: counts.rejected },
            { key: "all", label: "All", count: undefined },
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
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => (
          <PaymentCard
            appointment={item}
            colors={colors}
            busy={busyId === item.id}
            onVerify={() => handleDecision(item, "verified")}
            onReject={() => handleDecision(item, "rejected")}
            onView={() => setViewUrl(item.paymentProofUrl ?? null)}
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
            <Feather name="credit-card" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No {filter !== "all" ? filter : ""} payment proofs
            </Text>
          </View>
        }
      />
    </View>
  );
}

function PaymentCard({
  appointment,
  colors,
  busy,
  onVerify,
  onReject,
  onView,
}: {
  appointment: Appointment;
  colors: any;
  busy: boolean;
  onVerify: () => void;
  onReject: () => void;
  onView: () => void;
}) {
  const statusColor =
    appointment.paymentStatus === "verified" ? "#10b981" :
    appointment.paymentStatus === "rejected" ? "#ef4444" : "#f59e0b";

  return (
    <View style={[cardStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {appointment.paymentProofUrl ? (
        <Pressable onPress={onView}>
          <Image source={{ uri: appointment.paymentProofUrl }} style={cardStyles.proof} contentFit="cover" />
        </Pressable>
      ) : null}

      <View style={cardStyles.body}>
        <View style={cardStyles.headerRow}>
          <Text style={[cardStyles.patientName, { color: colors.foreground }]}>{appointment.patientName}</Text>
          <View style={[cardStyles.statusBadge, { backgroundColor: statusColor + "18", borderColor: statusColor + "30" }]}>
            <Text style={[cardStyles.statusText, { color: statusColor }]}>
              {appointment.paymentStatus.toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={[cardStyles.doctorName, { color: colors.mutedForeground }]}>
          For consultation with {appointment.doctorName}
        </Text>

        <View style={[cardStyles.detailGrid, { borderTopColor: colors.border }]}>
          <DetailRow icon="dollar-sign" label="Amount" value={`AED ${appointment.totalPrice}`} colors={colors} />
          {appointment.paymentMethod && (
            <DetailRow icon="credit-card" label="Method" value={appointment.paymentMethod} colors={colors} />
          )}
          {appointment.transactionId && (
            <DetailRow icon="hash" label="Transaction ID" value={appointment.transactionId} colors={colors} />
          )}
          {appointment.senderName && (
            <DetailRow icon="user" label="Sender" value={appointment.senderName} colors={colors} />
          )}
        </View>

        {appointment.paymentStatus === "pending" && (
          <View style={cardStyles.actions}>
            <Pressable
              onPress={onReject}
              disabled={busy}
              style={[cardStyles.actionBtn, { backgroundColor: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.25)" }, busy && { opacity: 0.5 }]}
            >
              <Feather name="x-circle" size={14} color="#ef4444" />
              <Text style={[cardStyles.actionText, { color: "#ef4444" }]}>Reject</Text>
            </Pressable>
            <Pressable
              onPress={onVerify}
              disabled={busy}
              style={[cardStyles.actionBtn, { backgroundColor: "rgba(16,185,129,0.1)", borderColor: "rgba(16,185,129,0.25)" }, busy && { opacity: 0.5 }]}
            >
              <Feather name="check-circle" size={14} color="#10b981" />
              <Text style={[cardStyles.actionText, { color: "#10b981" }]}>Verify</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

function DetailRow({ icon, label, value, colors }: { icon: any; label: string; value: string; colors: any }) {
  return (
    <View style={detailStyles.row}>
      <Feather name={icon} size={11} color={colors.mutedForeground} />
      <Text style={[detailStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[detailStyles.value, { color: colors.foreground }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 3 },
  label: { fontSize: 10, flex: 1 },
  value: { fontSize: 11, fontWeight: "600" },
});

const cardStyles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, marginBottom: 12, overflow: "hidden" },
  proof: { width: "100%", height: 160 },
  body: { padding: 14, gap: 8 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  patientName: { fontSize: 15, fontWeight: "700" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  statusText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  doctorName: { fontSize: 12 },
  detailGrid: { borderTopWidth: 1, paddingTop: 8, marginTop: 2, gap: 2 },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
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
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14, textTransform: "capitalize" },
});
