/**
 * Design tokens — every color in the app lives here.
 *
 * React Native has no CSS custom properties, so these are plain constants
 * imported into StyleSheet.create(...) calls and color props:
 *
 *   import { colors } from "@/constants/colors";
 *   backgroundColor: colors.background,
 */

export const colors = {
  // ---- Surfaces ----
  background: "white",
  backgroundInverse: "black",
  surface: "#ececec",
  surfaceMuted: "#dbdbdb",
  overlay: "#00000030",

  // ---- Text ----
  text: "black",
  textInverse: "white",
  textSecondary: "#404040",
  textMuted: "#888888",

  // ---- Borders ----
  border: "#e7e7e7",
  borderStrong: "#9b9b9b",

  // ---- Accents / status ----
  accent: "#b53900",
  danger: "red",
} as const;

export type ColorToken = keyof typeof colors;
