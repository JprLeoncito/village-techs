import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { FeesScreen } from '../screens/FeesScreen';
import { GuestListScreen } from '../screens/guests/GuestListScreen';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { StickerListScreen } from '../screens/stickers/StickerListScreen';
import { useTheme } from '../contexts/ThemeContext';
import { Icons, IconColors } from '../constants/icons';

// Define tab param list
export type TabParamList = {
  Dashboard: undefined;
  Guests: undefined;
  Vehicles: undefined;
  Fees: undefined;
  More: undefined;
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
      <MaterialIcons
        name={icon as any}
        size={24}
        color={focused ? theme.colors.primary : theme.colors.muted}
        style={focused && styles.tabIconFocused}
      />
      {false && (
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
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={Icons.home} label="Home" />
          ),
          tabBarLabel: () => null,
        }}
      />

      <Tab.Screen
        name="Guests"
        component={GuestListScreen}
        options={{
          title: 'Guest List',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={Icons.features.guests} label="Guests" />
          ),
          tabBarLabel: () => null,
        }}
      />

      <Tab.Screen
        name="Vehicles"
        component={StickerListScreen}
        options={{
          title: 'Vehicles',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={Icons.features.stickers} label="Vehicle" />
          ),
          tabBarLabel: () => null,
        }}
      />

      <Tab.Screen
        name="Fees"
        component={FeesScreen}
        options={{
          title: 'Association Fees',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={Icons.features.fees} label="Fees" />
          ),
          tabBarLabel: () => null,
        }}
      />

      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{
          title: 'More',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={Icons.more} label="More" />
          ),
          tabBarLabel: () => null,
        }}
      />
    </Tab.Navigator>
  );
};

// Define RootStackParamList to match AppNavigator
type RootStackParamList = {
  Household: undefined;
  GuestList: undefined;
  Deliveries: undefined;
  Announcements: undefined;
  ConstructionPermits: undefined;
  Settings: undefined;
};

const MoreScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleMenuPress = (screen: keyof RootStackParamList) => {
    navigation.navigate(screen);
  };

  const styles = {
    screenContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: 20,
    },
    screenTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 20,
    },
    menuList: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      overflow: 'hidden',
    },
  };

  return (
    <View style={styles.screenContainer}>
      <View style={styles.menuList}>
        <MenuOption icon={Icons.household} title="Household Members" onPress={() => handleMenuPress('Household')} theme={theme} />
        <MenuOption icon={Icons.features.guests} title="Guest Management" onPress={() => handleMenuPress('GuestList')} theme={theme} />
        <MenuOption icon={Icons.features.permits} title="Construction Permits" onPress={() => handleMenuPress('ConstructionPermits')} theme={theme} />
        <MenuOption icon={Icons.features.deliveries} title="Deliveries" onPress={() => handleMenuPress('Deliveries')} theme={theme} />
        <MenuOption icon={Icons.features.announcements} title="Announcements" onPress={() => handleMenuPress('Announcements')} theme={theme} />
        <MenuOption icon={Icons.settings} title="Settings" onPress={() => handleMenuPress('Settings')} theme={theme} />
        <MenuOption icon={Icons.help} title="Help & Support" onPress={() => {}} theme={theme} />
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
      <MaterialIcons name={icon as any} size={24} color={theme.colors.text} style={menuStyles.menuIcon} />
      <Text style={menuStyles.menuTitle}>{title}</Text>
      <MaterialIcons name="chevron-right" size={24} color={theme.colors.muted} />
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
