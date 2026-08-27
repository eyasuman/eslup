import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
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
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import {
  signUp,
  signIn,
  upsertInstitution,
  uploadInstituteLicense,
  deleteUpload,
  createNotification,
} from "@/lib/supabase";

type Step = 1 | 2 | 3;

const INSTITUTE_CATEGORIES = [
  { id: "Hospital", label: "Hospital", icon: "plus-square" as const, desc: "Full-service inpatient & outpatient facility" },
  { id: "Clinic", label: "Clinic / Health Centre", icon: "activity" as const, desc: "Outpatient primary & specialist care" },
  { id: "Laboratory", label: "Diagnostic Laboratory", icon: "thermometer" as const, desc: "Lab tests, pathology & analysis" },
  { id: "Pharmacy", label: "Pharmacy", icon: "package" as const, desc: "Medication dispensing & health products" },
  { id: "Imaging", label: "Imaging Centre", icon: "camera" as const, desc: "Radiology, CT, MRI & ultrasound" },
  { id: "Dental", label: "Dental Clinic", icon: "smile" as const, desc: "Oral & maxillofacial care" },
  { id: "Rehabilitation", label: "Rehabilitation Centre", icon: "trending-up" as const, desc: "Physiotherapy & occupational therapy" },
  { id: "Mental Health", label: "Mental Health Centre", icon: "heart" as const, desc: "Psychiatry & counselling services" },
  { id: "Eye Care", label: "Eye Care Centre", icon: "eye" as const, desc: "Ophthalmology & optometry" },
  { id: "Other", label: "Other Healthcare Facility", icon: "grid" as const, desc: "Specialised or mixed healthcare service" },
];

const CITY_OPTIONS = [
  "Addis Ababa", "Dire Dawa", "Mekelle", "Gondar", "Hawassa",
  "Bahir Dar", "Jimma", "Dessie", "Jijiga", "Shashemene",
];

