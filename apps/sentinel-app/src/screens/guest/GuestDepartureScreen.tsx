import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Header } from '@/components/shared/Header';
import { PhotoCapture } from '@/components/camera/PhotoCapture';
import { TextInput } from '@/components/ui/TextInput';

type GuestStackParamList = {
  GuestList: undefined;
  GuestVerification: {
    guestId?: string;
  };
  WalkInGuest: undefined;
  GuestDeparture: {
    guestId: string;
  };
};

type GuestDepartureRouteProp = RouteProp<GuestStackParamList, 'GuestDeparture'>;
type GuestDepartureNavigationProp = StackNavigationProp<GuestStackParamList, 'GuestDeparture'>;

interface Guest {
  id: string;
  name: string;
  contact_number: string;
  email?: string;
  purpose: string;
  expected_arrival?: string;
  expected_departure?: string;
  household_id: string;
  household_name: string;
  status: 'pending' | 'approved' | 'checked_in' | 'checked_out' | 'expired';
  qr_code?: string;
  notes?: string;
  host_name?: string;
  created_at: string;
  updated_at: string;
}

interface GuestAccessLog {
  id: string;
  guest_id: string;
  check_in_timestamp: string;
  check_out_timestamp?: string;
  security_officer_id: string;
  security_officer_name?: string;
  verification_method: string;
  verification_notes?: string;
  verification_photos?: string[];
}

interface Household {
  id: string;
  name: string;
  residence_number: string;
  member_names: string[];
  contact_number?: string;
}

interface Photo {
  uri: string;
  timestamp: number;
}

