import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { DoctorStatus, AppointmentStatus } from "@/context/DataContext";

type BadgeStatus = DoctorStatus | AppointmentStatus;

interface StatusBadgeProps {
  status: BadgeStatus;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const getColors = (s: BadgeStatus) => {
    switch (s) {
      case "Active":
      case "completed":
        return { bg: "rgba(16,185,129,0.12)", text: "#10b981", border: "rgba(16,185,129,0.25)" };
      case "Pending":
      case "pending":
      case "scheduled":
        return { bg: "rgba(245,158,11,0.12)", text: "#f59e0b", border: "rgba(245,158,11,0.25)" };
      case "Disabled":
      case "cancelled":
        return { bg: "rgba(100,116,139,0.15)", text: "#94a3b8", border: "rgba(100,116,139,0.25)" };
      case "Declined":
      case "declined":
        return { bg: "rgba(239,68,68,0.12)", text: "#ef4444", border: "rgba(239,68,68,0.25)" };
      default:
        return { bg: "rgba(99,102,241,0.12)", text: "#6366f1", border: "rgba(99,102,241,0.25)" };
    }
  };

  const c = getColors(status);

  return (
    <View
      style={[
        styles.badge,
        size === "md" && styles.badgeMd,
        { backgroundColor: c.bg, borderColor: c.border },
      ]}
    >
      <Text style={[styles.text, size === "md" && styles.textMd, { color: c.text }]}>
        {status.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  badgeMd: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  text: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  textMd: {
    fontSize: 11,
    letterSpacing: 1,
  },
});
