// services/bleService.js
// Handles Bluetooth Low Energy: scanning for devices and monitoring signal strength (RSSI).
// Uses react-native-ble-plx — requires Expo Dev Client (not Expo Go).

import { Platform, PermissionsAndroid } from 'react-native';
import Constants from 'expo-constants';
import { sendAlertNotification } from './notificationService';

let BleManagerCtor = null;
const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  try {
    // Expo Go does not include this native module. Guard import to avoid app crash.
    BleManagerCtor = require('react-native-ble-plx').BleManager;
  } catch (e) {
    BleManagerCtor = null;
  }
}

export const isBLEAvailable = !!BleManagerCtor;
export const isBLESimulated = !isBLEAvailable;

// Single BleManager instance — reusing one is important
let bleManager = null;
if (BleManagerCtor) {
  try {
    bleManager = new BleManagerCtor();
  } catch (e) {
    bleManager = null;
  }
}

// Interval ref for RSSI polling loop
let _rssiInterval = null;
let _scanTimeout = null;

// Flag to prevent alert from firing repeatedly
let _alertFired = false;

// --- Request Bluetooth permissions (Android 12+ requires extra perms) ---
export async function requestBLEPermissions() {
  if (!isBLEAvailable) return true;

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
  if (!isBLEAvailable || !bleManager) {
    const mockDevices = [
      { id: 'mock-bag-tag', name: 'Bag Tag (Simulated)', rssi: -68 },
      { id: 'mock-earbuds', name: 'Earbuds (Simulated)', rssi: -74 },
      { id: 'mock-backpack', name: 'Backpack Beacon (Simulated)', rssi: -82 },
    ];

    mockDevices.forEach((device, index) => {
      setTimeout(() => onDeviceFound(device), index * 500);
    });

    _scanTimeout = setTimeout(() => {
      _scanTimeout = null;
    }, 2500);
    return;
  }

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
  if (_scanTimeout) {
    clearTimeout(_scanTimeout);
    _scanTimeout = null;
  }

  if (!bleManager) return;
  bleManager.stopDeviceScan();
}

// --- Start monitoring RSSI of a specific device ---
// deviceId: the BLE device ID (MAC address on Android, UUID on iOS)
// threshold: RSSI value below which we consider device "out of range"
// onRSSI: callback(rssiValue) — called every poll cycle with current RSSI
// onOutOfRange: callback() — called once when RSSI drops below threshold
export function startRSSIMonitor(deviceId, threshold, onRSSI, onOutOfRange) {
  if (!isBLEAvailable || !bleManager) {
    _alertFired = false;

    _rssiInterval = setInterval(async () => {
      const drift = Math.floor(Math.random() * 28) - 16;
      const rssi = -72 + drift;
      onRSSI(rssi);

      if (rssi < threshold && !_alertFired) {
        _alertFired = true;

        await sendAlertNotification(
          '🎒 Simulated Bag Alert',
          'Bag signal dropped below threshold (simulation mode).'
        );

        onOutOfRange();
        setTimeout(() => { _alertFired = false; }, 30000);
      }
    }, 3000);

    return;
  }

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