export const GuestDepartureScreen: React.FC = () => {
  const { theme } = useTheme();
  const { officer } = useAuth();
  const route = useRoute<GuestDepartureRouteProp>();
  const navigation = useNavigation<GuestDepartureNavigationProp>();
  const { guestId } = route.params;

  const [guest, setGuest] = useState<Guest | null>(null);
  const [accessLog, setAccessLog] = useState<GuestAccessLog | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [departureNotes, setDepartureNotes] = useState('');
  const [departurePhotos, setDeparturePhotos] = useState<Photo[]>([]);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadGuestDetails();
  }, [guestId]);

  const loadGuestDetails = async () => {
    try {
      if (!guestId || !officer?.tenantId) return;

      // Load guest details
      const { data: guestData, error: guestError } = await supabase
        .from('guests')
        .select('*')
        .eq('id', guestId)
        .eq('tenant_id', officer.tenantId)
        .single();

      if (guestError || !guestData) {
        console.error('Error loading guest:', guestError);
        Alert.alert('Error', 'Failed to load guest details');
        return;
      }

      setGuest(guestData);

      // Load active access log
      const { data: logData, error: logError } = await supabase
        .from('guest_access_logs')
        .select('*')
        .eq('guest_id', guestId)
        .is('check_out_timestamp', null)
        .single();

      if (!logError && logData) {
        setAccessLog(logData);
      }

      // Load household details
      const { data: householdData, error: householdError } = await supabase
        .from('households')
        .select('*')
        .eq('id', guestData.household_id)
        .single();

      if (!householdError && householdData) {
        setHousehold(householdData);
      }
    } catch (error) {
      console.error('Error loading guest details:', error);
      Alert.alert('Error', 'Failed to load guest details');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoCapture = (photo: Photo) => {
    setDeparturePhotos(prev => [...prev, photo].slice(-3)); // Keep max 3 photos
    setShowPhotoCapture(false);
  };

  const removePhoto = (index: number) => {
    setDeparturePhotos(prev => prev.filter((_, i) => i !== index));
  };

  const calculateVisitDuration = () => {
    if (!accessLog) return '';

    const checkIn = new Date(accessLog.check_in_timestamp);
    const now = new Date();
    const diffMs = now.getTime() - checkIn.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h ${diffMins}m`;
    }
    return `${diffMins}m`;
  };

  const isOverdue = () => {
    if (!guest?.expected_departure) return false;
    return new Date() > new Date(guest.expected_departure);
  };

  const handleCheckOut = async () => {
    if (!guest || !accessLog) return;

    try {
      setIsProcessing(true);

      // Update access log with checkout time
      const { error: logError } = await supabase
        .from('guest_access_logs')
        .update({
          check_out_timestamp: new Date().toISOString(),
          departure_notes: departureNotes || null,
          departure_photos: departurePhotos.map(photo => photo.uri),
          checkout_officer_id: officer.id,
        })
        .eq('id', accessLog.id);

      if (logError) throw logError;

      // Update guest status
      const { error: guestError } = await supabase
        .from('guests')
        .update({
          status: 'checked_out',
          notes: departureNotes || guest.notes,
        })
        .eq('id', guest.id);

      if (guestError) throw guestError;

      Alert.alert(
        'Guest Checked Out',
        `${guest.name} has been checked out successfully. Visit duration: ${calculateVisitDuration()}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error checking out guest:', error);
      Alert.alert('Error', 'Failed to check out guest. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const textStyles = {
    title: [styles.title, { color: theme.colors.text }],
    subtitle: [styles.subtitle, { color: theme.colors.muted }],
    sectionTitle: [styles.sectionTitle, { color: theme.colors.text }],
    labelText: [styles.labelText, { color: theme.colors.muted }],
    valueText: [styles.valueText, { color: theme.colors.text }],
    guestName: [styles.guestName, { color: theme.colors.text }],
    durationText: [styles.durationText, { color: theme.colors.text }],
    overdueText: [styles.overdueText, { color: theme.colors.error }],
    photosTitle: [styles.photosTitle, { color: theme.colors.text }],
    photoTime: [styles.photoTime, { color: theme.colors.muted }],
    loadingText: [styles.loadingText, { color: theme.colors.muted }],
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header title="Guest Departure" showBackButton />
        <View style={styles.loadingContainer}>
          <Icon name="loading" size={32} color={theme.colors.primary} />
          <Text style={textStyles.loadingText}>Loading guest details...</Text>
        </View>
      </View>
    );
  }

  if (!guest || !accessLog) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header title="Guest Departure" showBackButton />
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={textStyles.title}>Guest Not Found</Text>
          <Text style={textStyles.subtitle}>
            The guest is not currently checked in or could not be found.
          </Text>
          <Button
            title="Go Back"
            onPress={() => navigation.goBack()}
            variant="outline"
          />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Header title="Guest Departure" showBackButton />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Guest Information */}
        <Card style={styles.card} padding={16}>
          <View style={styles.guestHeader}>
            <View style={styles.guestInfo}>
              <Text style={textStyles.guestName}>{guest.name}</Text>
              <Badge title="Checked In" variant="primary" size="small" />
            </View>
            <View style={styles.durationContainer}>
              <Icon name="clock" size={20} color={theme.colors.primary} />
              <Text style={textStyles.durationText}>{calculateVisitDuration()}</Text>
            </View>
          </View>

          {isOverdue() && (
            <View style={styles.overdueWarning}>
              <Icon name="alert" size={20} color={theme.colors.error} />
              <Text style={textStyles.overdueText}>
                Guest's expected departure time has passed
              </Text>
            </View>
          )}

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={textStyles.labelText}>Household</Text>
              <Text style={textStyles.valueText}>{guest.household_name}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={textStyles.labelText}>Contact</Text>
              <Text style={textStyles.valueText}>{guest.contact_number}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={textStyles.labelText}>Purpose</Text>
              <Text style={textStyles.valueText}>{guest.purpose}</Text>
            </View>
            {guest.host_name && (
              <View style={styles.infoItem}>
                <Text style={textStyles.labelText}>Host</Text>
                <Text style={textStyles.valueText}>{guest.host_name}</Text>
              </View>
            )}
          </View>

          <View style={styles.timeSection}>
            <View style={styles.timeItem}>
              <Icon name="login" size={16} color={theme.colors.muted} />
              <View>
                <Text style={textStyles.labelText}>Check-in Time</Text>
                <Text style={textStyles.valueText}>
                  {new Date(accessLog.check_in_timestamp).toLocaleString()}
                </Text>
              </View>
            </View>
            {guest.expected_departure && (
              <View style={styles.timeItem}>
                <Icon name="calendar-clock" size={16} color={theme.colors.muted} />
                <View>
                  <Text style={textStyles.labelText}>Expected Departure</Text>
                  <Text style={textStyles.valueText}>
                    {new Date(guest.expected_departure).toLocaleString()}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {accessLog.verification_photos && accessLog.verification_photos.length > 0 && (
            <View style={styles.verificationSection}>
              <Text style={textStyles.labelText}>Check-in Photos</Text>
              <View style={styles.existingPhotos}>
                {accessLog.verification_photos.map((photo, index) => (
                  <Image key={index} source={{ uri: photo }} style={styles.existingPhoto} />
                ))}
              </View>
            </View>
          )}
        </Card>

        {/* Household Information */}
        {household && (
          <Card style={styles.card} padding={16}>
            <Text style={textStyles.sectionTitle}>Household Information</Text>
            <View style={styles.householdInfo}>
              <View style={styles.householdItem}>
                <Icon name="home" size={20} color={theme.colors.muted} />
                <Text style={textStyles.valueText}>
                  Residence {household.residence_number}
                </Text>
              </View>
              {household.contact_number && (
                <View style={styles.householdItem}>
                  <Icon name="phone" size={20} color={theme.colors.muted} />
                  <Text style={textStyles.valueText}>{household.contact_number}</Text>
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Departure Photos */}
        <Card style={styles.card} padding={16}>
          <View style={styles.photoSection}>
            <View style={styles.photoHeader}>
              <Text style={textStyles.photosTitle}>Departure Photos</Text>
              <Text style={textStyles.photoTime}>
                {departurePhotos.length}/3 photos
              </Text>
            </View>

            {departurePhotos.length > 0 && (
              <View style={styles.photosList}>
                {departurePhotos.map((photo, index) => (
                  <View key={photo.timestamp} style={styles.photoContainer}>
                    <View style={styles.photoWrapper}>
                      <Image source={{ uri: photo.uri }} style={styles.photoThumbnail} />
                      <TouchableOpacity
                        style={[styles.removeButton, { backgroundColor: theme.colors.error }]}
                        onPress={() => removePhoto(index)}
                      >
                        <Icon name="close" size={12} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                    <Text style={textStyles.photoTime}>
                      {new Date(photo.timestamp).toLocaleTimeString()}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <Button
              title="Take Departure Photo"
              onPress={() => setShowPhotoCapture(true)}
              disabled={departurePhotos.length >= 3}
              variant={departurePhotos.length > 0 ? 'outline' : 'default'}
              icon={<Icon name="camera" size={20} color={departurePhotos.length > 0 ? theme.colors.primary : '#ffffff'} />}
            />
          </View>
        </Card>

        {/* Departure Notes */}
        <Card style={styles.card} padding={16}>
          <Text style={textStyles.sectionTitle}>Departure Notes</Text>
          <TextInput
            label="Add departure notes (Optional)"
            value={departureNotes}
            onChangeText={setDepartureNotes}
            placeholder="Enter any notes about the guest's departure..."
            multiline
            numberOfLines={4}
            style={styles.notesInput}
            leftIcon={<Icon name="text" size={20} color={theme.colors.muted} />}
          />
        </Card>

        {/* Check Out Action */}
        <Card style={styles.card} padding={16}>
          <View style={styles.checkOutSection}>
            <View style={styles.checkOutHeader}>
              <Icon name="logout" size={24} color={theme.colors.primary} />
              <View style={styles.checkOutInfo}>
                <Text style={textStyles.sectionTitle}>Check Out Guest</Text>
                <Text style={textStyles.subtitle}>
                  Total visit duration: {calculateVisitDuration()}
                </Text>
              </View>
            </View>

            <Button
              title="Check Out Guest"
              onPress={handleCheckOut}
              loading={isProcessing}
              disabled={isProcessing}
              icon={<Icon name="logout" size={20} color="#ffffff" />}
            />
          </View>
        </Card>
      </ScrollView>

      {/* Photo Capture Modal */}
      {showPhotoCapture && (
        <PhotoCapture
          onPhotoCapture={handlePhotoCapture}
          maxPhotos={3}
          title="Capture Departure Photos"
          subtitle="Take photos for departure documentation"
        />
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  guestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  guestInfo: {
    flex: 1,
    gap: 4,
  },
  guestName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  durationText: {
    fontSize: 14,
    fontWeight: '500',
  },
  overdueWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    gap: 8,
    marginBottom: 16,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    gap: 4,
  },
  timeSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verificationSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 8,
  },
  existingPhotos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  existingPhoto: {
    width: 60,
    height: 60,
    borderRadius: 6,
  },
  householdInfo: {
    gap: 8,
  },
  householdItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  photoSection: {
    gap: 16,
  },
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photosTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  photoTime: {
    fontSize: 14,
  },
  photosList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoContainer: {
    alignItems: 'center',
    gap: 4,
  },
  photoWrapper: {
    position: 'relative',
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesInput: {
    marginTop: 8,
  },
  checkOutSection: {
    gap: 16,
  },
  checkOutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkOutInfo: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '500',
  },
  valueText: {
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
  },
  overdueText: {
    fontSize: 14,
    fontWeight: '500',
  },
});