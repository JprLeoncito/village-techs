import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
    } catch (error) {
      Alert.alert(
        'Login Failed',
        error instanceof Error ? error.message : 'Invalid credentials'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <MaterialIcons name="apartment" size={64} color="#10b981" />
          <Text style={styles.title}>Village Tech</Text>
          <Text style={styles.subtitle}>Residence App</Text>
        </View>

        <Card style={styles.loginCard}>
          <Text style={styles.cardTitle}>Sign In</Text>

          <Input
            testID="email-input"
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            testID="password-input"
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
          />

          <Button
            testID="login-button"
            variant="primary"
            onPress={handleLogin}
            loading={isLoading}
            disabled={isLoading}
            fullWidth
            style={styles.loginButton}
          >
            Sign In
          </Button>
        </Card>

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

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Contact your HOA admin for account access
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    fontSize: 64,
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
  loginCard: {
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 24,
    textAlign: 'center',
  },
  loginButton: {
    marginTop: 16,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
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

export default LoginScreen;