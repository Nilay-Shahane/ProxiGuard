# ProxiGuard — Smart Commuter App

A minimal Expo React Native app with two features:
- 📍 **Wake Me Up** — location alarm that fires when you're near your train stop
- 🎒 **Bag Guard** — BLE proximity alert if you walk away from your bag

---

## What the App Does (One Line)

ProxiGuard has two jobs — **wake you up before your train stop** using GPS, and **alert you if you walk away from your bag** using Bluetooth.

---

## File Structure

```
ProxiGuard/
├── App.js                        # Entry point, tab navigation
├── constants.js                  # Shared colors (dark theme)
├── app.json                      # Expo config + permissions
├── package.json
├── screens/
│   ├── GeofenceScreen.js         # Map + destination pin + alarm toggle
│   └── BagLeashScreen.js         # BLE scan + pair + RSSI monitor toggle
└── services/
    ├── locationService.js        # GPS logic, distance calculation
    ├── bleService.js             # Bluetooth scan + RSSI monitor
    └── notificationService.js    # Sends alerts/notifications
```

---

## Setup

```bash
# Install dependencies
npm install

# Start the app
npx expo start -c
```

> ⚠️ **BLE requires a custom dev build** — `react-native-ble-plx` does not work in Expo Go.
> For full BLE support run: `eas build --profile development --platform android`

---

## Key Config Values

| File | Variable | Default | Meaning |
|------|----------|---------|---------|
| `GeofenceScreen.js` | `ALERT_RADIUS` | 800m | Distance to destination that triggers alarm |
| `locationService.js` | `POLL_INTERVAL` | 10000ms | How often to check GPS location |
| `BagLeashScreen.js` | `RSSI_THRESHOLD` | -85 dBm | Signal strength that triggers bag alert |
| `bleService.js` | `setInterval` | 3000ms | How often to read Bluetooth RSSI |

---

## Code Explanation

### App.js — The Starting Point

This is the first file that runs. It creates the two tabs at the bottom of the screen (Wake Me Up and Bag Guard) and asks for notification permission when the app opens.

**Key concept — React Navigation:**

```js
// Think of it like a TV remote — tabs let you switch between screens
const Tab = createBottomTabNavigator();
```

When you tap a tab, React Navigation swaps which screen is shown. The tab bar with the 📍 and 🎒 icons lives here.

> **Q: Why do you need NavigationContainer?**
> It's the wrapper that keeps track of which screen you're on — like a browser keeping track of which page you're visiting.

---

### constants.js — Shared Colors

One place where all the dark theme colors are defined. Every screen file imports from here.

```js
export const COLORS = {
  bg: '#0D0D0D',        // near black background
  accent: '#00E5A0',    // the teal green color
  accentRed: '#FF4C4C'  // red for alerts and stop buttons
}
```

> **Why it's a separate file:** If colors were defined in `App.js` and screens imported from there, JavaScript sometimes loads files in the wrong order and `COLORS` comes back as `undefined`. A dedicated constants file fixes that.

---

### screens/GeofenceScreen.js — The Map Page

Shows a map, lets you pin a destination, and starts a background location alarm that fires when you're within 800 metres of the pin.

**The main states:**

```js
const [destination, setDestination] = useState(null);        // the pinned location
const [isActive, setIsActive] = useState(false);             // is alarm ON or OFF
const [currentLocation, setCurrentLocation] = useState(null); // where you are now
```

> **Q: What is useState?**
> It's React's way of remembering values. When a state value changes, the screen automatically re-renders to show the new value — like a live variable that's connected to the UI.

**The map tap handler:**

```js
const handleMapPress = (event) => {
  // event gives us the lat/lng where user tapped
  const { coordinate } = event.nativeEvent;
  setDestination(coordinate);
  AsyncStorage.setItem(DESTINATION_KEY, JSON.stringify(coordinate)); // save to phone
}
```

`AsyncStorage` is like `localStorage` in a browser — it saves data permanently on the phone so the destination is remembered even if you close the app.

**The alarm toggle:**

```js
const toggleAlarm = async () => {
  if (isActive) {
    stopGeofenceWatch(); // turn off
  } else {
    startGeofenceWatch(destination, 800, () => {
      // this callback runs when you enter the 800m radius
      setStatusMsg('You are near your destination!');
    });
  }
}
```

> **Q: What is a callback function?**
> It's a function you pass into another function to be called later. Here we pass a function to `startGeofenceWatch` and it calls it back when the alarm condition is met — like giving someone your number and saying "call me when it's ready."

---

### screens/BagLeashScreen.js — The Bluetooth Page

Scans for nearby Bluetooth devices, lets you pick one as your "bag device", then monitors its signal strength. If the signal drops, it means your bag is too far away.

**The scan flow:**

```js
const handleScan = async () => {
  setIsScanning(true);

  startBLEScan((device) => {
    // called every time a new BLE device is found nearby
    setScannedDevices(prev => [...prev, device]);
  });

  setTimeout(() => {
    stopBLEScan();
    setIsScanning(false);
  }, 8000); // auto stop after 8 seconds
}
```

**The tracking toggle:**

