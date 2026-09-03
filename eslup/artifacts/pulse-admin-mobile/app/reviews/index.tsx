import React, { useState, useMemo } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, Platform, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useData, Review, ReviewStatus } from "@/context/DataContext";

const STATUS_FILTERS: Array<ReviewStatus | "all"> = ["all", "visible", "pinned", "banned", "shadow_banned"];

const STATUS_META: Record<ReviewStatus, { label: string; color: string; icon: any }> = {
  visible: { label: "VISIBLE", color: "#10b981", icon: "eye" },
  pinned: { label: "PINNED", color: "#818cf8", icon: "bookmark" },
  banned: { label: "BANNED", color: "#ef4444", icon: "slash" },
  shadow_banned: { label: "SHADOW", color: "#94a3b8", icon: "eye-off" },
};

function StarRow({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Feather key={s} name="star" size={11} color={s <= rating ? "#f59e0b" : "#334155"} />
      ))}
    </View>
  );
}

export default function ReviewsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { reviews, updateReviewStatus } = useData();
  const [filter, setFilter] = useState<ReviewStatus | "all">("all");

  const filtered = useMemo(() => {
    if (filter === "all") return reviews;
    return reviews.filter((r) => r.status === filter);
  }, [reviews, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: reviews.length };
    (["visible", "pinned", "banned", "shadow_banned"] as ReviewStatus[]).forEach((s) => {
      c[s] = reviews.filter((r) => r.status === s).length;
    });
    return c;
  }, [reviews]);

  const avgRating = reviews.length
    ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)
    : "0";

  const topPt = Platform.OS === "web" ? 67 + 16 : insets.top + 16;

  const handleAction = (review: Review) => {
    const options = (["visible", "pinned", "banned", "shadow_banned"] as ReviewStatus[])
      .filter((s) => s !== review.status)
      .map((s) => ({
        text: STATUS_META[s].label,
        style: s === "banned" ? "destructive" as const : "default" as const,
        onPress: () => updateReviewStatus(review.id, s),
      }));
    Alert.alert(`Review by ${review.patientName}`, "Change review status:", [
      ...options,
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPt, backgroundColor: colors.background }]}>
        <View style={styles.titleRow}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="arrow-left" size={16} color={colors.foreground} />
          </Pressable>
          <View style={styles.titleGroup}>
            <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>ADMIN</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Reviews</Text>
          </View>
          <View style={[styles.ratingBadge, { backgroundColor: "#f59e0b15", borderColor: "#f59e0b30" }]}>
            <Feather name="star" size={12} color="#f59e0b" />
            <Text style={[styles.ratingText, { color: "#f59e0b" }]}>{avgRating}</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          {(["visible", "pinned", "banned", "shadow_banned"] as ReviewStatus[]).map((s) => {
            const m = STATUS_META[s];
            return (
              <View key={s} style={[styles.summaryChip, { backgroundColor: m.color + "10", borderColor: m.color + "25", flex: 1 }]}>
                <Text style={[styles.summaryVal, { color: m.color }]}>{counts[s] || 0}</Text>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{m.label}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.filterRow}>
          {STATUS_FILTERS.map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.chip, { backgroundColor: filter === f ? colors.primary : colors.card, borderColor: filter === f ? colors.primary : colors.border }]}
            >
              <Text style={[styles.chipLabel, { color: filter === f ? "#fff" : colors.mutedForeground }]}>
                {f === "all" ? `All ${counts.all}` : `${STATUS_META[f as ReviewStatus].label} ${counts[f] || 0}`}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <ReviewCard review={item} colors={colors} onAction={() => handleAction(item)} />}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 24 : 30) }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="message-square" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No reviews</Text>
          </View>
        }
      />
    </View>
  );
}

function ReviewCard({ review, colors, onAction }: { review: Review; colors: any; onAction: () => void }) {
  const meta = STATUS_META[review.status];
  const initials = review.patientName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <View style={[cardStyles.card, { backgroundColor: colors.card, borderColor: colors.border, borderLeftWidth: 3, borderLeftColor: meta.color }]}>
      <View style={cardStyles.header}>
        <View style={[cardStyles.avatar, { backgroundColor: meta.color + "15", borderColor: meta.color + "25" }]}>
          <Text style={[cardStyles.initials, { color: meta.color }]}>{initials}</Text>
        </View>
        <View style={cardStyles.headerInfo}>
          <Text style={[cardStyles.patientName, { color: colors.foreground }]}>{review.patientName}</Text>
          <Text style={[cardStyles.doctorName, { color: colors.mutedForeground }]}>re: {review.doctorName}</Text>
        </View>
        <View style={cardStyles.headerRight}>
          <View style={[cardStyles.statusBadge, { backgroundColor: meta.color + "12", borderColor: meta.color + "25" }]}>
            <Feather name={meta.icon} size={9} color={meta.color} />
            <Text style={[cardStyles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <Pressable onPress={onAction} style={[cardStyles.actionBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="more-horizontal" size={14} color={colors.mutedForeground} />
          </Pressable>
        </View>
      </View>
      <View style={cardStyles.ratingRow}>
        <StarRow rating={review.rating} />
        <Text style={[cardStyles.date, { color: colors.mutedForeground }]}>
          {new Date(review.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </Text>
      </View>
      <Text style={[cardStyles.comment, { color: colors.mutedForeground }]} numberOfLines={3}>{review.comment}</Text>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 10 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 13, fontWeight: "700" },
  headerInfo: { flex: 1 },
  patientName: { fontSize: 13, fontWeight: "600" },
  doctorName: { fontSize: 11, marginTop: 2 },
  headerRight: { alignItems: "flex-end", gap: 5 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  statusText: { fontSize: 8, fontWeight: "700", letterSpacing: 0.8 },
  actionBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  ratingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  date: { fontSize: 10 },
  comment: { fontSize: 12, lineHeight: 18 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  titleGroup: { flex: 1 },
  eyebrow: { fontSize: 9, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" },
  title: { fontSize: 24, fontWeight: "700", letterSpacing: -0.5 },
  ratingBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  ratingText: { fontSize: 14, fontWeight: "700" },
  summaryRow: { flexDirection: "row", gap: 6 },
  summaryChip: { borderRadius: 10, borderWidth: 1, padding: 8, alignItems: "center", gap: 2 },
  summaryVal: { fontSize: 16, fontWeight: "700" },
  summaryLabel: { fontSize: 7, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
  filterRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipLabel: { fontSize: 11, fontWeight: "600" },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14 },
});
