// services/bleService.js
// Handles Bluetooth Low Energy: scanning for devices and monitoring signal strength (RSSI).
// Uses react-native-ble-plx — requires Expo Dev Client (not Expo Go).

import { BleManager } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import { sendAlertNotification } from './notificationService';

// Single BleManager instance — reusing one is important
const bleManager = new BleManager();

// Interval ref for RSSI polling loop
let _rssiInterval = null;

// Flag to prevent alert from firing repeatedly
let _alertFired = false;

// --- Request Bluetooth permissions (Android 12+ requires extra perms) ---
export async function requestBLEPermissions() {
  if (Platform.OS === 'ios') {
    // iOS handles BLE permissions automatically via Info.plist keys
    return true;
  }

  if (Platform.OS === 'android') {
    if (Platform.Version >= 31) {
      // Android 12+ needs BLUETOOTH_SCAN and BLUETOOTH_CONNECT
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      return Object.values(results).every(
        (r) => r === PermissionsAndroid.RESULTS.GRANTED
      );
    } else {
      // Android < 12
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }
  }

  return false;
}

// --- Scan for nearby BLE devices ---
// onDeviceFound: callback(device) called for each discovered device
export function startBLEScan(onDeviceFound) {
  // stopDeviceScan in case a previous scan is running
  bleManager.stopDeviceScan();

  bleManager.startDeviceScan(
    null,    // null = scan for all UUIDs
    null,    // no scan options
    (error, device) => {
      if (error) {
        console.log('BLE scan error:', error);
        return;
      }
      if (device) {
        // Pass device up to the screen component
        onDeviceFound({
          id: device.id,
          name: device.name || device.localName || null,
          rssi: device.rssi,
        });
      }
    }
  );
}

// --- Stop BLE scan ---
export function stopBLEScan() {
  bleManager.stopDeviceScan();
}

// --- Start monitoring RSSI of a specific device ---
// deviceId: the BLE device ID (MAC address on Android, UUID on iOS)
// threshold: RSSI value below which we consider device "out of range"
// onRSSI: callback(rssiValue) — called every poll cycle with current RSSI
// onOutOfRange: callback() — called once when RSSI drops below threshold
export function startRSSIMonitor(deviceId, threshold, onRSSI, onOutOfRange) {
  _alertFired = false;

  // Poll RSSI every 3 seconds
  _rssiInterval = setInterval(async () => {
    try {
      // readRSSI connects to the device and reads its signal strength
      const device = await bleManager.readRSSIForDevice(deviceId);
      const rssi = device.rssi;

      console.log(`RSSI for ${deviceId}: ${rssi} dBm`);
      onRSSI(rssi);

      // If signal is too weak and alert hasn't fired yet
      if (rssi < threshold && !_alertFired) {
        _alertFired = true;

        await sendAlertNotification(
          '🎒 Forget something?',
          'Your bag is out of range! Check before you move.'
        );

        onOutOfRange();

        // Reset after 30s so it can alert again if needed
        setTimeout(() => { _alertFired = false; }, 30000);
      }
    } catch (e) {
      // Device not reachable = likely disconnected / very far
      console.log('RSSI read error (device may be out of range):', e.message);
      onRSSI(-99); // Indicate very weak signal

      if (!_alertFired) {
        _alertFired = true;
        await sendAlertNotification(
          '🎒 Bag Alert!',
          "Can't reach your bag device. Did you leave it behind?"
        );
        onOutOfRange();
        setTimeout(() => { _alertFired = false; }, 30000);
      }
    }
  }, 3000);
}

// --- Stop RSSI monitoring ---
export function stopRSSIMonitor() {
  if (_rssiInterval) {
    clearInterval(_rssiInterval);
    _rssiInterval = null;
  }
  _alertFired = false;
}