```js
const handleToggleTracking = (value) => {
  if (value) {
    startRSSIMonitor(
      pairedDevice.id,
      -85,                                          // RSSI threshold
      (rssi) => { setRssiValue(rssi); },            // called every 3s with signal value
      () => { setBagStatus('Bag out of range!'); }  // called when signal too weak
    );
  } else {
    stopRSSIMonitor();
  }
}
```

> **Q: What is RSSI?**
> Received Signal Strength Indicator — a number in dBm (like -60 or -85) that tells how strong the Bluetooth signal is. Closer = higher number (less negative). We set -85 as the threshold — below that means the bag is roughly 15-20 metres away.

---

### services/locationService.js — The GPS Brain

Handles all location logic — asking for permission, getting current position, and running a loop that checks if you're near your destination.

**The distance formula (Haversine):**

```js
export function getDistanceMeters(point1, point2) {
  // Haversine formula — calculates distance between
  // two lat/lng coordinates on a sphere (the Earth)
  // Returns distance in metres
}
```

> **Q: Why not just subtract the coordinates?**
> Because the Earth is round. Subtracting lat/lng directly gives wrong distances, especially over larger distances. The Haversine formula accounts for Earth's curvature.

**The polling loop:**

```js
// Every 10 seconds, check current position
_watchInterval = setInterval(async () => {
  const current = await getCurrentPosition();
  const dist = getDistanceMeters(current, destination);

  if (dist <= radiusMeters && !_alarmFired) {
    _alarmFired = true;          // make sure it only fires once
    sendAlertNotification(...);  // wake the user up
    onEnter();                   // tell the screen to update UI
  }
}, 10000);
```

> **Q: Why polling instead of expo's built-in geofencing?**
> `expo-location` has `startGeofencingAsync` but it requires a TaskManager background task registered at the top level of the app, which is more complex to set up. Polling every 10 seconds is simpler, works reliably, and uses minimal battery.

---

### services/bleService.js — The Bluetooth Brain

Uses the `react-native-ble-plx` library to scan for BLE devices and read signal strength.

**BleManager — single instance:**

```js
const bleManager = new BleManager();
// One instance shared across the whole app
// Creating multiple instances causes crashes
```

**Scanning for devices:**

```js
bleManager.startDeviceScan(null, null, (error, device) => {
  // null, null = scan all UUIDs, no filters
  // called repeatedly as devices are discovered nearby
  onDeviceFound({ id: device.id, name: device.name, rssi: device.rssi });
});
```

**RSSI monitoring loop:**

```js
_rssiInterval = setInterval(async () => {
  const device = await bleManager.readRSSIForDevice(deviceId);

  if (device.rssi < threshold) {
    // Signal too weak = bag is far away
    sendAlertNotification('Forget something?', 'Your bag is out of range!');
  }
}, 3000); // check every 3 seconds
```

> **Q: Why does BLE need a custom dev build and not Expo Go?**
> Expo Go is a pre-built app that only includes safe approved native modules. `react-native-ble-plx` needs direct access to the phone's Bluetooth hardware via native Android/iOS code, which Expo Go doesn't include. A custom dev build compiles our exact set of native modules into the app.

---

### services/notificationService.js — The Alert Sender

Sets up notification permissions and provides one function to fire an alert anywhere in the app.

```js
// Called once when app starts — asks user for permission
export async function setupNotifications() {
  await Notifications.requestPermissionsAsync();
}

// Called by location and BLE services when a threshold is crossed
export async function sendAlertNotification(title, body) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null, // null = fire immediately, not scheduled for later
  });
}
```

> **Q: Why do you need permission for notifications?**
> iOS and Android both require the user to explicitly allow an app to send notifications — it's a privacy protection. Without calling `requestPermissionsAsync`, the notification silently fails even if the code is correct.

---

## Data Flow — How It All Connects

### Wake Me Up flow

```
User taps map
      ↓
GeofenceScreen saves coordinates → AsyncStorage (permanent storage)
      ↓
User taps Start Alarm
      ↓
locationService starts a setInterval loop (every 10 seconds)
      ↓
Each tick: getCurrentPosition → getDistanceMeters → compare to 800m
      ↓
Distance < 800m?
      ↓
notificationService.sendAlertNotification() → phone buzzes
      ↓
Alarm auto-stops (fires only once)
```

### Bag Guard flow

```
User scans BLE → picks device → saved to AsyncStorage
      ↓
User toggles Bag Guard ON
      ↓
bleService starts setInterval loop (every 3 seconds)
      ↓
Each tick: readRSSIForDevice → compare to -85 dBm
      ↓
RSSI drops below -85?
      ↓
notificationService.sendAlertNotification() → phone buzzes
```

---

## Three Key Design Decisions

**1. Separation of concerns**
Screens only handle UI. Services handle logic. The screen doesn't know *how* GPS works — it just calls `startGeofenceWatch()` and gives it a callback. This makes the code easier to maintain and explain.

**2. Persistent storage**
`AsyncStorage` means user settings survive app restarts. The destination and paired device are saved to the phone and reloaded on mount via `useEffect` — so the user doesn't have to re-enter them every time.

**3. Single-fire pattern**
The `_alarmFired` boolean flag in both services ensures the alert fires exactly once per activation, not repeatedly every polling cycle. It resets only when the user manually turns the alarm off and on again.
