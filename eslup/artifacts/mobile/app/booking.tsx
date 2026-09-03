import { Feather } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp, Booking } from "@/context/AppContext";
import { createAppointment, createNotification, deleteUpload, getApprovedDoctors, getSetting, uploadPaymentProof } from "@/lib/supabase";
import { useColors } from "@/hooks/useColors";
import { formatEtDatePill } from "@/lib/ethiopianCalendar";

const TIME_SLOTS = {
  Morning: ["08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM"],
  Afternoon: ["12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM", "03:00 PM"],
  Evening: ["04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM", "06:00 PM"],
};

const DAYS_AHEAD = 14;

// Fallback payment accounts — overridden by per-provider data from Supabase
const FALLBACK_PAYMENT = {
  telebirr: { number: "0912 345 678", name: "PULSE Health-Tech PLC" },
  cbe: { number: "1000 456 789 00", name: "PULSE Health-Tech PLC" },
};

function getNextDates(n: number): Date[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
}

const KeyboardWrapper = Platform.OS === 'web' ? View : KeyboardAvoidingView;

/**
 * Validates Ethiopian phone numbers.
 * Accepted formats:
 *   - 10 digits starting with 09 or 07  (e.g. 0911234567)
 *   - +251 followed by 9 digits          (e.g. +251911234567)
 */
function isValidEthiopianPhone(phone: string): boolean {
  const p = phone.replace(/\s/g, "");
  // Local format: 09XXXXXXXX or 07XXXXXXXX
  if (/^0[79]\d{8}$/.test(p)) return true;
  // International format: +2519XXXXXXXX or +2517XXXXXXXX
  if (/^\+2519\d{8}$/.test(p) || /^\+2517\d{8}$/.test(p)) return true;
  return false;
}

const Container = ({ children, isDark }: { children: any; isDark: boolean }) => {
  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#202937' : '#FFFFFF' }}>
      {isDark && <LinearGradient colors={["#202937", "#315d93"]} style={StyleSheet.absoluteFillObject} />}
      {children}
    </View>
  );
};

