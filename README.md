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



## Key Config Values (easy to tweak)

| File | Variable | Default | Meaning |
|------|----------|---------|---------|
| `GeofenceScreen.js` | `ALERT_RADIUS` | 800m | Distance to destination that triggers alarm |
| `locationService.js` | `POLL_INTERVAL` | 10000ms | How often to check location |
| `BagLeashScreen.js` | `RSSI_THRESHOLD` | -85 dBm | Signal strength that triggers bag alert |
| `bleService.js` | `setInterval` | 3000ms | How often to read RSSI |