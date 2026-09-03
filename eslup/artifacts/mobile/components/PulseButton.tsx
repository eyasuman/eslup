import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

interface PulseButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function PulseButton({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  style,
  fullWidth = false,
}: PulseButtonProps) {
  const colors = useColors();

  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const bgColor =
    variant === "primary"
      ? colors.primary
      : variant === "secondary"
      ? colors.secondary
      : variant === "danger"
      ? colors.destructive
      : "transparent";

  const textColor =
    variant === "primary" || variant === "danger"
      ? "#fff"
      : variant === "secondary"
      ? colors.secondaryForeground
      : variant === "outline"
      ? colors.primary
      : colors.foreground;

  const borderColor =
    variant === "outline" ? colors.primary : "transparent";

  const paddingH = size === "sm" ? 14 : size === "lg" ? 28 : 20;
  const paddingV = size === "sm" ? 8 : size === "lg" ? 16 : 12;
  const fontSize = size === "sm" ? 13 : size === "lg" ? 18 : 15;

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bgColor,
          borderColor,
          borderWidth: variant === "outline" ? 1.5 : 0,
          paddingHorizontal: paddingH,
          paddingVertical: paddingV,
          borderRadius: colors.radius,
          opacity: pressed ? 0.8 : disabled ? 0.5 : 1,
          alignSelf: fullWidth ? "stretch" : "flex-start",
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text
          style={[styles.text, { color: textColor, fontSize, fontFamily: "Inter_600SemiBold" }]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});
