import React from "react";
import { AppContext } from "@/context/AppContext";
import colors from "@/constants/colors";

export function useColors() {
  const ctx = React.useContext(AppContext);
  const isDark = ctx?.isDark ?? false;
  const palette = isDark ? colors.dark : colors.light;
  return {
    ...palette,
    radius: colors.radius,
    gradientDark: colors.gradientDark,
    isDark,
  };
}
