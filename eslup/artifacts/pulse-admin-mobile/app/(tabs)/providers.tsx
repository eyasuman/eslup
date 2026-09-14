import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useData, DoctorStatus } from "@/context/DataContext";
import { ProviderCard } from "@/components/ProviderCard";

const STATUS_FILTERS: Array<DoctorStatus | "All"> = ["All", "Active", "Pending", "Disabled", "Declined"];

export default function ProvidersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { doctors } = useData();
  const [activeFilter, setActiveFilter] = useState<DoctorStatus | "All">("All");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let result = doctors;
    if (activeFilter !== "All") {
      result = result.filter((d) => d.status === activeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.specialty.toLowerCase().includes(q) ||
          d.city?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [doctors, activeFilter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: doctors.length };
    (["Active", "Pending", "Disabled", "Declined"] as DoctorStatus[]).forEach((s) => {
      c[s] = doctors.filter((d) => d.status === s).length;
    });
    return c;
  }, [doctors]);

  const topPt = Platform.OS === "web" ? 67 + 16 : insets.top + 16;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPt, backgroundColor: colors.background }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>Providers</Text>
          <View style={[styles.countBadge, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "33" }]}>
            <Text style={[styles.countText, { color: colors.primary }]}>{doctors.length}</Text>
          </View>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={15} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search providers..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={15} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
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
                {f}
              </Text>
              {counts[f] !== undefined && (
                <Text
                  style={[
                    styles.filterCount,
                    {
                      color: activeFilter === f ? "rgba(255,255,255,0.7)" : colors.mutedForeground,
                    },
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
        keyExtractor={(d) => d.id}
        renderItem={({ item }) => (
          <ProviderCard
            doctor={item}
            onPress={() => router.push({ pathname: "/provider/[id]", params: { id: item.id } })}
          />
        )}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 90) },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!filtered.length}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="users" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No providers found
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: {
    fontSize: 26,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  countText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    padding: 0,
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
    flex: 1,
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
