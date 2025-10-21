import React, { useState, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import biometricService, { BiometricType } from '../lib/biometric';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

// Define auth stack param list
export type AuthStackParamList = {
  Login: undefined;
  BiometricLogin: undefined;
  ForgotPassword: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_bottom',
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="BiometricLogin" component={BiometricLoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
};

// Login Screen Component
const LoginScreen: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('Biometric');

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    const status = await biometricService.checkBiometricSupport();
    setBiometricAvailable(status.isAvailable && status.hasEnrolled && status.isEnabled);

    if (status.supportedTypes.length > 0) {
      setBiometricType(biometricService.getBiometricTypeDisplayName(status.supportedTypes));
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    const success = await login(email, password);
    if (!success) {
      // Error is handled in auth context
    }
  };

  const handleBiometricLogin = async () => {
    const result = await biometricService.authenticateAndGetCredentials();

    if (result.success && result.credentials) {
      await login(result.credentials.email, result.credentials.password);
    } else {
      Alert.alert('Biometric Login Failed', result.error || 'Unable to authenticate');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo/Title */}
          <View style={styles.header}>
            <MaterialIcons name="apartment" size={64} color="#10b981" style={styles.logo} />
            <Text style={styles.title}>Village Tech</Text>
            <Text style={styles.subtitle}>Residence App</Text>
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter password"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <MaterialIcons
                    name={showPassword ? 'visibility' : 'visibility-off'}
                    size={20}
                    color="#6b7280"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.forgotButton}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {biometricAvailable && (
              <>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={styles.biometricButton}
                  onPress={handleBiometricLogin}
                  disabled={isLoading}
                >
                  <MaterialIcons
                    name={
                      biometricType === BiometricType.FACE_ID ? 'face' :
                      biometricType === BiometricType.FINGERPRINT ? 'fingerprint' : 'lock'
                    }
                    size={24}
                    color="#374151"
                    style={styles.biometricIcon}
                  />
                  <Text style={styles.biometricButtonText}>
                    Sign in with {biometricType}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Demo Accounts */}
          <View style={styles.demoCard}>
            <Text style={styles.demoTitle}>Demo Accounts</Text>
            <View style={styles.demoAccounts}>
              <View style={styles.demoAccount}>
                <Text style={styles.demoLabel}>Cruz Family (A-101):</Text>
                <Text style={styles.demoEmail}>juan.cruz@greenvalley.com</Text>
                <Text style={styles.demoPassword}>Password: Resident123!</Text>
              </View>
              <View style={styles.demoAccount}>
                <Text style={styles.demoLabel}>Santos Family (A-102):</Text>
                <Text style={styles.demoEmail}>pedro.santos@greenvalley.com</Text>
                <Text style={styles.demoPassword}>Password: Resident123!</Text>
              </View>
              <View style={styles.demoAccount}>
                <Text style={styles.demoLabel}>Reyes Family (A-103):</Text>
                <Text style={styles.demoEmail}>carlos.reyes@greenvalley.com</Text>
                <Text style={styles.demoPassword}>Password: Resident123!</Text>
              </View>
              <View style={styles.demoAccount}>
                <Text style={styles.demoLabel}>More accounts available:</Text>
                <Text style={styles.demoEmail}>roberto.lim, luis.garcia</Text>
                <Text style={styles.demoEmail}>maria.fernando, roberto.mendoza</Text>
                <Text style={styles.demoEmail}>amy.tan, jose.villanueva, rosa.castillo</Text>
                <Text style={styles.demoPassword}>All use: Resident123!</Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Don't have an account?{' '}
              <Text style={styles.footerLink}>Contact Admin</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Biometric Login Screen Component
const BiometricLoginScreen: React.FC = () => {
  const { loginWithBiometric } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    // Automatically trigger biometric authentication
    handleBiometricAuth();
  }, []);

  const handleBiometricAuth = async () => {
    setIsAuthenticating(true);

    const success = await loginWithBiometric();

    if (!success) {
      Alert.alert(
        'Authentication Failed',
        'Unable to authenticate with biometrics',
        [
          { text: 'Try Again', onPress: handleBiometricAuth },
          { text: 'Use Password', style: 'cancel' },
        ]
      );
    }

    setIsAuthenticating(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.biometricContainer}>
        <MaterialIcons name="lock" size={80} color="#10b981" style={styles.biometricPromptIcon} />
        <Text style={styles.biometricPromptTitle}>Authenticate to Continue</Text>
        <Text style={styles.biometricPromptSubtitle}>
          Use your biometric authentication to sign in
        </Text>

        {isAuthenticating && (
          <ActivityIndicator size="large" color="#10b981" style={styles.loader} />
        )}

        <TouchableOpacity style={styles.retryButton} onPress={handleBiometricAuth}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// Forgot Password Screen Component
const ForgotPasswordScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setIsSubmitting(true);

    // Implement password reset logic here
    // This would typically call a Supabase auth method

    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert(
        'Password Reset',
        'If an account exists with this email, you will receive password reset instructions.',
        [{ text: 'OK' }]
      );
    }, 2000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.forgotContainer}>
        <Text style={styles.forgotTitle}>Reset Password</Text>
        <Text style={styles.forgotDescription}>
          Enter your email address and we'll send you instructions to reset your password.
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSubmitting}
          />
        </View>

        <TouchableOpacity
          style={[styles.resetButton, isSubmitting && styles.disabledButton]}
          onPress={handleResetPassword}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.resetButtonText}>Send Reset Instructions</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back to Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  logo: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    padding: 8,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#6b7280',
    fontSize: 14,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingVertical: 14,
  },
  biometricIcon: {
    marginRight: 8,
  },
  biometricButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
  },
  footerLink: {
    color: '#10b981',
    fontWeight: '500',
  },
  biometricContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  biometricPromptIcon: {
    marginBottom: 24,
  },
  biometricPromptTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  biometricPromptSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  loader: {
    marginVertical: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#10b981',
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  forgotTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  forgotDescription: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 32,
  },
  resetButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  resetButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '500',
  },
  demoCard: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1d4ed8',
    textAlign: 'center',
    marginBottom: 12,
  },
  demoAccounts: {
    gap: 12,
  },
  demoAccount: {
    gap: 2,
  },
  demoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e40af',
  },
  demoEmail: {
    fontSize: 12,
    color: '#1e40af',
  },
  demoPassword: {
    fontSize: 12,
    color: '#1e40af',
  },
});

export default AuthNavigator;