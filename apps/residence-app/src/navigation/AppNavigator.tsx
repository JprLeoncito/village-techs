import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import AuthNavigator from './AuthNavigator';
import TabNavigator from './TabNavigator';
import { HouseholdScreen } from '../screens/HouseholdScreen';
import { DeliveriesScreen } from '../screens/DeliveriesScreen';
import { AnnouncementsScreen } from '../screens/AnnouncementsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import ConstructionPermitsScreen from '../screens/construction/ConstructionPermitsScreen';
import PasswordResetScreen from '../screens/auth/PasswordResetScreen';
import BiometricSetupScreen from '../screens/auth/BiometricSetupScreen';

// Import existing screens
import { GuestListScreen } from '../screens/guests/GuestListScreen';
import { GuestScheduleScreen } from '../screens/guests/GuestScheduleScreen';
import { GatePassListScreen } from '../screens/gatePasses/GatePassListScreen';
import { GatePassRequestScreen } from '../screens/gatePasses/GatePassRequestScreen';
import { AddEditHouseholdMemberScreen } from '../screens/household/AddEditHouseholdMemberScreen';
import { StickerListScreen } from '../screens/stickers/StickerListScreen';
import { StickerRequestScreen } from '../screens/stickers/StickerRequestScreen';
import { StickerDetailsScreen } from '../screens/stickers/StickerDetailsScreen';
import { StickerTrackingScreen } from '../screens/stickers/StickerTrackingScreen';
import networkStatus from '../lib/networkStatus';

