import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
// Removed StripeProvider - using mock payment service instead
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import networkStatus from './src/lib/networkStatus';
import notificationService from './src/services/notificationService';
import { supabase } from './src/lib/supabase';

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

// Navigation content that uses theme
const NavigationContent: React.FC = () => {
  const { theme, isDark } = useTheme();

  // Convert custom theme to React Navigation theme format
  // Spread the default theme to preserve fonts and other properties
  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.card,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.notification,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <AppNavigator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavigationContainer>
  );
};

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Check if required environment variables are configured
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || supabaseUrl.includes('your-project') ||
            !supabaseKey || supabaseKey.includes('your-')) {
          console.warn('Supabase credentials not configured. Running in demo mode.');
          // Skip Supabase initialization in demo mode
        }
        // Auth state listener is handled by AuthContext, no need for duplicate listener here

        // Initialize database (with error handling)
        // Skip database initialization for now as it requires proper setup
        // The database will be initialized when first accessed
        try {
          // Database initialization happens automatically on first use
          console.log('Database will initialize on first use');
        } catch (dbError) {
          console.warn('Database initialization skipped:', dbError);
        }

        // Initialize network monitoring
        try {
          networkStatus.initialize();
        } catch (networkError) {
          console.warn('Network monitoring initialization skipped:', networkError);
        }

        // Initialize notifications
        try {
          await notificationService.initialize();
        } catch (notificationError) {
          console.warn('Notification service initialization skipped:', notificationError);
        }

        // Load fonts if using custom fonts
        await Font.loadAsync({
          // Add custom fonts here if needed
        });

      } catch (e) {
        console.warn('Error during app initialization:', e);
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <NavigationContent />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
