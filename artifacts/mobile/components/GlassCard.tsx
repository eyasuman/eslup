import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { useColors } from "@/hooks/useColors";

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: "low" | "medium" | "high";
}

export function GlassCard({ children, style, intensity = "medium" }: GlassCardProps) {
  const colors = useColors();

  const bgOpacity = intensity === "low" ? 0.6 : intensity === "medium" ? 0.75 : 0.9;
  const borderOpacity = intensity === "low" ? 0.1 : intensity === "medium" ? 0.15 : 0.25;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: `rgba(30, 41, 59, ${bgOpacity})`,
          borderColor: `rgba(55, 101, 175, ${borderOpacity})`,
          borderRadius: colors.radius,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
});
