import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const SimpleLoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [name, setName] = useState('');
  const { login, signUp } = useAuth();
  const { theme } = useTheme();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(email, password);
      if (!result.success) {
        Alert.alert('Login Failed', result.error || 'An error occurred');
      }
    } catch (error) {
      Alert.alert('Login Failed', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !name) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      const result = await signUp(email, password, name);
      if (!result.success) {
        Alert.alert('Sign Up Failed', result.error || 'An error occurred');
      } else {
        Alert.alert(
          'Sign Up Successful',
          'Your account has been created. You can now log in.',
          [
            {
              text: 'OK',
              onPress: () => setShowSignUp(false),
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Sign Up Failed', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContainer: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 20,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.muted,
      textAlign: 'center',
      marginBottom: 40,
    },
    inputContainer: {
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: theme.colors.text,
      backgroundColor: theme.colors.card,
    },
    loginButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
      paddingVertical: 16,
      paddingHorizontal: 24,
      alignItems: 'center',
      marginTop: 20,
    },
    loginButtonDisabled: {
      backgroundColor: theme.colors.muted,
      opacity: 0.6,
    },
    loginButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
    },
    switchModeButton: {
      marginTop: 16,
      paddingVertical: 8,
    },
    switchModeText: {
      color: theme.colors.primary,
      fontSize: 14,
      fontWeight: '500',
      textAlign: 'center',
    },
    demoCredentials: {
      marginTop: 30,
      padding: 16,
      backgroundColor: theme.colors.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    demoTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    authSection: {
      marginBottom: 16,
      paddingVertical: 12,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    demoText: {
      fontSize: 12,
      color: theme.colors.muted,
      marginBottom: 2,
    },
    authNote: {
      fontSize: 11,
      color: theme.colors.primary,
      fontStyle: 'italic',
      marginTop: 4,
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Sentinel Security</Text>
        <Text style={styles.subtitle}>Gate Access Control System</Text>

        {showSignUp && (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              placeholderTextColor={theme.colors.muted}
              autoCapitalize="words"
            />
          </View>
        )}

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            placeholderTextColor={theme.colors.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            placeholderTextColor={theme.colors.muted}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[
            styles.loginButton,
            (!email || !password || (showSignUp && !name) || isLoading) && styles.loginButtonDisabled,
          ]}
          onPress={showSignUp ? handleSignUp : handleLogin}
          disabled={!email || !password || (showSignUp && !name) || isLoading}
        >
          <Text style={styles.loginButtonText}>
            {isLoading
              ? (showSignUp ? 'Creating Account...' : 'Signing In...')
              : (showSignUp ? 'Sign Up' : 'Sign In')
            }
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchModeButton}
          onPress={() => setShowSignUp(!showSignUp)}
        >
          <Text style={styles.switchModeText}>
            {showSignUp
              ? 'Already have an account? Sign In'
              : "Don't have an account? Sign Up"
            }
          </Text>
        </TouchableOpacity>

        <View style={styles.demoCredentials}>
          <Text style={styles.demoTitle}>🔐 Hybrid Authentication</Text>

          <View style={styles.authSection}>
            <Text style={styles.sectionTitle}>Security Account (Mock):</Text>
            <Text style={styles.demoText}>📧 Email: security@sentinel.com</Text>
            <Text style={styles.demoText}>🔑 Password: sentinel123</Text>
            <Text style={styles.authNote}>Built-in security officer account</Text>
          </View>

          <View style={styles.authSection}>
            <Text style={styles.sectionTitle}>Regular Users (Real Supabase):</Text>
            <Text style={styles.demoText}>📝 Sign up with any email/password</Text>
            <Text style={styles.demoText}>💾 Stored in real Supabase database</Text>
            <Text style={styles.authNote}>Persistent authentication</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default SimpleLoginScreen;