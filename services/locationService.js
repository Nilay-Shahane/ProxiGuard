// services/locationService.js
// Handles all location logic: permissions, getting position, distance checking.
// NOTE: expo-location's startGeofencingAsync requires a TaskManager task
//       registered at the TOP LEVEL (outside components). We use a polling
//       approach here as a simpler alternative that works in dev builds.

import * as Location from 'expo-location';
import { sendAlertNotification } from './notificationService';

// Interval (ms) for polling current location while alarm is ON
const POLL_INTERVAL = 10000; // every 10 seconds

// Internal ref to the polling interval so we can clear it
let _watchInterval = null;

// Flag to ensure we only fire the alarm ONCE per activation
let _alarmFired = false;

// --- Request foreground + background location permissions ---
export async function requestLocationPermissions() {
  const { status: fg } = await Location.requestForegroundPermissionsAsync();
  if (fg !== 'granted') return false;

  const { status: bg } = await Location.requestBackgroundPermissionsAsync();
  return bg === 'granted';
}

// --- Get current position once ---
export async function getCurrentPosition() {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    };
  } catch (e) {
    console.log('getCurrentPosition error:', e);
    return null;
  }
}

// --- Start watching location and check distance to destination ---
// destination: { latitude, longitude, label }
// radiusMeters: number — alert radius
// onEnter: callback fired once when user enters the radius
export function startGeofenceWatch(destination, radiusMeters, onEnter) {
  _alarmFired = false; // reset flag each time alarm starts

  _watchInterval = setInterval(async () => {
    const current = await getCurrentPosition();
    if (!current) return;

    const dist = getDistanceMeters(current, destination);
    console.log(`Distance to ${destination.label}: ${Math.round(dist)}m`);

    // Fire alarm if within radius AND not already fired
    if (dist <= radiusMeters && !_alarmFired) {
      _alarmFired = true;
      clearInterval(_watchInterval);
      _watchInterval = null;

      // Send notification
      await sendAlertNotification(
        '📍 Wake Up! Your stop is near.',
        `You are within ${radiusMeters}m of ${destination.label}`
      );

      // Call the screen's callback to update UI
      onEnter();
    }
  }, POLL_INTERVAL);
}

// --- Stop watching location ---
export function stopGeofenceWatch() {
  if (_watchInterval) {
    clearInterval(_watchInterval);
    _watchInterval = null;
  }
  _alarmFired = false;
}

// --- Calculate distance between two lat/lng points (Haversine formula) ---
// Returns distance in meters.
export function getDistanceMeters(point1, point2) {
  const R = 6371000; // Earth radius in meters
  const lat1 = toRad(point1.latitude);
  const lat2 = toRad(point2.latitude);
  const dLat = toRad(point2.latitude - point1.latitude);
  const dLon = toRad(point2.longitude - point1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}