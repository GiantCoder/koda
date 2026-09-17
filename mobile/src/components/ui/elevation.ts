import { Platform, StyleSheet, type ViewStyle } from "react-native";

/**
 * Soft elevation for product surfaces. Replaces the old 1px
 * `border-surface-secondary` depth cue. Dark surfaces keep a low-opacity
 * hairline because Android/iOS shadows read weakly on near-black fills.
 */
export function cardElevation(isDark: boolean, opts?: { clipped?: boolean }): ViewStyle {
  const hairline: ViewStyle = isDark
    ? {
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.08)",
      }
    : {
        borderWidth: 0,
        borderColor: "transparent",
      };

  if (opts?.clipped) {
    return hairline;
  }

  return {
    ...hairline,
    shadowColor: isDark ? "#000000" : "#1A1A2E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.4 : 0.08,
    shadowRadius: 10,
    elevation: Platform.OS === "android" ? 3 : 0,
  };
}

export function tileElevation(isDark: boolean): ViewStyle {
  return {
    ...cardElevation(isDark),
    shadowOpacity: isDark ? 0.35 : 0.06,
    shadowRadius: 8,
    elevation: Platform.OS === "android" ? 2 : 0,
  };
}
