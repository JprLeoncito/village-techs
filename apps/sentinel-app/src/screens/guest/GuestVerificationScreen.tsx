import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Header } from '../../components/shared/Header';
import { PhotoCapture } from '../../components/camera/PhotoCapture';
import { Input } from '../../components/ui/Input';

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

type GuestVerificationRouteProp = RouteProp<GuestStackParamList, 'GuestVerification'>;
type GuestVerificationNavigationProp = StackNavigationProp<GuestStackParamList, 'GuestVerification'>;

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

export const GuestVerificationScreen: React.FC = () => {
  const { theme } = useTheme();
  const { officer } = useAuth();
  const route = useRoute<GuestVerificationRouteProp>();
  const navigation = useNavigation<GuestVerificationNavigationProp>();
  const { guestId } = route.params;

  const [guest, setGuest] = useState<Guest | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [verificationPhotos, setVerificationPhotos] = useState<Photo[]>([]);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<'qr' | 'manual' | 'phone'>('manual');

  useEffect(() => {
    if (guestId) {
      loadGuestDetails();
    }
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

      // Load household details
      const { data: householdData, error: householdError } = await supabase
        .from('households')
        .select('*')
        .eq('id', guestData.household_id)
        .single();

      if (!householdError && householdData) {
        setHousehold(householdData);
      }

      // Set initial verification notes
      if (guestData.notes) {
        setVerificationNotes(guestData.notes);
      }
    } catch (error) {
      console.error('Error loading guest details:', error);
      Alert.alert('Error', 'Failed to load guest details');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoCapture = (photo: Photo) => {
    setVerificationPhotos(prev => [...prev, photo].slice(-3)); // Keep max 3 photos
    setShowPhotoCapture(false);
  };

  const removePhoto = (index: number) => {
    setVerificationPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleCallContact = () => {
    if (guest?.contact_number) {
      Linking.openURL(`tel:${guest.contact_number}`);
    }
  };

  const handleApproveGuest = async () => {
    if (!guest) return;

    try {
      setIsProcessing(true);

      const { error } = await supabase
        .from('guests')
        .update({
          status: 'approved',
          notes: verificationNotes || null,
          verification_photos: verificationPhotos.map(photo => photo.uri),
          verified_by: officer.id,
          verified_at: new Date().toISOString(),
        })
        .eq('id', guest.id);

      if (error) throw error;

      Alert.alert(
        'Guest Approved',
        `${guest.name} has been approved and can now check in.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error approving guest:', error);
      Alert.alert('Error', 'Failed to approve guest. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckIn = async () => {
    if (!guest) return;

    try {
      setIsProcessing(true);

      // Create guest access record
      const { error: accessError } = await supabase
        .from('guest_access_logs')
        .insert([{
          guest_id: guest.id,
          tenant_id: officer.tenantId,
          household_id: guest.household_id,
          check_in_timestamp: new Date().toISOString(),
          security_officer_id: officer.id,
          verification_method: verificationMethod,
          verification_notes: verificationNotes || null,
          verification_photos: verificationPhotos.map(photo => photo.uri),
        }]);

      if (accessError) throw accessError;

      // Update guest status
      const { error: guestError } = await supabase
        .from('guests')
        .update({
          status: 'checked_in',
          notes: verificationNotes || null,
          verification_photos: verificationPhotos.map(photo => photo.uri),
          verified_by: officer.id,
          verified_at: new Date().toISOString(),
        })
        .eq('id', guest.id);

      if (guestError) throw guestError;

      Alert.alert(
        'Guest Checked In',
        `${guest.name} has been checked in successfully.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error checking in guest:', error);
      Alert.alert('Error', 'Failed to check in guest. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectGuest = async () => {
    if (!guest) return;

    Alert.alert(
      'Reject Guest',
      `Are you sure you want to reject ${guest.name}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsProcessing(true);

              const { error } = await supabase
                .from('guests')
                .update({
                  status: 'rejected',
                  notes: `Rejected: ${verificationNotes || 'No reason provided'}`,
                  rejected_by: officer.id,
                  rejected_at: new Date().toISOString(),
                })
                .eq('id', guest.id);

              if (error) throw error;

              Alert.alert(
                'Guest Rejected',
                `${guest.name} has been rejected.`,
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (error) {
              console.error('Error rejecting guest:', error);
              Alert.alert('Error', 'Failed to reject guest. Please try again.');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'checked_in': return 'primary';
      case 'checked_out': return 'muted';
      case 'expired': return 'error';
      default: return 'default';
    }
  };

  const isExpired = () => {
    if (!guest?.expected_departure) return false;
    return new Date() > new Date(guest.expected_departure);
  };

  const textStyles = {
    title: [styles.title, { color: theme.colors.text }],
    subtitle: [styles.subtitle, { color: theme.colors.muted }],
    sectionTitle: [styles.sectionTitle, { color: theme.colors.text }],
    labelText: [styles.labelText, { color: theme.colors.muted }],
    valueText: [styles.valueText, { color: theme.colors.text }],
    guestName: [styles.guestName, { color: theme.colors.text }],
    methodLabel: [styles.methodLabel, { color: theme.colors.text }],
    photosTitle: [styles.photosTitle, { color: theme.colors.text }],
    photoTime: [styles.photoTime, { color: theme.colors.muted }],
    loadingText: [styles.loadingText, { color: theme.colors.muted }],
    expiredText: [styles.expiredText, { color: theme.colors.error }],
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header title="Guest Verification" showBackButton />
        <View style={styles.loadingContainer}>
          <Icon name="loading" size={32} color={theme.colors.primary} />
          <Text style={textStyles.loadingText}>Loading guest details...</Text>
        </View>
      </View>
    );
  }

  if (!guest) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header title="Guest Verification" showBackButton />
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={textStyles.title}>Guest Not Found</Text>
          <Text style={textStyles.subtitle}>The requested guest could not be found.</Text>
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
      <Header title="Guest Verification" showBackButton />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Guest Information */}
        <Card style={styles.card} padding={16}>
          <View style={styles.guestHeader}>
            <View style={styles.guestInfo}>
              <Text style={textStyles.guestName}>{guest.name}</Text>
              <View style={styles.statusRow}>
                <Badge
                  title={guest.status.replace('_', ' ')}
                  variant={getStatusColor(guest.status) as any}
                  size="small"
                />
                {isExpired() && (
                  <Badge title="Expired" variant="error" size="small" />
                )}
              </View>
            </View>
            <View style={styles.contactActions}>
              <TouchableOpacity
                style={[styles.contactButton, { backgroundColor: theme.colors.success }]}
                onPress={handleCallContact}
              >
                <Icon name="phone" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {isExpired() && (
            <View style={styles.expiredWarning}>
              <Icon name="alert" size={20} color={theme.colors.error} />
              <Text style={textStyles.expiredText}>
                This guest's expected departure time has passed
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
            {guest.email && (
              <View style={styles.infoItem}>
                <Text style={textStyles.labelText}>Email</Text>
                <Text style={textStyles.valueText}>{guest.email}</Text>
              </View>
            )}
            {guest.host_name && (
              <View style={styles.infoItem}>
                <Text style={textStyles.labelText}>Host</Text>
                <Text style={textStyles.valueText}>{guest.host_name}</Text>
              </View>
            )}
          </View>

          <View style={styles.purposeSection}>
            <Text style={textStyles.labelText}>Purpose of Visit</Text>
            <Text style={textStyles.valueText}>{guest.purpose}</Text>
          </View>

          {(guest.expected_arrival || guest.expected_departure) && (
            <View style={styles.timeSection}>
              {guest.expected_arrival && (
                <View style={styles.timeItem}>
                  <Icon name="calendar-clock" size={16} color={theme.colors.muted} />
                  <View>
                    <Text style={textStyles.labelText}>Expected Arrival</Text>
                    <Text style={textStyles.valueText}>
                      {new Date(guest.expected_arrival).toLocaleString()}
                    </Text>
                  </View>
                </View>
              )}
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
              {household.member_names.length > 0 && (
                <View style={styles.householdItem}>
                  <Icon name="account-group" size={20} color={theme.colors.muted} />
                  <Text style={textStyles.valueText}>
                    Members: {household.member_names.join(', ')}
                  </Text>
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Verification Method */}
        <Card style={styles.card} padding={16}>
          <Text style={textStyles.sectionTitle}>Verification Method</Text>
          <View style={styles.methodsContainer}>
            <TouchableOpacity
              style={[
                styles.methodOption,
                {
                  backgroundColor: verificationMethod === 'manual'
                    ? theme.colors.primary + '20'
                    : theme.colors.card,
                  borderColor: verificationMethod === 'manual'
                    ? theme.colors.primary
                    : theme.colors.border,
                },
              ]}
              onPress={() => setVerificationMethod('manual')}
            >
              <Icon
                name="account-check"
                size={24}
                color={verificationMethod === 'manual' ? theme.colors.primary : theme.colors.text}
              />
              <Text style={textStyles.methodLabel}>Manual Verification</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.methodOption,
                {
                  backgroundColor: verificationMethod === 'phone'
                    ? theme.colors.primary + '20'
                    : theme.colors.card,
                  borderColor: verificationMethod === 'phone'
                    ? theme.colors.primary
                    : theme.colors.border,
                },
              ]}
              onPress={() => setVerificationMethod('phone')}
            >
              <Icon
                name="phone-check"
                size={24}
                color={verificationMethod === 'phone' ? theme.colors.primary : theme.colors.text}
              />
              <Text style={textStyles.methodLabel}>Phone Verification</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.methodOption,
                {
                  backgroundColor: verificationMethod === 'qr'
                    ? theme.colors.primary + '20'
                    : theme.colors.card,
                  borderColor: verificationMethod === 'qr'
                    ? theme.colors.primary
                    : theme.colors.border,
                },
              ]}
              onPress={() => setVerificationMethod('qr')}
              disabled={!guest.qr_code}
            >
              <Icon
                name="qrcode-check"
                size={24}
                color={verificationMethod === 'qr' ? theme.colors.primary : theme.colors.muted}
              />
              <Text style={[
                textStyles.methodLabel,
                !guest.qr_code && { color: theme.colors.muted }
              ]}>
                QR Code {!guest.qr_code && '(Not Available)'}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Verification Photos */}
        <Card style={styles.card} padding={16}>
          <View style={styles.photoSection}>
            <View style={styles.photoHeader}>
              <Text style={textStyles.photosTitle}>Verification Photos</Text>
              <Text style={textStyles.photoTime}>
                {verificationPhotos.length}/3 photos
              </Text>
            </View>

            {verificationPhotos.length > 0 && (
              <View style={styles.photosList}>
                {verificationPhotos.map((photo, index) => (
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
              title="Take Photo"
              onPress={() => setShowPhotoCapture(true)}
              disabled={verificationPhotos.length >= 3}
              variant={verificationPhotos.length > 0 ? 'outline' : 'default'}
              icon={<Icon name="camera" size={20} color={verificationPhotos.length > 0 ? theme.colors.primary : '#ffffff'} />}
            />
          </View>
        </Card>

        {/* Verification Notes */}
        <Card style={styles.card} padding={16}>
          <Text style={textStyles.sectionTitle}>Verification Notes</Text>
          <TextInput
            label="Add verification notes..."
            value={verificationNotes}
            onChangeText={setVerificationNotes}
            placeholder="Enter any notes about the verification process..."
            multiline
            numberOfLines={4}
            style={styles.notesInput}
          />
        </Card>

        {/* Actions */}
        <Card style={styles.card} padding={16}>
          <Text style={textStyles.sectionTitle}>Actions</Text>
          <View style={styles.actions}>
            {guest.status === 'pending' && (
              <>
                <Button
                  title="Approve Guest"
                  onPress={handleApproveGuest}
                  loading={isProcessing}
                  disabled={isProcessing}
                  icon={<Icon name="check-circle" size={20} color="#ffffff" />}
                />
                <Button
                  title="Check In Directly"
                  onPress={handleCheckIn}
                  loading={isProcessing}
                  disabled={isProcessing}
                  variant="outline"
                  icon={<Icon name="login" size={20} color={theme.colors.primary} />}
                />
                <Button
                  title="Reject Guest"
                  onPress={handleRejectGuest}
                  variant="outline"
                  icon={<Icon name="close-circle" size={20} color={theme.colors.error} />}
                  textStyle={{ color: theme.colors.error }}
                />
              </>
            )}

            {guest.status === 'approved' && (
              <Button
                title="Check In Guest"
                onPress={handleCheckIn}
                loading={isProcessing}
                disabled={isProcessing || isExpired()}
                icon={<Icon name="login" size={20} color="#ffffff" />}
              />
            )}

            {(guest.status === 'checked_in' || guest.status === 'checked_out') && (
              <Text style={textStyles.subtitle}>
                {guest.status === 'checked_in'
                  ? 'Guest is already checked in. Use the check out process to record departure.'
                  : 'Guest has already checked out.'
                }
              </Text>
            )}
          </View>
        </Card>
      </ScrollView>

      {/* Photo Capture Modal */}
      {showPhotoCapture && (
        <PhotoCapture
          onPhotoCapture={handlePhotoCapture}
          maxPhotos={3}
          title="Capture Verification Photos"
          subtitle="Take photos for guest verification documentation"
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
  },
  guestName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 8,
  },
  contactButton: {
    padding: 8,
    borderRadius: 20,
  },
  expiredWarning: {
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
  purposeSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
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
  householdInfo: {
    gap: 8,
  },
  householdItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  methodsContainer: {
    gap: 8,
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
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
  actions: {
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '500',
  },
  valueText: {
    fontSize: 16,
  },
  methodLabel: {
    fontSize: 16,
    fontWeight: '500',
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
  expiredText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default GuestVerificationScreen;