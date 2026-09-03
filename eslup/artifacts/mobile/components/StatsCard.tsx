import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { GlassCard } from "./GlassCard";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: string;
  change?: string;
  positive?: boolean;
}

export function StatsCard({ label, value, icon, change, positive }: StatsCardProps) {
  const colors = useColors();
  return (
    <GlassCard style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: colors.glassLight }]}>
        <Feather name={icon as any} size={18} color={colors.primary} />
      </View>
      <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      {change && (
        <Text style={[styles.change, { color: positive ? colors.success : colors.destructive }]}>
          {positive ? "+" : ""}{change}
        </Text>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    flex: 1,
    minWidth: 140,
    gap: 6,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  value: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  change: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
});
