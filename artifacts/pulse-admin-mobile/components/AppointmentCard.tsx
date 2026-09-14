import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { Appointment } from "@/context/DataContext";
import { StatusBadge } from "./StatusBadge";

interface AppointmentCardProps {
  appointment: Appointment;
}

const SERVICE_ICONS: Record<string, any> = {
  "Video Consultation": "video",
  "Audio Consultation": "phone",
  "In-Person Visit": "user",
  "Home Visit": "home",
};

export function AppointmentCard({ appointment }: AppointmentCardProps) {
  const colors = useColors();

  const dateObj = new Date(appointment.date);
  const dateStr = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const timeStr = dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <StatusBadge status={appointment.status} />
          <Text style={[styles.id, { color: colors.mutedForeground }]}>
            #{appointment.id.split("_")[1]}
          </Text>
        </View>
        <Text style={[styles.price, { color: colors.foreground }]}>
          AED {appointment.totalPrice}
        </Text>
      </View>

      <View style={styles.parties}>
        <View style={styles.party}>
          <View style={[styles.partyDot, { backgroundColor: colors.primary }]} />
          <View>
            <Text style={[styles.partyRole, { color: colors.mutedForeground }]}>Provider</Text>
            <Text style={[styles.partyName, { color: colors.foreground }]}>
              {appointment.doctorName}
            </Text>
          </View>
        </View>
        <View style={[styles.connector, { backgroundColor: colors.border }]} />
        <View style={styles.party}>
          <View style={[styles.partyDot, { backgroundColor: "#10b981" }]} />
          <View>
            <Text style={[styles.partyRole, { color: colors.mutedForeground }]}>Patient</Text>
            <Text style={[styles.partyName, { color: colors.foreground }]}>
              {appointment.patientName}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <View style={styles.footerItem}>
          <Feather name={SERVICE_ICONS[appointment.serviceType] || "activity"} size={11} color={colors.mutedForeground} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            {appointment.serviceType}
          </Text>
        </View>
        <View style={styles.footerItem}>
          <Feather name="calendar" size={11} color={colors.mutedForeground} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            {dateStr} at {timeStr}
          </Text>
        </View>
        <View style={[styles.feeBreakdown, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Text style={[styles.feeText, { color: colors.mutedForeground }]}>
            Provider: AED {appointment.consultationFee} · Platform: AED {appointment.platformFee}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  id: {
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
  },
  parties: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  party: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  partyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  partyRole: {
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  partyName: {
    fontSize: 12,
    fontWeight: "600",
  },
  connector: {
    width: 1,
    height: 28,
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 6,
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  footerText: {
    fontSize: 11,
  },
  feeBreakdown: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 2,
  },
  feeText: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
});
