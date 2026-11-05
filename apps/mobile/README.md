# Mobile app

Expo SDK 58 + Expo Router (drawer navigator). Runs as a **development build** (`expo-dev-client`), not Expo Go.

Run all commands from the repo root unless noted.

## iOS simulator

```bash
npm run ios            # prebuild, build, install, start Metro
```

## Android phone (USB)

1. On the phone: **Developer options** → **USB debugging**.
2. Plug in and accept the prompt. Check with `adb devices`.
3. `npm run android`

After the first install, `npm run mobile` (Metro only) is enough. Rebuild only when native dependencies or `app.json` change.

## Native folders

`ios/` and `android/` are generated (Continuous Native Generation) and git-ignored. Configure native behaviour in `app.json`.

`expo run:ios|android` does **not** regenerate a folder that already exists. After adding a config plugin or changing permissions in `app.json`, regenerate first (in this folder), then rebuild:

```bash
npx expo prebuild            # or --clean to start from scratch
```

## Server URL

[services/server.ts](services/server.ts) defaults to `http://<Metro host IP>:3000`, so the simulator and a phone on the same Wi-Fi both reach `npm run server`. Override with `EXPO_PUBLIC_SERVER_URL` in `apps/mobile/.env.local`.

## Structure

```
app/                File-based routes
  _layout.tsx       Fonts, splash, drawer navigator
  index.tsx         Landing screen
  (drawer)/home     Push-to-talk screen
  (drawer)/settings Settings + __DEV__-only diagnostics
components/  constants/  hooks/  services/  utils/
```
