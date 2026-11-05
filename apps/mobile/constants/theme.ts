import { DarkTheme } from "expo-router";
import { colors } from "./colors";

/** React Navigation theme: headers, drawer, and screen backgrounds. */
export const navigationTheme: typeof DarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
  },
};
