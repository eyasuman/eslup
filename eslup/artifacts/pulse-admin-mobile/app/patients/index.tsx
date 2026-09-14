import React, { useState, useMemo } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput, Platform, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useData, Patient } from "@/context/DataContext";

export default function PatientsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { patients, togglePatientStatus } = useData();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "suspended">("all");

  const filtered = useMemo(() => {
    let result = patients;
    if (filter !== "all") result = result.filter((p) => p.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || p.city?.toLowerCase().includes(q));
    }
    return result;
  }, [patients, filter, search]);

  const counts = { all: patients.length, active: patients.filter((p) => p.status === "active").length, suspended: patients.filter((p) => p.status === "suspended").length };
  const topPt = Platform.OS === "web" ? 67 + 16 : insets.top + 16;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPt, backgroundColor: colors.background }]}>
        <View style={styles.titleRow}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="arrow-left" size={16} color={colors.foreground} />
          </Pressable>
          <View style={styles.titleGroup}>
            <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>ADMIN</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Patients</Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "30" }]}>
            <Text style={[styles.countText, { color: colors.primary }]}>{patients.length}</Text>
          </View>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={15} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search patients..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search ? <Pressable onPress={() => setSearch("")}><Feather name="x" size={15} color={colors.mutedForeground} /></Pressable> : null}
        </View>

        <View style={styles.filterRow}>
          {(["all", "active", "suspended"] as const).map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.chip, { backgroundColor: filter === f ? colors.primary : colors.card, borderColor: filter === f ? colors.primary : colors.border }]}
            >
              <Text style={[styles.chipLabel, { color: filter === f ? "#fff" : colors.mutedForeground }]}>
                {f.charAt(0).toUpperCase() + f.slice(1)} {counts[f]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <PatientCard
            patient={item}
            colors={colors}
            onToggle={() =>
              Alert.alert(
                `${item.status === "active" ? "Suspend" : "Activate"} Patient`,
                `${item.status === "active" ? "Suspend" : "Reactivate"} ${item.name}?`,
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Confirm", style: item.status === "active" ? "destructive" : "default", onPress: () => togglePatientStatus(item.id) },
                ]
              )
            }
          />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 24 : 30) }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="users" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No patients found</Text>
          </View>
        }
      />
    </View>
  );
}

function PatientCard({ patient, colors, onToggle }: { patient: Patient; colors: any; onToggle: () => void }) {
  const isActive = patient.status === "active";
  const initials = patient.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <View style={[cardStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={cardStyles.row}>
        <View style={[cardStyles.avatar, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "25" }]}>
          <Text style={[cardStyles.initials, { color: colors.primary }]}>{initials}</Text>
        </View>
        <View style={cardStyles.info}>
          <Text style={[cardStyles.name, { color: colors.foreground }]}>{patient.name}</Text>
          <Text style={[cardStyles.email, { color: colors.mutedForeground }]}>{patient.email}</Text>
          <View style={cardStyles.metaRow}>
            {patient.city && (
              <View style={[cardStyles.tag, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Feather name="map-pin" size={9} color={colors.mutedForeground} />
                <Text style={[cardStyles.tagText, { color: colors.mutedForeground }]}>{patient.city}</Text>
              </View>
            )}
            <View style={[cardStyles.tag, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="calendar" size={9} color={colors.mutedForeground} />
              <Text style={[cardStyles.tagText, { color: colors.mutedForeground }]}>{patient.totalAppointments} appts</Text>
            </View>
          </View>
        </View>
        <View style={cardStyles.right}>
          <View style={[cardStyles.statusBadge, {
            backgroundColor: isActive ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
            borderColor: isActive ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)",
          }]}>
            <Text style={[cardStyles.statusText, { color: isActive ? "#10b981" : "#ef4444" }]}>
              {isActive ? "ACTIVE" : "SUSPENDED"}
            </Text>
          </View>
          <Pressable
            onPress={onToggle}
            style={[cardStyles.toggleBtn, {
              backgroundColor: isActive ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)",
              borderColor: isActive ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)",
            }]}
          >
            <Feather name={isActive ? "user-x" : "user-check"} size={13} color={isActive ? "#ef4444" : "#10b981"} />
          </Pressable>
        </View>
      </View>
      <View style={[cardStyles.footer, { borderTopColor: colors.border }]}>
        <View style={cardStyles.footerItem}>
          <Feather name="mail" size={10} color={colors.mutedForeground} />
          <Text style={[cardStyles.footerText, { color: colors.mutedForeground }]}>{patient.email}</Text>
        </View>
        {patient.phone && (
          <View style={cardStyles.footerItem}>
            <Feather name="phone" size={10} color={colors.mutedForeground} />
            <Text style={[cardStyles.footerText, { color: colors.mutedForeground }]}>{patient.phone}</Text>
          </View>
        )}
        <Text style={[cardStyles.joined, { color: colors.mutedForeground }]}>
          Joined {new Date(patient.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
        </Text>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 10 },
  row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  avatar: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 14, fontWeight: "700" },
  info: { flex: 1, gap: 3 },
  name: { fontSize: 14, fontWeight: "600" },
  email: { fontSize: 11 },
  metaRow: { flexDirection: "row", gap: 5, marginTop: 2 },
  tag: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  tagText: { fontSize: 9, fontWeight: "500" },
  right: { alignItems: "flex-end", gap: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  statusText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.8 },
  toggleBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  footer: { borderTopWidth: 1, paddingTop: 10, gap: 4 },
  footerItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  footerText: { fontSize: 10 },
  joined: { fontSize: 9, marginTop: 2 },
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
  searchBar: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  filterRow: { flexDirection: "row", gap: 7 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipLabel: { fontSize: 11, fontWeight: "600" },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14 },
});
