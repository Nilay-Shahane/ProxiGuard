// services/notificationService.js
// Handles setting up and sending push/local notifications via expo-notifications.

import * as Notifications from 'expo-notifications';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,   // show a banner even when app is open
    shouldPlaySound: true,   // play sound
    shouldSetBadge: false,
  }),
});

// --- Request notification permissions (called once on app start) ---
export async function setupNotifications() {
  const { status: existing } = await Notifications.getPermissionsAsync();

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('Notification permission not granted');
    }
  }
}

// --- Fire a local notification immediately ---
// title: bold heading text
// body: detail text
export async function sendAlertNotification(title, body) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX, // loud on Android
      },
      trigger: null, // null = fire immediately
    });
  } catch (e) {
    console.log('Failed to send notification:', e);
  }
}