// screens/GeofenceScreen.js
// "Wake Me Up" feature — user pins a destination, app alerts when nearby.

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, ScrollView, Switch,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../App';
import {
  requestLocationPermissions,
  startGeofenceWatch,
  stopGeofenceWatch,
  getCurrentPosition,
} from '../services/locationService';

// Key used to save destination in AsyncStorage
const DESTINATION_KEY = 'proxiguard_destination';

// Radius in meters — alert fires when user is within this distance
const ALERT_RADIUS = 800;

export default function GeofenceScreen() {
  const mapRef = useRef(null);

  // The pinned destination (lat/lng + optional name)
  const [destination, setDestination] = useState(null);

  // Whether the geofence alarm is currently active
  const [isActive, setIsActive] = useState(false);

  // User's current live location
  const [currentLocation, setCurrentLocation] = useState(null);

  // Text shown below the map (status messages)
  const [statusMsg, setStatusMsg] = useState('Tap the map to pin your destination.');

  // Simple label the user can type for the destination
  const [destinationLabel, setDestinationLabel] = useState('');

  // --- Load saved destination from storage on mount ---
  useEffect(() => {
    loadSavedDestination();
    fetchCurrentLocation();
  }, []);

  const loadSavedDestination = async () => {
    try {
      const saved = await AsyncStorage.getItem(DESTINATION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setDestination(parsed);
        setDestinationLabel(parsed.label || '');
        setStatusMsg(`Saved: ${parsed.label || 'Pinned spot'}`);
      }
    } catch (e) {
      console.log('Could not load saved destination:', e);
    }
  };

  const fetchCurrentLocation = async () => {
    const loc = await getCurrentPosition();
    if (loc) setCurrentLocation(loc);
  };

  // --- Handle tap on map: set destination to tapped coordinates ---
  const handleMapPress = async (event) => {
    // Don't allow changing pin while alarm is active
    if (isActive) {
      Alert.alert('Stop the alarm first', 'Turn off the alarm before changing destination.');
      return;
    }

    const { coordinate } = event.nativeEvent;
    const newDest = {
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      label: destinationLabel || 'My Stop',
    };

    setDestination(newDest);
    setStatusMsg(`Pinned: ${newDest.label} (${newDest.latitude.toFixed(4)}, ${newDest.longitude.toFixed(4)})`);

    // Save to AsyncStorage so it persists between sessions
    await AsyncStorage.setItem(DESTINATION_KEY, JSON.stringify(newDest));
  };

  // --- Toggle the geofence alarm ON/OFF ---
  const toggleAlarm = async () => {
    if (isActive) {
      // Turn OFF
      await stopGeofenceWatch();
      setIsActive(false);
      setStatusMsg('Alarm stopped.');
      return;
    }

    // Turn ON — need a destination first
    if (!destination) {
      Alert.alert('No destination', 'Tap the map to pin a destination first.');
      return;
    }

    // Ask for background location permission
    const granted = await requestLocationPermissions();
    if (!granted) {
      Alert.alert('Permission needed', 'Background location permission is required for this feature.');
      return;
    }

    // Start watching position and checking distance
    startGeofenceWatch(destination, ALERT_RADIUS, () => {
      // This callback fires when user enters the radius
      setStatusMsg('🔔 You are near your destination!');
      setIsActive(false); // auto-stop after firing once
    });

    setIsActive(true);
    setStatusMsg(`Alarm ON — will alert within ${ALERT_RADIUS}m of ${destination.label}`);
  };

  // --- Center map on current location ---
  const goToMyLocation = () => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Title */}
      <View style={styles.header}>
        <Text style={styles.title}>📍 Wake Me Up</Text>
        <Text style={styles.subtitle}>Pin your stop. Sleep on the train.</Text>
      </View>

      {/* Optional label input for the destination */}
      <TextInput
        style={styles.input}
        placeholder="Destination name (e.g. Dadar Station)"
        placeholderTextColor={COLORS.subtext}
        value={destinationLabel}
        onChangeText={setDestinationLabel}
      />

      {/* Map View */}
      <MapView
        ref={mapRef}
        style={styles.map}
        onPress={handleMapPress}
        mapType="standard"
        initialRegion={{
          // Default to Mumbai area
          latitude: 19.076,
          longitude: 72.877,
          latitudeDelta: 0.3,
          longitudeDelta: 0.3,
        }}
      >
        {/* Show pinned destination marker */}
        {destination && (
          <>
            <Marker
              coordinate={destination}
              title={destination.label}
              pinColor={COLORS.accent}
            />
            {/* Visual circle showing the alert radius */}
            <Circle
              center={destination}
              radius={ALERT_RADIUS}
              strokeColor={COLORS.accent}
              fillColor="rgba(0, 229, 160, 0.10)"
            />
          </>
        )}

        {/* Show user's current location */}
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="You"
            pinColor="#4A90E2"
          />
        )}
      </MapView>

      {/* My Location button */}
      <TouchableOpacity style={styles.myLocBtn} onPress={goToMyLocation}>
        <Text style={styles.myLocBtnText}>📌 My Location</Text>
      </TouchableOpacity>

      {/* Status message */}
      <Text style={styles.status}>{statusMsg}</Text>

      {/* Alarm toggle button */}
      <TouchableOpacity
        style={[styles.alarmBtn, isActive && styles.alarmBtnActive]}
        onPress={toggleAlarm}
      >
        <Text style={styles.alarmBtnText}>
          {isActive ? '🔕 Stop Alarm' : '🔔 Start Alarm'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: 55,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 12,
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
  input: {
    backgroundColor: COLORS.card,
    color: COLORS.text,
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  map: {
    marginHorizontal: 20,
    borderRadius: 16,
    height: 300,
    overflow: 'hidden',
  },
  myLocBtn: {
    alignSelf: 'flex-end',
    marginRight: 20,
    marginTop: 8,
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  myLocBtnText: {
    color: COLORS.text,
    fontSize: 12,
  },
  status: {
    color: COLORS.subtext,
    fontSize: 13,
    marginHorizontal: 20,
    marginTop: 10,
    minHeight: 36,
  },
  alarmBtn: {
    backgroundColor: COLORS.accent,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  alarmBtnActive: {
    backgroundColor: COLORS.accentRed,
  },
  alarmBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});