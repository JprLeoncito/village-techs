import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../lib/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { StatusIndicator } from '../../components/ui/StatusIndicator';

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, loading } = useAuth();
  const { theme } = useTheme();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    try {
      setIsLoading(true);
      const result = await signIn(email.trim(), password.trim());

      if (result.error) {
        Alert.alert('Login Failed', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const textStyles = {
    title: [styles.title, { color: theme.colors.text }],
    subtitle: [styles.subtitle, { color: theme.colors.muted }],
    label: [styles.label, { color: theme.colors.text }],
    forgotPassword: [styles.forgotPassword, { color: theme.colors.primary }],
    helpText: [styles.helpText, { color: theme.colors.muted }],
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <StatusIndicator status="syncing" size="large" />
          <Text style={textStyles.title}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo and Header */}
          <View style={styles.header}>
            <View style={[styles.logoContainer, { backgroundColor: theme.colors.primary }]}>
              <Icon name="shield-account" size={48} color="#ffffff" />
            </View>
            <Text style={textStyles.title}>Sentinel Security</Text>
            <Text style={textStyles.subtitle}>Security Officer Portal</Text>
          </View>

          {/* Login Form */}
          <Card style={styles.formContainer} padding={24}>
            <View style={styles.formHeader}>
              <Icon name="login" size={32} color={theme.colors.primary} />
              <Text style={[styles.formTitle, { color: theme.colors.text }]}>
                Sign In
              </Text>
              <Text style={textStyles.subtitle}>
                Enter your credentials to access the security portal
              </Text>
            </View>

            <View style={styles.form}>
              <Input
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                placeholder="officer@villagetech.ph"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                leftIcon={<Icon name="email" size={20} color={theme.colors.muted} />}
                editable={!isLoading}
              />

              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                leftIcon={<Icon name="lock" size={20} color={theme.colors.muted} />}
                rightIcon={
                  <Icon
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={theme.colors.muted}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                editable={!isLoading}
              />

              <View style={styles.forgotPasswordContainer}>
                <Text style={textStyles.forgotPassword}>Forgot Password?</Text>
              </View>

              <Button
                title="Sign In"
                onPress={handleLogin}
                loading={isLoading}
                disabled={!email.trim() || !password.trim()}
                style={styles.loginButton}
                icon={<Icon name="login" size={20} color="#ffffff" />}
              />
            </View>
          </Card>

          {/* Demo Account Section */}
          <Card style={styles.demoCard} padding={16}>
            <View style={styles.demoHeader}>
              <Icon name="account-key" size={24} color={theme.colors.primary} />
              <Text style={[styles.demoTitle, { color: theme.colors.text }]}>
                Demo Account
              </Text>
            </View>
            <View style={styles.demoAccount}>
              <Text style={[styles.demoLabel, { color: theme.colors.text }]}>
                Security Officer:
              </Text>
              <Text style={[styles.demoEmail, { color: theme.colors.muted }]}>
                Email: security.officer@greenvalley.com
              </Text>
              <Text style={[styles.demoPassword, { color: theme.colors.muted }]}>
                Password: Security123!
              </Text>
            </View>
          </Card>

          {/* Help Section */}
          <View style={styles.helpSection}>
            <View style={styles.helpItem}>
              <Icon name="information" size={20} color={theme.colors.muted} />
              <Text style={textStyles.helpText}>
                Use your security officer credentials to access the portal
              </Text>
            </View>
            <View style={styles.helpItem}>
              <Icon name="cellphone" size={20} color={theme.colors.muted} />
              <Text style={textStyles.helpText}>
                For technical support, contact your security administrator
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginVertical: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  formContainer: {
    marginBottom: 32,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  form: {
    gap: 16,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  forgotPassword: {
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    marginTop: 8,
  },
  helpSection: {
    gap: 16,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  helpText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  demoCard: {
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  demoAccount: {
    gap: 4,
  },
  demoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  demoEmail: {
    fontSize: 12,
  },
  demoPassword: {
    fontSize: 12,
  },
});