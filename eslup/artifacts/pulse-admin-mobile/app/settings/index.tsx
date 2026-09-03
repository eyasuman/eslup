import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, TextInput, Alert, Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings, updateSettings } = useData();
  const { signOut } = useAuth();

  const [fee, setFee] = useState(String(settings.platformFee));
  const [noticePeriod, setNoticePeriod] = useState(String(settings.cancellationNoticePeriodHours));
  const [penalty, setPenalty] = useState(String(settings.cancellationPenaltyFee));
  const [cadence, setCadence] = useState(settings.reminderCadence);
  const [paymentAccountNumber, setPaymentAccountNumber] = useState(settings.paymentAccountNumber ?? "");
  const [paymentMethod, setPaymentMethod] = useState(settings.paymentMethod ?? "Bank Transfer");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [newRegEnabled, setNewRegEnabled] = useState(true);
  const [reviewsEnabled, setReviewsEnabled] = useState(true);
  const [saving, setSaving] = useState(false);


  const topPt = Platform.OS === "web" ? 67 + 16 : insets.top + 16;

  const handleSave = async () => {
    const feeNum = parseFloat(fee);
    const noticeNum = parseInt(noticePeriod);
    const penaltyNum = parseFloat(penalty);
    if (isNaN(feeNum) || feeNum < 0 || feeNum > 100) {
      Alert.alert("Invalid Fee", "Platform fee must be 0–100%."); return;
    }
    setSaving(true);
    await updateSettings({
      platformFee: feeNum,
      cancellationNoticePeriodHours: noticeNum,
      cancellationPenaltyFee: penaltyNum,
      reminderCadence: cadence,
      paymentAccountNumber: paymentAccountNumber.trim(),
      paymentMethod,
    });
    setSaving(false);
    Alert.alert("Saved", "Platform settings updated successfully.");
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPt, paddingBottom: insets.bottom + (Platform.OS === "web" ? 24 : 30) }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.titleRow}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="arrow-left" size={16} color={colors.foreground} />
        </Pressable>
        <View style={styles.titleGroup}>
          <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>ADMIN</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
        </View>
        <Pressable onPress={handleSave} disabled={saving} style={[styles.saveBtn, { backgroundColor: saving ? colors.muted : colors.primary }]}>
          <Feather name="check" size={14} color="#fff" />
          <Text style={styles.saveText}>{saving ? "Saving..." : "Save"}</Text>
        </Pressable>
      </View>

      <SectionCard title="Revenue & Fees" icon="dollar-sign" colors={colors}>
        <FieldRow label="Platform Fee (%)" description="Applied to all completed consultations" colors={colors}>
          <View style={[styles.inputBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              value={fee}
              onChangeText={setFee}
              keyboardType="decimal-pad"
              placeholder="10"
              placeholderTextColor={colors.mutedForeground}
            />
            <Text style={[styles.inputUnit, { color: colors.mutedForeground }]}>%</Text>
          </View>
        </FieldRow>
      </SectionCard>

      <SectionCard title="Cancellation Policy" icon="x-circle" colors={colors}>
        <FieldRow label="Notice Period (hours)" description="Minimum notice required before cancellation" colors={colors}>
          <View style={[styles.inputBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              value={noticePeriod}
              onChangeText={setNoticePeriod}
              keyboardType="number-pad"
              placeholder="24"
              placeholderTextColor={colors.mutedForeground}
            />
            <Text style={[styles.inputUnit, { color: colors.mutedForeground }]}>hrs</Text>
          </View>
        </FieldRow>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <FieldRow label="Penalty Fee (AED)" description="Charged if cancelled inside notice window" colors={colors}>
          <View style={[styles.inputBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              value={penalty}
              onChangeText={setPenalty}
              keyboardType="decimal-pad"
              placeholder="50"
              placeholderTextColor={colors.mutedForeground}
            />
            <Text style={[styles.inputUnit, { color: colors.mutedForeground }]}>AED</Text>
          </View>
        </FieldRow>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.fieldRow}>
          <View style={styles.fieldInfo}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Reminder Cadence</Text>
            <Text style={[styles.fieldDesc, { color: colors.mutedForeground }]}>How often to remind patients of upcoming appointments</Text>
          </View>
        </View>
        <View style={styles.cadenceRow}>
          {(["weekly", "daily", "same-day"] as const).map((c) => (
            <Pressable
              key={c}
              onPress={() => setCadence(c)}
              style={[styles.cadenceChip, { backgroundColor: cadence === c ? colors.primary : colors.background, borderColor: cadence === c ? colors.primary : colors.border }]}
            >
              <Text style={[styles.cadenceText, { color: cadence === c ? "#fff" : colors.mutedForeground }]}>{c}</Text>
            </Pressable>
          ))}
        </View>
      </SectionCard>

      <SectionCard title="Payment Details" icon="credit-card" colors={colors}>
        <FieldRow label="Payment Account Number" description="Account number clients use to pay" colors={colors}>
          <View style={[styles.inputBox, { backgroundColor: colors.background, borderColor: colors.border, flex: 1 }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground, textAlign: "left" }]}
              value={paymentAccountNumber}
              onChangeText={setPaymentAccountNumber}
              placeholder="e.g. AE07 0123 4567 8901 2345 678"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
            />
          </View>
        </FieldRow>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={[styles.fieldRow, { paddingBottom: 4 }]}>
          <View style={styles.fieldInfo}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Payment Method</Text>
            <Text style={[styles.fieldDesc, { color: colors.mutedForeground }]}>How clients should pay</Text>
          </View>
        </View>
        <View style={styles.paymentMethodRow}>
          {(["Bank Transfer", "Card", "Cash", "Apple Pay", "Google Pay"] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setPaymentMethod(m)}
              style={[
                styles.paymentMethodChip,
                { backgroundColor: paymentMethod === m ? colors.primary : colors.background, borderColor: paymentMethod === m ? colors.primary : colors.border },
              ]}
            >
              <Text style={[styles.paymentMethodText, { color: paymentMethod === m ? "#fff" : colors.mutedForeground }]}>{m}</Text>
            </Pressable>
          ))}
        </View>
      </SectionCard>

      <Pressable testID="admin-sign-out" onPress={() => void signOut()} style={[styles.signOutButton, { borderColor: colors.border }]}>
        <Feather name="log-out" size={15} color={colors.destructive} />
        <Text style={[styles.signOutLabel, { color: colors.destructive }]}>Sign out of admin console</Text>
      </Pressable>

      <SectionCard title="Platform Controls" icon="sliders" colors={colors}>
        <ToggleRow label="Maintenance Mode" description="Temporarily disable patient access to the platform" value={maintenanceMode} onToggle={() => { Alert.alert("Maintenance Mode", `${maintenanceMode ? "Disable" : "Enable"} maintenance mode?`, [{ text: "Cancel", style: "cancel" }, { text: "Confirm", onPress: () => setMaintenanceMode(!maintenanceMode) }]); }} colors={colors} danger={maintenanceMode} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <ToggleRow label="New Provider Registrations" description="Allow new healthcare providers to register" value={newRegEnabled} onToggle={() => setNewRegEnabled(!newRegEnabled)} colors={colors} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <ToggleRow label="Patient Reviews" description="Allow patients to submit reviews for providers" value={reviewsEnabled} onToggle={() => setReviewsEnabled(!reviewsEnabled)} colors={colors} />
      </SectionCard>

      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.infoTitle, { color: colors.foreground }]}>System Information</Text>
        {[
          { label: "App Version", value: "1.0.0" },
          { label: "Environment", value: "Production" },
          { label: "Data Region", value: "UAE (AE-DU)" },
          { label: "Database", value: "PostgreSQL" },
          { label: "API", value: "REST / Express 5" },
        ].map((item, i, arr) => (
          <View key={item.label} style={[styles.infoRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>{item.value}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function SectionCard({ title, icon, colors, children }: any) {
  return (
    <View style={[sectionStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={sectionStyles.header}>
        <Feather name={icon} size={14} color={colors.mutedForeground} />
        <Text style={[sectionStyles.title, { color: colors.foreground }]}>{title}</Text>
      </View>
      <View style={[sectionStyles.divider, { backgroundColor: colors.border }]} />
      {children}
    </View>
  );
}

function FieldRow({ label, description, colors, children }: any) {
  return (
    <View style={styles.fieldRow}>
      <View style={styles.fieldInfo}>
        <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.fieldDesc, { color: colors.mutedForeground }]}>{description}</Text>
      </View>
      {children}
    </View>
  );
}

function ToggleRow({ label, description, value, onToggle, colors, danger }: any) {
  return (
    <View style={styles.fieldRow}>
      <View style={styles.fieldInfo}>
        <Text style={[styles.fieldLabel, { color: danger ? "#ef4444" : colors.foreground }]}>{label}</Text>
        <Text style={[styles.fieldDesc, { color: colors.mutedForeground }]}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: danger ? "#ef444488" : colors.primary + "88" }}
        thumbColor={value ? (danger ? "#ef4444" : colors.primary) : colors.mutedForeground}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14 },
  title: { fontSize: 13, fontWeight: "600" },
  divider: { height: 1 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  titleGroup: { flex: 1 },
  eyebrow: { fontSize: 9, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" },
  title: { fontSize: 24, fontWeight: "700", letterSpacing: -0.5 },
  saveBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  saveText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  divider: { height: 1, marginVertical: 4 },
  fieldRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, gap: 12 },
  fieldInfo: { flex: 1 },
  fieldLabel: { fontSize: 13, fontWeight: "500" },
  fieldDesc: { fontSize: 11, marginTop: 2, lineHeight: 16 },
  inputBox: { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, minWidth: 80 },
  input: { fontSize: 15, fontWeight: "700", flex: 1, padding: 0, textAlign: "right" },
  inputUnit: { fontSize: 11, marginLeft: 4 },
  cadenceRow: { flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingBottom: 14 },
  cadenceChip: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  cadenceText: { fontSize: 11, fontWeight: "600" },
  signOutButton: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  signOutLabel: { fontSize: 13, fontWeight: "700" },
  paymentMethodRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 14, paddingBottom: 14 },
  paymentMethodChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  paymentMethodText: { fontSize: 11, fontWeight: "600" },
  infoCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  infoTitle: { fontSize: 13, fontWeight: "600", padding: 14, paddingBottom: 10 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 11 },
  infoLabel: { fontSize: 12 },
  infoValue: { fontSize: 12, fontWeight: "500" },
});
