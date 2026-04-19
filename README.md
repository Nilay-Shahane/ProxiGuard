# ProxiGuard

ProxiGuard is an Expo React Native app with two core features:

- Wake Me Up: location-based destination alarm.
- Bag Guard: Bluetooth Low Energy (BLE) distance-based bag alert.

This guide is written so you can set up, run, and keep the app working reliably from scratch.

## 1) What Works Where

- Expo Go:
  - Wake Me Up works.
  - Bag Guard runs in simulation mode (not real BLE hardware scanning).
- Expo Development Build / Production Build:
  - Wake Me Up works.
  - Bag Guard real BLE scanning works.

Real BLE scanning requires a custom native runtime, which means development build or production build, not Expo Go.

## 2) Prerequisites

Install these once:

- Node.js LTS (18 or 20 recommended)
- npm (comes with Node)
- Expo CLI via npx (no global install required)
- EAS CLI:

```bash
npm install -g eas-cli
```

For Android builds:

- Expo account (`eas login`)
- Android phone for testing (for BLE tests)

## 3) Fresh Install

From project root:

```bash
npm install
```

## 4) Environment Setup

Copy `.env.example` to `.env` and fill values:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Required values in `.env`:

- `GOOGLE_MAPS_API_KEY`

Recommended values in `.env`:

- `EXPO_ANDROID_PACKAGE`
- `EXPO_IOS_BUNDLE_ID`

The app reads these in `app.config.js` and injects native config at build time.

## 5) Google Maps API Key (Easy Setup)

Create key in Google Cloud Console:

1. Open Google Cloud Console.
2. Create/select project.
3. Enable APIs:
   - Maps SDK for Android
   - Maps SDK for iOS (if building iOS)
4. Create API key.
5. Add restrictions:
   - Application restriction: Android apps / iOS apps (recommended for production)
   - API restriction: only Maps SDK APIs you use
6. Put key in `.env`:

```env
GOOGLE_MAPS_API_KEY=YOUR_REAL_KEY
```

## 6) Verify Config Before Running

Check project health:

```bash
npx expo-doctor
```

Check resolved Expo config:

```bash
npx expo config
```

In output, verify:

- `android.config.googleMaps.apiKey` exists
- package/bundle identifiers are correct

## 7) Run Modes

### A) Quick test in Expo Go

```bash
npx expo start --go -c
```

Notes:

- Good for UI and geofence flow.
- Bag Guard is simulation in Expo Go.

### B) Real BLE testing (recommended)

Build development client (Android):

```bash
eas build --profile development --platform android
```

Install the generated app on phone, then run Metro for dev client:

```bash
npx expo start --dev-client -c
```

Open the project from the installed Dev Client app.

## 8) EAS Build Profiles

Profiles in `eas.json`:

- `development`: internal dev client build
- `preview`: internal test build
- `production`: release build with auto version increment

Typical commands:

```bash
eas build --profile preview --platform android
eas build --profile production --platform android
```

## 9) Keep It Working Long-Term

Use this checklist each time:

1. Keep dependencies aligned:

```bash
npx expo install --check
```

2. Validate config and dependencies:

```bash
npx expo-doctor
```

3. Confirm map key injection:

```bash
npx expo config
```

4. After dependency/config changes, clear bundler cache:

```bash
npx expo start -c
```

5. For real BLE verification, always test on a development build or production build, not Expo Go.

## 10) Common Issues and Fast Fixes

- Map shows blank/crash on Android:
  - Check `GOOGLE_MAPS_API_KEY` in `.env`
  - Verify key has Maps SDK for Android enabled
  - Rebuild app if native config changed

- BLE scan returns nothing in Expo Go:
  - Expected behavior (simulation only in Expo Go)
  - Use development build for real scanning

- EAS cloud build does not pick local `.env`:
  - Add secrets in EAS:

```bash
eas secret:create --scope project --name GOOGLE_MAPS_API_KEY --value "YOUR_REAL_KEY"
```

- Phone cannot connect to Metro (LAN issues):
  - Use tunnel:

```bash
npx expo start --tunnel
```

## 11) Project Structure

- `App.js`: app entry and tab navigation
- `screens/GeofenceScreen.js`: location destination and alarm flow
- `screens/BagLeashScreen.js`: BLE pairing and monitoring UI
- `services/locationService.js`: location polling and distance logic
- `services/bleService.js`: BLE scan/monitor implementation + Expo Go simulation fallback
- `services/notificationService.js`: local notifications setup and alerts
- `app.json`: base Expo config
- `app.config.js`: env-driven dynamic native config
- `.env.example`: starter environment template

## 12) Security Notes

- Never commit `.env`.
- Restrict your Google API key in Google Cloud Console.
- Rotate keys if leaked.
