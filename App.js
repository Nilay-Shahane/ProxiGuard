// App.js — Entry point. Sets up navigation between the two main screens.

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';

// Screens
import GeofenceScreen from './screens/GeofenceScreen';
import BagLeashScreen from './screens/BagLeashScreen';

// Notification setup (request permissions on app start)
import { setupNotifications } from './services/notificationService';

// Colors — dark theme
export const COLORS = {
  bg: '#0D0D0D',
  card: '#1A1A1A',
  accent: '#00E5A0',     // teal-green accent
  accentRed: '#FF4C4C',  // for alerts
  text: '#FFFFFF',
  subtext: '#888888',
  border: '#2A2A2A',
};

const Tab = createBottomTabNavigator();

export default function App() {
  // Ask for notification permissions when app launches
  useEffect(() => {
    setupNotifications();
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: COLORS.card,
            borderTopColor: COLORS.border,
          },
          tabBarActiveTintColor: COLORS.accent,
          tabBarInactiveTintColor: COLORS.subtext,
        }}
      >
        {/* Tab 1: Location-based wake-up alarm */}
        <Tab.Screen
          name="Wake Me Up"
          component={GeofenceScreen}
          options={{
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📍</Text>,
          }}
        />

        {/* Tab 2: Bluetooth bag proximity monitor */}
        <Tab.Screen
          name="Bag Guard"
          component={BagLeashScreen}
          options={{
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🎒</Text>,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}