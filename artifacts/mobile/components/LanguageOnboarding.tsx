import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Language } from "@/context/AppContext";

const LANGUAGES: { id: Language; flag: string; native: string; label: string }[] = [
  { id: "en", flag: "🇺🇸", native: "English",      label: "English" },
  { id: "am", flag: "🇪🇹", native: "አማርኛ",         label: "Amharic" },
  { id: "om", flag: "🇪🇹", native: "Afaan Oromoo",  label: "Oromo" },
  { id: "ar", flag: "🇸🇦", native: "العربية",       label: "Arabic" },
  { id: "so", flag: "🇸🇴", native: "Soomaali",      label: "Somali" },
];

interface Props {
  onSelect: (lang: Language) => void;
}

export function LanguageOnboarding({ onSelect }: Props) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<Language>("en");

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect(selected);
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#202937", "#1a3356", "#315d93"]}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.inner, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Feather name="activity" size={36} color="#fff" />
          </View>
          <Text style={styles.logoText}>PULSE</Text>
          <Text style={styles.logoSub}>Healthcare Marketplace</Text>
        </View>

        {/* Title */}
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Choose Your Language</Text>
          <Text style={styles.subtitle}>
            Select the language you'd like to use throughout the app.{"\n"}
            You can change this anytime in your profile.
          </Text>
        </View>

        {/* Language options */}
        <View style={styles.langList}>
          {LANGUAGES.map((lang) => {
            const isActive = selected === lang.id;
            return (
              <Pressable
                key={lang.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelected(lang.id);
                }}
                style={[
                  styles.langRow,
                  isActive && styles.langRowActive,
                ]}
              >
                <Text style={styles.langFlag}>{lang.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.langNative, isActive && styles.langNativeActive]}>
                    {lang.native}
                  </Text>
                  <Text style={styles.langLabel}>{lang.label}</Text>
                </View>
                <View style={[styles.radio, isActive && styles.radioActive]}>
                  {isActive && <View style={styles.radioDot} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Continue button */}
        <Pressable onPress={handleContinue} style={styles.continueBtn}>
          <Text style={styles.continueBtnText}>Continue</Text>
          <Feather name="arrow-right" size={18} color="#202937" />
        </Pressable>

        <Text style={styles.hint}>ቋንቋ ይምረጡ · Afaan filachuu · اختر اللغة · Luqad dooro</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: {
    flexGrow: 1,
    paddingHorizontal: 24,
    gap: 28,
    justifyContent: "center",
    minHeight: "100%" as any,
  },
  logoWrap: { alignItems: "center", gap: 10 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
  },
  logoText: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 4,
  },
  logoSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 1.5,
  },
  titleWrap: { gap: 8 },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
    lineHeight: 20,
  },
  langList: { gap: 10 },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  langRowActive: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderColor: "rgba(255,255,255,0.5)",
  },
  langFlag: { fontSize: 28 },
  langNative: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.75)",
  },
  langNativeActive: { color: "#fff" },
  langLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)",
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { borderColor: "#fff" },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#fff",
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 16,
  },
  continueBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#202937",
  },
  hint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
  },
});
