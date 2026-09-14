import React, { useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, Platform, Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useData } from "@/context/DataContext";
import { StatCard } from "@/components/StatCard";
import { AppointmentCard } from "@/components/AppointmentCard";
import { SectionHeader } from "@/components/SectionHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { NotificationBell } from "@/components/NotificationBell";

const TOOLS: Array<{ title: string; sub: (d: any) => string; icon: any; color: string; route: string }> = [
  { title: "Payments", sub: (d) => `${d.appointments.filter((a: any) => a.paymentProofUrl && a.paymentStatus === "pending").length} pending`, icon: "credit-card", color: "#10b981", route: "/payments" },
  { title: "Licenses", sub: (d) => `${d.doctors.filter((p: any) => p.status === "Pending" && p.licenseFile).length} pending`, icon: "file-text", color: "#3b82f6", route: "/licenses" },
  { title: "Institutes", sub: (d) => `${d.institutes.filter((i: any) => i.status === "Active").length} active`, icon: "grid", color: "#818cf8", route: "/institutes" },
  { title: "Banners", sub: (d) => `${d.banners.filter((b: any) => b.isActive).length} live`, icon: "image", color: "#f59e0b", route: "/banners" },
  { title: "Reviews", sub: (d) => `${d.reviews.filter((r: any) => r.status === "visible" || r.status === "pinned").length} visible`, icon: "star", color: "#f59e0b", route: "/reviews" },
  { title: "Patients", sub: (d) => `${d.patients.filter((p: any) => p.status === "active").length} active`, icon: "users", color: "#10b981", route: "/patients" },
  { title: "Teleradiology", sub: (d) => `${d.teleradiologyCases.filter((c: any) => c.status === "urgent").length} urgent`, icon: "radio", color: "#ef4444", route: "/teleradiology" },
  { title: "Audit Log", sub: (d) => `${d.auditLogs.length} entries`, icon: "list", color: "#94a3b8", route: "/audit" },
  { title: "Settings", sub: () => `Fee: ${10}% · Policy`, icon: "sliders", color: "#6366f1", route: "/settings" },
];

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const data = useData();
  const { doctors, appointments, revenue, institutes, banners, reviews, patients, teleradiologyCases, settings } = data;
  const [refreshing, setRefreshing] = React.useState(false);

  const stats = useMemo(() => {
    const active = doctors.filter((d) => d.status === "Active").length;
    const pending = doctors.filter((d) => d.status === "Pending").length;
    const completed = appointments.filter((a) => a.status === "completed").length;
    const platformRevenue = appointments.filter((a) => a.status === "completed").reduce((acc, a) => acc + a.platformFee, 0);
    const urgentCases = teleradiologyCases.filter((c) => c.status === "urgent").length;
    const bannedReviews = reviews.filter((r) => r.status === "banned" || r.status === "shadow_banned").length;
    return { active, pending, completed, platformRevenue, total: doctors.length, urgentCases, bannedReviews };
  }, [doctors, appointments, teleradiologyCases, reviews]);

  const onRefresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 800); };
  const topPt = Platform.OS === "web" ? 67 + 16 : insets.top + 16;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPt, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 90) }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>PULSE NETWORK</Text>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Admin Console</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={[styles.liveBadge, { backgroundColor: "rgba(16,185,129,0.12)", borderColor: "rgba(16,185,129,0.25)" }]}>
            <View style={styles.liveDot} />
            <Text style={[styles.liveText, { color: "#10b981" }]}>LIVE</Text>
          </View>
          <NotificationBell />
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.row}>
          <StatCard label="Providers" value={stats.total} color={colors.primary} trend="up" trendValue="8.3%" onPress={() => router.push("/(tabs)/providers")} />
          <StatCard label="Active" value={stats.active} color="#10b981" trend="up" trendValue="5.1%" />
        </View>
        <View style={styles.row}>
          <StatCard label="Pending" value={stats.pending} color="#f59e0b" subLabel="Awaiting review" onPress={() => router.push("/(tabs)/providers")} />
          <StatCard label="Completed" value={stats.completed} subLabel="Appointments" color="#818cf8" trend="up" trendValue="12.4%" />
        </View>
        <View style={styles.row}>
          <StatCard label="Platform Revenue" value={`AED ${stats.platformRevenue.toLocaleString()}`} subLabel="From consultations" color="#f59e0b" trend="up" trendValue="18.2% MoM" onPress={() => router.push("/(tabs)/revenue")} />
          <View style={{ flex: 1, gap: 10 }}>
            <AlertMini label="Urgent Cases" value={stats.urgentCases} color="#ef4444" icon="radio" colors={colors} onPress={() => router.push("/teleradiology")} />
            <AlertMini label="Flagged Reviews" value={stats.bannedReviews} color="#f59e0b" icon="alert-triangle" colors={colors} onPress={() => router.push("/reviews")} />
          </View>
        </View>
      </View>

      {/* System Status */}
      <View style={[styles.systemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.systemRow}>
          {[
            { label: "Firebase", status: "operational" as const },
            { label: "Supabase", status: "operational" as const },
            { label: "Auth", status: "operational" as const },
            { label: "Payments", status: "degraded" as const },
          ].map((s) => (
            <SystemStatus key={s.label} label={s.label} status={s.status} colors={colors} />
          ))}
        </View>
      </View>

      {/* Admin Tools Grid */}
      <SectionHeader title="Admin Tools" />
      <View style={styles.toolsGrid}>
        {TOOLS.map((tool) => (
          <Pressable
            key={tool.title}
            onPress={() => router.push(tool.route as any)}
            style={({ pressed }) => [
              styles.toolCard,
              { backgroundColor: colors.card, borderColor: colors.border },
              pressed && { opacity: 0.82 },
            ]}
          >
            <View style={[styles.toolIcon, { backgroundColor: tool.color + "15", borderColor: tool.color + "25" }]}>
              <Feather name={tool.icon} size={18} color={tool.color} />
            </View>
            <Text style={[styles.toolTitle, { color: colors.foreground }]}>{tool.title}</Text>
            <Text style={[styles.toolSub, { color: colors.mutedForeground }]}>{tool.sub(data)}</Text>
          </Pressable>
        ))}
      </View>

      {/* Recent Appointments */}
      <SectionHeader title="Recent Appointments" actionLabel="View All" onAction={() => router.push("/(tabs)/appointments")} />
      {appointments.slice(0, 3).map((apt) => (
        <AppointmentCard key={apt.id} appointment={apt} />
      ))}

      {/* Provider Overview */}
      <SectionHeader title="Provider Status" />
      <View style={[styles.overviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {(["Active", "Pending", "Disabled", "Declined"] as const).map((status, i) => {
          const count = doctors.filter((d) => d.status === status).length;
          return (
            <View key={status} style={[styles.overviewRow, i < 3 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <StatusBadge status={status} size="md" />
              <Text style={[styles.overviewCount, { color: colors.foreground }]}>{count}</Text>
            </View>
          );
        })}
      </View>

      {/* Institute Summary */}
      <SectionHeader title="Institutes" actionLabel="Manage" onAction={() => router.push("/institutes")} />
      <View style={[styles.tripleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {[
          { label: "Active", count: institutes.filter((i) => i.status === "Active").length, color: "#10b981" },
          { label: "Pending", count: institutes.filter((i) => i.status === "Pending").length, color: "#f59e0b" },
          { label: "Suspended", count: institutes.filter((i) => i.status === "Suspended").length, color: "#ef4444" },
        ].map((s, i) => (
          <View key={s.label} style={[styles.tripleItem, i < 2 && { borderRightWidth: 1, borderRightColor: colors.border }]}>
            <Text style={[styles.tripleVal, { color: s.color }]}>{s.count}</Text>
            <Text style={[styles.tripleLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function AlertMini({ label, value, color, icon, colors, onPress }: any) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        alertStyles.card,
        { backgroundColor: color + "10", borderColor: color + "22" },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Feather name={icon} size={12} color={color} />
      <View style={{ flex: 1 }}>
        <Text style={[alertStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[alertStyles.value, { color }]}>{value}</Text>
      </View>
      <Feather name="chevron-right" size={12} color={color} />
    </Pressable>
  );
}

function SystemStatus({ label, status, colors }: { label: string; status: "operational" | "degraded" | "down"; colors: any }) {
  const color = status === "operational" ? "#10b981" : status === "degraded" ? "#f59e0b" : "#ef4444";
  return (
    <View style={sysStyles.item}>
      <View style={[sysStyles.dot, { backgroundColor: color }]} />
      <Text style={[sysStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const alertStyles = StyleSheet.create({
  card: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, padding: 10 },
  label: { fontSize: 9, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
  value: { fontSize: 18, fontWeight: "700" },
});

const sysStyles = StyleSheet.create({
  item: { alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 9, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  eyebrow: { fontSize: 9, fontWeight: "700", letterSpacing: 2, marginBottom: 4 },
  pageTitle: { fontSize: 26, fontWeight: "700", letterSpacing: -0.5 },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, marginTop: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#10b981" },
  liveText: { fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  statsGrid: { gap: 10 },
  row: { flexDirection: "row", gap: 10 },
  systemCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  systemRow: { flexDirection: "row", justifyContent: "space-around" },
  toolsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  toolCard: {
    width: "47%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  toolIcon: { width: 40, height: 40, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  toolTitle: { fontSize: 14, fontWeight: "700" },
  toolSub: { fontSize: 11 },
  overviewCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  overviewRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
  overviewCount: { fontSize: 20, fontWeight: "700" },
  tripleCard: { borderRadius: 16, borderWidth: 1, flexDirection: "row", overflow: "hidden" },
  tripleItem: { flex: 1, alignItems: "center", paddingVertical: 16, gap: 4 },
  tripleVal: { fontSize: 24, fontWeight: "700" },
  tripleLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
});
