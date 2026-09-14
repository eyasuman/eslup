import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

interface PulseHeaderProps {
  title?: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
  transparent?: boolean;
}

export function PulseHeader({
  title,
  showBack = false,
  rightElement,
  transparent = false,
}: PulseHeaderProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: topPad + 10,
          paddingBottom: 12,
          backgroundColor: transparent ? "transparent" : colors.background,
          borderBottomColor: transparent ? "transparent" : colors.border,
          borderBottomWidth: transparent ? 0 : 0.5,
        },
      ]}
    >
      <View style={styles.inner}>
        {showBack ? (
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.glass }]}
          >
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </Pressable>
        ) : (
          <View style={styles.logoContainer}>
            <Text style={[styles.pulse, { color: colors.primary }]}>PULSE</Text>
          </View>
        )}

        {title && (
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        )}

        <View style={styles.right}>{rightElement}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoContainer: {
    flex: 1,
  },
  pulse: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: 4,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  right: {
    marginLeft: "auto",
  },
});
