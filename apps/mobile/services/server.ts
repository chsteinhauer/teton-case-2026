import { DEFAULT_SERVER_PORT, WS_PATH } from "@walkie/shared";
import Constants from "expo-constants";

/**
 * Where the server lives.
 *
 * In development this defaults to the machine running Metro, so the iOS
 * simulator *and* a physical phone on the same Wi-Fi both reach the server
 * started with `npm run server` on your Mac. Override with
 * EXPO_PUBLIC_SERVER_URL (e.g. "http://192.168.1.10:3000") in .env.local.
 */
function resolveHttpUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_SERVER_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  // hostUri looks like "192.168.1.23:8081" — the dev machine's LAN address.
  const host = Constants.expoConfig?.hostUri?.split(":")[0] ?? "localhost";
  return `http://${host}:${DEFAULT_SERVER_PORT}`;
}

export const SERVER_HTTP_URL = resolveHttpUrl();
export const SERVER_WS_URL = SERVER_HTTP_URL.replace(/^http/, "ws") + WS_PATH;
