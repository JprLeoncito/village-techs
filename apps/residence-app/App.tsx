import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ui/ErrorBoundary';
import NetworkAware from './src/components/ui/NetworkAware';

// Deep linking configuration
const linking = {
  prefixes: ['residence-app://'],
  config: {
    screens: {
      PasswordReset: 'reset-password',
      Household: 'household',
      Deliveries: 'deliveries',
      Announcements: 'announcements',
      ConstructionPermits: 'permits',
      Settings: 'settings',
      BiometricSetup: 'biometric-setup',
    },
  },
};

const AppContent: React.FC = () => {
  const { theme } = useTheme();

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error('App error:', error, errorInfo);
    // Here you could also send to a monitoring service like Sentry
  };

  const handleRetry = () => {
    // You could implement app-level retry logic here
    console.log('App retry requested');
  };

  return (
    <ErrorBoundary onError={handleError}>
      <NetworkAware onRetry={handleRetry}>
        <AuthProvider>
          <NavigationContainer linking={linking}>
            <StatusBar style={theme.dark ? 'light' : 'dark'} />
            <AppNavigator />
          </NavigationContainer>
        </AuthProvider>
      </NetworkAware>
    </ErrorBoundary>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

