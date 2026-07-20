import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp, Notification } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/constants/translations";

const TYPE_ICON: Record<Notification["type"], string> = {
  booking: "calendar",
  approval: "check-circle",
  cancellation: "x-circle",
  info: "info",
};

const TYPE_COLOR: Record<Notification["type"], string> = {
  booking: "#315d93",
  approval: "#059669",
  cancellation: "#DC2626",
  info: "#D97706",
};

type FilterType = "all" | "booking" | "approval" | "cancellation" | "info";

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { notifications, markAllRead, updateBooking, bookings, addNotification, language } = useApp();
  const t = useTranslation(language);
  const isRTL = language === "ar";
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const bg = colors.isDark ? colors.background : "#FFFFFF";
  const textPrimary = colors.isDark ? "#FFFFFF" : "#202937";
  const textMuted = colors.isDark ? "#94A3B8" : "#64748B";
  const cardBg = colors.isDark ? "rgba(255,255,255,0.06)" : "#F4F7FB";
  const borderCol = colors.isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0";

  const unread = notifications.filter((n) => !n.read).length;

  const filtered = activeFilter === "all"
    ? notifications
    : notifications.filter((n) => n.type === activeFilter);

  const handleCancelBooking = (notif: Notification) => {
    // Find the booking associated with this notification
    const booking = bookings.find((b) => notif.body.toLowerCase().includes(b.providerName.toLowerCase()));
    if (!booking) {
      Alert.alert("Cancel Booking", "Booking not found. It may have already been processed.");
      return;
    }
    if (booking.status === "cancelled") {
      Alert.alert("Already Cancelled", "This booking has already been cancelled.");
      return;
    }
    Alert.alert(
      "Cancel Appointment",
      `Are you sure you want to cancel your appointment with ${booking.providerName}?`,
      [
        { text: "Keep Appointment", style: "cancel" },
        {
          text: "Cancel Appointment", style: "destructive",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            updateBooking(booking.id, { status: "cancelled" });
            addNotification({
              id: Date.now().toString(),
              title: "Appointment Cancelled",
              body: `Your appointment with ${booking.providerName} has been cancelled.`,
              read: false,
              createdAt: new Date().toISOString(),
              type: "cancellation",
            });
          },
        },
      ]
    );
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHrs = Math.floor(diffMins / 60);
      if (diffHrs < 24) return `${diffHrs}h ago`;
      const diffDays = Math.floor(diffHrs / 24);
      if (diffDays === 1) return "Yesterday";
      return `${diffDays} days ago`;
    } catch {
      return "";
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 10, borderBottomColor: borderCol }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>{t("notification_title")}</Text>
          {unread > 0 && <Text style={[styles.headerSub, { color: textMuted }]}>{unread} unread</Text>}
        </View>
        {unread > 0 && (
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); markAllRead(); }}
            style={[styles.markReadBtn, { borderColor: "#315d93" + "40" }]}
          >
            <Feather name="check-square" size={14} color="#315d93" />
            <Text style={[styles.markReadText, { color: "#315d93" }]}>{t("mark_all_read")}</Text>
          </Pressable>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterRow, { borderBottomColor: borderCol }]}>
        {(["all", "booking", "approval", "cancellation", "info"] as FilterType[]).map((f) => {
          const labels: Record<FilterType, string> = { all: "All", booking: "Bookings", approval: "Approvals", cancellation: "Cancellations", info: "Info" };
          const active = activeFilter === f;
          return (
            <Pressable
              key={f}
              onPress={() => setActiveFilter(f)}
              style={[styles.filterTab, active && { borderBottomColor: "#315d93", borderBottomWidth: 2 }]}
            >
              <Text style={[styles.filterTabText, { color: active ? "#315d93" : textMuted }]}>{labels[f]}</Text>
            </Pressable>
          );
        })}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.isDark ? "rgba(255,255,255,0.06)" : "#F4F7FB" }]}>
            <Feather name="bell-off" size={40} color={textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: textPrimary }]}>{t("no_notifications")}</Text>
          <Text style={[styles.emptyText, { color: textMuted }]}>
            {activeFilter === "all"
              ? "You're all caught up! Notifications will appear here."
              : `No ${activeFilter} notifications.`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: bottomPad + 40 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const typeColor = TYPE_COLOR[item.type];
            return (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.notifCard,
                  {
                    backgroundColor: item.read ? cardBg : (colors.isDark ? "rgba(49,93,147,0.12)" : "#EEF3FA"),
                    borderColor: item.read ? borderCol : "#315d93" + "30",
                    borderLeftWidth: item.read ? 1 : 3,
                    borderLeftColor: item.read ? borderCol : typeColor,
                  },
                ]}
              >
                <View style={styles.notifTop}>
                  <View style={[styles.notifIcon, { backgroundColor: typeColor + "18" }]}>
                    <Feather name={TYPE_ICON[item.type] as any} size={18} color={typeColor} />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={styles.notifTitleRow}>
                      <Text style={[styles.notifTitle, { color: textPrimary }]}>{item.title}</Text>
                      {!item.read && <View style={[styles.unreadDot, { backgroundColor: "#315d93" }]} />}
                    </View>
                    <Text style={[styles.notifBody, { color: textMuted }]}>{item.body}</Text>
                    <Text style={[styles.notifTime, { color: textMuted }]}>{formatTime(item.createdAt)}</Text>
                  </View>
                </View>

                {/* Action buttons for booking notifications */}
                {item.type === "booking" && (
                  <View style={styles.notifActions}>
                    <Pressable
                      onPress={() => handleCancelBooking(item)}
                      style={({ pressed }) => [styles.notifActionBtn, { borderColor: "#DC2626", opacity: pressed ? 0.8 : 1 }]}
                    >
                      <Feather name="x" size={13} color="#DC2626" />
                      <Text style={[styles.notifActionText, { color: "#DC2626" }]}>Cancel Booking</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => router.push("/booking")}
                      style={({ pressed }) => [styles.notifActionBtn, { borderColor: "#315d93", backgroundColor: "#315d93" + "10", opacity: pressed ? 0.8 : 1 }]}
                    >
                      <Feather name="calendar" size={13} color="#315d93" />
                      <Text style={[styles.notifActionText, { color: "#315d93" }]}>View Booking</Text>
                    </Pressable>
                  </View>
                )}
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
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 0.5 },
  backBtn: {},
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  markReadBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  markReadText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  filterRow: { flexDirection: "row", borderBottomWidth: 0.5, paddingHorizontal: 16 },
  filterTab: { paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 2, borderBottomColor: "transparent" },
  filterTabText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 40 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  notifCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  notifTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  notifIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  notifTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  notifTitle: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  unreadDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  notifBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  notifTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  notifActions: { flexDirection: "row", gap: 10, paddingTop: 4 },
  notifActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  notifActionText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
