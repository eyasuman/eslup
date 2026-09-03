import React, { useState, useMemo, useCallback } from "react";
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
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useData, NotificationItem, NotificationType } from "@/context/DataContext";

const TYPE_META: Record<NotificationType, { label: string; icon: any; color: string }> = {
  payment_proof: { label: "Payment Proofs", icon: "credit-card", color: "#10b981" },
  license_review: { label: "License Reviews", icon: "file-text", color: "#3b82f6" },
  appointment_request: { label: "Appointments", icon: "calendar", color: "#6366f1" },
  urgent_case: { label: "Urgent Cases", icon: "alert-triangle", color: "#ef4444" },
  info: { label: "Information", icon: "info", color: "#8b5cf6" },
};

const TYPE_ORDER: NotificationType[] = [
  "urgent_case",
  "payment_proof",
  "license_review",
  "appointment_request",
  "info",
];

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useData();
  const [filter, setFilter] = useState<NotificationType | "all">("all");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: notifications.length };
    TYPE_ORDER.forEach((t) => { c[t] = notifications.filter((n) => n.type === t).length; });
    return c;
  }, [notifications]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const filtered = useMemo(() => {
    if (filter === "all") return notifications;
    return notifications.filter((n) => n.type === filter);
  }, [notifications, filter]);

  const grouped = useMemo(() => {
    const groups: { type: NotificationType; items: NotificationItem[] }[] = [];
    TYPE_ORDER.forEach((t) => {
      const items = filtered.filter((n) => n.type === t);
      if (items.length > 0) groups.push({ type: t, items });
    });
    return groups;
  }, [filtered]);

  const handleMarkAllRead = useCallback(() => {
    if (unreadCount === 0) return;
    Alert.alert(
      "Mark All as Read",
      `Mark all ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""} as read?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Mark Read", onPress: () => markAllNotificationsRead() },
      ]
    );
  }, [unreadCount, markAllNotificationsRead]);

  const topPt = Platform.OS === "web" ? 67 + 16 : insets.top + 16;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.topBar, { paddingTop: topPt, backgroundColor: colors.background }]}>
        <View style={styles.titleRow}>
          <View style={styles.titleGroup}>
            <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>NOTIFICATIONS</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Alerts</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={handleMarkAllRead}
              disabled={unreadCount === 0}
              style={[
                styles.markAllBtn,
                {
                  backgroundColor: unreadCount > 0 ? colors.primary + "15" : colors.card,
                  borderColor: unreadCount > 0 ? colors.primary + "30" : colors.border,
                  opacity: unreadCount === 0 ? 0.5 : 1,
                },
              ]}
            >
              <Feather name="check-circle" size={13} color={unreadCount > 0 ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.markAllText, { color: unreadCount > 0 ? colors.primary : colors.mutedForeground }]}>
                Mark All Read
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Category filter chips */}
        <View style={styles.filterRow}>
          <Pressable
            onPress={() => setFilter("all")}
            style={[styles.chip, { backgroundColor: filter === "all" ? colors.primary : colors.card, borderColor: filter === "all" ? colors.primary : colors.border }]}
          >
            <Text style={[styles.chipLabel, { color: filter === "all" ? "#fff" : colors.mutedForeground }]}>All</Text>
            <View style={[styles.chipCount, { backgroundColor: filter === "all" ? "rgba(255,255,255,0.2)" : colors.muted }]}>
              <Text style={[styles.chipCountText, { color: filter === "all" ? "#fff" : colors.mutedForeground }]}>{counts.all}</Text>
            </View>
          </Pressable>
          {TYPE_ORDER.map((t) => {
            const meta = TYPE_META[t];
            const isActive = filter === t;
            return (
              <Pressable
                key={t}
                onPress={() => setFilter(t)}
                style={[styles.chip, { backgroundColor: isActive ? meta.color : colors.card, borderColor: isActive ? meta.color : colors.border }]}
              >
                <Feather name={meta.icon} size={10} color={isActive ? "#fff" : meta.color} />
                <Text style={[styles.chipLabel, { color: isActive ? "#fff" : colors.mutedForeground }]}>{meta.label}</Text>
                <View style={[styles.chipCount, { backgroundColor: isActive ? "rgba(255,255,255,0.2)" : colors.muted }]}>
                  <Text style={[styles.chipCountText, { color: isActive ? "#fff" : colors.mutedForeground }]}>{counts[t]}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => (
          <NotificationRow notification={item} colors={colors} onMarkRead={markNotificationRead} />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 24 : 30) }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="bell-off" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>No notifications</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              New alerts will appear here when action is needed.
            </Text>
          </View>
        }
      />
    </View>
  );
}

function NotificationRow({
  notification,
  colors,
  onMarkRead,
}: {
  notification: NotificationItem;
  colors: any;
  onMarkRead: (id: string) => Promise<void>;
}) {
  const meta = TYPE_META[notification.type] ?? TYPE_META.info;
  const timeAgo = getTimeAgo(notification.createdAt);

  return (
    <Pressable
      onPress={() => {
        if (!notification.read) onMarkRead(notification.id);
      }}
      style={({ pressed }) => [
        rowStyles.row,
        {
          backgroundColor: notification.read ? colors.card : colors.background,
          borderColor: notification.read ? colors.border : meta.color + "25",
        },
        !notification.read && {
          borderLeftWidth: 3,
          borderLeftColor: meta.color,
        },
        pressed && { opacity: 0.8 },
      ]}
    >
      {/* Icon */}
      <View
        style={[
          rowStyles.iconBox,
          {
            backgroundColor: notification.read ? colors.muted : meta.color + "15",
            borderColor: notification.read ? colors.border : meta.color + "30",
          },
        ]}
      >
        <Feather name={meta.icon} size={15} color={notification.read ? colors.mutedForeground : meta.color} />
      </View>

      {/* Content */}
      <View style={rowStyles.content}>
        <View style={rowStyles.titleRow}>
          <Text
            style={[rowStyles.title, { color: colors.foreground, fontWeight: notification.read ? "500" : "700" }]}
            numberOfLines={1}
          >
            {notification.title}
          </Text>
          {!notification.read && <View style={[rowStyles.unreadDot, { backgroundColor: meta.color }]} />}
        </View>
        <Text style={[rowStyles.body, { color: colors.mutedForeground }]} numberOfLines={2}>
          {notification.body}
        </Text>
        <View style={rowStyles.footer}>
          <Text style={[rowStyles.time, { color: colors.mutedForeground }]}>{timeAgo}</Text>
          <View style={[rowStyles.typeBadge, { backgroundColor: meta.color + "12", borderColor: meta.color + "25" }]}>
            <Text style={[rowStyles.typeLabel, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
      </View>

      {/* Tap hint */}
      {!notification.read && (
        <Feather name="check" size={14} color={colors.mutedForeground} style={{ opacity: 0.4 }} />
      )}
    </Pressable>
  );
}

function getTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  content: { flex: 1, gap: 3 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { fontSize: 13, flex: 1 },
  unreadDot: { width: 7, height: 7, borderRadius: 4 },
  body: { fontSize: 11, lineHeight: 16 },
  footer: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 5 },
  time: { fontSize: 9, fontWeight: "500" },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  typeLabel: { fontSize: 8, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingHorizontal: 16, paddingBottom: 10, gap: 12 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  titleGroup: { flex: 1 },
  eyebrow: { fontSize: 9, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" },
  title: { fontSize: 24, fontWeight: "700", letterSpacing: -0.5 },
  headerActions: { flexDirection: "row", gap: 8, paddingTop: 6 },
  markAllBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  markAllText: { fontSize: 10, fontWeight: "600" },
  filterRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  chipLabel: { fontSize: 10, fontWeight: "600" },
  chipCount: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6 },
  chipCountText: { fontSize: 9, fontWeight: "700" },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: "600" },
  emptySub: { fontSize: 12, textAlign: "center", maxWidth: 220 },
});
