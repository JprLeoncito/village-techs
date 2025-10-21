import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SimpleHomeScreen from '../screens/SimpleHomeScreen';
import { useTheme } from '../contexts/ThemeContext';

// Define tab param list
export type TabParamList = {
  Home: undefined;
  Logs: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

// Tab icon component
interface TabIconProps {
  focused: boolean;
  icon: string;
  label: string;
}

const TabIcon: React.FC<TabIconProps> = ({ focused, icon, label }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.tabIconContainer}>
      <Icon
        name={icon}
        size={24}
        color={focused ? theme.colors.primary : theme.colors.muted}
        style={focused && styles.tabIconFocused}
      />
      <Text
        style={[
          styles.tabLabel,
          { color: focused ? theme.colors.primary : theme.colors.muted },
          focused && styles.tabLabelFocused,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
};

// Placeholder screens
const LogsScreen = () => {
  const { theme } = useTheme();
  return (
    <View style={[styles.screenContainer, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.screenTitle, { color: theme.colors.text }]}>Security Logs</Text>
      <Text style={[styles.screenDescription, { color: theme.colors.muted }]}>
        Entry and exit logs will appear here
      </Text>
    </View>
  );
};

const SettingsScreen = () => {
  const { theme } = useTheme();
  return (
    <View style={[styles.screenContainer, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.screenTitle, { color: theme.colors.text }]}>Settings</Text>
      <Text style={[styles.screenDescription, { color: theme.colors.muted }]}>
        Application settings and preferences
      </Text>
    </View>
  );
};

const SimpleTabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
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
      }}
    >
      <Tab.Screen
        name="Home"
        component={SimpleHomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="shield-account" label="Home" />
          ),
          tabBarLabel: () => null,
        }}
      />

      <Tab.Screen
        name="Logs"
        component={LogsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="history" label="Logs" />
          ),
          tabBarLabel: () => null,
        }}
      />

      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="cog" label="Settings" />
          ),
          tabBarLabel: () => null,
        }}
      />
    </Tab.Navigator>
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
  screenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  screenDescription: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default SimpleTabNavigator;