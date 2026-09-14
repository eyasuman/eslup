import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { getAppointmentsForClient, subscribeToClientBookings, updateAppointmentStatus, unsubscribeChannel } from "@/lib/supabase";
import { useColors } from "@/hooks/useColors";

export default function AppointmentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, bookings: localBookings } = useApp();

  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "confirmed" | "completed" | "cancelled">("all");
  const [ratingApptId, setRatingApptId]   = useState<string | null>(null);
  const [ratingStars, setRatingStars]     = useState(0);
  const [ratingComment, setRatingComment] = useState("");

  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const isDark = colors.isDark;
  const bg = isDark ? "#202937" : "#FFFFFF";
  const textPrimary = isDark ? "#FFFFFF" : "#202937";
  const textMuted = isDark ? "#94A3B8" : "#64748B";
  const cardBg = isDark ? "rgba(255,255,255,0.08)" : "#F8FAFC";
  const cardBorder = isDark ? "rgba(255,255,255,0.12)" : "#E2E8F0";

  const fetchAppointments = async () => {
    if (!user?.id) return;
    setFetchError(null);
    try {
      const data = await getAppointmentsForClient(user.id);
      setAppointments(data);
    } catch (err: any) {
      setFetchError(err?.message ?? "Could not load appointments. Check your connection and try again.");
    }
  };

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchAppointments().finally(() => setLoading(false));

    const channel = subscribeToClientBookings(user.id, (appt, eventType) => {
      if (eventType === "INSERT") {
        setAppointments((prev) => [appt, ...prev]);
      } else if (eventType === "UPDATE") {
        setAppointments((prev) => prev.map((a) => (a.id === appt.id ? { ...a, ...appt } : a)));
      } else if (eventType === "DELETE") {
        setAppointments((prev) => prev.filter((a) => a.id !== appt.id));
      }
    });

    return () => { unsubscribeChannel(channel); };
  }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAppointments();
    setRefreshing(false);
  };

  const handleCancel = (apptId: string, doctorName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // optimistic update
    setAppointments((prev) =>
      prev.map((a) => (a.id === apptId ? { ...a, status: "cancelled" } : a))
    );
    updateAppointmentStatus(apptId, "cancelled").catch(() => {
      // revert on failure
      setAppointments((prev) =>
        prev.map((a) => (a.id === apptId ? { ...a, status: "pending" } : a))
      );
    });
  };

  const filteredAppts = appointments.filter((a) => {
    if (filterStatus === "all") return true;
    const s = a.status ?? "pending";
    if (filterStatus === "confirmed") return s === "confirmed" || s === "accepted" || s === "scheduled";
    return s === filterStatus;
  });

  const statusColor = (status: string) => {
    if (status === "accepted" || status === "confirmed" || status === "scheduled") return "#059669";
    if (status === "completed") return "#315d93";
    if (status === "pending") return "#D97706";
    if (status === "cancelled" || status === "declined") return "#DC2626";
    return "#64748B";
  };

  const statusLabel = (status: string) => {
    if (status === "scheduled" || status === "accepted" || status === "confirmed") return "Confirmed";
    if (status === "completed") return "Completed";
    if (status === "pending") return "Pending";
    if (status === "declined") return "Declined";
    if (status === "cancelled") return "Cancelled";
    return status;
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: "#202937" }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>My Appointments</Text>
        <Pressable
          onPress={() => router.push("/booking")}
          style={styles.newBtn}
        >
          <Feather name="plus" size={18} color="#fff" />
        </Pressable>
      </View>

      {/* Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {(["all", "pending", "confirmed", "completed", "cancelled"] as const).map((f) => {
          const active = filterStatus === f;
          const count = f === "all"
            ? appointments.length
            : appointments.filter((a) => {
                const s = a.status ?? "pending";
                if (f === "confirmed") return s === "confirmed" || s === "accepted" || s === "scheduled";
                return s === f;
              }).length;
          return (
            <Pressable
              key={f}
              onPress={() => setFilterStatus(f)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? "#315d93" : (isDark ? "rgba(255,255,255,0.08)" : "#F4F7FB"),
                  borderColor: active ? "#315d93" : cardBorder,
                },
              ]}
            >
              <Text style={[styles.filterText, { color: active ? "#fff" : textMuted }]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
              {count > 0 && (
                <View style={[styles.countBadge, { backgroundColor: active ? "rgba(255,255,255,0.25)" : "#315d93" + "20" }]}>
                  <Text style={[styles.countText, { color: active ? "#fff" : "#315d93" }]}>{count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Rating modal ── */}
      {ratingApptId && (
        <View style={styles.ratingOverlay}>
          <View style={[styles.ratingModal, { backgroundColor: isDark ? "#202937" : "#fff", borderColor: isDark ? "rgba(255,255,255,0.12)" : "#E2E8F0" }]}>
            <Text style={[styles.ratingTitle, { color: textPrimary }]}>Rate Your Appointment</Text>
            <View style={styles.starsRow}>
              {[1,2,3,4,5].map((s) => (
                <Pressable key={s} onPress={() => setRatingStars(s)} hitSlop={8}>
                  <Feather name="star" size={32} color={s <= ratingStars ? "#D97706" : (isDark ? "rgba(255,255,255,0.2)" : "#E2E8F0")} />
                </Pressable>
              ))}
            </View>
            <TextInput
              style={[styles.ratingInput, { color: textPrimary, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F4F7FB", borderColor: isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0" }]}
              placeholder="Write a comment (optional)"
              placeholderTextColor={textMuted}
              value={ratingComment}
              onChangeText={setRatingComment}
              multiline
            />
            <View style={styles.ratingBtns}>
              <Pressable onPress={() => { setRatingApptId(null); setRatingStars(0); setRatingComment(""); }} style={[styles.ratingBtn, { borderColor: isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0" }]}>
                <Text style={[styles.ratingBtnText, { color: textMuted }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (ratingStars === 0) { Alert.alert("Select stars", "Please tap a star to rate."); return; }
                  Alert.alert("Thank you!", `Your ${ratingStars}-star review has been submitted.`);
                  setRatingApptId(null); setRatingStars(0); setRatingComment("");
                }}
                style={[styles.ratingBtn, { backgroundColor: "#315d93", borderColor: "#315d93" }]}
              >
                <Text style={[styles.ratingBtnText, { color: "#fff" }]}>Submit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: bottomPad + 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#315d93" />}
      >
        {/* Guest mode — show locally-stored bookings */}
        {!user ? (
          localBookings.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="calendar" size={44} color="#315d93" />
              <Text style={[styles.emptyTitle, { color: textPrimary }]}>No Appointments Yet</Text>
              <Text style={[styles.emptyText, { color: textMuted }]}>
                Book a consultation — no sign-in required.
              </Text>
              <Pressable onPress={() => router.push("/(tabs)/healthcare")} style={[styles.findBtn, { backgroundColor: "#315d93" }]}>
                <Text style={styles.findBtnText}>Find Providers</Text>
              </Pressable>
              <Pressable onPress={() => router.push("/(tabs)/you")} style={[styles.findBtn, { backgroundColor: "transparent", borderWidth: 1, borderColor: "#315d93" }]}>
                <Text style={[styles.findBtnText, { color: "#315d93" }]}>Sign In to Sync</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={[styles.guestBanner, { backgroundColor: "#315d93" + "15", borderColor: "#315d93" + "30" }]}>
                <Feather name="info" size={14} color="#315d93" />
                <Text style={[styles.guestBannerText, { color: "#315d93" }]}>
                  Sign in to sync & access all your appointments.
                </Text>
                <Pressable onPress={() => router.push("/(tabs)/you")}>
                  <Text style={styles.guestBannerLink}>Sign In</Text>
                </Pressable>
              </View>
              {localBookings.map((b) => {
                const sColor = b.status === "confirmed" ? "#059669" : b.status === "pending" ? "#D97706" : b.status === "cancelled" ? "#DC2626" : "#315d93";
                return (
                  <View key={b.id} style={[styles.apptCard, { backgroundColor: cardBg, borderColor: cardBorder, borderLeftWidth: 3, borderLeftColor: sColor }]}>
                    <View style={styles.apptRow}>
                      <View style={[styles.apptIcon, { backgroundColor: "#315d93" + "15" }]}>
                        <Feather name="calendar" size={20} color="#315d93" />
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={[styles.apptDoctor, { color: textPrimary }]}>{b.providerName}</Text>
                        <Text style={[styles.apptSpecialty, { color: "#315d93" }]}>{b.specialty}</Text>
                        <Text style={[styles.apptDate, { color: textMuted }]}>{b.date} · {b.time}</Text>
                        <Text style={[styles.apptAmount, { color: "#059669" }]}>ETB {b.amount}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: sColor + "18" }]}>
                        <Text style={[styles.statusText, { color: sColor }]}>{b.status}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </>
          )
        ) : loading ? (
          <View style={styles.emptyState}>
            <Feather name="loader" size={36} color="#315d93" />
            <Text style={[styles.emptyText, { color: textMuted, marginTop: 8 }]}>Loading…</Text>
          </View>
        ) : fetchError ? (
          <View style={styles.emptyState}>
            <Feather name="alert-circle" size={44} color="#DC2626" />
            <Text style={[styles.emptyTitle, { color: textPrimary }]}>Could Not Load</Text>
            <Text style={[styles.emptyText, { color: textMuted }]}>{fetchError}</Text>
            <Pressable
              onPress={() => { setLoading(true); fetchAppointments().finally(() => setLoading(false)); }}
              style={[styles.findBtn, { backgroundColor: "#315d93" }]}
            >
              <Text style={styles.findBtnText}>Try Again</Text>
            </Pressable>
          </View>
        ) : filteredAppts.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="calendar" size={44} color="#315d93" />
            <Text style={[styles.emptyTitle, { color: textPrimary }]}>
              {filterStatus === "all" ? "No Appointments" : `No ${filterStatus} appointments`}
            </Text>
            <Text style={[styles.emptyText, { color: textMuted }]}>
              {filterStatus === "all"
                ? "Book your first consultation from the Healthcare tab."
                : "Try a different filter."}
            </Text>
            {filterStatus === "all" && (
              <Pressable
                onPress={() => router.push("/(tabs)/healthcare")}
                style={[styles.findBtn, { backgroundColor: "#315d93" }]}
              >
                <Text style={styles.findBtnText}>Find Providers</Text>
              </Pressable>
            )}
          </View>
        ) : (
          filteredAppts.map((a) => {
            const rawStatus = a.status ?? "pending";
            const sColor = statusColor(rawStatus);
            const sLabel = statusLabel(rawStatus);
            const providerName = a.doctorName ?? a.providerName ?? "Provider";
            const specialty = a.specialty ?? "";
            const rawDate = a.date;
            let dateStr = "";
            let timeStr = "";
            if (rawDate) {
              try {
                const d = new Date(rawDate);
                dateStr = d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
                timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              } catch {
                dateStr = String(rawDate);
              }
            }
            const amount = a.totalPrice ?? a.consultationFee ?? a.amount ?? 0;
            const serviceType = a.serviceType ?? a.consultationType ?? "";
            const canCancel = rawStatus === "pending";

            return (
              <View
                key={a.id}
                style={[
                  styles.apptCard,
                  { backgroundColor: cardBg, borderColor: cardBorder, borderLeftWidth: 3, borderLeftColor: sColor },
                ]}
              >
                <View style={styles.apptRow}>
                  <View style={[styles.apptIcon, { backgroundColor: "#315d93" + "15" }]}>
                    <Feather name="calendar" size={20} color="#315d93" />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={[styles.apptDoctor, { color: textPrimary }]}>{providerName}</Text>
                    {specialty ? <Text style={[styles.apptSpecialty, { color: "#315d93" }]}>{specialty}</Text> : null}
                    {serviceType ? <Text style={[styles.apptService, { color: textMuted }]}>{serviceType}</Text> : null}
                    {dateStr ? (
                      <Text style={[styles.apptDate, { color: textMuted }]}>
                        {dateStr}{timeStr ? ` · ${timeStr}` : ""}
                      </Text>
                    ) : null}
                    <Text style={[styles.apptAmount, { color: "#059669" }]}>
                      ETB {Number(amount).toLocaleString()}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sColor + "18" }]}>
                    <Text style={[styles.statusText, { color: sColor }]}>{sLabel}</Text>
                  </View>
                </View>

                {(() => {
                  const isVideo = serviceType === "video" || serviceType === "Video Consultation";
                  const isConfirmed = rawStatus === "scheduled" || rawStatus === "accepted" || rawStatus === "confirmed";
                  const isCompleted = rawStatus === "completed";
                  const showVideoJoin = isVideo && isConfirmed;
                  const showActions = canCancel || rawStatus === "cancelled" || rawStatus === "declined" || showVideoJoin || isCompleted;
                  if (!showActions) return null;
                  return (
                    <View style={[styles.apptActions, { borderTopColor: cardBorder }]}>
                      {isCompleted && (
                        <Pressable
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            if (!user) {
                              Alert.alert(
                                "Sign in to rate",
                                "Please sign in to leave a rating and review.",
                                [
                                  { text: "Cancel", style: "cancel" },
                                  { text: "Sign In", onPress: () => router.push("/(tabs)/you") },
                                ]
                              );
                              return;
                            }
                            setRatingApptId(a.id);
                          }}
                          style={[styles.actionBtn, { backgroundColor: "#D97706" + "15", borderColor: "#D97706", flex: 1 }]}
                        >
                          <Feather name="star" size={13} color="#D97706" />
                          <Text style={[styles.actionBtnText, { color: "#D97706" }]}>Rate & Review</Text>
                        </Pressable>
                      )}
                      {showVideoJoin && (
                        <Pressable
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            router.push({
                              pathname: "/video-consultation",
                              params: {
                                appointmentId: a.id,
                                doctorId: a.doctorUserId ?? "",
                                doctorName: providerName,
                                specialty,
                                isDoctor: "false",
                              },
                            });
                          }}
                          style={[styles.actionBtn, { backgroundColor: "#315d93", borderColor: "#315d93", flex: 1 }]}
                        >
                          <Feather name="video" size={13} color="#fff" />
                          <Text style={[styles.actionBtnText, { color: "#fff" }]}>Join Video Call</Text>
                        </Pressable>
                      )}
                      {rawStatus === "cancelled" || rawStatus === "declined" ? (
                        <Pressable
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            router.push({
                              pathname: "/booking",
                              params: { doctorId: a.doctorUserId, doctorName: providerName, specialty },
                            });
                          }}
                          style={[styles.actionBtn, { backgroundColor: "#315d93" + "15", borderColor: "#315d93" }]}
                        >
                          <Feather name="refresh-cw" size={13} color="#315d93" />
                          <Text style={[styles.actionBtnText, { color: "#315d93" }]}>Book Again</Text>
                        </Pressable>
                      ) : canCancel ? (
                        <Pressable
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            handleCancel(a.id, providerName);
                          }}
                          style={[styles.actionBtn, { backgroundColor: "#DC2626" + "10", borderColor: "#DC2626" }]}
                        >
                          <Feather name="x" size={13} color="#DC2626" />
                          <Text style={[styles.actionBtnText, { color: "#DC2626" }]}>Cancel</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })()}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 14,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold", flex: 1, textAlign: "center" },
  newBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 18 },
  filterRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 12, alignItems: "center" },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  countBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 },
  countText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  emptyState: { alignItems: "center", gap: 12, paddingTop: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  findBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, marginTop: 4 },
  findBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  apptCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  apptRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14 },
  apptIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  apptDoctor: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  apptSpecialty: { fontSize: 12, fontFamily: "Inter_500Medium" },
  apptService: { fontSize: 11, fontFamily: "Inter_400Regular" },
  apptDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  apptAmount: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start" },
  statusText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  apptActions: { flexDirection: "row", gap: 10, paddingHorizontal: 14, paddingBottom: 12, borderTopWidth: 0.5 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  actionBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  // Guest banner
  guestBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  guestBannerText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
  guestBannerLink: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#315d93" },
  // Rating modal
  ratingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 24 },
  ratingModal: { width: "100%", borderRadius: 20, borderWidth: 1, padding: 24, gap: 16 },
  ratingTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  starsRow: { flexDirection: "row", justifyContent: "center", gap: 12 },
  ratingInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 72, textAlignVertical: "top" },
  ratingBtns: { flexDirection: "row", gap: 10 },
  ratingBtn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  ratingBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
