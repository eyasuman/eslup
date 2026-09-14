import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useData } from "@/context/DataContext";
import { SectionHeader } from "@/components/SectionHeader";

export default function RevenueScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { revenue, appointments } = useData();

  const stats = useMemo(() => {
    const totalRevenue = revenue.reduce((acc, r) => acc + r.revenue, 0);
    const totalAppointments = revenue.reduce((acc, r) => acc + r.appointments, 0);
    const platformFees = appointments
      .filter((a) => a.status === "completed")
      .reduce((acc, a) => acc + a.platformFee, 0);
    const avgFee =
      appointments.length > 0
        ? Math.round(
            appointments.reduce((acc, a) => acc + a.consultationFee, 0) / appointments.length
          )
        : 0;
    const latestMonth = revenue[revenue.length - 1];
    const prevMonth = revenue[revenue.length - 2];
    const growth =
      prevMonth && prevMonth.revenue > 0
        ? (((latestMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100).toFixed(1)
        : "0";

    return { totalRevenue, totalAppointments, platformFees, avgFee, growth };
  }, [revenue, appointments]);

  const maxRevenue = Math.max(...revenue.map((r) => r.revenue));

  const topPt = Platform.OS === "web" ? 67 + 16 : insets.top + 16;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPt, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 90) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Revenue</Text>

      <View style={[styles.heroCard, { backgroundColor: "#4f46e5", }]}>
        <Text style={styles.heroLabel}>TOTAL PLATFORM REVENUE</Text>
        <Text style={styles.heroValue}>AED {stats.totalRevenue.toLocaleString()}</Text>
        <View style={styles.heroRow}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>↑ {stats.growth}% this month</Text>
          </View>
          <Text style={styles.heroSub}>{stats.totalAppointments} appointments</Text>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <MetricCard
          label="Platform Fees"
          value={`AED ${stats.platformFees}`}
          icon="dollar-sign"
          color="#10b981"
          colors={colors}
        />
        <MetricCard
          label="Avg Consultation"
          value={`AED ${stats.avgFee}`}
          icon="bar-chart-2"
          color="#818cf8"
          colors={colors}
        />
      </View>

      <SectionHeader title="Monthly Breakdown" />
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.barChart}>
          {revenue.map((r, i) => {
            const height = Math.max(8, (r.revenue / maxRevenue) * 120);
            const isLast = i === revenue.length - 1;
            return (
              <View key={r.month} style={styles.barItem}>
                <Text style={[styles.barValue, { color: colors.mutedForeground }]}>
                  {r.revenue >= 1000 ? `${(r.revenue / 1000).toFixed(0)}k` : r.revenue}
                </Text>
                <View
                  style={[
                    styles.bar,
                    {
                      height,
                      backgroundColor: isLast ? "#6366f1" : colors.primary + "40",
                      borderColor: isLast ? "#818cf8" : colors.primary + "60",
                    },
                  ]}
                />
                <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>{r.month}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <SectionHeader title="Monthly Details" />
      <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.tableHeaderText, { color: colors.mutedForeground, flex: 1 }]}>Month</Text>
          <Text style={[styles.tableHeaderText, { color: colors.mutedForeground, textAlign: "right" }]}>Appts</Text>
          <Text style={[styles.tableHeaderText, { color: colors.mutedForeground, textAlign: "right", width: 100 }]}>Revenue</Text>
        </View>
        {revenue.map((r, i) => (
          <View
            key={r.month}
            style={[
              styles.tableRow,
              i < revenue.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              i === revenue.length - 1 && { backgroundColor: "rgba(99,102,241,0.05)" },
            ]}
          >
            <View style={styles.monthCell}>
              {i === revenue.length - 1 && (
                <View style={[styles.currentDot, { backgroundColor: colors.primary }]} />
              )}
              <Text style={[styles.tableCell, { color: colors.foreground }]}>{r.month}</Text>
            </View>
            <Text style={[styles.tableCell, { color: colors.mutedForeground, textAlign: "right" }]}>
              {r.appointments}
            </Text>
            <Text style={[styles.tableCell, { color: i === revenue.length - 1 ? colors.primary : colors.foreground, textAlign: "right", width: 100, fontWeight: "700", fontFamily: "Inter_700Bold" }]}>
              AED {r.revenue.toLocaleString()}
            </Text>
          </View>
        ))}
      </View>

      <View style={[styles.feeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.feeHeader}>
          <Feather name="settings" size={14} color={colors.mutedForeground} />
          <Text style={[styles.feeTitle, { color: colors.foreground }]}>Platform Fee Settings</Text>
        </View>
        <View style={[styles.feeSetting, { borderColor: colors.border }]}>
          <Text style={[styles.feeLabel, { color: colors.mutedForeground }]}>Fixed Platform Fee</Text>
          <View style={[styles.feeValue, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
            <Text style={[styles.feeValueText, { color: colors.primary }]}>10%</Text>
          </View>
        </View>
        <Text style={[styles.feeNote, { color: colors.mutedForeground }]}>
          Applied automatically to all completed consultations. Contact support to adjust the platform fee rate.
        </Text>
      </View>
    </ScrollView>
  );
}

function MetricCard({ label, value, icon, color, colors }: any) {
  return (
    <View style={[metricStyles.card, { flex: 1, backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[metricStyles.iconWrap, { backgroundColor: color + "18", borderColor: color + "30" }]}>
        <Feather name={icon} size={14} color={color} />
      </View>
      <Text style={[metricStyles.value, { color }]}>{value}</Text>
      <Text style={[metricStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const metricStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
    marginTop: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16 },
  title: {
    fontSize: 26,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  heroCard: {
    borderRadius: 20,
    padding: 22,
    gap: 8,
    overflow: "hidden",
  },
  heroLabel: {
    fontSize: 9,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    color: "rgba(255,255,255,0.6)",
    textTransform: "uppercase",
  },
  heroValue: {
    fontSize: 34,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    letterSpacing: -1,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  heroBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: "rgba(255,255,255,0.9)",
    letterSpacing: 0.5,
  },
  heroSub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Inter_400Regular",
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  chartCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 160,
    paddingBottom: 24,
  },
  barItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    height: "100%",
  },
  barValue: {
    fontSize: 8,
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  bar: {
    width: "70%",
    borderRadius: 4,
    borderWidth: 1,
  },
  barLabel: {
    fontSize: 9,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  tableCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tableHeaderText: {
    fontSize: 9,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 13,
    alignItems: "center",
  },
  monthCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  currentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tableCell: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  feeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  feeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  feeTitle: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  feeSetting: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  feeLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  feeValue: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  feeValueText: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  feeNote: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
});
