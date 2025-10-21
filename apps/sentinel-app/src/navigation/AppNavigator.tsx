import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import AuthNavigator from './AuthNavigator';
import SimpleTabNavigator from './SimpleTabNavigator';
import GateMonitoringScreen from '../screens/monitoring/GateMonitoringScreen';
import EntryLogScreen from '../screens/entry/EntryLogScreen';
import GuestVerificationScreen from '../screens/guest/GuestVerificationScreen';
import DeliveryHandoffScreen from '../screens/delivery/DeliveryHandoffScreen';
import IncidentReportScreen from '../screens/incident/IncidentReportScreen';
// Import additional screens as needed
// import ExitLogScreen from '../screens/entry/ExitLogScreen';
// import BroadcastAlertScreen from '../screens/monitoring/BroadcastAlertScreen';
// import ShiftReportScreen from '../screens/monitoring/ShiftReportScreen';
// import SettingsScreen from '../screens/settings/ProfileScreen';

// Define the root stack param list
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  // Security screens accessible from More menu
  GateMonitoring: undefined;
  EntryLog: undefined;
  ExitLog: undefined;
  GuestVerification: undefined;
  DeliveryHandoff: undefined;
  IncidentReport: undefined;
  BroadcastAlert: undefined;
  ShiftReport: undefined;
  Settings: undefined;
  // Auth screens
  Login: undefined;
  GateSelection: undefined;
  ClockIn: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, refreshSession } = useAuth();

  useEffect(() => {
    // Refresh session on app start
    refreshSession();
  }, []);

  // Show loading screen while checking auth status
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {isAuthenticated ? (
        <>
          {/* Authenticated Stack */}
          <Stack.Screen
            name="Main"
            component={SimpleTabNavigator}
            options={{
              animation: 'fade',
            }}
          />
          <Stack.Screen
            name="GateMonitoring"
            component={GateMonitoringScreen}
            options={{
              headerShown: true,
              title: 'Gate Monitoring',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="EntryLog"
            component={EntryLogScreen}
            options={{
              headerShown: true,
              title: 'Entry Log',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="GuestVerification"
            component={GuestVerificationScreen}
            options={{
              headerShown: true,
              title: 'Guest Management',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="DeliveryHandoff"
            component={DeliveryHandoffScreen}
            options={{
              headerShown: true,
              title: 'Deliveries',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="IncidentReport"
            component={IncidentReportScreen}
            options={{
              headerShown: true,
              title: 'Incident Report',
              animation: 'slide_from_right',
            }}
          />
        </>
      ) : (
        <>
          {/* Unauthenticated Stack */}
          <Stack.Screen
            name="Auth"
            component={AuthNavigator}
            options={{
              animation: 'fade',
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});

export default AppNavigator;