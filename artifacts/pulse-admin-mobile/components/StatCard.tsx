import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useColors } from "@/hooks/useColors";

interface StatCardProps {
  label: string;
  value: string | number;
  subLabel?: string;
  color?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  onPress?: () => void;
}

export function StatCard({ label, value, subLabel, color, trend, trendValue, onPress }: StatCardProps) {
  const colors = useColors();

  const accentColor = color || colors.primary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && onPress ? { opacity: 0.85 } : undefined,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: accentColor + "22", borderColor: accentColor + "44" }]}>
        <View style={[styles.dotInner, { backgroundColor: accentColor }]} />
      </View>
      <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      {subLabel ? (
        <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>{subLabel}</Text>
      ) : null}
      {trend && trendValue ? (
        <View
          style={[
            styles.trend,
            {
              backgroundColor:
                trend === "up"
                  ? "rgba(16,185,129,0.1)"
                  : trend === "down"
                  ? "rgba(239,68,68,0.1)"
                  : "rgba(148,163,184,0.1)",
              borderColor:
                trend === "up"
                  ? "rgba(16,185,129,0.2)"
                  : trend === "down"
                  ? "rgba(239,68,68,0.2)"
                  : "rgba(148,163,184,0.2)",
            },
          ]}
        >
          <Text
            style={[
              styles.trendText,
              {
                color:
                  trend === "up" ? "#10b981" : trend === "down" ? "#ef4444" : colors.mutedForeground,
              },
            ]}
          >
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 4,
    minHeight: 110,
    justifyContent: "flex-end",
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  value: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    opacity: 0.6,
  },
  subLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  trend: {
    marginTop: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  trendText: {
    fontSize: 9,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
});