// Define the root stack param list
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  // Feature screens accessible from More menu
  Household: undefined;
  Deliveries: undefined;
  Announcements: undefined;
  ConstructionPermits: undefined;
  Settings: undefined;
  // Additional screens for navigation
  StickerList: undefined;
  StickerRequest: { mode?: 'create' | 'edit' | 'renewal'; renewalStickerId?: string };
  StickerDetails: { stickerId: string };
  StickerTracking: { stickerId: string };
  GuestList: undefined;
  GuestSchedule: undefined;
  GatePassList: undefined;
  GatePassDetail: { gatePassId: string };
  GatePassRequest: undefined;
  AddEditHouseholdMember: { mode?: 'create' | 'edit'; memberId?: string };
  // Other root-level screens
  BiometricSetup?: undefined;
  PasswordReset?: { email?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, refreshSession } = useAuth();

  useEffect(() => {
    // Initialize network monitoring
    networkStatus.initialize();

    // Refresh session on app start
    refreshSession();

    // Cleanup on unmount
    return () => {
      networkStatus.cleanup();
    };
  }, []);

  // Show loading screen while checking auth status
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
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
              component={TabNavigator}
              options={{
                animation: 'fade',
              }}
            />

            {/* Feature screens accessible from More menu */}
            <Stack.Screen
              name="Household"
              component={HouseholdScreen}
              options={{
                headerShown: true,
                title: 'Household Members',
                headerStyle: {
                  backgroundColor: '#10b981',
                },
                headerTintColor: '#ffffff',
                headerTitleStyle: {
                  fontWeight: '600',
                },
              }}
            />

            <Stack.Screen
              name="Deliveries"
              component={DeliveriesScreen}
              options={{
                headerShown: true,
                title: 'Deliveries',
                headerStyle: {
                  backgroundColor: '#10b981',
                },
                headerTintColor: '#ffffff',
                headerTitleStyle: {
                  fontWeight: '600',
                },
              }}
            />

            <Stack.Screen
              name="Announcements"
              component={AnnouncementsScreen}
              options={{
                headerShown: true,
                title: 'Announcements',
                headerStyle: {
                  backgroundColor: '#10b981',
                },
                headerTintColor: '#ffffff',
                headerTitleStyle: {
                  fontWeight: '600',
                },
              }}
            />

            <Stack.Screen
              name="ConstructionPermits"
              component={ConstructionPermitsScreen}
              options={{
                headerShown: true,
                title: 'Construction Permits',
                headerStyle: {
                  backgroundColor: '#10b981',
                },
                headerTintColor: '#ffffff',
                headerTitleStyle: {
                  fontWeight: '600',
                },
              }}
            />

            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                headerShown: true,
                title: 'Settings',
                headerStyle: {
                  backgroundColor: '#10b981',
                },
                headerTintColor: '#ffffff',
                headerTitleStyle: {
                  fontWeight: '600',
                },
              }}
            />

            {/* Additional screens for detailed navigation */}
            <Stack.Screen
              name="StickerList"
              component={StickerListScreen}
              options={{
                headerShown: true,
                title: 'Vehicle Stickers',
                headerStyle: {
                  backgroundColor: '#10b981',
                },
                headerTintColor: '#ffffff',
                headerTitleStyle: {
                  fontWeight: '600',
                },
              }}
            />

            <Stack.Screen
              name="StickerRequest"
              component={StickerRequestScreen}
              options={{
                headerShown: true,
                title: 'Request Sticker',
                headerStyle: {
                  backgroundColor: '#10b981',
                },
                headerTintColor: '#ffffff',
                headerTitleStyle: {
                  fontWeight: '600',
                },
              }}
            />

            <Stack.Screen
              name="StickerDetails"
              component={StickerDetailsScreen}
              options={{
                headerShown: true,
                title: 'Sticker Details',
                headerStyle: {
                  backgroundColor: '#10b981',
                },
                headerTintColor: '#ffffff',
                headerTitleStyle: {
                  fontWeight: '600',
                },
              }}
            />

            <Stack.Screen
              name="StickerTracking"
              component={StickerTrackingScreen}
              options={{
                headerShown: true,
                title: 'Track Sticker',
                headerStyle: {
                  backgroundColor: '#10b981',
                },
                headerTintColor: '#ffffff',
                headerTitleStyle: {
                  fontWeight: '600',
                },
              }}
            />

            <Stack.Screen
              name="GuestList"
              component={GuestListScreen}
              options={{
                headerShown: true,
                title: 'Guest List',
                headerStyle: {
                  backgroundColor: '#10b981',
                },
                headerTintColor: '#ffffff',
                headerTitleStyle: {
                  fontWeight: '600',
                },
              }}
            />

            <Stack.Screen
              name="GuestSchedule"
              component={GuestScheduleScreen}
              options={{
                headerShown: false, // Custom header in the component
                presentation: 'modal',
              }}
            />

            <Stack.Screen
              name="GatePassList"
              component={GatePassListScreen}
              options={{
                headerShown: true,
                title: 'Gate Passes',
                headerStyle: {
                  backgroundColor: '#10b981',
                },
                headerTintColor: '#ffffff',
                headerTitleStyle: {
                  fontWeight: '600',
                },
              }}
            />

            <Stack.Screen
              name="GatePassRequest"
              component={GatePassRequestScreen}
              options={{
                headerShown: true,
                title: 'Request Gate Pass',
                headerStyle: {
                  backgroundColor: '#10b981',
                },
                headerTintColor: '#ffffff',
                headerTitleStyle: {
                  fontWeight: '600',
                },
              }}
            />

            <Stack.Screen
              name="AddEditHouseholdMember"
              component={AddEditHouseholdMemberScreen}
              options={({ route }) => ({
                headerShown: true,
                title: route.params?.mode === 'edit' ? 'Edit Member' : 'Add Member',
                headerStyle: {
                  backgroundColor: '#10b981',
                },
                headerTintColor: '#ffffff',
                headerTitleStyle: {
                  fontWeight: '600',
                },
              })}
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
            <Stack.Screen
              name="PasswordReset"
              component={PasswordResetScreen}
              options={{
                headerShown: true,
                title: 'Reset Password',
                headerStyle: {
                  backgroundColor: '#ffffff',
                },
                headerTintColor: '#1f2937',
                headerTitleStyle: {
                  fontWeight: '600',
                },
              }}
            />
          </>
        )}

        {/* Biometric setup can be accessed from both authenticated and unauthenticated states */}
        <Stack.Screen
          name="BiometricSetup"
          component={BiometricSetupScreen}
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Biometric Setup',
            headerStyle: {
              backgroundColor: '#ffffff',
            },
            headerTintColor: '#1f2937',
            headerTitleStyle: {
              fontWeight: '600',
            },
          }}
        />
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