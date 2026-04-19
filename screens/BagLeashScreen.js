// screens/BagLeashScreen.js
// "Bag Leash" feature — pair a BLE device, alert if it goes out of range.

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Switch, TouchableOpacity,
  FlatList, ActivityIndicator, Alert, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../theme/colors';
import {
  startBLEScan,
  stopBLEScan,
  startRSSIMonitor,
  stopRSSIMonitor,
  requestBLEPermissions,
  isBLEAvailable,
  isBLESimulated,
} from '../services/bleService';

// Keys for persisting paired device info
const PAIRED_DEVICE_KEY = 'proxiguard_ble_device';

// RSSI threshold — below this value = device is too far away
// Typical values: -50 (close), -80 (medium), -95 (very far / disconnected)
const RSSI_THRESHOLD = -85;

export default function BagLeashScreen() {
  // Whether "Track My Bag" mode is ON
  const [isTracking, setIsTracking] = useState(false);

  // BLE devices found during scan
  const [scannedDevices, setScannedDevices] = useState([]);

  // The device the user has selected/paired
  const [pairedDevice, setPairedDevice] = useState(null);

  // Whether we're currently scanning for devices
  const [isScanning, setIsScanning] = useState(false);

  // Latest RSSI reading and status text
  const [rssiValue, setRssiValue] = useState(null);
  const [bagStatus, setBagStatus] = useState('Bag Guard is OFF');

  // Load previously paired device from storage
  useEffect(() => {
    loadPairedDevice();
    return () => {
      // Clean up — stop everything when screen unmounts
      stopBLEScan();
      stopRSSIMonitor();
    };
  }, []);

  const loadPairedDevice = async () => {
    try {
      const saved = await AsyncStorage.getItem(PAIRED_DEVICE_KEY);
      if (saved) {
        setPairedDevice(JSON.parse(saved));
      }
    } catch (e) {
      console.log('Could not load paired device:', e);
    }
  };

  // --- Scan for nearby BLE devices ---
  const handleScan = async () => {
    const granted = await requestBLEPermissions();
    if (!granted) {
      Alert.alert('Permission needed', 'Bluetooth permission is required to scan for devices.');
      return;
    }

    setScannedDevices([]); // clear old results
    setIsScanning(true);

    // startBLEScan calls the callback each time a new device is found
    startBLEScan((device) => {
      setScannedDevices((prev) => {
        // Avoid duplicates — update existing or add new
        const exists = prev.find((d) => d.id === device.id);
        if (exists) {
          return prev.map((d) => (d.id === device.id ? device : d));
        }
        return [...prev, device];
      });
    });

    // Auto-stop scan after 8 seconds
    setTimeout(() => {
      stopBLEScan();
      setIsScanning(false);
    }, 8000);
  };

  // --- User picks a device from scan results ---
  const handleSelectDevice = async (device) => {
    stopBLEScan();
    setIsScanning(false);
    setScannedDevices([]); // hide list after selection

    setPairedDevice(device);
    await AsyncStorage.setItem(PAIRED_DEVICE_KEY, JSON.stringify(device));
    Alert.alert('Device Paired', `"${device.name || 'Unknown Device'}" saved as your bag tracker.`);
  };

  // --- Toggle tracking ON/OFF ---
  const handleToggleTracking = async (value) => {
    if (value) {
      // Turn ON
      if (!pairedDevice) {
        Alert.alert('No device', 'Please scan and select your bag device first.');
        return;
      }

      const granted = await requestBLEPermissions();
      if (!granted) return;

      setIsTracking(true);
      setBagStatus('Monitoring your bag...');

      // Start RSSI monitoring loop
      startRSSIMonitor(
        pairedDevice.id,
        RSSI_THRESHOLD,
        (rssi) => {
          // Called repeatedly with current RSSI
          setRssiValue(rssi);
          setBagStatus(rssi > RSSI_THRESHOLD ? '✅ Bag is close' : '⚠️ Bag may be far');
        },
        () => {
          // Called when RSSI drops below threshold — alert user!
          setBagStatus('🚨 Bag out of range!');
          // The bleService also fires a notification
        }
      );
    } else {
      // Turn OFF
      stopRSSIMonitor();
      setIsTracking(false);
      setRssiValue(null);
      setBagStatus('Bag Guard is OFF');
    }
  };

  // --- Forget the currently paired device ---
  const handleForgetDevice = async () => {
    if (isTracking) {
      Alert.alert('Stop tracking first', 'Turn off Bag Guard before unpairing.');
      return;
    }
    await AsyncStorage.removeItem(PAIRED_DEVICE_KEY);
    setPairedDevice(null);
    setBagStatus('Bag Guard is OFF');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🎒 Bag Guard</Text>
        <Text style={styles.subtitle}>
          Never leave your bag behind.{isBLESimulated ? ' (Simulation mode in Expo Go)' : ''}
        </Text>
      </View>

      {/* Paired device card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>PAIRED DEVICE</Text>
        {!isBLEAvailable && (
          <Text style={styles.noDevice}>
            BLE simulation is active in Expo Go.
          </Text>
        )}
        {pairedDevice ? (
          <View style={styles.deviceRow}>
            <Text style={styles.deviceName}>
              {pairedDevice.name || 'Unknown Device'}
            </Text>
            <TouchableOpacity onPress={handleForgetDevice}>
              <Text style={styles.forgetBtn}>Forget</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.noDevice}>No device paired yet</Text>
        )}

        {/* Scan button */}
        <TouchableOpacity
          style={[styles.scanBtn, isScanning && styles.scanBtnActive]}
          onPress={handleScan}
          disabled={isScanning}
        >
          {isScanning
            ? <ActivityIndicator color="#000" size="small" />
            : <Text style={styles.scanBtnText}>🔍 Scan for Devices</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Scanned device list — only visible while scanning / right after */}
      {scannedDevices.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>NEARBY DEVICES — tap to pair</Text>
          <FlatList
            data={scannedDevices}
            keyExtractor={(item) => item.id}
            style={{ maxHeight: 180 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.deviceItem}
                onPress={() => handleSelectDevice(item)}
              >
                <Text style={styles.deviceItemName}>
                  {item.name || 'Unnamed Device'}
                </Text>
                <Text style={styles.deviceItemRssi}>RSSI: {item.rssi}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Tracking toggle card */}
      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.cardLabel}>BAG GUARD</Text>
            <Text style={styles.bagStatus}>{bagStatus}</Text>
            {/* Show live RSSI when tracking */}
            {rssiValue !== null && (
              <Text style={styles.rssiText}>Signal: {rssiValue} dBm</Text>
            )}
          </View>
          <Switch
            value={isTracking}
            onValueChange={handleToggleTracking}
            trackColor={{ false: COLORS.border, true: COLORS.accent }}
            thumbColor={isTracking ? '#000' : COLORS.subtext}
          />
        </View>
      </View>

      {/* Info note */}
      <Text style={styles.infoNote}>
        💡 Put your BLE headphones or a tile tag in your bag, scan, and pair it.
        Turn on Bag Guard when you start traveling. In Expo Go, this runs with simulated devices.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: 55,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: COLORS.subtext,
    fontSize: 13,
    marginTop: 2,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  cardLabel: {
    color: COLORS.subtext,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
  },
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  deviceName: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  forgetBtn: {
    color: COLORS.accentRed,
    fontSize: 13,
  },
  noDevice: {
    color: COLORS.subtext,
    fontSize: 14,
    marginBottom: 10,
  },
  scanBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  scanBtnActive: {
    opacity: 0.7,
  },
  scanBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
  },
  deviceItemName: {
    color: COLORS.text,
    fontSize: 14,
  },
  deviceItemRssi: {
    color: COLORS.subtext,
    fontSize: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bagStatus: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  rssiText: {
    color: COLORS.subtext,
    fontSize: 12,
  },
  infoNote: {
    color: COLORS.subtext,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
});