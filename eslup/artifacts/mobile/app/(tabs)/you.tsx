import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp, Language, UserRole } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { signIn, signUp, signOut as supabaseSignOut, getDoctorByUserId, getInstitutionByUserId, signInWithPhone, signUpWithPhone } from "@/lib/supabase";
import { useTranslation } from "@/constants/translations";

const LANGUAGES: { id: Language; label: string; native: string; flag: string }[] = [
  { id: "en", label: "English",     native: "English",      flag: "🇺🇸" },
  { id: "am", label: "Amharic",     native: "አማርኛ",         flag: "🇪🇹" },
  { id: "om", label: "Afaan Oromo", native: "Afaan Oromoo",  flag: "🇪🇹" },
  { id: "ar", label: "Arabic",      native: "العربية",       flag: "🇸🇦" },
  { id: "so", label: "Somali",      native: "Soomaali",      flag: "🇸🇴" },
];

type AuthMode = "select" | "client-login" | "client-register" | "provider-login" | "provider-register" | "institute-login";

export default function YouScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, userRole, setUserRole, setUser, isDark, toggleTheme, language, setLanguage, bookings } = useApp();
  const t = useTranslation(language);
  const isRTL = language === "ar";

  const [authMode, setAuthMode] = useState<AuthMode>("select");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);
  // Providers can choose to sign in with email or phone number
  const [providerLoginMethod, setProviderLoginMethod] = useState<"email" | "phone">("email");
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) { setEmailError("Email is required"); return false; }
    if (!re.test(email)) { setEmailError("Enter a valid email address"); return false; }
    setEmailError(""); return true;
  };

  const isValidEthiopianPhone = (p: string) => {
    const clean = p.replace(/\s/g, "");
    return /^0[79]\d{8}$/.test(clean) || /^\+2519\d{8}$/.test(clean) || /^\+2517\d{8}$/.test(clean);
  };

  const validatePhone = (p: string) => {
    if (!p) { setEmailError("Phone number is required"); return false; }
    if (!isValidEthiopianPhone(p)) { setEmailError("Enter a valid Ethiopian number: 09XXXXXXXX or +251…"); return false; }
    setEmailError(""); return true;
  };

  const validatePassword = (pw: string) => {
    if (!pw) { setPasswordError("Password is required"); return false; }
    if (pw.length < 6) { setPasswordError("Password must be at least 6 characters"); return false; }
    setPasswordError(""); return true;
  };

  const bg = colors.isDark ? colors.background : "#FFFFFF";
  const textPrimary = colors.isDark ? "#FFFFFF" : "#202937";
  const textMuted = colors.isDark ? "#94A3B8" : "#64748B";
  const cardBg = colors.isDark ? "rgba(255,255,255,0.06)" : "#F4F7FB";
  const borderCol = colors.isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0";
  const inputBg = colors.isDark ? "rgba(255,255,255,0.08)" : "#F4F7FB";

  const handleLogin = async (selectedRole: UserRole) => {
    const isClientMode = authMode === "client-login";
    const isInstituteMode = authMode === "institute-login";
    // Clients use phone; providers use email or phone; institutes use email only
    const usePhone = isClientMode || (!isInstituteMode && providerLoginMethod === "phone");

    if (usePhone) {
      if (!validatePhone(form.phone) || !validatePassword(form.password)) return;
    } else {
      if (!validateEmail(form.email) || !validatePassword(form.password)) return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      let userId = Date.now().toString();
      let userName = usePhone ? "User" : form.email.split("@")[0];
      let userPhone = usePhone ? form.phone : "";
      let resolvedRole: UserRole = selectedRole;
      let doctorStatus: string | undefined;
      let instituteStatus: string | undefined;

      try {
        const data = usePhone
          ? await signInWithPhone(form.phone, form.password)
          : await signIn(form.email, form.password);

        if (data.user) {
          userId = data.user.id;
          userName = data.user.user_metadata?.name ?? userName;
          if (data.user.user_metadata?.phone) userPhone = data.user.user_metadata.phone;

          if (isInstituteMode) {
            // Institute login — look up institutions table
            try {
              const instProfile = await getInstitutionByUserId(userId);
              if (instProfile) {
                userName = instProfile.name ?? userName;
                userPhone = instProfile.phone ?? userPhone;
                resolvedRole = "institute";
                instituteStatus = instProfile.status;
                if (instProfile.status === "Pending") {
                  Alert.alert("Account Pending", "Your institute is pending admin approval. You'll be notified once it's active.", [{ text: "OK" }]);
                } else if (instProfile.status === "Declined") {
                  Alert.alert("Account Declined", "Your institute application was declined. Please update your information.", [{ text: "OK" }]);
                }
              } else {
                Alert.alert("No Institute Found", "No institute account found for this email. Please register first.");
                setLoading(false);
                return;
              }
            } catch {
              Alert.alert("Login Failed", "Could not verify your institute account. Please try again.");
              setLoading(false);
              return;
            }
          } else {
            try {
              const doctorProfile = await getDoctorByUserId(userId);
              if (doctorProfile) {
                userName = doctorProfile.name ?? userName;
                if (!userPhone) userPhone = doctorProfile.phone ?? "";
                resolvedRole = "provider";
                doctorStatus = doctorProfile.status;
                if (doctorProfile.status === "Pending") {
                  Alert.alert("Account Pending", "Your provider account is pending admin approval. You can still use client features while waiting.", [{ text: "OK" }]);
                } else if (doctorProfile.status === "Declined") {
                  Alert.alert("Account Declined", "Your provider application was declined. Please contact support.", [{ text: "OK" }]);
                }
              } else {
                resolvedRole = "client";
              }
            } catch {
              resolvedRole = "client";
            }
          }
        }
      } catch (err: any) {
        const loginMsg: string = err?.message ?? String(err);
        if (loginMsg.includes("Invalid login credentials") || loginMsg.includes("invalid_credentials")) {
          Alert.alert("Login Failed", usePhone ? "Incorrect phone number or password." : "Incorrect email or password. Please try again.");
          setLoading(false);
          return;
        }
        if (loginMsg.includes("Email not confirmed") || loginMsg.includes("email_not_confirmed")) {
          Alert.alert("Email Not Confirmed", "Please check your inbox and confirm your email address before logging in.");
          setLoading(false);
          return;
        }
        Alert.alert("Login Failed", loginMsg || "Could not sign in. Please try again.");
        setLoading(false);
        return;
      }

      await setUser({ id: userId, name: userName, email: usePhone ? "" : form.email, phone: userPhone, role: resolvedRole, doctorStatus, instituteStatus });
      await setUserRole(resolvedRole);

      if (resolvedRole === "institute") {
        if (instituteStatus === "Active") router.replace("/(institute)/institute-dashboard");
        else router.replace("/(institute)/institute-status");
      } else {
        setAuthMode("select");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (role: UserRole) => {
    if (role === "provider") {
      router.push("/(provider)/provider-register");
      return;
    }

    // Client registration — phone-based only
    if (!form.name.trim()) { Alert.alert("Missing fields", "Please enter your name."); return; }
    if (!validatePhone(form.phone) || !validatePassword(form.password)) return;

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      let userId = Date.now().toString();
      try {
        const data = await signUpWithPhone(form.phone, form.password, form.name, "client");
        if (data.user) userId = data.user.id;
      } catch (err: any) {
        const regMsg: string = err?.message ?? String(err);
        if (regMsg.includes("already registered") || regMsg.includes("already been registered") || regMsg.includes("already exists")) {
          Alert.alert("Number already registered", "This phone number is already registered. Please sign in instead.");
          setLoading(false);
          return;
        }
        // Non-fatal: proceed with local userId
      }
      await setUser({ id: userId, name: form.name, email: "", phone: form.phone, role: "client" });
      await setUserRole("client");
      setAuthMode("select");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(t("sign_out"), "Are you sure you want to sign out?", [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("sign_out"), style: "destructive",
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          try { await supabaseSignOut(); } catch {}
          await setUser(null);
          await setUserRole(null);
          setAuthMode("select");
        },
      },
    ]);
  };

  // ── LOGGED IN ─────────────────────────────────────────────────────────────
  if (user) {
    const isPendingProvider = userRole === "provider" && user.doctorStatus === "Pending";
    const isPendingInstitute = userRole === "institute" && user.instituteStatus === "Pending";
    const headerBg = userRole === "institute" ? "#0D9488" : "#202937";
    const roleAccent = userRole === "institute" ? "#0D9488" : "#315d93";

    const quickActions = [
      { icon: "bell", label: t("notification_title"), onPress: () => router.push("/notifications") },
      ...(userRole === "institute"
        ? [{
            icon: "home",
            label: "Institute Dashboard",
            onPress: () => {
              if (user?.instituteStatus === "Active") router.push("/(institute)/institute-dashboard");
              else router.push("/(institute)/institute-status");
            }
          }]
        : userRole === "client"
        ? [
            { icon: "calendar", label: t("my_appointments"), onPress: () => router.push("/appointments") },
            { icon: "heart", label: t("edd_calculator"), onPress: () => router.push("/edd-calculator") },
            { icon: "activity", label: t("become_provider"), onPress: () => router.push("/(provider)/provider-register") },
          ]
        : [
            { icon: "calendar", label: t("my_appointments"), onPress: () => router.push("/appointments") },
            { icon: "heart", label: t("edd_calculator"), onPress: () => router.push("/edd-calculator") },
            { icon: "grid", label: t("provider_dashboard"), onPress: () => router.push("/(provider)/provider-dashboard") },
          ]),
    ];

    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: bottomPad + 110 }}
        >
          {/* Profile Header */}
          <View style={[styles.profileHeader, { paddingTop: topPad + 20, backgroundColor: headerBg }]}>
            <View style={[styles.avatarCircle, { backgroundColor: roleAccent }]}>
              <Text style={styles.avatarInitials}>
                {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.profileName}>{user.name}</Text>
            <View style={[styles.roleBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              <Text style={styles.roleText}>
                {userRole === "client" ? t("client") : userRole === "institute" ? "Healthcare Institute" : "Healthcare Provider"}
              </Text>
            </View>
            {(isPendingProvider || isPendingInstitute) && (
              <View style={[styles.pendingBadge]}>
                <Feather name="clock" size={12} color="#D97706" />
                <Text style={styles.pendingBadgeText}>Pending Approval</Text>
              </View>
            )}
            <Text style={styles.profileEmail}>
              {user.phone ? `📱 ${user.phone}` : user.email ? `✉️ ${user.email}` : ""}
            </Text>
          </View>

          {/* Stats Row */}
          <View style={[styles.statsRow, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: textPrimary }]}>{bookings.length}</Text>
              <Text style={[styles.statLabel, { color: textMuted }]}>{t("bookings")}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: borderCol }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: textPrimary }]}>
                {bookings.filter((b) => b.status === "completed").length}
              </Text>
              <Text style={[styles.statLabel, { color: textMuted }]}>{t("completed")}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: borderCol }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: textPrimary }]}>
                {bookings.filter((b) => b.status === "pending").length}
              </Text>
              <Text style={[styles.statLabel, { color: textMuted }]}>{t("pending")}</Text>
            </View>
          </View>

          <View style={{ paddingHorizontal: 20, gap: 12, marginTop: 12 }}>
            {/* Quick Actions */}
            <Text style={[styles.sectionTitle, { color: textPrimary, textAlign: isRTL ? "right" : "left" }]}>{t("quick_actions")}</Text>
            {quickActions.map((item) => (
              <Pressable
                key={item.label}
                onPress={item.onPress}
                style={({ pressed }) => [
                  styles.menuItem,
                  { backgroundColor: cardBg, borderColor: borderCol, opacity: pressed ? 0.8 : 1, flexDirection: isRTL ? "row-reverse" : "row" },
                ]}
              >
                <View style={[styles.menuIcon, { backgroundColor: "#315d93" + "15" }]}>
                  <Feather name={item.icon as any} size={18} color="#315d93" />
                </View>
                <Text style={[styles.menuLabel, { color: textPrimary, textAlign: isRTL ? "right" : "left" }]}>{item.label}</Text>
                <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={16} color={textMuted} />
              </Pressable>
            ))}

            {/* Settings */}
            <Text style={[styles.sectionTitle, { color: textPrimary, marginTop: 8, textAlign: isRTL ? "right" : "left" }]}>{t("settings")}</Text>

            {/* Language */}
            <Pressable
              onPress={() => setShowLangPicker((v) => !v)}
              style={[styles.menuItem, { backgroundColor: cardBg, borderColor: borderCol, flexDirection: isRTL ? "row-reverse" : "row" }]}
            >
              <View style={[styles.menuIcon, { backgroundColor: "#315d93" + "15" }]}>
                <Feather name="globe" size={18} color="#315d93" />
              </View>
              <Text style={[styles.menuLabel, { color: textPrimary, textAlign: isRTL ? "right" : "left" }]}>{t("language")}</Text>
              <Text style={[styles.menuValue, { color: textMuted }]}>{LANGUAGES.find((l) => l.id === language)?.native ?? "English"}</Text>
              <Feather name={showLangPicker ? "chevron-up" : "chevron-down"} size={16} color={textMuted} />
            </Pressable>
            {showLangPicker && (
              <View style={[styles.langPicker, { backgroundColor: cardBg, borderColor: borderCol }]}>
                {LANGUAGES.map((lang) => (
                  <Pressable
                    key={lang.id}
                    onPress={() => { setLanguage(lang.id); setShowLangPicker(false); }}
                    style={[styles.langOption, { borderBottomColor: borderCol, flexDirection: isRTL ? "row-reverse" : "row" }]}
                  >
                    <Text style={[styles.langNative, { color: textPrimary, textAlign: isRTL ? "right" : "left" }]}>{lang.native}</Text>
                    <Text style={[styles.langLabel, { color: textMuted }]}>{lang.label}</Text>
                    {language === lang.id && <Feather name="check" size={16} color="#315d93" />}
                  </Pressable>
                ))}
              </View>
            )}

            {/* Dark Mode */}
            <View style={[styles.menuItem, { backgroundColor: cardBg, borderColor: borderCol, flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={[styles.menuIcon, { backgroundColor: "#315d93" + "15" }]}>
                <Feather name={isDark ? "moon" : "sun"} size={18} color="#315d93" />
              </View>
              <Text style={[styles.menuLabel, { color: textPrimary, textAlign: isRTL ? "right" : "left" }]}>{t("dark_mode")}</Text>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: "#E2E8F0", true: "#315d93" }}
                thumbColor="#fff"
              />
            </View>

            {/* Sign Out */}
            <Pressable
              onPress={handleSignOut}
              style={({ pressed }) => [styles.signOutBtn, { borderColor: "#DC2626", opacity: pressed ? 0.8 : 1, flexDirection: isRTL ? "row-reverse" : "row" }]}
            >
              <Feather name="log-out" size={18} color="#DC2626" />
              <Text style={styles.signOutText}>{t("sign_out")}</Text>
            </Pressable>

            <Text style={[styles.version, { color: textMuted }]}>PULSE Health-Tech Solution · v1.0.0</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── AUTH FORMS ─────────────────────────────────────────────────────────────
  if (authMode !== "select") {
    const isClient = authMode.startsWith("client");
    const isInstitute = authMode.startsWith("institute");
    const isLogin = authMode.endsWith("login");
    const role: UserRole = isClient ? "client" : isInstitute ? "institute" : "provider";
    const formAccent = isInstitute ? "#0D9488" : isClient ? "#315d93" : "#202937";
    const formIcon = isInstitute ? "home" : isClient ? "user" : "activity";
    const formSubtitle = isInstitute ? "I'm an Institute" : isClient ? t("im_client") : t("im_provider");

    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 24, paddingTop: topPad + 20, paddingBottom: bottomPad + 110 }}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => setAuthMode("select")} style={[styles.backBtn, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={20} color={textPrimary} />
            <Text style={[styles.backText, { color: textPrimary }]}>{t("back")}</Text>
          </Pressable>

          <View style={styles.authHeader}>
            <View style={[styles.authRoleIcon, { backgroundColor: formAccent }]}>
              <Feather name={formIcon as any} size={32} color="#fff" />
            </View>
            <Text style={[styles.authTitle, { color: textPrimary }]}>
              {isLogin ? t("sign_in") : t("create_account")}
            </Text>
            <Text style={[styles.authSubtitle, { color: textMuted }]}>{formSubtitle}</Text>
          </View>

          <View style={{ gap: 14 }}>
            {!isLogin && !isInstitute && (
              <View>
                <Text style={[styles.inputLabel, { color: textMuted, textAlign: isRTL ? "right" : "left" }]}>{t("name")} *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, borderColor: borderCol, color: textPrimary, textAlign: isRTL ? "right" : "left" }]}
                  placeholder="e.g. Abebe Girma"
                  placeholderTextColor={textMuted}
                  autoCapitalize="words"
                  value={form.name}
                  onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
                />
              </View>
            )}

            {/* ── Provider login method toggle (provider only) ── */}
            {!isClient && !isInstitute && (
              <View style={{ gap: 8 }}>
                <Text style={[styles.inputLabel, { color: textMuted }]}>Sign in with</Text>
                <View style={[styles.methodToggle, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9", borderColor: borderCol }]}>
                  {(["email", "phone"] as const).map((m) => (
                    <Pressable
                      key={m}
                      onPress={() => { setProviderLoginMethod(m); setEmailError(""); }}
                      style={[styles.methodBtn, providerLoginMethod === m && { backgroundColor: "#315d93" }]}
                    >
                      <Feather name={m === "email" ? "mail" : "phone"} size={14} color={providerLoginMethod === m ? "#fff" : textMuted} />
                      <Text style={[styles.methodBtnText, { color: providerLoginMethod === m ? "#fff" : textMuted }]}>
                        {m === "email" ? "Email" : "Phone"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* ── Phone field (clients always; providers when phone selected) ── */}
            {(isClient || (!isInstitute && providerLoginMethod === "phone")) && (
              <View>
                <Text style={[styles.inputLabel, { color: textMuted, textAlign: isRTL ? "right" : "left" }]}>Phone Number *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, borderColor: emailError ? "#DC2626" : borderCol, color: textPrimary, textAlign: isRTL ? "right" : "left" }]}
                  placeholder="e.g. 0911234567"
                  placeholderTextColor={textMuted}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={14}
                  value={form.phone}
                  onChangeText={(v) => { setForm((p) => ({ ...p, phone: v.replace(/[^\d+\s]/g, "") })); if (emailError) validatePhone(v); }}
                />
                {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
              </View>
            )}

            {/* ── Email field (providers email mode OR institutes always) ── */}
            {(isInstitute || (!isClient && providerLoginMethod === "email")) && (
              <View>
                <Text style={[styles.inputLabel, { color: textMuted, textAlign: isRTL ? "right" : "left" }]}>
                  {isInstitute ? "Official Email *" : `${t("email")} *`}
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, borderColor: emailError ? "#DC2626" : borderCol, color: textPrimary, textAlign: isRTL ? "right" : "left" }]}
                  placeholder={isInstitute ? "info@yourinstitute.com" : "your@email.com"}
                  placeholderTextColor={textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={form.email}
                  onChangeText={(v) => { setForm((p) => ({ ...p, email: v })); if (emailError) validateEmail(v); }}
                />
                {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
              </View>
            )}

            <View>
              <Text style={[styles.inputLabel, { color: textMuted, textAlign: isRTL ? "right" : "left" }]}>{t("password")} *</Text>
              <View style={[styles.passwordRow, { backgroundColor: inputBg, borderColor: passwordError ? "#DC2626" : borderCol, flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <TextInput
                  style={[styles.passwordInput, { color: textPrimary, textAlign: isRTL ? "right" : "left" }]}
                  placeholder={isLogin ? "Your password" : "Min. 6 characters"}
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

            <Pressable
              onPress={() => isLogin ? handleLogin(role) : handleRegister(role)}
              disabled={loading}
              style={({ pressed }) => [styles.authBtn, { backgroundColor: formAccent, opacity: loading || pressed ? 0.8 : 1 }]}
            >
              {loading ? (
                <Text style={styles.authBtnText}>{t("please_wait")}</Text>
              ) : (
                <>
                  <Feather name={isLogin ? "log-in" : "user-plus"} size={18} color="#fff" />
                  <Text style={styles.authBtnText}>{isLogin ? t("sign_in") : t("create_account")}</Text>
                </>
              )}
            </Pressable>

            {/* For institutes: register directs to full registration screen */}
            {isInstitute && isLogin && (
              <Pressable onPress={() => router.push("/(institute)/institute-register")} style={styles.switchLink}>
                <Text style={[styles.switchText, { color: textMuted }]}>
                  {t("dont_have_account") + " "}
                  <Text style={{ color: "#0D9488", fontFamily: "Inter_600SemiBold" }}>{t("register")}</Text>
                </Text>
              </Pressable>
            )}

            {!isInstitute && (
              <Pressable
                onPress={() => setAuthMode(isLogin
                  ? (isClient ? "client-register" : "provider-register")
                  : (isClient ? "client-login" : "provider-login")
                )}
                style={styles.switchLink}
              >
                <Text style={[styles.switchText, { color: textMuted }]}>
                  {isLogin ? t("dont_have_account") + " " : t("already_have_account") + " "}
                  <Text style={{ color: formAccent, fontFamily: "Inter_600SemiBold" }}>
                    {isLogin ? t("register") : t("sign_in")}
                  </Text>
                </Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── ROLE SELECTION ─────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 110 }}
      >
        <View style={[styles.heroSection, { paddingTop: topPad + 20 }]}>
          <View style={styles.heroBadge}>
            <Feather name="user" size={40} color="#fff" />
          </View>
          <Text style={[styles.heroTitle, { color: textPrimary }]}>Welcome to PULSE</Text>
          <Text style={[styles.heroSub, { color: textMuted }]}>
            Ethiopia's trusted health-tech platform.{"\n"}Sign in to access your account.
          </Text>
        </View>

        <View style={{ paddingHorizontal: 20, gap: 14 }}>
          {/* Client */}
          <View style={[styles.roleCard, { backgroundColor: cardBg, borderColor: borderCol, flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.roleIconWrap, { backgroundColor: "#315d93" + "15" }]}>
              <Feather name="user" size={28} color="#315d93" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.roleTitle, { color: textPrimary, textAlign: isRTL ? "right" : "left" }]}>{t("im_client")}</Text>
              <Text style={[styles.roleDesc, { color: textMuted, textAlign: isRTL ? "right" : "left" }]}>Book doctors, track appointments, access teleradiology</Text>
            </View>
            <View style={{ gap: 8 }}>
              <Pressable onPress={() => { setAuthMode("client-login"); setForm({ name: "", email: "", phone: "", password: "" }); setEmailError(""); setPasswordError(""); }} style={[styles.roleBtn, { backgroundColor: "#315d93" }]}>
                <Text style={styles.roleBtnText}>{t("sign_in")}</Text>
              </Pressable>
              <Pressable onPress={() => { setAuthMode("client-register"); setForm({ name: "", email: "", phone: "", password: "" }); setEmailError(""); setPasswordError(""); }} style={[styles.roleBtnOutline, { borderColor: "#315d93" }]}>
                <Text style={[styles.roleBtnOutlineText, { color: "#315d93" }]}>{t("register")}</Text>
              </Pressable>
            </View>
          </View>

          {/* Provider */}
          <View style={[styles.roleCard, { backgroundColor: cardBg, borderColor: borderCol, flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.roleIconWrap, { backgroundColor: "#202937" + "15" }]}>
              <Feather name="activity" size={28} color="#202937" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.roleTitle, { color: textPrimary, textAlign: isRTL ? "right" : "left" }]}>{t("im_provider")}</Text>
              <Text style={[styles.roleDesc, { color: textMuted, textAlign: isRTL ? "right" : "left" }]}>Manage appointments, patients & radiology cases</Text>
            </View>
            <View style={{ gap: 8 }}>
              <Pressable onPress={() => { setAuthMode("provider-login"); setForm({ name: "", email: "", phone: "", password: "" }); setEmailError(""); setPasswordError(""); setProviderLoginMethod("email"); }} style={[styles.roleBtn, { backgroundColor: "#202937" }]}>
                <Text style={styles.roleBtnText}>{t("sign_in")}</Text>
              </Pressable>
              <Pressable onPress={() => router.push("/(provider)/provider-register")} style={[styles.roleBtnOutline, { borderColor: "#202937" }]}>
                <Text style={[styles.roleBtnOutlineText, { color: "#202937" }]}>{t("register")}</Text>
              </Pressable>
            </View>
          </View>

          {/* Institute */}
          <View style={[styles.roleCard, { backgroundColor: cardBg, borderColor: borderCol, flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.roleIconWrap, { backgroundColor: "#0D948815" }]}>
              <Feather name="home" size={28} color="#0D9488" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.roleTitle, { color: textPrimary, textAlign: isRTL ? "right" : "left" }]}>I'm an Institute</Text>
              <Text style={[styles.roleDesc, { color: textMuted, textAlign: isRTL ? "right" : "left" }]}>Register your clinic, hospital or healthcare facility</Text>
            </View>
            <View style={{ gap: 8 }}>
              <Pressable
                onPress={() => { setAuthMode("institute-login"); setForm({ name: "", email: "", phone: "", password: "" }); setEmailError(""); setPasswordError(""); }}
                style={[styles.roleBtn, { backgroundColor: "#0D9488" }]}
              >
                <Text style={styles.roleBtnText}>{t("sign_in")}</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push("/(institute)/institute-register")}
                style={[styles.roleBtnOutline, { borderColor: "#0D9488" }]}
              >
                <Text style={[styles.roleBtnOutlineText, { color: "#0D9488" }]}>{t("register")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroSection: { alignItems: "center", padding: 32, paddingBottom: 20, gap: 12 },
  heroBadge: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#315d93", alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center" },
  heroSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  roleCard: { alignItems: "center", gap: 14, padding: 16, borderRadius: 16, borderWidth: 1 },
  roleIconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  roleTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 4 },
  roleDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  roleBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, alignItems: "center" },
  roleBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  roleBtnOutline: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  roleBtnOutlineText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  profileHeader: { alignItems: "center", padding: 24, paddingBottom: 28, gap: 8 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#315d93", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  avatarInitials: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff" },
  profileName: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  roleText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#fff" },
  pendingBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#D97706" + "20", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pendingBadgeText: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#D97706" },
  profileEmail: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  statsRow: { flexDirection: "row", margin: 20, borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  statItem: { flex: 1, alignItems: "center", padding: 16, gap: 4 },
  statVal: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statDivider: { width: 1, marginVertical: 12 },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  menuItem: { alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  menuIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  menuValue: { fontSize: 13, fontFamily: "Inter_400Regular" },
  langPicker: { borderRadius: 12, borderWidth: 1, overflow: "hidden", marginTop: -8 },
  langOption: { alignItems: "center", padding: 14, borderBottomWidth: 1, gap: 10 },
  langNative: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  langLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  signOutBtn: { alignItems: "center", justifyContent: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  signOutText: { color: "#DC2626", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  version: { textAlign: "center", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 8 },
  backBtn: { alignItems: "center", gap: 8, marginBottom: 24 },
  backText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  authHeader: { alignItems: "center", marginBottom: 28, gap: 10 },
  authRoleIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  authTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  authSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular" },
  inputLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 6 },
  input: { height: 52, borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, fontSize: 15, fontFamily: "Inter_400Regular" },
  passwordRow: { alignItems: "center", borderRadius: 14, borderWidth: 1, paddingLeft: 16 },
  passwordInput: { flex: 1, height: 52, fontSize: 15, fontFamily: "Inter_400Regular" },
  eyeBtn: { width: 44, height: 52, alignItems: "center", justifyContent: "center" },
  errorText: { color: "#DC2626", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 },
  authBtn: { height: 54, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  authBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  switchLink: { alignItems: "center", paddingVertical: 8 },
  switchText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  methodToggle: { flexDirection: "row", borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  methodBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 8 },
  methodBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
