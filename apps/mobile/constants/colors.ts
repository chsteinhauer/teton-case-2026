/**
 * Design tokens — every color in the app lives here.
 *
 * Dark theme in the style of chat apps like Discord: a few close greys for
 * depth (deepest = drawer, base = screens, raised = cards/headers), soft
 * off-white text, and one indigo accent. Components only use these semantic
 * names, so a light theme later is a matter of a second token set.
 *
 *   import { colors } from "@/constants/colors";
 *   backgroundColor: colors.background,
 */

export const colors = {
  // ---- Surfaces (darkest → lightest) ----
  backgroundDeep: "#1E1F22", // drawer, landing screen
  background: "#313338", // default screen background
  surface: "#2B2D31", // headers, cards, list rows
  surfaceRaised: "#383A40", // inputs, chips, row hover
  surfacePressed: "#404249", // press feedback
  overlay: "#00000099", // modal scrim

  // ---- Text ----
  text: "#F2F3F5",
  textSecondary: "#B5BAC1",
  textMuted: "#949BA4",
  textOnAccent: "#FFFFFF",

  // ---- Borders ----
  border: "#3F4147",

  // ---- Accent / status ----
  accent: "#5865F2", // primary buttons, active drawer item
  accentPressed: "#4752C4",
  success: "#23A55A", // online, you are talking
  warning: "#F0B232", // someone else is talking
  danger: "#F23F43", // offline, errors
} as const;

export type ColorToken = keyof typeof colors;
