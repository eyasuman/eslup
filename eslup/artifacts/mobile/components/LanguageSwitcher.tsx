import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { useLanguage, AVAILABLE_LANGUAGES, LanguageInfo } from "@/hooks/useLanguage";
import { Language } from "@/context/AppContext";

interface LanguageSwitcherProps {
  compact?: boolean;
}

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const colors = useColors();
  const { currentLanguageInfo, changeLanguage, isRTL } = useLanguage();
  const [visible, setVisible] = useState(false);

  const bg = colors.isDark ? colors.background : "#FFFFFF";
  const cardBg = colors.isDark ? "rgba(255,255,255,0.06)" : "#F4F7FB";
  const borderCol = colors.isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0";
  const textPrimary = colors.isDark ? "#FFFFFF" : "#202937";
  const textMuted = colors.isDark ? "#94A3B8" : "#64748B";

  const handleSelect = (lang: LanguageInfo) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    changeLanguage(lang.id as Language);
    setVisible(false);
  };

  return (
    <>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setVisible(true);
        }}
        style={[
          styles.trigger,
          {
            backgroundColor: cardBg,
            borderColor: borderCol,
            flexDirection: isRTL ? "row-reverse" : "row",
          },
        ]}
      >
        <Text style={styles.flag}>{currentLanguageInfo.flag}</Text>
        {!compact && (
          <Text style={[styles.triggerText, { color: textPrimary }]}>
            {currentLanguageInfo.native}
          </Text>
        )}
        <Feather name="chevron-down" size={14} color={textMuted} />
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View style={[styles.sheet, { backgroundColor: bg, borderColor: borderCol }]}>
            <View style={[styles.sheetHeader, { borderBottomColor: borderCol }]}>
              <Text style={[styles.sheetTitle, { color: textPrimary }]}>Select Language</Text>
              <Pressable onPress={() => setVisible(false)}>
                <Feather name="x" size={20} color={textMuted} />
              </Pressable>
            </View>

            {AVAILABLE_LANGUAGES.map((lang) => {
              const isSelected = lang.id === currentLanguageInfo.id;
              return (
                <Pressable
                  key={lang.id}
                  onPress={() => handleSelect(lang)}
                  style={[
                    styles.langRow,
                    {
                      backgroundColor: isSelected ? colors.primary + "15" : "transparent",
                      borderBottomColor: borderCol,
                      flexDirection: isRTL ? "row-reverse" : "row",
                    },
                  ]}
                >
                  <Text style={styles.langFlag}>{lang.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.langNative, { color: textPrimary, textAlign: isRTL ? "right" : "left" }]}>
                      {lang.native}
                    </Text>
                    <Text style={[styles.langLabel, { color: textMuted, textAlign: isRTL ? "right" : "left" }]}>
                      {lang.label}
                    </Text>
                  </View>
                  {isSelected && (
                    <Feather name="check" size={18} color={colors.primary} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  flag: { fontSize: 18 },
  triggerText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  sheet: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 0.5,
  },
  sheetTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderBottomWidth: 0.5,
  },
  langFlag: { fontSize: 26 },
  langNative: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  langLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