export default function BookingScreen() {
  const { doctorId, doctorName, specialty } = useLocalSearchParams<{ doctorId: string; doctorName: string; specialty: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, addBooking, bookings, addNotification, language } = useApp();
  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [supabaseDoctor, setSupabaseDoctor] = useState<any>(null);

  // Fetch provider details from Supabase (for per-provider payment info)
  useEffect(() => {
    if (!doctorId) return;
    getApprovedDoctors().then((docs: any[]) => {
      const found = docs.find((d) => d.userId === doctorId);
      if (found) setSupabaseDoctor(found);
    }).catch(() => {});
  }, [doctorId]);

  // Adapter: map Supabase doctor → shape that booking UI expects
  const doctor = supabaseDoctor ? {
    name: supabaseDoctor.name ?? doctorName ?? "Provider",
    specialty: supabaseDoctor.specialty ?? "Healthcare Provider",
    hospital: supabaseDoctor.city ?? "Addis Ababa",
    price: (supabaseDoctor.consultationFee ?? 600) * 100,
    currency: "ETB",
    telebirrMerchant: supabaseDoctor.telebirrMerchant ?? supabaseDoctor.phone ?? null,
    cbeAccount: supabaseDoctor.cbeAccount ?? null,
  } : null;

  const [globalAccounts, setGlobalAccounts] = useState<any>(FALLBACK_PAYMENT);

  useEffect(() => {
    async function fetchGlobalAccounts() {
      const tbNum = await getSetting('global_telebirr_number');
      const tbName = await getSetting('global_telebirr_name');
      const cbeNum = await getSetting('global_cbe_number');
      const cbeName = await getSetting('global_cbe_name');
      
      setGlobalAccounts({
        telebirr: { 
          number: tbNum || FALLBACK_PAYMENT.telebirr.number, 
          name: tbName || FALLBACK_PAYMENT.telebirr.name 
        },
        cbe: { 
          number: cbeNum || FALLBACK_PAYMENT.cbe.number, 
          name: cbeName || FALLBACK_PAYMENT.cbe.name 
        }
      });
    }
    fetchGlobalAccounts();
  }, []);

  // Per-provider payment accounts (fall back to platform accounts if provider hasn't set their own)
  const paymentAccounts = {
    telebirr: {
      number: doctor?.telebirrMerchant ?? globalAccounts.telebirr.number,
      name: doctor ? doctor.name : globalAccounts.telebirr.name,
    },
    cbe: {
      number: doctor?.cbeAccount ?? globalAccounts.cbe.number,
      name: doctor ? doctor.name : globalAccounts.cbe.name,
    },
  };

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<keyof typeof TIME_SLOTS>("Morning");
  const [consultType, setConsultType] = useState<"video" | "phone" | "homecare">("video");
  const [paymentMethod, setPaymentMethod] = useState<"telebirr" | "cbe">("telebirr");
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [proofImage, setProofImage] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [senderName, setSenderName] = useState(user?.name ?? "");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);

  const isDark = colors.isDark;
  const bg = isDark ? "transparent" : "#FFFFFF";
  const textPrimary = isDark ? "#FFFFFF" : "#202937";
  const textMuted = isDark ? "#D1D5DB" : "#4B5563";
  const cardBg = isDark ? "rgba(255,255,255,0.08)" : "#F8FAFC";
  const borderCol = isDark ? "rgba(255,255,255,0.15)" : "#E2E8F0";
  const inputBg = isDark ? "rgba(255,255,255,0.08)" : "#F4F7FB";
  const dates = getNextDates(DAYS_AHEAD);
  const amount = doctor?.price ?? (supabaseDoctor?.consultationFee ? supabaseDoctor.consultationFee * 100 : 60000);
  const amountFormatted = (amount / 100).toFixed(0);
  const currency = "ETB";

  const copyToClipboard = async (text: string, label: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
    } catch {}
    Alert.alert("Copied!", `${label} copied to clipboard.`);
  };

  const pickProofImage = async (source: "camera" | "gallery") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      let result;
      if (source === "camera") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert("Permission needed", "Camera access required."); return; }
        result = await ImagePicker.launchCameraAsync({ quality: 0.9, allowsEditing: false });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert("Permission needed", "Gallery access required."); return; }
        result = await ImagePicker.launchImageLibraryAsync({ quality: 0.9, allowsMultipleSelection: false, mediaTypes: ImagePicker.MediaTypeOptions.Images });
      }
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setProofImage({
          uri: asset.uri,
          name: asset.fileName ?? "payment-proof.jpg",
          type: asset.mimeType ?? "image/jpeg",
        });
        if (!paidAmount) setPaidAmount(amountFormatted);
      }
    } catch {
      Alert.alert("Error", "Could not access media.");
    }
  };

  const handleSubmitPayment = async () => {
    if (!proofImage) { Alert.alert("Proof Required", "Please upload a screenshot or photo of your payment."); return; }
    if (!senderName.trim()) { Alert.alert("Missing Info", "Please enter the sender name."); return; }
    if (!user?.id) {
      Alert.alert("Sign In Required", "Please sign in before submitting payment. Payment proofs are stored privately under your account.");
      return;
    }
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const appointmentDate = new Date(selectedDate!);
    // Parse selectedTime like "09:00 AM" into the date
    try {
      const [timePart, ampm] = selectedTime!.split(" ");
      const [hours, minutes] = timePart.split(":").map(Number);
      let h = hours;
      if (ampm === "PM" && h !== 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      appointmentDate.setHours(h, minutes, 0, 0);
    } catch {}

    const effectiveName  = user?.name  ?? guestName.trim()  ?? "Guest";
    const effectiveEmail = user?.email ?? guestPhone.trim() ?? "";

    let proofUpload: Awaited<ReturnType<typeof uploadPaymentProof>> | null = null;
    const appointmentId = Crypto.randomUUID();
    try {
      proofUpload = await uploadPaymentProof(
        user.id,
        proofImage.uri,
        proofImage.name,
        proofImage.type,
        appointmentId
      );
    } catch (err: any) {
      Alert.alert("Upload Failed", err?.message ?? "Your payment proof could not be saved. Please try again.");
      setSubmitting(false);
      return;
    }

    const newBooking: Booking = {
      id: Date.now().toString(),
      providerId: doctorId ?? "unknown",
      providerName: doctorName ?? doctor?.name ?? "Unknown",
      specialty: specialty ?? doctor?.specialty ?? "General",
      serviceType: consultType === "homecare" ? "homecare" : consultType === "video" ? "online" : "onsite",
      status: "pending",
      date: selectedDate!.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
      time: selectedTime!,
      amount,
      currency,
    };

    // Persist only after the required private payment proof is safely stored.
    try {
      const appointment = await createAppointment({
        id: appointmentId,
        patientId: user.id,
        patientName: effectiveName,
        patientEmail: effectiveEmail,
          doctorUserId: doctorId ?? undefined,
          doctorName: doctorName ?? doctor?.name ?? "Unknown",
          specialty: specialty ?? doctor?.specialty ?? "General",
          date: appointmentDate.toISOString(),
          serviceType: consultType === "homecare" ? "homecare" : consultType === "video" ? "video" : "phone",
          consultationFee: parseFloat(amountFormatted),
          platformFee: 5,
          totalPrice: parseFloat(amountFormatted) + 5,
          paymentProofUrl: proofUpload.storagePath,
          paymentProofUploadId: proofUpload.id,
          paymentMethod: paymentMethod,
          transactionId: transactionId || "N/A",
          senderName: senderName,
          notes: (paymentMethod === "telebirr" ? "Telebirr" : "CBE") + " | Sender: " + senderName + (paymentNote ? " | Note: " + paymentNote : ""),
      });
      newBooking.id = appointment.id;
      await addBooking(newBooking);
    } catch (err: any) {
      await deleteUpload(proofUpload.id).catch(() => {});
      Alert.alert("Booking Failed", err?.message ?? "Your appointment could not be saved. No payment proof was retained.");
      setSubmitting(false);
      return;
    }

    // ── Local in-app notification (always, even for guests) ──────────────────
    const payLabel = paymentMethod === "telebirr" ? "Telebirr" : "CBE Bank";
    const dateLabel = newBooking.date;
    addNotification({
      id: Date.now().toString(),
      title: "📋 Payment Submitted",
      body: `Your ${payLabel} payment for ${newBooking.providerName} on ${dateLabel} at ${newBooking.time} has been received. Awaiting admin & doctor verification.`,
      read: false,
      createdAt: new Date().toISOString(),
      type: "booking",
    });

    // ── Persist notification to Supabase for signed-in patients ─────────────
    if (user?.id) {
      createNotification({
        user_id: user.id,
        title: "📋 Payment Submitted",
        body: `Your ${payLabel} payment for ${newBooking.providerName} on ${dateLabel} at ${newBooking.time} is pending admin & doctor verification.\nAmount: ${currency} ${amountFormatted}`,
        type: "booking",
      }).catch(() => {});

      // ── Notify the provider about the new booking ─────────────────────────
      if (doctorId) {
        createNotification({
          user_id: doctorId,
          title: "🔔 New Appointment Request",
          body: `${effectiveName} has booked an appointment on ${dateLabel} at ${newBooking.time} (${newBooking.specialty}). Payment via ${payLabel} is pending verification.`,
          type: "booking",
        }).catch(() => {});
      }
    }

    setBooking(newBooking);
    setSubmitting(false);
    setStep(4);
  };

  // ── APPOINTMENTS LIST VIEW (no doctorId) ─────────────────────────────────
  if (!doctorId) {
    return (
      <Container isDark={isDark}>
        <View style={[styles.header, { paddingTop: topPad + 10, borderBottomColor: borderCol }]}>
          <Pressable onPress={() => router.back()} style={styles.backRow}>
            <Feather name="arrow-left" size={22} color={textPrimary} />
            <Text style={[styles.headerTitle, { color: textPrimary }]}>My Appointments</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: bottomPad + 40 }}>
          {bookings.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="calendar" size={48} color={textMuted} />
              <Text style={[styles.emptyTitle, { color: textPrimary }]}>No Appointments Yet</Text>
              <Text style={[styles.emptyText, { color: textMuted }]}>Book your first consultation.</Text>
              <Pressable onPress={() => router.push("/(tabs)/healthcare")} style={styles.exploreBtn}>
                <Text style={styles.exploreBtnText}>Find Providers</Text>
              </Pressable>
            </View>
          ) : (
            bookings.map((b) => {
              const statusColor = b.status === "confirmed" ? "#059669" : b.status === "pending" ? "#D97706" : b.status === "cancelled" ? "#DC2626" : "#315d93";
              return (
                <View key={b.id} style={[styles.bookingCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                  <View style={[styles.bookingIcon, { backgroundColor: "#315d93" + "18" }]}>
                    <Feather name="calendar" size={20} color="#315d93" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bookingDoc, { color: textPrimary }]}>{b.providerName}</Text>
                    <Text style={[styles.bookingSpec, { color: "#315d93" }]}>{b.specialty}</Text>
                    <Text style={[styles.bookingDate, { color: textMuted }]}>{b.date} at {b.time}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + "18" }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {b.status === "pending" ? "Pending Verification" : b.status}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </Container>
    );
  }

  // ── STEP 4: SUCCESS SCREEN ─────────────────────────────────────────────────
  if (step === 4 && booking) {
    return (
      <Container isDark={isDark}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.successScreen, { paddingTop: topPad + 30, paddingBottom: bottomPad + 40 }]}
        >
          <View style={styles.successIconWrap}>
            <Feather name="check-circle" size={56} color="#059669" />
          </View>
          <Text style={[styles.successTitle, { color: textPrimary }]}>Payment Submitted Successfully</Text>
          <Text style={[styles.successMsg, { color: textMuted }]}>
            Your payment proof has been sent for verification.{"\n"}Your appointment is currently{" "}
            <Text style={{ color: "#D97706", fontFamily: "Inter_700Bold" }}>Pending Approval</Text>.
          </Text>
          <Text style={[styles.successNote, { color: textMuted }]}>
            You will be notified once admin confirms payment.
          </Text>

          {/* Summary card */}
          <View style={[styles.successSummary, { backgroundColor: cardBg, borderColor: borderCol }]}>
            {[
              { label: "Provider", value: booking.providerName },
              { label: "Date", value: booking.date },
              { label: "Time", value: booking.time },
              { label: "Method", value: paymentMethod === "telebirr" ? "Telebirr" : "CBE Bank" },
              { label: "Amount", value: `${currency} ${amountFormatted}` },
              { label: "Status", value: "Pending Verification" },
            ].map((row) => (
              <View key={row.label} style={[styles.summaryRow, { borderBottomColor: borderCol }]}>
                <Text style={[styles.summaryLabel, { color: textMuted }]}>{row.label}</Text>
                <Text style={[styles.summaryValue, { color: row.label === "Status" ? "#D97706" : textPrimary }]}>{row.value}</Text>
              </View>
            ))}
          </View>

          <View style={{ gap: 12, width: "100%" }}>
            <Pressable
              onPress={() => router.replace("/(tabs)")}
              style={({ pressed }) => [styles.successBtn, { backgroundColor: "#315d93", opacity: pressed ? 0.9 : 1 }]}
            >
              <Feather name="home" size={18} color="#fff" />
              <Text style={styles.successBtnText}>Back to Home</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/appointments")}
              style={({ pressed }) => [styles.successBtnOutline, { borderColor: borderCol, opacity: pressed ? 0.9 : 1 }]}
            >
              <Text style={[styles.successBtnOutlineText, { color: textMuted }]}>View My Appointments</Text>
            </Pressable>
          </View>
        </ScrollView>
      </Container>
    );
  }

  return (
    <Container isDark={isDark}>
      <KeyboardWrapper
        style={{ flex: 1 }}
        {...(Platform.OS !== "web" ? { behavior: Platform.OS === "ios" ? "padding" : "height", keyboardVerticalOffset: Platform.OS === "ios" ? 0 : 24 } : {})}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: topPad + 10, borderBottomColor: borderCol }]}>
          <Pressable onPress={() => step === 1 ? router.back() : setStep((s) => (s - 1) as 1 | 2 | 3)} style={styles.backRow}>
            <Feather name="arrow-left" size={22} color={textPrimary} />
            <Text style={[styles.headerTitle, { color: textPrimary }]}>Book Appointment</Text>
          </Pressable>
          <View style={styles.steps}>
            {[1, 2, 3].map((s) => (
              <View key={s} style={[styles.stepDot, { backgroundColor: step >= s ? "#315d93" : (isDark ? "rgba(255,255,255,0.15)" : "#E2E8F0") }]} />
            ))}
          </View>
          <Text style={[styles.stepLabel, { color: textMuted }]}>
            {step === 1 ? "Consultation Type" : step === 2 ? "Date & Time" : "Payment"}
          </Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: bottomPad + 110 }} keyboardShouldPersistTaps="handled">
          {/* Doctor summary */}
          {doctor && (
            <View style={[styles.docSummary, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <View style={[styles.docAvatar, { backgroundColor: "#315d93" + "18" }]}>
                <Feather name="user" size={28} color="#315d93" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.docName, { color: textPrimary }]}>{doctor.name}</Text>
                <Text style={[styles.docSpec, { color: "#315d93" }]}>{doctor.specialty}</Text>
                <Text style={[styles.docHosp, { color: textMuted }]}>{doctor.hospital}</Text>
              </View>
              <Text style={[styles.docFee, { color: "#059669" }]}>ETB {amountFormatted}</Text>
            </View>
          )}

          {/* ── STEP 1: Consultation Type ── */}
          {step === 1 && (
            <>
              <Text style={[styles.stepTitle, { color: textPrimary }]}>Select Consultation Type</Text>
              {(["video", "phone", "homecare"] as const).map((ct) => {
                const icons = { video: "video" as const, phone: "phone" as const, homecare: "home" as const };
                const labels = { video: "Video Consultation", phone: "Phone / Audio Call", homecare: "Home Care Visit" };
                const descs = { video: "Secure video call — any location", phone: "Voice consultation by phone", homecare: "Doctor visits you at home" };
                const active = consultType === ct;
                return (
                  <Pressable
                    key={ct}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setConsultType(ct); }}
                    style={[styles.optionRow, { backgroundColor: active ? "#202937" : cardBg, borderColor: active ? "#315d93" : borderCol }]}
                  >
                    <View style={[styles.optionIcon, { backgroundColor: active ? "rgba(49,93,147,0.4)" : "#315d93" + "15" }]}>
                      <Feather name={icons[ct]} size={20} color={active ? "#7FA8D8" : "#315d93"} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionLabel, { color: active ? "#fff" : textPrimary }]}>{labels[ct]}</Text>
                      <Text style={[styles.optionSub, { color: active ? "rgba(255,255,255,0.6)" : textMuted }]}>{descs[ct]}</Text>
                    </View>
                    {active && <Feather name="check-circle" size={18} color="#059669" />}
                  </Pressable>
                );
              })}

              {/* Guest info — shown only when not signed in */}
              {!user && (
                <View style={[styles.guestBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
                  <View style={styles.guestBoxHeader}>
                    <Feather name="user" size={15} color="#315d93" />
                    <Text style={[styles.guestBoxTitle, { color: textPrimary }]}>Your Details</Text>
                    <Text style={[styles.guestBoxSub, { color: "#315d93" }]}>Guest booking</Text>
                  </View>
                  <TextInput
                    style={[styles.guestInput, { color: textPrimary, backgroundColor: inputBg, borderColor: borderCol }]}
                    placeholder="Full name *"
                    placeholderTextColor={textMuted}
                    value={guestName}
                    onChangeText={setGuestName}
                  />
                  <TextInput
                    style={[
                      styles.guestInput,
                      {
                        color: textPrimary,
                        backgroundColor: inputBg,
                        borderColor: guestPhone.length > 0 && !isValidEthiopianPhone(guestPhone) ? "#DC2626" : borderCol,
                      },
                    ]}
                    placeholder="Phone number * (e.g. 0911234567)"
                    placeholderTextColor={textMuted}
                    value={guestPhone}
                    onChangeText={(text) => {
                      // Allow digits, +, spaces — strip everything else
                      const cleaned = text.replace(/[^\d+\s]/g, "");
                      setGuestPhone(cleaned);
                    }}
                    keyboardType="phone-pad"
                    maxLength={14}
                    autoCorrect={false}
                  />
                  {guestPhone.length > 0 && !isValidEthiopianPhone(guestPhone) && (
                    <Text style={{ color: "#DC2626", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: -4 }}>
                      Enter a valid Ethiopian number: 09XXXXXXXX or +2519XXXXXXXX
                    </Text>
                  )}
                  <Text style={[styles.guestNote, { color: textMuted }]}>
                    Sign in to save & track all your appointments.
                  </Text>
                </View>
              )}

              <Pressable
                onPress={() => {
                  if (!user && !guestName.trim()) {
                    Alert.alert("Name required", "Please enter your full name to continue.");
                    return;
                  }
                  if (!user && guestPhone.trim() && !isValidEthiopianPhone(guestPhone)) {
                    Alert.alert(
                      "Invalid phone number",
                      "Please enter a valid Ethiopian phone number.\n\nExamples:\n• 0911234567\n• +251911234567"
                    );
                    return;
                  }
                  setStep(2);
                }}
                style={[styles.nextBtn, { backgroundColor: "#202937" }]}
              >
                <Text style={styles.nextBtnText}>Next: Select Date & Time</Text>
                <Feather name="arrow-right" size={18} color="#fff" />
              </Pressable>
            </>
          )}

          {/* ── STEP 2: Date & Time ── */}
          {step === 2 && (
            <>
              <Text style={[styles.stepTitle, { color: textPrimary }]}>Choose Date & Time</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {dates.map((date) => {
                  const isSel = selectedDate?.toDateString() === date.toDateString();
                  const isAmharic = language === "am";
                  const etPill = isAmharic ? formatEtDatePill(date) : null;
                  const weekdayLabel = etPill
                    ? etPill.weekday
                    : date.toLocaleDateString("en-US", { weekday: "short" });
                  const dayLabel = etPill ? etPill.day : String(date.getDate());
                  const monthLabel = etPill
                    ? etPill.month
                    : date.toLocaleDateString("en-US", { month: "short" });
                  return (
                    <Pressable
                      key={date.toISOString()}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedDate(date); }}
                      style={[styles.datePill, { backgroundColor: isSel ? "#202937" : cardBg, borderColor: isSel ? "#315d93" : borderCol, minWidth: isAmharic ? 68 : 60 }]}
                    >
                      <Text style={[styles.datePillDay, { color: isSel ? "rgba(255,255,255,0.7)" : textMuted, fontSize: isAmharic ? 9 : 11 }]}>
                        {weekdayLabel}
                      </Text>
                      <Text style={[styles.datePillNum, { color: isSel ? "#fff" : textPrimary }]}>{dayLabel}</Text>
                      <Text style={[styles.datePillMonth, { color: isSel ? "rgba(255,255,255,0.7)" : textMuted, fontSize: isAmharic ? 9 : 11 }]}>
                        {monthLabel}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={[styles.periodRow, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9", borderColor: borderCol }]}>
                {(Object.keys(TIME_SLOTS) as (keyof typeof TIME_SLOTS)[]).map((p) => (
                  <Pressable key={p} onPress={() => setSelectedPeriod(p)} style={[styles.periodTab, selectedPeriod === p && { backgroundColor: "#315d93" }]}>
                    <Text style={[styles.periodTabText, { color: selectedPeriod === p ? "#fff" : textMuted }]}>{p}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.timeGrid}>
                {TIME_SLOTS[selectedPeriod].map((slot) => {
                  const isSel = selectedTime === slot;
                  return (
                    <Pressable
                      key={slot}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedTime(slot); }}
                      style={[styles.timeSlot, { backgroundColor: isSel ? "#315d93" : cardBg, borderColor: isSel ? "#315d93" : borderCol }]}
                    >
                      <Text style={[styles.timeSlotText, { color: isSel ? "#fff" : textPrimary }]}>{slot}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                onPress={() => { if (selectedDate && selectedTime) setStep(3); else Alert.alert("Incomplete", "Please select both a date and a time slot."); }}
                style={[styles.nextBtn, { backgroundColor: "#202937" }]}
              >
                <Text style={styles.nextBtnText}>Next: Payment</Text>
                <Feather name="arrow-right" size={18} color="#fff" />
              </Pressable>
            </>
          )}

          {/* ── STEP 3: Payment ── */}
          {step === 3 && (
            <>
              {/* Booking Summary */}
              <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Text style={[styles.summaryTitle, { color: textPrimary }]}>Booking Summary</Text>
                {[
                  { label: "Provider", value: doctorName ?? doctor?.name ?? "" },
                  { label: "Type", value: consultType === "video" ? "Video Consultation" : consultType === "phone" ? "Phone Call" : "Home Care Visit" },
                  { label: "Date", value: selectedDate?.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) ?? "" },
                  { label: "Time", value: selectedTime ?? "" },
                ].map((row) => (
                  <View key={row.label} style={[styles.summaryRow, { borderBottomColor: borderCol }]}>
                    <Text style={[styles.summaryLabel, { color: textMuted }]}>{row.label}</Text>
                    <Text style={[styles.summaryValue, { color: textPrimary }]}>{row.value}</Text>
                  </View>
                ))}
                <View style={[styles.totalRow]}>
                  <Text style={[styles.totalLabel, { color: textPrimary }]}>Total Amount</Text>
                  <Text style={[styles.totalValue, { color: "#059669" }]}>{currency} {amountFormatted}</Text>
                </View>
              </View>

              {/* Payment Method */}
              <Text style={[styles.stepTitle, { color: textPrimary }]}>Select Payment Method</Text>
              {([
                { id: "telebirr" as const, icon: "smartphone" as const, label: "Telebirr", sub: "Ethiopian mobile money transfer", accent: "#059669" },
                { id: "cbe" as const, icon: "credit-card" as const, label: "CBE — Commercial Bank of Ethiopia", sub: "Bank transfer via CBE account", accent: "#1E40AF" },
              ]).map((pm) => {
                const active = paymentMethod === pm.id;
                return (
                  <Pressable
                    key={pm.id}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPaymentMethod(pm.id); }}
                    style={[styles.optionRow, { backgroundColor: active ? "#202937" : cardBg, borderColor: active ? "#315d93" : borderCol }]}
                  >
                    <View style={[styles.optionIcon, { backgroundColor: active ? "rgba(49,93,147,0.4)" : pm.accent + "15" }]}>
                      <Feather name={pm.icon} size={20} color={active ? "#7FA8D8" : pm.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionLabel, { color: active ? "#fff" : textPrimary }]}>{pm.label}</Text>
                      <Text style={[styles.optionSub, { color: active ? "rgba(255,255,255,0.6)" : textMuted }]}>{pm.sub}</Text>
                    </View>
                    {active && <Feather name="check-circle" size={18} color="#059669" />}
                  </Pressable>
                );
              })}

              {/* Account Details Card */}
              <View style={[styles.accountCard, { backgroundColor: paymentMethod === "telebirr" ? "#059669" + "10" : "#1E40AF" + "10", borderColor: paymentMethod === "telebirr" ? "#059669" + "30" : "#1E40AF" + "30" }]}>
                <View style={styles.accountHeader}>
                  <Feather name={paymentMethod === "telebirr" ? "smartphone" : "credit-card"} size={20} color={paymentMethod === "telebirr" ? "#059669" : "#1E40AF"} />
                  <Text style={[styles.accountMethodLabel, { color: paymentMethod === "telebirr" ? "#059669" : "#1E40AF" }]}>
                    {paymentMethod === "telebirr" ? "Telebirr Merchant Number" : "CBE Account Number"}
                  </Text>
                </View>
                <View style={styles.accountNumberRow}>
                  <Text style={[styles.accountNumber, { color: textPrimary }]}>
                    {paymentMethod === "telebirr" ? paymentAccounts.telebirr.number : paymentAccounts.cbe.number}
                  </Text>
                  <Pressable
                    onPress={() => copyToClipboard(paymentMethod === "telebirr" ? paymentAccounts.telebirr.number : paymentAccounts.cbe.number, paymentMethod === "telebirr" ? "Telebirr number" : "CBE account number")}
                    style={[styles.copyBtn, { backgroundColor: paymentMethod === "telebirr" ? "#059669" : "#1E40AF" }]}
                  >
                    <Feather name="copy" size={14} color="#fff" />
                    <Text style={styles.copyBtnText}>Copy</Text>
                  </Pressable>
                </View>
                <Text style={[styles.accountName, { color: textMuted }]}>
                  Account Name: {paymentMethod === "telebirr" ? paymentAccounts.telebirr.name : paymentAccounts.cbe.name}
                </Text>
              </View>

              {/* Payment Instructions */}
              <View style={[styles.instructionsCard, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F0F9FF", borderColor: "#315d93" + "30" }]}>
                <Text style={[styles.instrTitle, { color: "#315d93" }]}>Payment Instructions</Text>
                {[
                  `Send exactly ${currency} ${amountFormatted} to the ${paymentMethod === "telebirr" ? "Telebirr number" : "CBE account"} above`,
                  "Take a clear screenshot immediately after payment",
                  "Upload the screenshot in the section below",
                  "Wait for admin confirmation (usually within 2 hours)",
                ].map((step, i) => (
                  <View key={i} style={styles.instrRow}>
                    <View style={styles.instrNum}>
                      <Text style={styles.instrNumText}>{i + 1}</Text>
                    </View>
                    <Text style={[styles.instrText, { color: textMuted }]}>{step}</Text>
                  </View>
                ))}
              </View>

              {/* Upload Proof */}
              <Text style={[styles.stepTitle, { color: textPrimary }]}>Upload Payment Proof</Text>

              {proofImage ? (
                <View style={{ gap: 10 }}>
                  <Image source={{ uri: proofImage.uri }} style={styles.proofPreview} resizeMode="cover" />
                  <Pressable onPress={() => setProofImage(null)} style={[styles.removeBtn, { borderColor: "#DC2626" + "40" }]}>
                    <Feather name="x" size={14} color="#DC2626" />
                    <Text style={[styles.removeBtnText, { color: "#DC2626" }]}>Remove & re-upload</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  <Pressable onPress={() => pickProofImage("camera")} style={[styles.uploadBtn, { backgroundColor: cardBg, borderColor: borderCol }]}>
                    <Feather name="camera" size={22} color="#315d93" />
                    <Text style={[styles.uploadBtnText, { color: textPrimary }]}>Take Photo of Receipt</Text>
                  </Pressable>
                  <Pressable onPress={() => pickProofImage("gallery")} style={[styles.uploadBtn, { backgroundColor: cardBg, borderColor: borderCol }]}>
                    <Feather name="image" size={22} color="#315d93" />
                    <Text style={[styles.uploadBtnText, { color: textPrimary }]}>Upload from Gallery</Text>
                  </Pressable>
                </View>
              )}

              {/* Additional Fields */}
              <View style={{ gap: 12 }}>
                <View>
                  <Text style={[styles.inputLabel, { color: textMuted }]}>Sender Name *</Text>
                  <TextInput style={[styles.textInput, { backgroundColor: inputBg, borderColor: borderCol, color: textPrimary }]} placeholder="Name on Telebirr / CBE account" placeholderTextColor={textMuted} value={senderName} onChangeText={setSenderName} autoCapitalize="words" />
                </View>
                <View>
                  <Text style={[styles.inputLabel, { color: textMuted }]}>Optional Note</Text>
                  <TextInput style={[styles.textInput, { backgroundColor: inputBg, borderColor: borderCol, color: textPrimary, height: 72 }]} placeholder="Any additional notes..." placeholderTextColor={textMuted} value={paymentNote} onChangeText={setPaymentNote} multiline={Platform.OS !== 'web'} textAlignVertical="top" />
                </View>
              </View>

              {/* Submit */}
              <Pressable
                onPress={handleSubmitPayment}
                disabled={submitting}
                style={({ pressed }) => [styles.submitBtn, { backgroundColor: "#315d93", opacity: pressed || submitting ? 0.85 : 1, shadowColor: "#315d93", shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12 }]}
              >
                <Feather name="send" size={20} color="#fff" />
                <Text style={styles.submitBtnText}>{submitting ? "Submitting…" : "Submit Payment for Verification"}</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardWrapper>
    </Container>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 0.5 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  steps: { flexDirection: "row", gap: 8 },
  stepDot: { flex: 1, height: 4, borderRadius: 2 },
  stepLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 6 },
  docSummary: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 15, borderWidth: 1 },
  docAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  docName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  docSpec: { fontSize: 12, fontFamily: "Inter_500Medium" },
  docHosp: { fontSize: 11, fontFamily: "Inter_400Regular" },
  docFee: { fontSize: 15, fontFamily: "Inter_700Bold" },
  stepTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 14, borderWidth: 1 },
  optionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  optionLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  optionSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  nextBtn: { borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  nextBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  datePill: { borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center", minWidth: 64 },
  datePillDay: { fontSize: 11, fontFamily: "Inter_500Medium" },
  datePillNum: { fontSize: 22, fontFamily: "Inter_700Bold" },
  datePillMonth: { fontSize: 11, fontFamily: "Inter_500Medium" },
  periodRow: { flexDirection: "row", borderRadius: 12, overflow: "hidden", borderWidth: 0.5 },
  periodTab: { flex: 1, padding: 10, alignItems: "center", borderRadius: 10 },
  periodTabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  timeSlot: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  timeSlotText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  summaryCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 2 },
  summaryTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 8 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 0.5 },
  summaryLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  summaryValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 10 },
  totalLabel: { fontSize: 15, fontFamily: "Inter_700Bold" },
  totalValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  accountCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  accountHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  accountMethodLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  accountNumberRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  accountNumber: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  copyBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  accountName: { fontSize: 12, fontFamily: "Inter_400Regular" },
  instructionsCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  instrTitle: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 4 },
  instrRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  instrNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#315d93", alignItems: "center", justifyContent: "center" },
  instrNumText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  instrText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  proofPreview: { width: "100%", height: 200, borderRadius: 14 },
  removeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  removeBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  uploadBtn: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18, borderRadius: 14, borderWidth: 1 },
  uploadBtnText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  inputLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 6 },
  textInput: { borderWidth: 1, borderRadius: 12, padding: 13, fontSize: 14, fontFamily: "Inter_400Regular" },
  submitBtn: { borderRadius: 16, padding: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 8 },
  submitBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  // Appointments list
  bookingCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  bookingIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  bookingDoc: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  bookingSpec: { fontSize: 12, fontFamily: "Inter_500Medium" },
  bookingDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  empty: { alignItems: "center", gap: 16, paddingTop: 80 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  exploreBtn: { backgroundColor: "#315d93", borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  exploreBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  // Guest fields
  guestBox: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  guestBoxHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  guestBoxTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  guestBoxSub: { fontSize: 11, fontFamily: "Inter_500Medium" },
  guestInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, fontFamily: "Inter_400Regular" },
  guestNote: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 2 },
  // Success
  successScreen: { flex: 1, alignItems: "center", paddingHorizontal: 24, gap: 18 },
  successIconWrap: { marginTop: 20, width: 100, height: 100, borderRadius: 50, backgroundColor: "#059669" + "15", alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  successMsg: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  successNote: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  successSummary: { width: "100%", borderRadius: 14, borderWidth: 1, padding: 16, gap: 2 },
  successBtn: { width: "100%", padding: 16, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  successBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  successBtnOutline: { width: "100%", padding: 14, borderRadius: 14, alignItems: "center", borderWidth: 1 },
  successBtnOutlineText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
