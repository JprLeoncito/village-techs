import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Header } from '@/components/shared/Header';

export const ProfileScreen: React.FC = () => {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { officer, signOut } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();

  const handlePasswordChange = async () => {
    // Validation
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      // Verify current password by re-authenticating
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: officer!.email,
        password: currentPassword,
      });

      if (signInError) {
        Alert.alert('Error', 'Current password is incorrect');
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      Alert.alert(
        'Success',
        'Password changed successfully',
        [{ text: 'OK', onPress: () => resetPasswordForm() }]
      );
    } catch (error: any) {
      console.error('Error changing password:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to change password. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetPasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordForm(false);
    setIsChangingPassword(false);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => signOut(),
        },
      ]
    );
  };

  const textStyles = {
    title: [styles.title, { color: theme.colors.text }],
    subtitle: [styles.subtitle, { color: theme.colors.muted }],
    sectionTitle: [styles.sectionTitle, { color: theme.colors.text }],
    label: [styles.label, { color: theme.colors.text }],
    value: [styles.value, { color: theme.colors.text }],
    readonlyValue: [styles.readonlyValue, { color: theme.colors.muted }],
    note: [styles.note, { color: theme.colors.muted }],
  };

  if (!officer) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={textStyles.title}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Profile" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Overview Card */}
        <Card style={styles.profileCard} padding={24}>
          <View style={styles.profileHeader}>
            <View style={[styles.avatarContainer, { backgroundColor: theme.colors.primary }]}>
              <Icon name="shield-account" size={48} color="#ffffff" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={textStyles.title}>{officer.email}</Text>
              <Badge
                title={officer.role === 'security_head' ? 'Security Head' : 'Security Officer'}
                variant={officer.role === 'security_head' ? 'primary' : 'secondary'}
                size="small"
              />
            </View>
          </View>

          <View style={styles.profileStats}>
            <View style={styles.statItem}>
              <Icon name="map-marker" size={20} color={theme.colors.primary} />
              <Text style={textStyles.value}>Gate Assigned</Text>
              <Text style={textStyles.readonlyValue}>Current Shift</Text>
            </View>
            <View style={styles.statItem}>
              <Icon name="clock" size={20} color={theme.colors.primary} />
              <Text style={textStyles.value}>Status</Text>
              <Text style={textStyles.readonlyValue}>On Duty</Text>
            </View>
          </View>
        </Card>

        {/* Account Information */}
        <Card style={styles.card} padding={20}>
          <Text style={textStyles.sectionTitle}>Account Information</Text>
          <Text style={textStyles.note}>
            Profile information is managed by your administrator. Contact them for any changes.
          </Text>

          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Text style={textStyles.label}>Email Address</Text>
              <Text style={textStyles.readonlyValue}>{officer.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={textStyles.label}>Role</Text>
              <Text style={textStyles.readonlyValue}>
                {officer.role === 'security_head' ? 'Security Head' : 'Security Officer'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={textStyles.label}>User ID</Text>
              <Text style={textStyles.readonlyValue}>{officer.id.slice(0, 8)}...</Text>
            </View>
          </View>
        </Card>

        {/* Password Change */}
        <Card style={styles.card} padding={20}>
          <View style={styles.sectionHeader}>
            <Text style={textStyles.sectionTitle}>Security</Text>
            <Icon name="lock" size={20} color={theme.colors.primary} />
          </View>

          {!showPasswordForm ? (
            <Button
              title="Change Password"
              onPress={() => setShowPasswordForm(true)}
              variant="outline"
              icon={<Icon name="key" size={20} color={theme.colors.primary} />}
            />
          ) : (
            <View style={styles.passwordForm}>
              <Input
                label="Current Password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                secureTextEntry
                leftIcon={<Icon name="lock" size={20} color={theme.colors.muted} />}
                editable={!isLoading}
              />

              <Input
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password (min. 6 characters)"
                secureTextEntry
                leftIcon={<Icon name="lock-reset" size={20} color={theme.colors.muted} />}
                editable={!isLoading}
              />

              <Input
                label="Confirm New Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                secureTextEntry
                leftIcon={<Icon name="lock-check" size={20} color={theme.colors.muted} />}
                editable={!isLoading}
              />

              <View style={styles.passwordButtons}>
                <Button
                  title="Cancel"
                  onPress={resetPasswordForm}
                  variant="outline"
                  style={styles.cancelButton}
                />
                <Button
                  title="Update Password"
                  onPress={handlePasswordChange}
                  loading={isLoading}
                  disabled={isLoading}
                  icon={<Icon name="check" size={20} color="#ffffff" />}
                  style={styles.updateButton}
                />
              </View>
            </View>
          )}
        </Card>

        {/* App Settings */}
        <Card style={styles.card} padding={20}>
          <View style={styles.sectionHeader}>
            <Text style={textStyles.sectionTitle}>App Settings</Text>
            <Icon name="cog" size={20} color={theme.colors.primary} />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={textStyles.label}>Dark Mode</Text>
              <Text style={textStyles.readonlyValue}>
                {isDark ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
            <Button
              title={isDark ? 'Disable' : 'Enable'}
              onPress={toggleTheme}
              variant="outline"
              size="small"
            />
          </View>
        </Card>

        {/* Sign Out */}
        <Card style={styles.card} padding={20}>
          <Button
            title="Sign Out"
            onPress={handleSignOut}
            variant="danger"
            icon={<Icon name="logout" size={20} color="#ffffff" />}
          />
        </Card>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={textStyles.readonlyValue}>Sentinel Security v1.0.0</Text>
          <Text style={textStyles.note}>© 2025 Village Tech</Text>
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  profileCard: {
    margin: 20,
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  note: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  infoSection: {
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
  },
  readonlyValue: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  passwordForm: {
    gap: 16,
  },
  passwordButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  updateButton: {
    flex: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
  },
  versionContainer: {
    alignItems: 'center',
    padding: 20,
    gap: 4,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
});