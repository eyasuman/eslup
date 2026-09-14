import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UPDATED_EMERGENCY_CONTACTS } from "@/data/ethiopianHospitals";
import { useColors } from "@/hooks/useColors";
import { getEmergencyContacts, EmergencyContact } from "@/lib/supabase";

export default function UrgentCareScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const bg = colors.isDark ? colors.background : "#FFFFFF";
  const textPrimary = colors.isDark ? "#FFFFFF" : "#202937";
  const textMuted = colors.isDark ? "#94A3B8" : "#64748B";
  const cardBg = colors.isDark ? "rgba(255,255,255,0.06)" : "#FFF5F5";
  const borderCol = colors.isDark ? "rgba(255,255,255,0.1)" : "#FECACA";

  const [contacts, setContacts] = React.useState<EmergencyContact[]>(UPDATED_EMERGENCY_CONTACTS as EmergencyContact[]);

  React.useEffect(() => {
    getEmergencyContacts()
      .then((data) => { if (data.length > 0) setContacts(data); })
      .catch(() => { /* keep local fallback */ });
  }, []);

  const callNumber = (phone: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const cleaned = phone.replace(/\s/g, "");
    const url = `tel:${cleaned}`;
    if (Platform.OS === "web") {
      Alert.alert("Call Emergency", `Calling ${phone}...`);
      return;
    }
    Linking.canOpenURL(url).then((can) => {
      if (can) Linking.openURL(url);
      else Alert.alert("Cannot call", "Your device cannot make phone calls.");
    });
  };

  const priorityColor = (p: string) => p === "critical" ? "#DC2626" : p === "high" ? "#D97706" : "#315d93";

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Red emergency header */}
      <View style={[styles.header, { paddingTop: topPad + 10 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.pulseIcon}>
            <Feather name="alert-triangle" size={36} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Emergency Services</Text>
          <Text style={styles.headerSub}>Tap any number to call immediately</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: bottomPad + 40 }}
      >
        {/* Critical alert */}
        <Pressable
          onPress={() => callNumber("907")}
          style={[styles.criticalBanner, { backgroundColor: "#DC2626" }]}
        >
          <View style={styles.criticalLeft}>
            <Feather name="alert-circle" size={22} color="#fff" />
            <View>
              <Text style={styles.criticalTitle}>Life-Threatening Emergency?</Text>
              <Text style={styles.criticalSub}>Call 907 (Red Cross) immediately</Text>
            </View>
          </View>
          <View style={styles.callNowBtn}>
            <Feather name="phone-call" size={20} color="#DC2626" />
          </View>
        </Pressable>

        <Text style={[styles.sectionTitle, { color: textPrimary }]}>Emergency Contacts</Text>

        {contacts.map((contact) => (
          <View key={contact.id} style={[styles.contactCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={styles.contactHeader}>
              <View style={[styles.contactIcon, { backgroundColor: priorityColor(contact.priority) + "18" }]}>
                <Feather
                  name={contact.priority === "critical" ? "truck" : contact.priority === "high" ? "activity" : "phone"}
                  size={20}
                  color={priorityColor(contact.priority)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.contactName, { color: textPrimary }]}>{contact.name}</Text>
                <Text style={[styles.contactDesc, { color: textMuted }]}>{contact.description}</Text>
              </View>
            </View>
            {/* All phone numbers as individual call buttons */}
            <View style={styles.phonesRow}>
              {contact.phones.map((phone) => (
                <Pressable
                  key={phone}
                  onPress={() => callNumber(phone)}
                  style={({ pressed }) => [
                    styles.phoneBtn,
                    { backgroundColor: priorityColor(contact.priority), opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Feather name="phone" size={13} color="#fff" />
                  <Text style={styles.phoneBtnText}>{phone}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {/* Safety tips */}
        <View style={[styles.tipsCard, { backgroundColor: colors.isDark ? "rgba(255,255,255,0.04)" : "#F0FDF4", borderColor: colors.isDark ? "rgba(255,255,255,0.08)" : "#BBF7D0" }]}>
          <Text style={[styles.tipsTitle, { color: textPrimary }]}>While Waiting for Help</Text>
          {[
            "Keep the patient calm and still",
            "Apply pressure to any bleeding wounds",
            "Do not give food or water",
            "Stay on the line with the dispatcher",
            "Send someone to guide the ambulance to your location",
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <View style={[styles.tipBullet, { backgroundColor: "#059669" }]} />
              <Text style={[styles.tipText, { color: textMuted }]}>{tip}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.disclaimerBox, { backgroundColor: colors.isDark ? "rgba(255,255,255,0.04)" : "#FFF7ED", borderColor: "#FED7AA" }]}>
          <Feather name="info" size={14} color="#D97706" />
          <Text style={[styles.disclaimerText, { color: textMuted }]}>
            Once contact is established between you and the emergency service, PULSE holds no responsibility for the further communication or the outcome.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { backgroundColor: "#DC2626", paddingHorizontal: 20, paddingBottom: 28 },
  backBtn: { marginBottom: 16 },
  headerCenter: { alignItems: "center", gap: 10 },
  pulseIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#fff", fontSize: 24, fontFamily: "Inter_700Bold" },
  headerSub: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontFamily: "Inter_400Regular" },
  criticalBanner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderRadius: 15, padding: 16 },
  criticalLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  criticalTitle: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  criticalSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  callNowBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  contactCard: { borderRadius: 15, borderWidth: 1, padding: 14, gap: 12 },
  contactHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  contactIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  contactName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  contactDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  phonesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  phoneBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  phoneBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  tipsCard: { borderRadius: 15, borderWidth: 1, padding: 16, gap: 10 },
  tipsTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 4 },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  tipBullet: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  tipText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  disclaimerBox: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: "flex-start" },
  disclaimerText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 17 },
});
