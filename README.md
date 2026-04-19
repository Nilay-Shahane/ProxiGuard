# ProxiGuard — Smart Commuter App

A minimal Expo React Native app with two features:
- 📍 **Wake Me Up** — location alarm that fires when you're near your stop
- 🎒 **Bag Guard** — BLE proximity alert if your bag is left behind

---

## File Structure

```
ProxiGuard/
├── App.js                        # Entry point, tab navigation, colors
├── app.json                      # Expo config + permissions
├── package.json
├── screens/
│   ├── GeofenceScreen.js         # Map + destination pin + alarm toggle
│   └── BagLeashScreen.js         # BLE scan + pair + RSSI monitor toggle
└── services/
    ├── locationService.js        # Location permissions, polling, distance calc
    ├── bleService.js             # BLE scan, RSSI monitor (react-native-ble-plx)
    └── notificationService.js    # Notification setup + send alert
```

---

## Setup (Day 1)

```bash
# 1. Install dependencies
npm install

# 2. Build dev client (required for BLE + background location)
npx expo run:android
# or
npx expo run:ios
```

> ⚠️ **Cannot use Expo Go** — `react-native-ble-plx` requires a custom dev build.

---

## Day 1 Focus (Location / Geofence)
1. Run `npx expo run:android` to get a dev build on your phone
2. Open the **Wake Me Up** tab
3. Type a destination name, tap the map to pin it
4. Tap **Start Alarm** — walk toward the pin to test

## Day 2 Focus (BLE / Bag Guard)
1. Open the **Bag Guard** tab
2. Tap **Scan for Devices** — your Bluetooth headphones / tag will appear
3. Tap the device to pair it
4. Toggle **Bag Guard ON** and walk away from your phone to test

---

## Key Config Values (easy to tweak)

| File | Variable | Default | Meaning |
|------|----------|---------|---------|
| `GeofenceScreen.js` | `ALERT_RADIUS` | 800m | Distance to destination that triggers alarm |
| `locationService.js` | `POLL_INTERVAL` | 10000ms | How often to check location |
| `BagLeashScreen.js` | `RSSI_THRESHOLD` | -85 dBm | Signal strength that triggers bag alert |
| `bleService.js` | `setInterval` | 3000ms | How often to read RSSI |