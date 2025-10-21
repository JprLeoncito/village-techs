import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';

export const SettingsScreen: React.FC = () => {
  const { user, householdId, householdName, logout, updateProfile } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();

  // Profile state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Load user and household data on mount
  useEffect(() => {
    if (user) {
      setFirstName(user.user_metadata?.first_name || '');
      setLastName(user.user_metadata?.last_name || '');
      // Try to get phone from household data if not in user metadata
      const userPhone = user.user_metadata?.phone;
      if (userPhone) {
        setPhone(userPhone);
      } else if (householdId) {
        // Fetch household data for phone number
        fetchHouseholdData();
      }
    }
  }, [user, householdId]);

  const fetchHouseholdData = async () => {
    try {
      if (!householdId) return;

      console.log('Fetching household data for ID:', householdId);
      console.log('Current user ID:', user?.id);

      // First try to get phone number from the current user's household member record
      const { data: memberData, error: memberError } = await supabase
        .from('household_members')
        .select('contact_phone, first_name, last_name')
        .eq('household_id', householdId)
        .eq('user_id', user?.id)
        .maybeSingle();

      if (memberError) {
        console.error('Error fetching member data:', memberError);
      } else if (memberData?.contact_phone && memberData.contact_phone.trim() !== '') {
        console.log('Found phone number in household member record:', memberData.contact_phone);
        setPhone(memberData.contact_phone);
        return;
      }

      // Fallback: try to get phone number from household contact_phone
      const { data: household, error } = await supabase
        .from('households')
        .select(`
          contact_phone,
          residences!inner(
            id,
            unit_number,
            type
          )
        `)
        .eq('id', householdId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching household data:', error);
        return;
      }

      console.log('Household data fetched:', household);

      // Check available phone fields
      const contactPhone = household?.contact_phone;
      const userPhone = user?.user_metadata?.phone;

      if (contactPhone && contactPhone.trim() !== '') {
        console.log('Found phone number in household contact_phone:', contactPhone);
        setPhone(contactPhone);
      } else if (userPhone && userPhone.trim() !== '') {
        console.log('Using phone from user metadata:', userPhone);
        setPhone(userPhone);
      } else {
        console.log('No phone number found in household members, household contact, or user metadata');
      }
    } catch (error) {
      console.error('Error fetching household data:', error);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setProfileLoading(true);

      console.log('Updating profile with:', { firstName, lastName, phone });

      // Update user metadata (first name, last name)
      const profileSuccess = await updateProfile({
        first_name: firstName,
        last_name: lastName,
      });

      if (!profileSuccess) {
        console.log('Profile update failed');
        Alert.alert('Error', 'Failed to update profile');
        return;
      }

      // Update phone number in household_members table
      if (householdId && user?.id) {
        const { error: memberUpdateError } = await supabase
          .from('household_members')
          .update({ contact_phone: phone.trim() || null })
          .eq('household_id', householdId)
          .eq('user_id', user.id);

        if (memberUpdateError) {
          console.error('Error updating household member phone:', memberUpdateError);
          Alert.alert('Error', 'Failed to update phone number');
          return;
        }
      }

      console.log('Profile updated successfully, reloading user data...');
      // Force reload user data from auth context
      if (user) {
        setFirstName(user.user_metadata?.first_name || '');
        setLastName(user.user_metadata?.last_name || '');
      }
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async () => {
    // Validation
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    try {
      setPasswordLoading(true);

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      // Clear password fields
      setNewPassword('');
      setConfirmPassword('');

      Alert.alert('Success', 'Password changed successfully!');
    } catch (error) {
      console.error('Password change error:', error);
      Alert.alert('Error', 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  const styles = createStyles(theme);

  return (
    <ScrollView style={styles.container}>
      {/* Profile Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: isEditMode ? theme.colors.error : theme.colors.primary }]}
            onPress={() => setIsEditMode(!isEditMode)}
          >
            <Text style={styles.editButtonText}>
              {isEditMode ? 'Cancel' : 'Edit'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={user?.email || ''}
              editable={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={[styles.input, !isEditMode && styles.disabledInput]}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter first name"
              placeholderTextColor={theme.colors.muted}
              editable={isEditMode}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={[styles.input, !isEditMode && styles.disabledInput]}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter last name"
              placeholderTextColor={theme.colors.muted}
              editable={isEditMode}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={[styles.input, !isEditMode && styles.disabledInput]}
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter phone number"
              placeholderTextColor={theme.colors.muted}
              keyboardType="phone-pad"
              editable={isEditMode}
            />
          </View>

          {isEditMode && (
            <TouchableOpacity
              style={[styles.button, profileLoading && styles.buttonDisabled]}
              onPress={handleUpdateProfile}
              disabled={profileLoading}
            >
              {profileLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Update Profile</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Security Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Change Password</Text>
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>New Password</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password (min 8 characters)"
              placeholderTextColor={theme.colors.muted}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor={theme.colors.muted}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, passwordLoading && styles.buttonDisabled]}
            onPress={handleChangePassword}
            disabled={passwordLoading}
          >
            {passwordLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Change Password</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Appearance Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Dark Mode</Text>
              <Text style={styles.settingDescription}>
                {isDark ? 'Dark theme enabled' : 'Light theme enabled'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#d1d5db', true: '#10b981' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>
      </View>

      {/* Household Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Household Information</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Residence:</Text>
            <Text style={styles.infoValue}>{householdName || 'N/A'}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowLast]}>
            <Text style={styles.infoLabel}>Household ID:</Text>
            <Text style={styles.infoValue}>
              {householdId ? `...${householdId.slice(-8)}` : 'N/A'}
            </Text>
          </View>
        </View>
      </View>

      {/* Logout Section */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    section: {
      padding: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 12,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    editButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 6,
      alignItems: 'center',
    },
    editButtonText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '600',
    },
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.dark ? '#1f2937' : '#ffffff',
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: theme.colors.text,
    },
    disabledInput: {
      backgroundColor: theme.dark ? '#374151' : '#f3f4f6',
      color: theme.colors.muted,
    },
    button: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
    },
    settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    settingInfo: {
      flex: 1,
      marginRight: 16,
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    settingDescription: {
      fontSize: 14,
      color: theme.colors.muted,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    infoRowLast: {
      borderBottomWidth: 0,
    },
    infoLabel: {
      fontSize: 14,
      color: theme.colors.muted,
    },
    infoValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    logoutButton: {
      backgroundColor: theme.colors.error,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
    },
    logoutButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
    },
  });

export default SettingsScreen;