export default function InstituteRegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setUser, setUserRole } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [step, setStep] = useState<Step>(1);
  const [category, setCategory] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    city: "",
    website: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [licenseFile, setLicenseFile] = useState<{ name: string; uri: string; type: string } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const bg = colors.isDark ? colors.background : "#FFFFFF";
  const textPrimary = colors.isDark ? "#FFFFFF" : "#202937";
  const textMuted = colors.isDark ? "#94A3B8" : "#64748B";
  const cardBg = colors.isDark ? "rgba(255,255,255,0.06)" : "#F4F7FB";
  const borderCol = colors.isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0";
  const inputBg = colors.isDark ? "rgba(255,255,255,0.08)" : "#F4F7FB";
  const accentColor = "#0D9488"; // teal for institutes

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) { setEmailError("Email is required"); return false; }
    if (!re.test(email)) { setEmailError("Enter a valid email address"); return false; }
    setEmailError(""); return true;
  };

  const validatePassword = (pw: string) => {
    if (!pw) { setPasswordError("Password is required"); return false; }
    if (pw.length < 8) { setPasswordError("Password must be at least 8 characters"); return false; }
    setPasswordError(""); return true;
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/png", "image/jpg"],
        copyToCacheDirectory: true,
      });
      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setLicenseFile({ name: asset.name, uri: asset.uri, type: asset.mimeType ?? "application/octet-stream" });
      }
    } catch {
      Alert.alert("Error", "Could not pick file.");
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!category) { Alert.alert("Select category", "Please select your institute category."); return; }
      setStep(2);
    } else if (step === 2) {
      if (!form.name.trim()) { Alert.alert("Missing fields", "Please enter your institute name."); return; }
      if (!validateEmail(form.email) || !validatePassword(form.password)) return;
      if (!form.phone.trim()) { Alert.alert("Missing fields", "Please enter a contact phone number."); return; }
      if (!form.city) { Alert.alert("Missing fields", "Please select your city."); return; }
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    if (!licenseFile) {
      Alert.alert("License required", "Please upload your operating licence or registration certificate.");
      return;
    }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      // 1. Create Supabase auth account
      let userId: string | null = null;
      let signUpError: any = null;

      try {
        const authData = await signUp(form.email, form.password, form.name, "institute", form.phone);
        if (authData.user) {
          userId = authData.user.id;
        }
      } catch (err: any) {
        signUpError = err;
      }

      if (!userId) {
        const msg: string = signUpError?.message ?? String(signUpError ?? "Account creation failed.");
        Alert.alert("Registration Error", msg || "Could not create account. Please try again.");
        setLoading(false);
        return;
      }

      // 2. Upload licence file (real file, not mock)
      let licenseUpload: Awaited<ReturnType<typeof uploadInstituteLicense>> | null = null;
      if (licenseFile) {
        try { licenseUpload = await uploadInstituteLicense(userId, licenseFile); } catch (err: any) {
          Alert.alert("License upload failed", err?.message ?? "Could not upload the licence file. Please try again.");
          setLoading(false);
          return;
        }
      }

      // 3. Save institute record to Supabase (only real institute_pulse columns)
      try {
        await upsertInstitution({
          userId,
          name: form.name,
          type: category ?? "Other",
          email: form.email,
          phone: form.phone,
          address: form.address || undefined,
          city: form.city,
          status: "Pending",
          licenseUploadId: licenseUpload?.id,
          services: [],
        });
      } catch (error) {
        if (licenseUpload) await deleteUpload(licenseUpload.id).catch(() => {});
        throw error;
      }
      if (licenseUpload?.replacedUploadId) {
        try {
          await deleteUpload(licenseUpload.replacedUploadId);
        } catch {
          licenseUpload.cleanupPending = true;
        }
      }
      if (licenseUpload?.cleanupPending) {
        Alert.alert(
          "License Updated",
          "Your new license was saved. Cleanup of the previous file is queued and will retry automatically."
        );
      }

      // 4. Welcome notification
      try {
        await createNotification({
          user_id: userId,
          title: "Application Under Review",
          body: `Welcome ${form.name}! Your institute registration is pending admin approval. We'll notify you within 24–48 hours.`,
          type: "info",
        });
      } catch {}

      await setUser({
        id: userId,
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: "institute",
        instituteStatus: "Pending",
      });
      await setUserRole("institute");
      router.replace("/(institute)/status");
    } catch (err: any) {
      const msg: string = err?.message ?? String(err);
      Alert.alert("Registration Error", msg || "Could not complete registration. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: bg }]}
      behavior={Platform.OS === "ios" ? "padding" : Platform.OS === "android" ? "height" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: accentColor }]}>
        <Pressable
          onPress={() => { if (step === 1) router.back(); else setStep((s) => (s - 1) as Step); }}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Institute Registration</Text>
        <Text style={styles.headerSub}>Register your healthcare facility on PULSE</Text>
        <View style={styles.stepIndicator}>
          {[1, 2, 3].map((s) => (
            <View key={s} style={styles.stepItem}>
              <View style={[styles.stepCircle, { backgroundColor: step >= s ? "#fff" : "rgba(255,255,255,0.3)" }]}>
                <Text style={[styles.stepNum, { color: step >= s ? accentColor : "rgba(255,255,255,0.6)" }]}>{s}</Text>
              </View>
              {s < 3 && <View style={[styles.stepLine, { backgroundColor: step > s ? "#fff" : "rgba(255,255,255,0.3)" }]} />}
            </View>
          ))}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: bottomPad + 80 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── STEP 1: Category ── */}
        {step === 1 && (
          <>
            <Text style={[styles.stepTitle, { color: textPrimary }]}>What type of facility are you?</Text>
            <Text style={[styles.stepDesc, { color: textMuted }]}>
              Select the category that best describes your healthcare facility.
            </Text>
            {INSTITUTE_CATEGORIES.map((cat) => {
              const active = category === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCategory(cat.id); }}
                  style={[styles.typeCard, { backgroundColor: active ? "#0D948815" : cardBg, borderColor: active ? accentColor : borderCol }]}
                >
                  <View style={[styles.typeIcon, { backgroundColor: active ? accentColor + "25" : accentColor + "12" }]}>
                    <Feather name={cat.icon} size={22} color={accentColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.typeLabel, { color: textPrimary }]}>{cat.label}</Text>
                    <Text style={[styles.typeDesc2, { color: textMuted }]}>{cat.desc}</Text>
                  </View>
                  {active && <Feather name="check-circle" size={18} color={accentColor} />}
                </Pressable>
              );
            })}
          </>
        )}

        {/* ── STEP 2: Institute Info ── */}
        {step === 2 && (
          <>
            <Text style={[styles.stepTitle, { color: textPrimary }]}>Institute information</Text>

            {[
              { key: "name", label: "Institute Name *", placeholder: "e.g. Bethel General Hospital", autoCapitalize: "words" as const, keyboardType: "default" as const },
            ].map((field) => (
              <View key={field.key}>
                <Text style={[styles.inputLabel, { color: textMuted }]}>{field.label}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, borderColor: borderCol, color: textPrimary }]}
                  placeholder={field.placeholder}
                  placeholderTextColor={textMuted}
                  autoCapitalize={field.autoCapitalize}
                  keyboardType={field.keyboardType}
                  autoCorrect={false}
                  value={form[field.key as keyof typeof form]}
                  onChangeText={(v) => setForm((p) => ({ ...p, [field.key]: v }))}
                />
              </View>
            ))}

            {/* Email */}
            <View>
              <Text style={[styles.inputLabel, { color: textMuted }]}>Official Email *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, borderColor: emailError ? "#DC2626" : borderCol, color: textPrimary }]}
                placeholder="info@yourhospital.com"
                placeholderTextColor={textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                value={form.email}
                onChangeText={(v) => { setForm((p) => ({ ...p, email: v })); if (emailError) setEmailError(""); }}
              />
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            </View>

            {/* Phone */}
            <View>
              <Text style={[styles.inputLabel, { color: textMuted }]}>Contact Phone *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, borderColor: borderCol, color: textPrimary }]}
                placeholder="0911234567"
                placeholderTextColor={textMuted}
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={14}
                value={form.phone}
                onChangeText={(v) => setForm((p) => ({ ...p, phone: v.replace(/[^\d+\s]/g, "") }))}
              />
            </View>

            {/* Address */}
            <View>
              <Text style={[styles.inputLabel, { color: textMuted }]}>Street Address</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, borderColor: borderCol, color: textPrimary }]}
                placeholder="e.g. Bole Road, Bole Sub-City"
                placeholderTextColor={textMuted}
                autoCapitalize="words"
                autoCorrect={false}
                value={form.address}
                onChangeText={(v) => setForm((p) => ({ ...p, address: v }))}
              />
            </View>

            {/* City */}
            <View>
              <Text style={[styles.inputLabel, { color: textMuted }]}>City *</Text>
              <View style={styles.cityGrid}>
                {CITY_OPTIONS.map((city) => {
                  const active = form.city === city;
                  return (
                    <Pressable
                      key={city}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setForm((p) => ({ ...p, city })); }}
                      style={[styles.cityChip, { backgroundColor: active ? accentColor : cardBg, borderColor: active ? accentColor : borderCol }]}
                    >
                      <Text style={[styles.cityText, { color: active ? "#fff" : textPrimary }]}>{city}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Password */}
            <View>
              <Text style={[styles.inputLabel, { color: textMuted }]}>Password *</Text>
              <View style={[styles.passwordRow, { backgroundColor: inputBg, borderColor: passwordError ? "#DC2626" : borderCol }]}>
                <TextInput
                  style={[styles.passwordInput, { color: textPrimary }]}
                  placeholder="Min. 8 characters"
                  placeholderTextColor={textMuted}
                  secureTextEntry={!showPassword}
                  value={form.password}
                  onChangeText={(v) => { setForm((p) => ({ ...p, password: v })); if (passwordError) validatePassword(v); }}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                  <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={textMuted} />
                </Pressable>
              </View>
              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
            </View>
          </>
        )}

        {/* ── STEP 3: Licence Upload ── */}
        {step === 3 && (
          <>
            <Text style={[styles.stepTitle, { color: textPrimary }]}>Upload operating licence</Text>
            <Text style={[styles.stepDesc, { color: textMuted }]}>
              Upload your Ministry of Health licence or official registration certificate. This will be reviewed by our admin team before your institute goes live.
            </Text>

            <Pressable
              onPress={pickDocument}
              style={[styles.uploadArea, { backgroundColor: cardBg, borderColor: licenseFile ? "#059669" : borderCol }]}
            >
              <Feather name={licenseFile ? "check-circle" : "upload"} size={32} color={licenseFile ? "#059669" : accentColor} />
              <Text style={[styles.uploadTitle, { color: licenseFile ? "#059669" : textPrimary }]}>
                {licenseFile ? licenseFile.name : "Tap to upload licence"}
              </Text>
              <Text style={[styles.uploadSub, { color: textMuted }]}>PDF, JPG, or PNG accepted</Text>
            </Pressable>

            {/* Summary */}
            <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              {[
                { label: "Category", value: INSTITUTE_CATEGORIES.find((c) => c.id === category)?.label ?? "" },
                { label: "Institute Name", value: form.name },
                { label: "Email", value: form.email },
                { label: "Phone", value: form.phone },
                { label: "City", value: form.city },
                { label: "Address", value: form.address || "—" },
              ].map((row) => (
                <View key={row.label} style={[styles.summaryRow, { borderBottomColor: borderCol }]}>
                  <Text style={[styles.summaryLabel, { color: textMuted }]}>{row.label}</Text>
                  <Text style={[styles.summaryValue, { color: textPrimary }]} numberOfLines={1}>{row.value}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.infoCard, { backgroundColor: "#D97706" + "12", borderColor: "#D97706" + "30" }]}>
              <Feather name="info" size={16} color="#D97706" />
              <Text style={[styles.infoText, { color: "#D97706" }]}>
                Your institute will have <Text style={{ fontFamily: "Inter_700Bold" }}>Pending</Text> status until an admin reviews and approves your licence. Providers will be able to affiliate with your institute after approval.
              </Text>
            </View>
          </>
        )}

        {/* Navigation buttons */}
        {step < 3 ? (
          <Pressable onPress={handleNext} style={[styles.nextBtn, { backgroundColor: accentColor }]}>
            <Text style={styles.nextBtnText}>
              {step === 1 ? "Next: Institute Details" : "Next: Upload Licence"}
            </Text>
            <Feather name="arrow-right" size={18} color="#fff" />
          </Pressable>
        ) : (
          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={[styles.nextBtn, { backgroundColor: accentColor, opacity: loading ? 0.7 : 1 }]}
          >
            <Feather name="send" size={18} color="#fff" />
            <Text style={styles.nextBtnText}>{loading ? "Submitting…" : "Submit Application"}</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingBottom: 24 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", marginTop: 4 },
  stepIndicator: { flexDirection: "row", alignItems: "center", marginTop: 20 },
  stepItem: { flexDirection: "row", alignItems: "center" },
  stepCircle: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  stepNum: { fontSize: 13, fontFamily: "Inter_700Bold" },
  stepLine: { width: 40, height: 2, marginHorizontal: 4 },
  stepTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 4 },
  stepDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  typeCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  typeIcon: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  typeLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  typeDesc2: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  inputLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 6 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 15, fontFamily: "Inter_400Regular" },
  passwordRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingLeft: 14 },
  passwordInput: { flex: 1, height: 48, fontSize: 15, fontFamily: "Inter_400Regular" },
  eyeBtn: { width: 44, height: 48, alignItems: "center", justifyContent: "center" },
  errorText: { color: "#DC2626", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 },
  cityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cityChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  cityText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  uploadArea: { borderRadius: 16, borderWidth: 2, borderStyle: "dashed", padding: 32, alignItems: "center", gap: 10 },
  uploadTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  uploadSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  summaryCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", padding: 12, borderBottomWidth: 1 },
  summaryLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  summaryValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "right" },
  infoCard: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: "flex-start" },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  nextBtn: { borderRadius: 14, height: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  nextBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  successContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  successIcon: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center" },
  successDesc: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 24 },
  pendingCard: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
  pendingText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  doneBtn: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40, alignItems: "center" },
  doneBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
