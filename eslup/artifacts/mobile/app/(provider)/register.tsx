import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
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
import { signUp, signIn, signInWithPhone, signUpWithPhone, phoneToEmail, upsertDoctor, uploadMedicalLicense, createNotification } from "@/lib/supabase";
import { PROVIDER_TYPES, SPECIALTIES_BY_TYPE, type ProviderType } from "@/data/providerCategories";

type Step = 1 | 2 | 3;

const CITY_OPTIONS = [
  "Addis Ababa", "Dire Dawa", "Mekelle", "Gondar", "Hawassa",
  "Bahir Dar", "Jimma", "Dessie", "Jijiga", "Shashemene",
];

export default function ProviderRegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setUser, setUserRole } = useApp();
  const params = useLocalSearchParams<{ name?: string; email?: string }>();
  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [step, setStep] = useState<Step>(1);
  const [providerType, setProviderType] = useState<ProviderType | null>(null);
  const [specialty, setSpecialty] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: params.name ?? "",
    email: params.email ?? "",
    password: "",
    city: "",
    yearsExp: "",
    phone: "",
    hospital: "",
    languages: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [licenseFile, setLicenseFile] = useState<{ name: string; uri: string; type: string } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  // Providers can choose to register/sign in with email or phone number
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");

  const bg = colors.isDark ? colors.background : "#FFFFFF";
  const textPrimary = colors.isDark ? "#FFFFFF" : "#202937";
  const textMuted = colors.isDark ? "#94A3B8" : "#64748B";
  const cardBg = colors.isDark ? "rgba(255,255,255,0.06)" : "#F4F7FB";
  const borderCol = colors.isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0";
  const inputBg = colors.isDark ? "rgba(255,255,255,0.08)" : "#F4F7FB";

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) { setEmailError("Email is required"); return false; }
    if (!re.test(email)) { setEmailError("Enter a valid email address"); return false; }
    setEmailError("");
    return true;
  };

  const isValidEthiopianPhone = (p: string) => {
    const clean = p.replace(/\s/g, "");
    return /^0[79]\d{8}$/.test(clean) || /^\+2519\d{8}$/.test(clean) || /^\+2517\d{8}$/.test(clean);
  };

  const validatePhone = (p: string) => {
    if (!p) { setEmailError("Phone number is required"); return false; }
    if (!isValidEthiopianPhone(p)) { setEmailError("Enter a valid Ethiopian number: 09XXXXXXXX"); return false; }
    setEmailError(""); return true;
  };

  const validatePassword = (pw: string) => {
    if (!pw) { setPasswordError("Password is required"); return false; }
    if (pw.length < 8) { setPasswordError("Password must be at least 8 characters"); return false; }
    setPasswordError("");
    return true;
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
      if (!providerType) { Alert.alert("Select type", "Please select your provider type."); return; }
      if (!specialty) { Alert.alert("Select specialty", "Please select a specialty."); return; }
      setStep(2);
    } else if (step === 2) {
      if (!form.name.trim()) { Alert.alert("Missing fields", "Please enter your full name."); return; }
      const idOk = authMethod === "email" ? validateEmail(form.email) : validatePhone(form.phone);
      const passwordOk = validatePassword(form.password);
      if (!idOk || !passwordOk) return;
      if (!form.city) { Alert.alert("Missing fields", "Please select your city/location."); return; }
      setStep(3);
    }
  };

  const doUpsertProfile = async (userId: string) => {
    const resolvedEmail = authMethod === "phone" ? phoneToEmail(form.phone) : form.email;
    await upsertDoctor({
      userId,
      name: form.name,
      email: resolvedEmail,
      providerType: providerType
        ? providerType.charAt(0).toUpperCase() + providerType.slice(1)
        : "Doctor",
      specialty: specialty ?? "General",
      city: form.city,
      experienceYears: form.yearsExp ? parseInt(form.yearsExp) : undefined,
      phone: form.phone,
      bio: [form.hospital, form.languages].filter(Boolean).join(" · ") || undefined,
      status: "Pending",
      serviceModes: { video: true, audio: false, inPerson: true, homeVisit: false },
      availability: [],
    });
    if (!licenseFile) throw new Error("A medical license is required.");
    const licenseUpload = await uploadMedicalLicense(userId, licenseFile);
    if (licenseUpload.cleanupPending) {
      Alert.alert(
        "License Updated",
        "Your new license was saved. Cleanup of the previous file is queued and will retry automatically."
      );
    }
    try {
      await createNotification({
        user_id: userId,
        title: "Application Under Review",
        body: `Welcome ${form.name}! Your provider registration is pending admin approval (24–48 hrs).`,
        type: "info",
      });
    } catch {}
    await setUser({ id: userId, name: form.name, email: authMethod === "phone" ? "" : form.email, phone: form.phone, role: "provider", doctorStatus: "Pending" });
    await setUserRole("provider");
    setSubmitted(true);
  };

  const handleSubmit = async () => {
    if (!licenseFile) { Alert.alert("License required", "Please upload your medical license."); return; }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      // ── Step 1: Try to create a new Supabase auth account ─────────────────
      let userId: string | null = null;
      let signUpError: any = null;

      try {
        const authData = authMethod === "phone"
          ? await signUpWithPhone(form.phone, form.password, form.name, "provider")
          : await signUp(form.email, form.password, form.name, "provider", form.phone);
        if (authData.user) {
          userId = authData.user.id;
          // Establish a session immediately so RLS allows the insert
          if (!authData.session) {
            try {
              if (authMethod === "phone") {
                await signInWithPhone(form.phone, form.password);
              } else {
                await signIn(form.email, form.password);
              }
            } catch {}
          }
        }
      } catch (err: any) {
        signUpError = err;
        const msg: string = err?.message ?? String(err);
        // ── Rate limit or already-registered: try sign-in recovery ──
        if (
          msg.toLowerCase().includes("rate limit") ||
          msg.toLowerCase().includes("too many") ||
          msg.includes("already registered") ||
          msg.includes("already been registered") ||
          msg.includes("User already registered")
        ) {
          try {
            const recovered = authMethod === "phone"
              ? await signIn(phoneToEmail(form.phone), form.password)
              : await signIn(form.email, form.password);
            if (recovered.user) {
              userId = recovered.user.id;
              signUpError = null;
            }
          } catch {}
        }
      }

      if (!userId) {
        const msg: string = signUpError?.message ?? String(signUpError ?? "Account creation failed.");
        if (
          msg.toLowerCase().includes("rate limit") ||
          msg.toLowerCase().includes("too many")
        ) {
          Alert.alert(
            "Email Limit Reached",
            "Supabase has temporarily paused confirmation emails. Your account may already be created — please try signing in with your credentials after a few minutes. If the problem persists, contact support."
          );
        } else {
          Alert.alert("Registration Error", msg || "Could not create account. Please try again.");
        }
        return;
      }

      // ── Step 2: Write provider profile to the `doctors` table ─────────────
      await doUpsertProfile(userId);
    } catch (err: any) {
      const msg: string = err?.message ?? String(err);
      if (msg.includes("row-level security") || msg.includes("violates") || msg.includes("policy")) {
        Alert.alert(
          "Database Permission Error",
          "Your account was created but the profile could not be saved due to a database policy. Please contact support or check your Supabase RLS settings for the 'doctors' table."
        );
      } else {
        Alert.alert("Registration Error", msg || "Could not complete registration. Please check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={styles.successContainer}>
          <View style={[styles.successIcon, { backgroundColor: "#059669" + "20" }]}>
            <Feather name="check-circle" size={64} color="#059669" />
          </View>
          <Text style={[styles.successTitle, { color: textPrimary }]}>Application Submitted!</Text>
          <Text style={[styles.successDesc, { color: textMuted }]}>
            Your provider registration is under review. The admin team will verify your credentials and activate your account within 24–48 hours.
          </Text>
          <View style={[styles.pendingCard, { backgroundColor: "#D97706" + "15", borderColor: "#D97706" + "30" }]}>
            <Feather name="clock" size={20} color="#D97706" />
            <Text style={[styles.pendingText, { color: "#D97706" }]}>Status: Pending Admin Approval</Text>
          </View>
          <Pressable onPress={() => router.replace("/(tabs)")} style={styles.doneBtn}>
            <Text style={styles.doneBtnText}>Back to Home</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const currentSpecialties = providerType ? SPECIALTIES_BY_TYPE[providerType] : [];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: bg }]}
      behavior={Platform.OS === "ios" ? "padding" : Platform.OS === "android" ? "height" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
    >
      <View style={[styles.header, { paddingTop: topPad + 10 }]}>
        <Pressable
          onPress={() => { if (step === 1) router.back(); else setStep((s) => (s - 1) as Step); }}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Provider Registration</Text>
        <Text style={styles.headerSub}>Join PULSE as a healthcare professional</Text>
        <View style={styles.stepIndicator}>
          {[1, 2, 3].map((s) => (
            <View key={s} style={styles.stepItem}>
              <View style={[styles.stepCircle, { backgroundColor: step >= s ? "#fff" : "rgba(255,255,255,0.3)" }]}>
                <Text style={[styles.stepNum, { color: step >= s ? "#315d93" : "rgba(255,255,255,0.6)" }]}>{s}</Text>
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
        {/* ── STEP 1: Provider Type & Specialty ── */}
        {step === 1 && (
          <>
            <Text style={[styles.stepTitle, { color: textPrimary }]}>What type of provider are you?</Text>
            {PROVIDER_TYPES.map((pt) => {
              const active = providerType === pt.id;
              return (
                <Pressable
                  key={pt.id}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setProviderType(pt.id); setSpecialty(null); }}
                  style={[styles.typeCard, { backgroundColor: active ? "#202937" : cardBg, borderColor: active ? "#315d93" : borderCol }]}
                >
                  <View style={[styles.typeIcon, { backgroundColor: active ? "rgba(49,93,147,0.4)" : "#315d93" + "15" }]}>
                    <Feather name={pt.icon as any} size={22} color={active ? "#7FA8D8" : "#315d93"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.typeLabel, { color: active ? "#fff" : textPrimary }]}>{pt.label}</Text>
                    <Text style={[styles.typeDesc, { color: active ? "rgba(255,255,255,0.65)" : textMuted }]}>{pt.desc}</Text>
                  </View>
                  {active && <Feather name="check-circle" size={18} color="#059669" />}
                </Pressable>
              );
            })}

            {providerType && (
              <>
                <Text style={[styles.stepTitle, { color: textPrimary, marginTop: 8 }]}>Select your specialty</Text>
                <View style={styles.specialtyGrid}>
                  {currentSpecialties.map((sp) => {
                    const active = specialty === sp;
                    return (
                      <Pressable
                        key={sp}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSpecialty(sp); }}
                        style={[styles.specChip, { backgroundColor: active ? "#315d93" : cardBg, borderColor: active ? "#315d93" : borderCol }]}
                      >
                        <Text style={[styles.specText, { color: active ? "#fff" : textPrimary }]}>{sp}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </>
        )}

        {/* ── STEP 2: Personal Info ── */}
        {step === 2 && (
          <>
            <Text style={[styles.stepTitle, { color: textPrimary }]}>Your information</Text>

            {/* Full name */}
            <View>
              <Text style={[styles.inputLabel, { color: textMuted }]}>Full Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, borderColor: borderCol, color: textPrimary }]}
                placeholder="Dr. Abebe Girma"
                placeholderTextColor={textMuted}
                autoCapitalize="words"
                value={form.name}
                onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
              />
            </View>

            {/* Auth method toggle */}
            <View style={{ gap: 8 }}>
              <Text style={[styles.inputLabel, { color: textMuted }]}>Account Login Method *</Text>
              <View style={[styles.methodToggle, { backgroundColor: colors.isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9", borderColor: borderCol }]}>
                {(["email", "phone"] as const).map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => { setAuthMethod(m); setEmailError(""); }}
                    style={[styles.methodBtn, authMethod === m && { backgroundColor: "#315d93" }]}
                  >
                    <Feather name={m === "email" ? "mail" : "phone"} size={14} color={authMethod === m ? "#fff" : textMuted} />
                    <Text style={[styles.methodBtnText, { color: authMethod === m ? "#fff" : textMuted }]}>
                      {m === "email" ? "Email" : "Phone Number"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Email field (when email method) */}
            {authMethod === "email" && (
              <View>
                <Text style={[styles.inputLabel, { color: textMuted }]}>Email Address *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, borderColor: emailError ? "#DC2626" : borderCol, color: textPrimary }]}
                  placeholder="your@email.com"
                  placeholderTextColor={textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  value={form.email}
                  onChangeText={(v) => { setForm((p) => ({ ...p, email: v })); if (emailError) setEmailError(""); }}
                />
                {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
              </View>
            )}

            {/* Phone field — required when phone method; optional contact otherwise */}
            <View>
              <Text style={[styles.inputLabel, { color: textMuted }]}>
                {authMethod === "phone" ? "Phone Number *" : "Phone Number (contact)"}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, borderColor: authMethod === "phone" && emailError ? "#DC2626" : borderCol, color: textPrimary }]}
                placeholder="0912345678"
                placeholderTextColor={textMuted}
                autoCapitalize="none"
                keyboardType="phone-pad"
                autoCorrect={false}
                maxLength={14}
                value={form.phone}
                onChangeText={(v) => { setForm((p) => ({ ...p, phone: v.replace(/[^\d+\s]/g, "") })); if (emailError) setEmailError(""); }}
              />
              {authMethod === "phone" && emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            </View>

            {[
              { key: "hospital", label: "Clinic / Hospital Name *", placeholder: "e.g. Tikur Anbessa", autoCapitalize: "words" as const, keyboardType: "default" as const },
              { key: "languages", label: "Languages Spoken", placeholder: "e.g. Amharic, English", autoCapitalize: "words" as const, keyboardType: "default" as const },
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

            <View>
              <Text style={[styles.inputLabel, { color: textMuted }]}>Password *</Text>
              <View style={[styles.passwordRow, { backgroundColor: inputBg, borderColor: passwordError ? "#DC2626" : borderCol }]}>
                <TextInput
                  style={[styles.passwordInput, { color: textPrimary }]}
                  placeholder="Min. 8 characters"
                  placeholderTextColor={textMuted}
                  secureTextEntry={!showPassword}
                  value={form.password}
                  onChangeText={(v) => setForm((p) => ({ ...p, password: v }))}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                  <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={textMuted} />
                </Pressable>
              </View>
              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
            </View>

            <View>
              <Text style={[styles.inputLabel, { color: textMuted }]}>City / Location *</Text>
              <View style={styles.cityGrid}>
                {CITY_OPTIONS.map((city) => {
                  const active = form.city === city;
                  return (
                    <Pressable
                      key={city}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setForm((p) => ({ ...p, city })); }}
                      style={[styles.cityChip, { backgroundColor: active ? "#315d93" : cardBg, borderColor: active ? "#315d93" : borderCol }]}
                    >
                      <Text style={[styles.cityText, { color: active ? "#fff" : textPrimary }]}>{city}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View>
              <Text style={[styles.inputLabel, { color: textMuted }]}>Years of Experience</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, borderColor: borderCol, color: textPrimary }]}
                placeholder="e.g. 5"
                placeholderTextColor={textMuted}
                keyboardType="numeric"
                value={form.yearsExp}
                onChangeText={(v) => setForm((p) => ({ ...p, yearsExp: v.replace(/[^0-9]/g, "") }))}
              />
            </View>
          </>
        )}

        {/* ── STEP 3: Medical License ── */}
        {step === 3 && (
          <>
            <Text style={[styles.stepTitle, { color: textPrimary }]}>Upload your medical license</Text>
            <Text style={[styles.stepDesc, { color: textMuted }]}>
              Your license will be securely stored and reviewed by the admin team before your account is activated.
            </Text>

            <Pressable
              onPress={pickDocument}
              style={[styles.uploadArea, { backgroundColor: cardBg, borderColor: licenseFile ? "#059669" : borderCol }]}
            >
              <Feather name={licenseFile ? "check-circle" : "upload"} size={32} color={licenseFile ? "#059669" : "#315d93"} />
              <Text style={[styles.uploadTitle, { color: licenseFile ? "#059669" : textPrimary }]}>
                {licenseFile ? licenseFile.name : "Tap to upload license"}
              </Text>
              <Text style={[styles.uploadSub, { color: textMuted }]}>PDF, JPG, or PNG accepted</Text>
            </Pressable>

            {/* Summary */}
            <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              {[
                { label: "Provider Type", value: PROVIDER_TYPES.find((pt) => pt.id === providerType)?.label ?? "" },
                { label: "Specialty", value: specialty ?? "" },
                { label: "Name", value: form.name },
                { label: authMethod === "phone" ? "Phone" : "Email", value: authMethod === "phone" ? form.phone : form.email },
                { label: "City", value: form.city },
                { label: "Experience", value: form.yearsExp ? `${form.yearsExp} years` : "Not specified" },
              ].map((row) => (
                <View key={row.label} style={[styles.summaryRow, { borderBottomColor: borderCol }]}>
                  <Text style={[styles.summaryLabel, { color: textMuted }]}>{row.label}</Text>
                  <Text style={[styles.summaryValue, { color: textPrimary }]}>{row.value}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.infoCard, { backgroundColor: "#D97706" + "12", borderColor: "#D97706" + "30" }]}>
              <Feather name="info" size={16} color="#D97706" />
              <Text style={[styles.infoText, { color: "#D97706" }]}>
                Your account will have <Text style={{ fontFamily: "Inter_700Bold" }}>Pending</Text> status until an admin reviews and approves your credentials.
              </Text>
            </View>
          </>
        )}

        {step < 3 ? (
          <Pressable onPress={handleNext} style={styles.nextBtn}>
            <Text style={styles.nextBtnText}>
              {step === 1 ? "Next: Personal Info" : "Next: Upload License"}
            </Text>
            <Feather name="arrow-right" size={18} color="#fff" />
          </Pressable>
        ) : (
          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={[styles.nextBtn, { opacity: loading ? 0.7 : 1 }]}
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
  header: { backgroundColor: "#202937", padding: 20, paddingBottom: 24 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", marginTop: 4 },
  stepIndicator: { flexDirection: "row", alignItems: "center", marginTop: 20 },
  stepItem: { flexDirection: "row", alignItems: "center" },
  stepCircle: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  stepNum: { fontSize: 13, fontFamily: "Inter_700Bold" },
  stepLine: { width: 40, height: 2, marginHorizontal: 4 },
  stepTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 4 },
  stepDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  typeCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 14, borderWidth: 1.5 },
  typeIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  typeLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  typeDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  specialtyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  specChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  specText: { fontSize: 13, fontFamily: "Inter_500Medium" },
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
  summaryValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  infoCard: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: "flex-start" },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  methodToggle: { flexDirection: "row", borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  methodBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 8 },
  methodBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  nextBtn: { backgroundColor: "#202937", borderRadius: 14, height: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  nextBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  successContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  successIcon: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center" },
  successDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  pendingCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  pendingText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  doneBtn: { backgroundColor: "#315d93", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40 },
  doneBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
