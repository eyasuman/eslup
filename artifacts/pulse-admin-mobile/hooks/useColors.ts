import colors from "@/constants/colors";

/**
 * Always returns dark palette — Pulse Network is a dark-themed admin console.
 * Includes all design tokens plus `radius`.
 */
export function useColors() {
  const palette = (colors as unknown as Record<string, typeof colors.light>).dark ?? colors.light;
  return { ...palette, radius: colors.radius };
}
