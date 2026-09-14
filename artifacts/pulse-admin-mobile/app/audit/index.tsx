import React, { useState, useMemo } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useData, AuditLog } from "@/context/DataContext";

type LogType = "User" | "Admin" | "System";

const TYPE_META: Record<LogType, { color: string; icon: any }> = {
  Admin: { color: "#818cf8", icon: "shield" },
  User: { color: "#10b981", icon: "user" },
  System: { color: "#f59e0b", icon: "cpu" },
};

export default function AuditScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { auditLogs } = useData();
  const [filter, setFilter] = useState<LogType | "all">("all");

  const filtered = useMemo(() => {
    if (filter === "all") return auditLogs;
    return auditLogs.filter((l) => l.type === filter);
  }, [auditLogs, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: auditLogs.length };
    (["Admin", "User", "System"] as LogType[]).forEach((t) => {
      c[t] = auditLogs.filter((l) => l.type === t).length;
    });
    return c;
  }, [auditLogs]);

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
            <Text style={[styles.title, { color: colors.foreground }]}>Audit Log</Text>
          </View>
          <View style={[styles.totalBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="list" size={12} color={colors.mutedForeground} />
            <Text style={[styles.totalText, { color: colors.mutedForeground }]}>{auditLogs.length}</Text>
          </View>
        </View>

        <View style={styles.typeRow}>
          {(["all", "Admin", "User", "System"] as const).map((t) => {
            const meta = t !== "all" ? TYPE_META[t] : null;
            return (
              <Pressable
                key={t}
                onPress={() => setFilter(t)}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor: filter === t ? (meta?.color || colors.primary) : colors.card,
                    borderColor: filter === t ? (meta?.color || colors.primary) : colors.border,
                  },
                ]}
              >
                {meta && <Feather name={meta.icon} size={11} color={filter === t ? "#fff" : meta.color} />}
                <Text style={[styles.typeLabel, { color: filter === t ? "#fff" : colors.mutedForeground }]}>
                  {t === "all" ? `All ${counts.all}` : `${t} ${counts[t] || 0}`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(l) => l.id}
        renderItem={({ item, index }) => (
          <LogEntry log={item} colors={colors} isLast={index === filtered.length - 1} />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 24 : 30) }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="file-text" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No audit logs</Text>
          </View>
        }
      />
    </View>
  );
}

function LogEntry({ log, colors, isLast }: { log: AuditLog; colors: any; isLast: boolean }) {
  const meta = TYPE_META[log.type];
  const dateObj = new Date(log.timestamp);
  const timeStr = dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const dateStr = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <View style={entryStyles.wrapper}>
      <View style={entryStyles.left}>
        <View style={[entryStyles.dot, { backgroundColor: meta.color, borderColor: meta.color + "30" }]} />
        {!isLast && <View style={[entryStyles.line, { backgroundColor: colors.border }]} />}
      </View>
      <View style={[entryStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={entryStyles.cardHeader}>
          <View style={[entryStyles.typePill, { backgroundColor: meta.color + "12", borderColor: meta.color + "25" }]}>
            <Feather name={meta.icon} size={9} color={meta.color} />
            <Text style={[entryStyles.typeText, { color: meta.color }]}>{log.type.toUpperCase()}</Text>
          </View>
          <Text style={[entryStyles.time, { color: colors.mutedForeground }]}>{dateStr} · {timeStr}</Text>
        </View>
        <Text style={[entryStyles.actor, { color: colors.foreground }]}>{log.actorName}</Text>
        <Text style={[entryStyles.action, { color: colors.mutedForeground }]}>{log.action}</Text>
        {log.objectType && (
          <View style={[entryStyles.objPill, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="tag" size={9} color={colors.mutedForeground} />
            <Text style={[entryStyles.objText, { color: colors.mutedForeground }]}>{log.objectType}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const entryStyles = StyleSheet.create({
  wrapper: { flexDirection: "row", gap: 12, paddingHorizontal: 16, marginBottom: 6 },
  left: { alignItems: "center", width: 16 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, marginTop: 12, zIndex: 1 },
  line: { flex: 1, width: 1, marginTop: 2 },
  card: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, gap: 4 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  typePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  typeText: { fontSize: 8, fontWeight: "700", letterSpacing: 0.8 },
  time: { fontSize: 9 },
  actor: { fontSize: 13, fontWeight: "600" },
  action: { fontSize: 11, lineHeight: 16 },
  objPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1, alignSelf: "flex-start", marginTop: 2 },
  objText: { fontSize: 9, fontWeight: "500" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  titleGroup: { flex: 1 },
  eyebrow: { fontSize: 9, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" },
  title: { fontSize: 24, fontWeight: "700", letterSpacing: -0.5 },
  totalBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  totalText: { fontSize: 12, fontWeight: "600" },
  typeRow: { flexDirection: "row", gap: 7, flexWrap: "wrap" },
  typeChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  typeLabel: { fontSize: 11, fontWeight: "600" },
  list: { paddingTop: 8 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14 },
});
