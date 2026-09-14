import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function weeksAndDays(lmpDate: Date): { weeks: number; days: number; edd: Date } {
  const today = new Date();
  const diff = Math.floor((today.getTime() - lmpDate.getTime()) / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(diff / 7);
  const days = diff % 7;
  const edd = addDays(lmpDate, 280);
  return { weeks, days, edd };
}

const TRIMESTERS = [
  { label: "First Trimester", weeks: "Weeks 1–12", color: "#315d93", icon: "feather" },
  { label: "Second Trimester", weeks: "Weeks 13–26", color: "#059669", icon: "sun" },
  { label: "Third Trimester", weeks: "Weeks 27–40", color: "#D97706", icon: "star" },
];

const MILESTONES = [
  { week: 8, label: "First heartbeat detectable" },
  { week: 12, label: "End of first trimester" },
  { week: 16, label: "Gender may be visible on ultrasound" },
  { week: 20, label: "Anatomy scan / mid-pregnancy" },
  { week: 24, label: "Viability milestone" },
  { week: 28, label: "Third trimester begins" },
  { week: 36, label: "Baby considered early term" },
  { week: 40, label: "Estimated due date" },
];

export default function EddCalculatorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [lmpDay, setLmpDay] = useState("");
  const [lmpMonth, setLmpMonth] = useState("");
  const [lmpYear, setLmpYear] = useState("");
  const [result, setResult] = useState<{ weeks: number; days: number; edd: Date } | null>(null);
  const [error, setError] = useState("");

  const bg = colors.isDark ? colors.background : "#FFFFFF";
  const textPrimary = colors.isDark ? "#FFFFFF" : "#202937";
  const textMuted = colors.isDark ? "#94A3B8" : "#64748B";
  const cardBg = colors.isDark ? "rgba(255,255,255,0.06)" : "#F4F7FB";
  const borderCol = colors.isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0";
  const inputBg = colors.isDark ? "rgba(255,255,255,0.08)" : "#F4F7FB";

  const calculate = () => {
    setError("");
    const day = parseInt(lmpDay, 10);
    const month = parseInt(lmpMonth, 10);
    const year = parseInt(lmpYear, 10);

    if (!day || !month || !year || isNaN(day) || isNaN(month) || isNaN(year)) {
      setError("Please enter a valid date.");
      return;
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      setError("Invalid date values.");
      return;
    }
    const lmp = new Date(year, month - 1, day);
    const today = new Date();
    if (lmp > today) {
      setError("LMP date cannot be in the future.");
      return;
    }
    const diff = Math.floor((today.getTime() - lmp.getTime()) / (1000 * 60 * 60 * 24));
    if (diff > 300) {
      setError("The date entered seems too far in the past (> 10 months).");
      return;
    }
    setResult(weeksAndDays(lmp));
  };

  const getTrimester = (weeks: number) => {
    if (weeks <= 12) return 0;
    if (weeks <= 26) return 1;
    return 2;
  };

  const passedMilestones = result ? MILESTONES.filter((m) => result.weeks >= m.week) : [];
  const upcomingMilestones = result ? MILESTONES.filter((m) => result.weeks < m.week).slice(0, 3) : [];

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.header, { paddingTop: topPad + 10 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Feather name="heart" size={28} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>EDD Calculator</Text>
          <Text style={styles.headerSub}>Estimated Due Date & Pregnancy Tracker</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: bottomPad + 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Input Card */}
        <View style={[styles.inputCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <Text style={[styles.inputCardTitle, { color: textPrimary }]}>
            Last Menstrual Period (LMP)
          </Text>
          <Text style={[styles.inputCardSub, { color: textMuted }]}>
            Enter the first day of your last period
          </Text>

          <View style={styles.dateRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.dateLabel, { color: textMuted }]}>Day</Text>
              <TextInput
                style={[styles.dateInput, { backgroundColor: inputBg, borderColor: borderCol, color: textPrimary }]}
                placeholder="DD"
                placeholderTextColor={textMuted}
                keyboardType="number-pad"
                maxLength={2}
                value={lmpDay}
                onChangeText={setLmpDay}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.dateLabel, { color: textMuted }]}>Month</Text>
              <TextInput
                style={[styles.dateInput, { backgroundColor: inputBg, borderColor: borderCol, color: textPrimary }]}
                placeholder="MM"
                placeholderTextColor={textMuted}
                keyboardType="number-pad"
                maxLength={2}
                value={lmpMonth}
                onChangeText={setLmpMonth}
              />
            </View>
            <View style={{ flex: 2 }}>
              <Text style={[styles.dateLabel, { color: textMuted }]}>Year</Text>
              <TextInput
                style={[styles.dateInput, { backgroundColor: inputBg, borderColor: borderCol, color: textPrimary }]}
                placeholder="YYYY"
                placeholderTextColor={textMuted}
                keyboardType="number-pad"
                maxLength={4}
                value={lmpYear}
                onChangeText={setLmpYear}
              />
            </View>
          </View>

          {error ? (
            <View style={styles.errorRow}>
              <Feather name="alert-circle" size={14} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={calculate}
            style={({ pressed }) => [styles.calcBtn, { opacity: pressed ? 0.9 : 1 }]}
          >
            <Feather name="hash" size={18} color="#fff" />
            <Text style={styles.calcBtnText}>Calculate EDD</Text>
          </Pressable>
        </View>

        {/* Result */}
        {result && (
          <>
            {/* EDD Display */}
            <View style={[styles.eddCard, { backgroundColor: "#202937" }]}>
              <Text style={styles.eddLabel}>Estimated Due Date</Text>
              <Text style={styles.eddDate}>{formatDate(result.edd)}</Text>
              <View style={styles.eddWeeks}>
                <Text style={styles.eddWeeksText}>
                  {result.weeks < 0 || result.weeks > 40
                    ? "Overdue" : `${result.weeks} weeks, ${result.days} days pregnant`}
                </Text>
              </View>
            </View>

            {/* Trimester */}
            <View style={{ gap: 8 }}>
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>Trimesters</Text>
              <View style={styles.trimesterRow}>
                {TRIMESTERS.map((t, i) => {
                  const active = getTrimester(result.weeks) === i;
                  return (
                    <View
                      key={t.label}
                      style={[
                        styles.trimCard,
                        { backgroundColor: active ? t.color : cardBg, borderColor: active ? t.color : borderCol },
                      ]}
                    >
                      <Feather name={t.icon as any} size={16} color={active ? "#fff" : t.color} />
                      <Text style={[styles.trimLabel, { color: active ? "#fff" : textPrimary }]}>{t.label}</Text>
                      <Text style={[styles.trimWeeks, { color: active ? "rgba(255,255,255,0.7)" : textMuted }]}>{t.weeks}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Progress Bar */}
            <View style={[styles.progressCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <View style={styles.progressHeader}>
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>Pregnancy Progress</Text>
                <Text style={[styles.progressPct, { color: "#315d93" }]}>
                  {Math.min(100, Math.round((result.weeks / 40) * 100))}%
                </Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0" }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(100, (result.weeks / 40) * 100)}%`,
                      backgroundColor: "#315d93",
                    },
                  ]}
                />
              </View>
              <View style={styles.progressLabels}>
                <Text style={[styles.progressLabel, { color: textMuted }]}>Week 0</Text>
                <Text style={[styles.progressLabel, { color: textMuted }]}>Week 40</Text>
              </View>
            </View>

            {/* Upcoming Milestones */}
            {upcomingMilestones.length > 0 && (
              <View style={{ gap: 10 }}>
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>Upcoming Milestones</Text>
                {upcomingMilestones.map((m) => (
                  <View
                    key={m.week}
                    style={[styles.milestoneRow, { backgroundColor: cardBg, borderColor: borderCol }]}
                  >
                    <View style={[styles.milestoneBadge, { backgroundColor: "#315d93" }]}>
                      <Text style={styles.milestoneWeek}>W{m.week}</Text>
                    </View>
                    <Text style={[styles.milestoneLabel, { color: textPrimary }]}>{m.label}</Text>
                    <Text style={[styles.milestoneDiff, { color: textMuted }]}>
                      in {m.week - result.weeks}w
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Completed Milestones */}
            {passedMilestones.length > 0 && (
              <View style={{ gap: 10 }}>
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>Completed Milestones</Text>
                {passedMilestones.slice(-3).reverse().map((m) => (
                  <View
                    key={m.week}
                    style={[styles.milestoneRow, { backgroundColor: cardBg, borderColor: borderCol }]}
                  >
                    <View style={[styles.milestoneBadge, { backgroundColor: "#059669" }]}>
                      <Feather name="check" size={12} color="#fff" />
                    </View>
                    <Text style={[styles.milestoneLabel, { color: textPrimary }]}>{m.label}</Text>
                    <Text style={[styles.milestoneDiff, { color: "#059669" }]}>✓ Done</Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={[styles.disclaimer, { color: textMuted }]}>
              * This calculator uses Naegele's Rule (LMP + 280 days). Results are estimates only. Always consult your healthcare provider for medical advice.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    backgroundColor: "#315d93",
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  backBtn: { marginBottom: 16 },
  headerContent: { alignItems: "flex-start", gap: 10 },
  headerIcon: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { color: "#fff", fontSize: 26, fontFamily: "Inter_700Bold" },
  headerSub: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontFamily: "Inter_400Regular" },
  inputCard: { borderRadius: 15, borderWidth: 1, padding: 18, gap: 14 },
  inputCardTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  inputCardSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: -6 },
  dateRow: { flexDirection: "row", gap: 10 },
  dateLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 6 },
  dateInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  errorText: { color: "#DC2626", fontSize: 13, fontFamily: "Inter_400Regular" },
  calcBtn: { backgroundColor: "#202937", borderRadius: 12, padding: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  calcBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  eddCard: { borderRadius: 15, padding: 22, alignItems: "center", gap: 10 },
  eddLabel: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontFamily: "Inter_500Medium" },
  eddDate: { color: "#fff", fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center" },
  eddWeeks: { backgroundColor: "rgba(49,93,147,0.5)", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  eddWeeksText: { color: "#fff", fontSize: 14, fontFamily: "Inter_500Medium" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  trimesterRow: { flexDirection: "row", gap: 8 },
  trimCard: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 10, gap: 4, alignItems: "center" },
  trimLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  trimWeeks: { fontSize: 9, fontFamily: "Inter_400Regular", textAlign: "center" },
  progressCard: { borderRadius: 15, borderWidth: 1, padding: 16, gap: 10 },
  progressHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  progressPct: { fontSize: 20, fontFamily: "Inter_700Bold" },
  progressTrack: { height: 10, borderRadius: 5, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 5 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  milestoneRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  milestoneBadge: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  milestoneWeek: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  milestoneLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  milestoneDiff: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  disclaimer: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 18, fontStyle: "italic" },
});
