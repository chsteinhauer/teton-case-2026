import { AudioContext } from "react-native-audio-api";

let ctx: AudioContext | null = null;

/** One playback context for the app, created on first use. */
export function getAudioContext(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}
