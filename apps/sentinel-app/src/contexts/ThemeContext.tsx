import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

export interface Theme {
  dark: boolean;
  colors: {
    primary: string;
    background: string;
    card: string;
    text: string;
    border: string;
    notification: string;
    error: string;
    success: string;
    warning: string;
    muted: string;
    security: {
      gateActive: string;
      gateClosed: string;
      rfidScanning: string;
      incidentHigh: string;
      incidentMedium: string;
      incidentLow: string;
    };
  };
}

export const LightTheme: Theme = {
  dark: false,
  colors: {
    primary: '#3b82f6', // Blue for security app
    background: '#f9fafb',
    card: '#ffffff',
    text: '#1f2937',
    border: '#e5e7eb',
    notification: '#3b82f6',
    error: '#ef4444',
    success: '#22c55e',
    warning: '#f59e0b',
    muted: '#6b7280',
    security: {
      gateActive: '#22c55e', // Green for open/approved
      gateClosed: '#ef4444', // Red for closed/denied
      rfidScanning: '#3b82f6', // Blue for scanning
      incidentHigh: '#dc2626', // Red for critical
      incidentMedium: '#f59e0b', // Orange for medium
      incidentLow: '#6b7280', // Gray for low
    },
  },
};

export const DarkTheme: Theme = {
  dark: true,
  colors: {
    primary: '#60a5fa', // Lighter blue for dark mode
    background: '#1f2937',
    card: '#374151',
    text: '#f9fafb',
    border: '#4b5563',
    notification: '#60a5fa',
    error: '#f87171',
    success: '#4ade80',
    warning: '#fbbf24',
    muted: '#9ca3af',
    security: {
      gateActive: '#4ade80',
      gateClosed: '#f87171',
      rfidScanning: '#60a5fa',
      incidentHigh: '#f87171',
      incidentMedium: '#fbbf24',
      incidentLow: '#9ca3af',
    },
  },
};

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: 'light' | 'dark' | 'auto') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

const THEME_STORAGE_KEY = '@sentinel_theme_preference';

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<'light' | 'dark' | 'auto'>('light');
  const [isLoading, setIsLoading] = useState(true);

  // Load theme preference on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (stored) {
        setThemeModeState(stored as 'light' | 'dark' | 'auto');
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setThemeMode = async (mode: 'light' | 'dark' | 'auto') => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const toggleTheme = () => {
    const newMode = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(newMode);
  };

  // Determine current theme based on mode and system preference
  const isDark =
    themeMode === 'dark' || (themeMode === 'auto' && systemColorScheme === 'dark');

  const theme = isDark ? DarkTheme : LightTheme;

  const value: ThemeContextType = {
    theme,
    isDark,
    toggleTheme,
    setThemeMode,
  };

  if (isLoading) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export default ThemeContext;