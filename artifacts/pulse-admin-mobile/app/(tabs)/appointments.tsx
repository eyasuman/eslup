import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useData, AppointmentStatus } from "@/context/DataContext";
import { AppointmentCard } from "@/components/AppointmentCard";

const STATUS_FILTERS: Array<AppointmentStatus | "all"> = [
  "all",
  "pending",
  "scheduled",
  "completed",
  "cancelled",
];

export default function AppointmentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { appointments } = useData();
  const [activeFilter, setActiveFilter] = useState<AppointmentStatus | "all">("all");

  const filtered = useMemo(() => {
    if (activeFilter === "all") return appointments;
    return appointments.filter((a) => a.status === activeFilter);
  }, [appointments, activeFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: appointments.length };
    (["pending", "scheduled", "completed", "cancelled", "declined"] as AppointmentStatus[]).forEach((s) => {
      c[s] = appointments.filter((a) => a.status === s).length;
    });
    return c;
  }, [appointments]);

  const totalRevenue = useMemo(
    () =>
      appointments
        .filter((a) => a.status === "completed")
        .reduce((acc, a) => acc + a.totalPrice, 0),
    [appointments]
  );

  const topPt = Platform.OS === "web" ? 67 + 16 : insets.top + 16;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPt, backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Appointments</Text>

        <View style={[styles.summaryRow]}>
          <SummaryChip
            label="Total"
            value={appointments.length}
            color={colors.primary}
            colors={colors}
          />
          <SummaryChip
            label="Revenue"
            value={`AED ${totalRevenue.toLocaleString()}`}
            color="#10b981"
            colors={colors}
          />
          <SummaryChip
            label="Pending"
            value={counts["pending"]}
            color="#f59e0b"
            colors={colors}
          />
        </View>

        <View style={styles.filterRow}>
          {STATUS_FILTERS.map((f) => (
            <Pressable
              key={f}
              onPress={() => setActiveFilter(f)}
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    activeFilter === f ? colors.primary : colors.card,
                  borderColor:
                    activeFilter === f ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterLabel,
                  { color: activeFilter === f ? "#fff" : colors.mutedForeground },
                ]}
              >
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
              {counts[f] !== undefined && (
                <Text
                  style={[
                    styles.filterCount,
                    { color: activeFilter === f ? "rgba(255,255,255,0.7)" : colors.mutedForeground },
                  ]}
                >
                  {counts[f]}
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => <AppointmentCard appointment={item} />}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 90) },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!filtered.length}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="calendar" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No appointments found
            </Text>
          </View>
        }
      />
    </View>
  );
}

function SummaryChip({
  label,
  value,
  color,
  colors,
}: {
  label: string;
  value: string | number;
  color: string;
  colors: any;
}) {
  return (
    <View
      style={[
        summaryStyles.chip,
        { flex: 1, backgroundColor: color + "10", borderColor: color + "22" },
      ]}
    >
      <Text style={[summaryStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[summaryStyles.value, { color }]}>{value}</Text>
    </View>
  );
}

const summaryStyles = StyleSheet.create({
  chip: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 2,
  },
  label: {
    fontSize: 9,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  value: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  title: {
    fontSize: 26,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterRow: {
    flexDirection: "row",
    gap: 7,
    flexWrap: "wrap",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  filterCount: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
