import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import GateMonitoringScreen from '../screens/monitoring/GateMonitoringScreen';
import EntryListScreen from '../screens/entry/EntryListScreen';
import GuestListScreen from '../screens/guest/GuestListScreen';
import DeliveryListScreen from '../screens/delivery/DeliveryListScreen';
import IncidentListScreen from '../screens/incident/IncidentListScreen';
import { useTheme } from '../contexts/ThemeContext';

// Define tab param list
export type TabParamList = {
  GateMonitoring: undefined;
  Entries: undefined;
  Guests: undefined;
  Deliveries: undefined;
  Incidents: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

// Tab icon component
interface TabIconProps {
  focused: boolean;
  icon: string;
  label: string;
  badge?: number;
}

const TabIcon: React.FC<TabIconProps> = ({ focused, icon, label, badge }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.tabIconContainer}>
      <Icon
        name={icon}
        size={24}
        color={focused ? theme.colors.primary : theme.colors.muted}
        style={focused && styles.tabIconFocused}
      />
      {badge && badge > 0 && (
        <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
      <Text
        style={[
          styles.tabLabel,
          { color: focused ? theme.colors.primary : theme.colors.muted },
          focused && styles.tabLabelFocused,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {label}
      </Text>
    </View>
  );
};

const TabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 10,
          paddingTop: 10,
          height: Platform.OS === 'ios' ? 88 + insets.bottom : 70,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: theme.colors.primary,
          elevation: 4,
          shadowOpacity: 0.1,
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
      }}
    >
      <Tab.Screen
        name="GateMonitoring"
        component={GateMonitoringScreen}
        options={{
          title: 'Gate Monitoring',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="shield-account" label="Monitor" />
          ),
          tabBarLabel: () => null,
        }}
      />

      <Tab.Screen
        name="Entries"
        component={EntryListScreen}
        options={{
          title: 'Entry Log',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="login" label="Entries" badge={3} />
          ),
          tabBarLabel: () => null,
        }}
      />

      <Tab.Screen
        name="Guests"
        component={GuestListScreen}
        options={{
          title: 'Guest Management',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="account-group" label="Guests" />
          ),
          tabBarLabel: () => null,
        }}
      />

      <Tab.Screen
        name="Deliveries"
        component={DeliveryListScreen}
        options={{
          title: 'Deliveries',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="package-variant" label="Deliveries" badge={2} />
          ),
          tabBarLabel: () => null,
        }}
      />

      <Tab.Screen
        name="Incidents"
        component={IncidentListScreen}
        options={{
          title: 'Incidents',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="alert-circle" label="Incidents" />
          ),
          tabBarLabel: () => null,
        }}
      />
    </Tab.Navigator>
  );
};

// Define RootStackParamList to match AppNavigator
type RootStackParamList = {
  GateMonitoring: undefined;
  EntryLog: undefined;
  ExitLog: undefined;
  GuestVerification: undefined;
  DeliveryHandoff: undefined;
  IncidentReport: undefined;
  BroadcastAlert: undefined;
  ShiftReport: undefined;
  Settings: undefined;
};

const MoreScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleMenuPress = (screen: keyof RootStackParamList) => {
    navigation.navigate(screen);
  };

  return (
    <View style={[styles.screenContainer, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.screenTitle, { color: theme.colors.text }]}>Security Operations</Text>
      <View style={[styles.menuList, { backgroundColor: theme.colors.card }]}>
        <MenuOption icon="history" title="Entry Log" onPress={() => handleMenuPress('EntryLog')} theme={theme} />
        <MenuOption icon="logout" title="Exit Log" onPress={() => handleMenuPress('ExitLog')} theme={theme} />
        <MenuOption icon="account-check" title="Guest Verification" onPress={() => handleMenuPress('GuestVerification')} theme={theme} />
        <MenuOption icon="package-delivery" title="Delivery Handoff" onPress={() => handleMenuPress('DeliveryHandoff')} theme={theme} />
        <MenuOption icon="file-document-alert" title="Incident Report" onPress={() => handleMenuPress('IncidentReport')} theme={theme} />
        <MenuOption icon="bullhorn" title="Broadcast Alert" onPress={() => handleMenuPress('BroadcastAlert')} theme={theme} />
        <MenuOption icon="clipboard-text" title="Shift Report" onPress={() => handleMenuPress('ShiftReport')} theme={theme} />
        <MenuOption icon="cog" title="Settings" onPress={() => handleMenuPress('Settings')} theme={theme} />
      </View>
    </View>
  );
};

// Menu option component for More screen
interface MenuOptionProps {
  icon: string;
  title: string;
  onPress: () => void;
  theme: any;
}

const MenuOption: React.FC<MenuOptionProps> = ({ icon, title, onPress, theme }) => {
  const menuStyles = createMenuStyles(theme);

  return (
    <TouchableOpacity
      style={menuStyles.menuOption}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Icon name={icon} size={24} color={theme.colors.text} style={menuStyles.menuIcon} />
      <Text style={menuStyles.menuTitle}>{title}</Text>
      <Icon name="chevron-right" size={24} color={theme.colors.muted} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabIconFocused: {
    transform: [{ scale: 1.1 }],
  },
  tabLabel: {
    fontSize: 9,
  },
  tabLabelFocused: {
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 16,
    alignItems: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  screenContainer: {
    flex: 1,
    padding: 20,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  menuList: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});

const createMenuStyles = (theme: any) =>
  StyleSheet.create({
    menuOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.dark ? '#374151' : '#f3f4f6',
    },
    menuIcon: {
      marginRight: 16,
    },
    menuTitle: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.text,
      fontWeight: '500',
    },
  });

export default TabNavigator;