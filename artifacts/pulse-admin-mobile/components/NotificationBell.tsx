import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useData, NotificationType } from "@/context/DataContext";

interface PendingItem {
  label: string;
  count: number;
  icon: any;
  color: string;
  route: string;
}

export function NotificationBell() {
  const colors = useColors();
  const router = useRouter();
  const { notifications, notificationsUnread } = useData();
  const [open, setOpen] = useState(false);

  const TYPE_ROUTES: Record<NotificationType, string> = {
    payment_proof: "/payments",
    license_review: "/licenses",
    appointment_request: "/appointments",
    urgent_case: "/teleradiology",
    info: "/",
  };

  const TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
    payment_proof: { label: "Payment proofs", icon: "credit-card", color: "#10b981" },
    license_review: { label: "License reviews", icon: "file-text", color: "#3b82f6" },
    appointment_request: { label: "Appointments", icon: "calendar", color: "#6366f1" },
    urgent_case: { label: "Urgent cases", icon: "alert-triangle", color: "#ef4444" },
    info: { label: "Info", icon: "info", color: "#8b5cf6" },
  };

  // Group unread notifications by type for the popover
  const items: PendingItem[] = useMemo(() => {
    const groups: Record<string, number> = {};
    notifications
      .filter((n) => !n.read)
      .forEach((n) => {
        groups[n.type] = (groups[n.type] || 0) + 1;
      });
    return Object.entries(groups)
      .map(([type, count]) => {
        const meta = TYPE_META[type] ?? TYPE_META.info;
        return {
          label: meta.label,
          count,
          icon: meta.icon,
          color: meta.color,
          route: TYPE_ROUTES[type as NotificationType],
        };
      })
      .filter((i) => i.count > 0);
  }, [notifications]);

  const total = items.reduce((acc, i) => acc + i.count, 0);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.bell, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Feather name="bell" size={17} color={colors.foreground} />
        {total > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{total > 99 ? "99+" : total}</Text>
          </View>
        )}
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={[styles.panelHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.panelTitleRow}>
                <Feather name="bell" size={15} color={colors.foreground} />
                <Text style={[styles.panelTitle, { color: colors.foreground }]}>
                  Unread Alerts
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {items.length > 0 && (
                  <Pressable
                    onPress={() => {
                      setOpen(false);
                      router.push("/(tabs)/notifications");
                    }}
                    style={({ pressed }) => [
                      { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7, backgroundColor: colors.primary + "15", borderWidth: 1, borderColor: colors.primary + "30" },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={{ fontSize: 10, fontWeight: "600", color: colors.primary }}>View All</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => setOpen(false)}>
                <Feather name="x" size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.panelBody}
            >
              {items.length === 0 ? (
                <View style={styles.empty}>
                  <Feather name="check-circle" size={28} color={colors.mutedForeground} />
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                    All caught up! No unread alerts.
                  </Text>
                </View>
              ) : (
                items.map((item) => (
                  <Pressable
                    key={item.label}
                    onPress={() => {
                      setOpen(false);
                      router.push(item.route as any);
                    }}
                    style={({ pressed }) => [
                      styles.item,
                      { backgroundColor: colors.background, borderColor: colors.border },
                      pressed && { opacity: 0.75 },
                    ]}
                  >
                    <View
                      style={[
                        styles.itemIcon,
                        { backgroundColor: item.color + "18", borderColor: item.color + "30" },
                      ]}
                    >
                      <Feather name={item.icon} size={14} color={item.color} />
                    </View>
                    <Text style={[styles.itemLabel, { color: colors.foreground }]}>
                      {item.label}
                    </Text>
                    <View
                      style={[
                        styles.itemBadge,
                        { backgroundColor: item.color + "18", borderColor: item.color + "30" },
                      ]}
                    >
                      <Text style={[styles.itemCount, { color: item.color }]}>
                        {item.count}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={13} color={colors.mutedForeground} />
                  </Pressable>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bell: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 17,
    height: 17,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "flex-end",
    justifyContent: "flex-start",
    paddingTop: Platform.OS === "web" ? 80 : 60,
    paddingRight: 16,
  },
  panel: {
    width: 300,
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: 420,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  panelTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  panelBody: {
    padding: 10,
    gap: 6,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  itemIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  itemLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
  },
  itemBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  itemCount: {
    fontSize: 11,
    fontWeight: "700",
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    gap: 10,
  },
  emptyText: {
    fontSize: 12,
    textAlign: "center",
  },
});
