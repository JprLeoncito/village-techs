import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { locationService } from '../../services/location/LocationService';
import { notificationService } from '../../services/notifications/NotificationService';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatusIndicator } from '../../components/ui/StatusIndicator';
import { Header } from '../../components/shared/Header';

type AuthStackParamList = {
  ClockIn: { gateId: string; gateName: string };
  Main: undefined;
};

type ClockInScreenRouteProp = RouteProp<AuthStackParamList, 'ClockIn'>;
type ClockInScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'ClockIn'>;

interface SecurityShift {
  id: string;
  officer_id: string;
  gate_id: string;
  clock_in_timestamp: string;
  clock_out_timestamp?: string;
  status: 'active' | 'completed';
}

export const ClockInScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingLocation, setIsVerifyingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'checking' | 'verified' | 'failed'>('checking');
  const [activeShift, setActiveShift] = useState<SecurityShift | null>(null);
  const { officer, signOut } = useAuth();
  const { theme } = useTheme();
  const route = useRoute<ClockInScreenRouteProp>();
  const navigation = useNavigation<ClockInScreenNavigationProp>();

  const { gateId, gateName } = route.params;

  useEffect(() => {
    checkActiveShift();
    verifyLocation();
  }, []);

  const checkActiveShift = async () => {
    try {
      if (!officer) return;

      const { data, error } = await supabase
        .from('security_shifts')
        .select('*')
        .eq('officer_id', officer.id)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking active shift:', error);
        return;
      }

      setActiveShift(data);
    } catch (error) {
      console.error('Error checking active shift:', error);
    }
  };

  const verifyLocation = async () => {
    setIsVerifyingLocation(true);
    setLocationStatus('checking');

    try {
      // Get gate location (you might need to implement this endpoint)
      const gateLocation = {
        id: gateId,
        name: gateName,
        coordinates: { latitude: 14.5995, longitude: 120.9842 }, // Placeholder
        radius: 100, // 100 meters
      };

      const result = await locationService.verifyAtGate(gateLocation);

      if (result.isAtGate) {
        setLocationStatus('verified');
      } else {
        setLocationStatus('failed');
        Alert.alert(
          'Location Required',
          `You need to be at ${gateName} to clock in. Current distance: ${result.distance?.toFixed(0)}m`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error verifying location:', error);
      setLocationStatus('failed');
      Alert.alert(
        'Location Error',
        'Unable to verify your location. Please ensure location services are enabled.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsVerifyingLocation(false);
    }
  };

  const handleClockIn = async () => {
    if (!officer || locationStatus !== 'verified') {
      Alert.alert(
        'Cannot Clock In',
        'Location verification is required before clocking in.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (activeShift) {
      Alert.alert(
        'Already Clocked In',
        `You are already clocked in at ${gateName} since ${new Date(activeShift.clock_in_timestamp).toLocaleTimeString()}`,
        [{ text: 'OK' }]
      );
      return;
    }

    setIsLoading(true);

    try {
      // Start location tracking
      await locationService.startShiftTracking(gateId);

      // Create shift record
      const { data, error } = await supabase
        .from('security_shifts')
        .insert([{
          officer_id: officer.id,
          gate_id: gateId,
          clock_in_timestamp: new Date().toISOString(),
          status: 'active',
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Send notification
      await notificationService.sendShiftReminder(
        `Successfully clocked in at ${gateName}. Shift tracking started.`
      );

      Alert.alert(
        'Clock In Successful',
        `You are now on duty at ${gateName}`,
        [{ text: 'OK' }]
      );

      // Navigate to main app
      navigation.replace('Main');
    } catch (error) {
      console.error('Error clocking in:', error);
      Alert.alert(
        'Clock In Failed',
        'An error occurred while clocking in. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
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
    gateName: [styles.gateName, { color: theme.colors.text }],
    locationText: [styles.locationText, { color: theme.colors.text }],
    locationSubtext: [styles.locationSubtext, { color: theme.colors.muted }],
    officerText: [styles.officerText, { color: theme.colors.muted }],
  };

  if (activeShift) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header
          title="Already Clocked In"
          showBackButton
          onBackPress={() => navigation.goBack()}
          rightAction={{
            icon: 'logout',
            onPress: handleSignOut,
          }}
        />

        <View style={styles.content}>
          <Card style={styles.statusCard} padding={24}>
            <View style={styles.statusHeader}>
              <Icon name="check-circle" size={48} color={theme.colors.success} />
              <Text style={textStyles.title}>Active Shift</Text>
            </View>

            <View style={styles.shiftInfo}>
              <View style={styles.infoRow}>
                <Icon name="map-marker" size={20} color={theme.colors.muted} />
                <Text style={textStyles.gateName}>{gateName}</Text>
              </View>

              <View style={styles.infoRow}>
                <Icon name="clock" size={20} color={theme.colors.muted} />
                <Text style={textStyles.officerText}>
                  Clocked in: {new Date(activeShift.clock_in_timestamp).toLocaleTimeString()}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Icon name="account" size={20} color={theme.colors.muted} />
                <Text style={textStyles.officerText}>
                  {officer?.email}
                </Text>
              </View>
            </View>

            <Button
              title="Continue to App"
              onPress={() => navigation.replace('Main')}
              icon={<Icon name="arrow-right" size={20} color="#ffffff" />}
            />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title="Clock In"
        showBackButton
        onBackPress={() => navigation.goBack()}
        rightAction={{
          icon: 'logout',
          onPress: handleSignOut,
        }}
      />

      <View style={styles.content}>
        <Card style={styles.card} padding={24}>
          {/* Gate Information */}
          <View style={styles.gateInfo}>
            <Icon name="map-marker" size={32} color={theme.colors.primary} />
            <Text style={textStyles.gateName}>{gateName}</Text>
            <Text style={textStyles.subtitle}>Selected gate for this shift</Text>
          </View>

          {/* Officer Information */}
          <View style={styles.officerSection}>
            <Text style={textStyles.subtitle}>Officer Information</Text>
            <View style={styles.infoRow}>
              <Icon name="account" size={20} color={theme.colors.muted} />
              <Text style={textStyles.officerText}>{officer?.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Icon name="shield" size={20} color={theme.colors.muted} />
              <Text style={textStyles.officerText}>
                {officer?.role === 'security_head' ? 'Security Head' : 'Security Officer'}
              </Text>
            </View>
          </View>

          {/* Location Verification */}
          <View style={styles.locationSection}>
            <Text style={textStyles.subtitle}>Location Verification</Text>
            <View style={styles.locationStatus}>
              {isVerifyingLocation ? (
                <View style={styles.verifyingLocation}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={textStyles.locationText}>Verifying location...</Text>
                </View>
              ) : (
                <View style={styles.locationResult}>
                  <StatusIndicator
                    status={locationStatus === 'verified' ? 'success' : 'error'}
                    size="small"
                  />
                  <Text style={textStyles.locationText}>
                    {locationStatus === 'verified' ? 'Location Verified' : 'Location Not Verified'}
                  </Text>
                  <Text style={textStyles.locationSubtext}>
                    {locationStatus === 'verified'
                      ? 'You are at the correct gate location'
                      : 'Please move to the gate location to clock in'}
                  </Text>
                </View>
              )}
            </View>

            {locationStatus !== 'verified' && (
              <Button
                title="Retry Location Check"
                onPress={verifyLocation}
                variant="outline"
                icon={<Icon name="refresh" size={20} color={theme.colors.primary} />}
              />
            )}
          </View>

          {/* Clock In Button */}
          <Button
            title="Clock In"
            onPress={handleClockIn}
            loading={isLoading}
            disabled={locationStatus !== 'verified' || isLoading}
            icon={<Icon name="login" size={20} color="#ffffff" />}
            style={styles.clockInButton}
          />
        </Card>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    gap: 24,
  },
  statusCard: {
    gap: 20,
  },
  gateInfo: {
    alignItems: 'center',
    gap: 8,
  },
  gateName: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  officerSection: {
    gap: 12,
  },
  locationSection: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  officerText: {
    fontSize: 16,
  },
  locationStatus: {
    alignItems: 'center',
    gap: 8,
  },
  verifyingLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationResult: {
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
  },
  locationSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  clockInButton: {
    marginTop: 8,
  },
  statusHeader: {
    alignItems: 'center',
    gap: 12,
  },
  shiftInfo: {
    gap: 16,
  },
});