import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
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

type WalkInGuestScreenNavigationProp = StackNavigationProp<GuestStackParamList, 'WalkInGuest'>;

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

export const WalkInGuestScreen: React.FC = () => {
  const { theme } = useTheme();
  const { officer } = useAuth();
  const navigation = useNavigation<WalkInGuestScreenNavigationProp>();

  const [guestName, setGuestName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [purpose, setPurpose] = useState('');
  const [householdSearch, setHouseholdSearch] = useState('');
  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [filteredHouseholds, setFilteredHouseholds] = useState<Household[]>([]);
  const [hostName, setHostName] = useState('');
  const [expectedDeparture, setExpectedDeparture] = useState('');
  const [notes, setNotes] = useState('');
  const [guestPhotos, setGuestPhotos] = useState<Photo[]>([]);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHouseholdList, setShowHouseholdList] = useState(false);

  useEffect(() => {
    loadHouseholds();
  }, []);

  useEffect(() => {
    filterHouseholds();
  }, [householdSearch, households]);

  const loadHouseholds = async () => {
    try {
      if (!officer?.tenantId) return;

      const { data, error } = await supabase
        .from('households')
        .select('*')
        .eq('tenant_id', officer.tenantId)
        .order('name', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Error loading households:', error);
        return;
      }

      setHouseholds(data || []);
    } catch (error) {
      console.error('Error loading households:', error);
    }
  };

  const filterHouseholds = () => {
    if (!householdSearch.trim()) {
      setFilteredHouseholds([]);
      return;
    }

    const search = householdSearch.toLowerCase();
    const filtered = households.filter(household =>
      household.name.toLowerCase().includes(search) ||
      household.residence_number.toLowerCase().includes(search) ||
      household.member_names.some(name => name.toLowerCase().includes(search))
    );

    setFilteredHouseholds(filtered);
  };

  const handlePhotoCapture = (photo: Photo) => {
    setGuestPhotos(prev => [...prev, photo].slice(-3)); // Keep max 3 photos
    setShowPhotoCapture(false);
  };

  const removePhoto = (index: number) => {
    setGuestPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleHouseholdSelect = (household: Household) => {
    setSelectedHousehold(household);
    setHouseholdSearch(`${household.name} - Residence ${household.residence_number}`);
    setShowHouseholdList(false);
    setFilteredHouseholds([]);
  };

  const validateForm = () => {
    if (!guestName.trim()) {
      Alert.alert('Validation Error', 'Guest name is required');
      return false;
    }

    if (!contactNumber.trim()) {
      Alert.alert('Validation Error', 'Contact number is required');
      return false;
    }

    if (!purpose.trim()) {
      Alert.alert('Validation Error', 'Purpose of visit is required');
      return false;
    }

    if (!selectedHousehold) {
      Alert.alert('Validation Error', 'Please select a household to visit');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setIsProcessing(true);

      // Create guest record
      const { data, error } = await supabase
        .from('guests')
        .insert([{
          tenant_id: officer.tenantId,
          household_id: selectedHousehold.id,
          household_name: selectedHousehold.name,
          name: guestName.trim(),
          contact_number: contactNumber.trim(),
          email: email.trim() || null,
          purpose: purpose.trim(),
          host_name: hostName.trim() || null,
          expected_departure: expectedDeparture ? new Date(expectedDeparture).toISOString() : null,
          status: 'approved', // Walk-in guests are auto-approved
          notes: notes.trim() || null,
          verification_photos: guestPhotos.map(photo => photo.uri),
          verified_by: officer.id,
          verified_at: new Date().toISOString(),
          is_walk_in: true,
        }])
        .select()
        .single();

      if (error) throw error;

      // Create guest access record (immediate check-in)
      const { error: accessError } = await supabase
        .from('guest_access_logs')
        .insert([{
          guest_id: data.id,
          tenant_id: officer.tenantId,
          household_id: selectedHousehold.id,
          check_in_timestamp: new Date().toISOString(),
          security_officer_id: officer.id,
          verification_method: 'walk_in',
          verification_notes: 'Walk-in guest - immediate check-in',
          verification_photos: guestPhotos.map(photo => photo.uri),
        }]);

      if (accessError) throw accessError;

      // Update guest status to checked in
      const { error: updateError } = await supabase
        .from('guests')
        .update({
          status: 'checked_in',
        })
        .eq('id', data.id);

      if (updateError) throw updateError;

      Alert.alert(
        'Guest Registered',
        `${guestName} has been successfully registered and checked in.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error registering walk-in guest:', error);
      Alert.alert(
        'Error',
        'Failed to register guest. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const textStyles = {
    title: [styles.title, { color: theme.colors.text }],
    subtitle: [styles.subtitle, { color: theme.colors.muted }],
    sectionTitle: [styles.sectionTitle, { color: theme.colors.text }],
    photosTitle: [styles.photosTitle, { color: theme.colors.text }],
    photoTime: [styles.photoTime, { color: theme.colors.muted }],
    householdItem: [styles.householdItem, { color: theme.colors.text }],
    residenceNumber: [styles.residenceNumber, { color: theme.colors.muted }],
    emptyText: [styles.emptyText, { color: theme.colors.muted }],
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Header title="Walk-in Guest Registration" showBackButton />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Guest Information */}
        <Card style={styles.card} padding={16}>
          <Text style={textStyles.sectionTitle}>Guest Information</Text>

          <TextInput
            label="Full Name"
            value={guestName}
            onChangeText={setGuestName}
            placeholder="Enter guest's full name"
            style={styles.input}
            required
            leftIcon={<Icon name="account" size={20} color={theme.colors.muted} />}
          />

          <TextInput
            label="Contact Number"
            value={contactNumber}
            onChangeText={setContactNumber}
            placeholder="Enter contact number"
            keyboardType="phone-pad"
            style={styles.input}
            required
            leftIcon={<Icon name="phone" size={20} color={theme.colors.muted} />}
          />

          <TextInput
            label="Email (Optional)"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter email address"
            keyboardType="email-address"
            style={styles.input}
            leftIcon={<Icon name="email" size={20} color={theme.colors.muted} />}
          />

          <TextInput
            label="Purpose of Visit"
            value={purpose}
            onChangeText={setPurpose}
            placeholder="Describe the purpose of the visit"
            multiline
            numberOfLines={3}
            style={styles.input}
            required
            leftIcon={<Icon name="text" size={20} color={theme.colors.muted} />}
          />
        </Card>

        {/* Household Selection */}
        <Card style={styles.card} padding={16}>
          <Text style={textStyles.sectionTitle}>Household to Visit</Text>

          <TextInput
            label="Search Household"
            value={householdSearch}
            onChangeText={setHouseholdSearch}
            placeholder="Search by name, residence number, or member"
            onFocus={() => setShowHouseholdList(true)}
            style={styles.input}
            leftIcon={<Icon name="home-search" size={20} color={theme.colors.muted} />}
          />

          {/* Selected Household Display */}
          {selectedHousehold && (
            <View style={styles.selectedHousehold}>
              <Icon name="check-circle" size={20} color={theme.colors.success} />
              <View style={styles.selectedInfo}>
                <Text style={textStyles.householdItem}>{selectedHousehold.name}</Text>
                <Text style={textStyles.residenceNumber}>
                  Residence {selectedHousehold.residence_number}
                </Text>
                {selectedHousehold.member_names.length > 0 && (
                  <Text style={textStyles.residenceNumber}>
                    Members: {selectedHousehold.member_names.join(', ')}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Household Search Results */}
          {showHouseholdList && filteredHouseholds.length > 0 && (
            <View style={styles.householdList}>
              {filteredHouseholds.map((household) => (
                <TouchableOpacity
                  key={household.id}
                  style={[styles.householdListItem, { borderColor: theme.colors.border }]}
                  onPress={() => handleHouseholdSelect(household)}
                >
                  <View style={styles.householdItemInfo}>
                    <Text style={textStyles.householdItem}>{household.name}</Text>
                    <Text style={textStyles.residenceNumber}>
                      Residence {household.residence_number}
                    </Text>
                    <Text style={textStyles.residenceNumber}>
                      {household.member_names.join(', ')}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={20} color={theme.colors.muted} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {showHouseholdList && householdSearch && filteredHouseholds.length === 0 && (
            <View style={styles.noResults}>
              <Icon name="home-search" size={24} color={theme.colors.muted} />
              <Text style={textStyles.emptyText}>No households found</Text>
            </View>
          )}

          <TextInput
            label="Host Name (Optional)"
            value={hostName}
            onChangeText={setHostName}
            placeholder="Name of the person being visited"
            style={styles.input}
            leftIcon={<Icon name="account" size={20} color={theme.colors.muted} />}
          />

          <TextInput
            label="Expected Departure (Optional)"
            value={expectedDeparture}
            onChangeText={setExpectedDeparture}
            placeholder="YYYY-MM-DD HH:MM"
            style={styles.input}
            leftIcon={<Icon name="calendar-clock" size={20} color={theme.colors.muted} />}
          />
        </Card>

        {/* Photo Capture */}
        <Card style={styles.card} padding={16}>
          <View style={styles.photoSection}>
            <View style={styles.photoHeader}>
              <Text style={textStyles.photosTitle}>Guest Photos</Text>
              <Text style={textStyles.photoTime}>
                {guestPhotos.length}/3 photos
              </Text>
            </View>

            {guestPhotos.length > 0 && (
              <View style={styles.photosList}>
                {guestPhotos.map((photo, index) => (
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
              disabled={guestPhotos.length >= 3}
              variant={guestPhotos.length > 0 ? 'outline' : 'default'}
              icon={<Icon name="camera" size={20} color={guestPhotos.length > 0 ? theme.colors.primary : '#ffffff'} />}
            />
          </View>
        </Card>

        {/* Additional Notes */}
        <Card style={styles.card} padding={16}>
          <Text style={textStyles.sectionTitle}>Additional Notes</Text>
          <TextInput
            label="Notes (Optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any additional notes about this guest..."
            multiline
            numberOfLines={4}
            style={styles.notesInput}
            leftIcon={<Icon name="text" size={20} color={theme.colors.muted} />}
          />
        </Card>

        {/* Submit Button */}
        <View style={styles.submitSection}>
          <Button
            title="Register & Check In Guest"
            onPress={handleSubmit}
            loading={isProcessing}
            disabled={isProcessing}
            icon={<Icon name="account-plus" size={20} color="#ffffff" />}
          />
        </View>

        {/* Instructions */}
        <Card style={styles.card} padding={16}>
          <Text style={textStyles.sectionTitle}>Instructions</Text>
          <View style={styles.instructions}>
            <Text style={textStyles.subtitle}>
              • Fill in all required guest information
            </Text>
            <Text style={textStyles.subtitle}>
              • Search and select the household to visit
            </Text>
            <Text style={textStyles.subtitle}>
              • Take photos for identification
            </Text>
            <Text style={textStyles.subtitle}>
              • Add any relevant notes
            </Text>
            <Text style={textStyles.subtitle}>
              • Guest will be automatically checked in
            </Text>
          </View>
        </Card>
      </ScrollView>

      {/* Photo Capture Modal */}
      {showPhotoCapture && (
        <PhotoCapture
          onPhotoCapture={handlePhotoCapture}
          maxPhotos={3}
          title="Capture Guest Photos"
          subtitle="Take photos for guest identification"
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
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  selectedHousehold: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dcfce7',
    gap: 12,
    marginBottom: 16,
  },
  selectedInfo: {
    flex: 1,
  },
  householdList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  householdListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  householdItemInfo: {
    flex: 1,
    gap: 2,
  },
  householdItem: {
    fontSize: 16,
    fontWeight: '500',
  },
  residenceNumber: {
    fontSize: 14,
  },
  noResults: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
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
  submitSection: {
    paddingVertical: 8,
  },
  instructions: {
    gap: 4,
  },
});