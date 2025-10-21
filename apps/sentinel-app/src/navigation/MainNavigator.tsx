import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

// Entry Stack
import { EntryListScreen } from '../screens/entry/EntryListScreen';
import { VehicleEntryScreen } from '../screens/entry/VehicleEntryScreen';
import { EntryLogScreen } from '../screens/entry/EntryLogScreen';
import { ExitLogScreen } from '../screens/entry/ExitLogScreen';
import { EntryDetailsScreen } from '../screens/entry/EntryDetailsScreen';

// Guest Stack
import { GuestListScreen } from '../screens/guest/GuestListScreen';
import { GuestVerificationScreen } from '../screens/guest/GuestVerificationScreen';
import { WalkInGuestScreen } from '../screens/guest/WalkInGuestScreen';
import { GuestDepartureScreen } from '../screens/guest/GuestDepartureScreen';

// Delivery Stack
import { DeliveryListScreen } from '../screens/delivery/DeliveryListScreen';
import { DeliveryLogScreen } from '../screens/delivery/DeliveryLogScreen';
import { DeliveryHandoffScreen } from '../screens/delivery/DeliveryHandoffScreen';

// Incident Stack
import { IncidentListScreen } from '../screens/incident/IncidentListScreen';
import { IncidentReportScreen } from '../screens/incident/IncidentReportScreen';
import { IncidentDetailsScreen } from '../screens/incident/IncidentDetailsScreen';

// Monitoring Stack
import { GateMonitoringScreen } from '../screens/monitoring/GateMonitoringScreen';
import { BroadcastAlertScreen } from '../screens/monitoring/BroadcastAlertScreen';
import { ShiftReportScreen } from '../screens/monitoring/ShiftReportScreen';

// Settings
import { ProfileScreen } from '../screens/settings/ProfileScreen';

export type MainTabParamList = {
  Entry: undefined;
  Guests: undefined;
  Deliveries: undefined;
  Incidents: undefined;
  Monitoring: undefined;
};

export type EntryStackParamList = {
  EntryList: undefined;
  VehicleEntry: undefined;
  EntryLog: undefined;
  ExitLog: undefined;
  EntryDetails: {
    entryId: string;
  };
};

export type GuestStackParamList = {
  GuestList: undefined;
  GuestVerification: {
    guestId?: string;
  };
  WalkInGuest: undefined;
  GuestDeparture: {
    guestId: string;
  };
};

export type DeliveryStackParamList = {
  DeliveryList: undefined;
  DeliveryLog: undefined;
  DeliveryHandoff: {
    deliveryId: string;
  };
};

export type IncidentStackParamList = {
  IncidentList: undefined;
  IncidentReport: undefined;
  IncidentDetails: {
    incidentId: string;
  };
};

export type MonitoringStackParamList = {
  GateMonitoring: undefined;
  BroadcastAlert: undefined;
  ShiftReport: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const EntryStack = createNativeStackNavigator<EntryStackParamList>();
const GuestStack = createNativeStackNavigator<GuestStackParamList>();
const DeliveryStack = createNativeStackNavigator<DeliveryStackParamList>();
const IncidentStack = createNativeStackNavigator<IncidentStackParamList>();
const MonitoringStack = createNativeStackNavigator<MonitoringStackParamList>();

// Entry Stack Navigator
const EntryStackNavigator = () => (
  <EntryStack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
    }}
  >
    <EntryStack.Screen name="EntryList" component={EntryListScreen} />
    <EntryStack.Screen name="VehicleEntry" component={VehicleEntryScreen} />
    <EntryStack.Screen name="EntryLog" component={EntryLogScreen} />
    <EntryStack.Screen name="ExitLog" component={ExitLogScreen} />
    <EntryStack.Screen name="EntryDetails" component={EntryDetailsScreen} />
  </EntryStack.Navigator>
);

// Guest Stack Navigator
const GuestStackNavigator = () => (
  <GuestStack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
    }}
  >
    <GuestStack.Screen name="GuestList" component={GuestListScreen} />
    <GuestStack.Screen name="GuestVerification" component={GuestVerificationScreen} />
    <GuestStack.Screen name="WalkInGuest" component={WalkInGuestScreen} />
    <GuestStack.Screen name="GuestDeparture" component={GuestDepartureScreen} />
  </GuestStack.Navigator>
);

// Delivery Stack Navigator
const DeliveryStackNavigator = () => (
  <DeliveryStack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
    }}
  >
    <DeliveryStack.Screen name="DeliveryList" component={DeliveryListScreen} />
    <DeliveryStack.Screen name="DeliveryLog" component={DeliveryLogScreen} />
    <DeliveryStack.Screen name="DeliveryHandoff" component={DeliveryHandoffScreen} />
  </DeliveryStack.Navigator>
);

// Incident Stack Navigator
const IncidentStackNavigator = () => (
  <IncidentStack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
    }}
  >
    <IncidentStack.Screen name="IncidentList" component={IncidentListScreen} />
    <IncidentStack.Screen name="IncidentReport" component={IncidentReportScreen} />
    <IncidentStack.Screen name="IncidentDetails" component={IncidentDetailsScreen} />
  </IncidentStack.Navigator>
);

// Monitoring Stack Navigator
const MonitoringStackNavigator = () => {
  const { isSecurityHead } = useAuth();

  return (
    <MonitoringStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <MonitoringStack.Screen name="GateMonitoring" component={GateMonitoringScreen} />
      {isSecurityHead && (
        <>
          <MonitoringStack.Screen name="BroadcastAlert" component={BroadcastAlertScreen} />
          <MonitoringStack.Screen name="ShiftReport" component={ShiftReportScreen} />
        </>
      )}
      <MonitoringStack.Screen name="Profile" component={ProfileScreen} />
    </MonitoringStack.Navigator>
  );
};

export const MainNavigator = () => {
  const { isSecurityHead } = useAuth();
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Entry':
              iconName = focused ? 'door-open' : 'door-closed';
              break;
            case 'Guests':
              iconName = focused ? 'account-group' : 'account-multiple';
              break;
            case 'Deliveries':
              iconName = focused ? 'package-variant-closed' : 'package-variant';
              break;
            case 'Incidents':
              iconName = focused ? 'alert' : 'alert-outline';
              break;
            case 'Monitoring':
              iconName = focused ? 'monitor-dashboard' : 'view-dashboard';
              break;
            default:
              iconName = 'help-circle';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen
        name="Entry"
        component={EntryStackNavigator}
        options={{
          title: 'Entry',
          tabBarLabel: 'Entry',
        }}
      />
      <Tab.Screen
        name="Guests"
        component={GuestStackNavigator}
        options={{
          title: 'Guests',
          tabBarLabel: 'Guests',
        }}
      />
      <Tab.Screen
        name="Deliveries"
        component={DeliveryStackNavigator}
        options={{
          title: 'Deliveries',
          tabBarLabel: 'Deliveries',
        }}
      />
      <Tab.Screen
        name="Incidents"
        component={IncidentStackNavigator}
        options={{
          title: 'Incidents',
          tabBarLabel: 'Incidents',
        }}
      />
      {isSecurityHead && (
        <Tab.Screen
          name="Monitoring"
          component={MonitoringStackNavigator}
          options={{
            title: 'Monitoring',
            tabBarLabel: 'Monitoring',
          }}
        />
      )}
    </Tab.Navigator>
  );
};