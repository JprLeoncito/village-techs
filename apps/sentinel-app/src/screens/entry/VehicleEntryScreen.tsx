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
  Image,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../lib/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Header } from '../../components/shared/Header';
import { PhotoCapture } from '../../components/camera/PhotoCapture';
import { TextInput } from '../../components/ui/TextInput';
import { RadioButton } from '../../components/ui/RadioButton';

type EntryStackParamList = {
  EntryList: undefined;
  VehicleEntry: undefined;
  EntryLog: undefined;
  ExitLog: undefined;
  EntryDetails: {
    entryId: string;
  };
};

type VehicleEntryScreenNavigationProp = StackNavigationProp<EntryStackParamList, 'VehicleEntry'>;

interface VehicleSticker {
  id: string;
  vehicle_plate: string;
  household_name: string;
  residence_number: string;
  member_names: string[];
  status: 'active' | 'expired';
  expiry_date: number;
}

interface Photo {
  uri: string;
  timestamp: number;
}

type EntryType = 'resident' | 'guest' | 'delivery' | 'construction' | 'visitor';

export const VehicleEntryScreen: React.FC = () => {
  const { theme } = useTheme();
  const { officer } = useAuth();
  const navigation = useNavigation<VehicleEntryScreenNavigationProp>();

  const [entryType, setEntryType] = useState<EntryType>('guest');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [visitorName, setVisitorName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [purpose, setPurpose] = useState('');
  const [entryNotes, setEntryNotes] = useState('');
  const [entryPhotos, setEntryPhotos] = useState<Photo[]>([]);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [foundSticker, setFoundSticker] = useState<VehicleSticker | null>(null);

  useEffect(() => {
    if (vehiclePlate.length >= 6) {
      lookupSticker(vehiclePlate);
    } else {
      setFoundSticker(null);
    }
  }, [vehiclePlate]);

  const lookupSticker = async (plate: string) => {
    try {
      if (!officer?.tenantId) return;

      const { data, error } = await supabase
        .from('stickers')
        .select('*')
        .eq('vehicle_plate', plate.toUpperCase())
        .eq('tenant_id', officer.tenantId)
        .eq('status', 'active')
        .single();

      if (error || !data) {
        setFoundSticker(null);
        return;
      }

      setFoundSticker(data);
      setEntryType('resident');
      setHouseholdName(data.household_name);
    } catch (error) {
      console.error('Error looking up sticker:', error);
      setFoundSticker(null);
    }
  };

  const handlePhotoCapture = (photo: Photo) => {
    setEntryPhotos(prev => [...prev, photo].slice(-3)); // Keep max 3 photos
    setShowPhotoCapture(false);
  };

  const removePhoto = (index: number) => {
    setEntryPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    if (!vehiclePlate.trim()) {
      Alert.alert('Validation Error', 'Vehicle plate number is required');
      return false;
    }

    if (entryType === 'guest' && !visitorName.trim()) {
      Alert.alert('Validation Error', 'Visitor name is required for guest entries');
      return false;
    }

    if (entryType === 'delivery' && !purpose.trim()) {
      Alert.alert('Validation Error', 'Delivery details are required');
      return false;
    }

    if (entryType === 'construction' && !purpose.trim()) {
      Alert.alert('Validation Error', 'Construction details are required');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setIsProcessing(true);

      // Get current gate
      const { data: gateData } = await supabase
        .from('security_shifts')
        .select('gate_id')
        .eq('officer_id', officer.id)
        .eq('status', 'active')
        .single();

      if (!gateData) {
        throw new Error('No active gate found');
      }

      // Create entry record
      const { data, error } = await supabase
        .from('gate_entries')
        .insert([{
          gate_id: gateData.gate_id,
          entry_timestamp: new Date().toISOString(),
          direction: 'in',
          entry_type: entryType,
          vehicle_plate: vehiclePlate.toUpperCase(),
          household_name: householdName || null,
          visitor_name: visitorName || null,
          contact_number: contactNumber || null,
          purpose: purpose || null,
          photos: entryPhotos.map(photo => photo.uri),
          notes: entryNotes || null,
          security_officer_id: officer.id,
        }])
        .select()
        .single();

      if (error) throw error;

      Alert.alert(
        'Entry Recorded',
        `Successfully recorded ${entryType} entry for ${vehiclePlate}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating entry:', error);
      Alert.alert(
        'Error',
        'Failed to record entry. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const entryTypes: { value: EntryType; label: string; icon: string; color: string }[] = [
    { value: 'guest', label: 'Guest', icon: 'account-group', color: 'warning' },
    { value: 'delivery', label: 'Delivery', icon: 'package', color: 'primary' },
    { value: 'construction', label: 'Construction', icon: 'hard-hat', color: 'secondary' },
    { value: 'visitor', label: 'Visitor', icon: 'account', color: 'info' },
  ];

  const textStyles = {
    title: [styles.title, { color: theme.colors.text }],
    subtitle: [styles.subtitle, { color: theme.colors.muted }],
    sectionTitle: [styles.sectionTitle, { color: theme.colors.text }],
    label: [styles.label, { color: theme.colors.text }],
    placeholderText: [styles.placeholderText, { color: theme.colors.muted }],
    photosTitle: [styles.photosTitle, { color: theme.colors.text }],
    photoTime: [styles.photoTime, { color: theme.colors.muted }],
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Header title="Manual Vehicle Entry" showBackButton />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Vehicle Plate */}
        <Card style={styles.card} padding={16}>
          <Text style={textStyles.sectionTitle}>Vehicle Information</Text>

          <TextInput
            label="Vehicle Plate Number"
            value={vehiclePlate}
            onChangeText={setVehiclePlate}
            placeholder="Enter plate number (e.g., ABC 123)"
            autoCapitalize="characters"
            style={styles.input}
            leftIcon={<Icon name="car" size={20} color={theme.colors.muted} />}
          />

          {/* Found Sticker */}
          {foundSticker && (
            <View style={styles.stickerFound}>
              <Icon name="check-circle" size={20} color={theme.colors.success} />
              <View style={styles.stickerInfo}>
                <Text style={textStyles.subtitle}>
                  Registered vehicle found
                </Text>
                <Text style={textStyles.placeholderText}>
                  {foundSticker.household_name} • Residence {foundSticker.residence_number}
                </Text>
              </View>
              <Badge title="Active" variant="success" size="small" />
            </View>
          )}

          {!foundSticker && vehiclePlate.length >= 6 && (
            <View style={styles.stickerNotFound}>
              <Icon name="alert" size={20} color={theme.colors.warning} />
              <Text style={textStyles.placeholderText}>
                No registered vehicle found for this plate
              </Text>
            </View>
          )}
        </Card>

        {/* Entry Type Selection (for non-residents) */}
        {!foundSticker && (
          <Card style={styles.card} padding={16}>
            <Text style={textStyles.sectionTitle}>Entry Type</Text>
            <View style={styles.entryTypeGrid}>
              {entryTypes.map((type) => (
                <RadioButton
                  key={type.value}
                  label={type.label}
                  value={entryType}
                  onValueChange={() => setEntryType(type.value)}
                  selected={entryType === type.value}
                  icon={type.icon}
                  color={theme.colors[type.color as keyof typeof theme.colors]}
                />
              ))}
            </View>
          </Card>
        )}

        {/* Additional Information */}
        <Card style={styles.card} padding={16}>
          <Text style={textStyles.sectionTitle}>Additional Information</Text>

          {/* Household Name (for residents) */}
          {foundSticker ? (
            <View style={styles.foundField}>
              <Icon name="home" size={16} color={theme.colors.muted} />
              <Text style={textStyles.label}>Household:</Text>
              <Text style={textStyles.placeholderText}>{foundSticker.household_name}</Text>
            </View>
          ) : (
            <TextInput
              label="Household/Company Name"
              value={householdName}
              onChangeText={setHouseholdName}
              placeholder="Enter household or company name"
              style={styles.input}
              leftIcon={<Icon name="home" size={20} color={theme.colors.muted} />}
            />
          )}

          {/* Visitor Name (for guests) */}
          {entryType === 'guest' && (
            <TextInput
              label="Visitor Name"
              value={visitorName}
              onChangeText={setVisitorName}
              placeholder="Enter visitor's full name"
              style={styles.input}
              required
              leftIcon={<Icon name="account" size={20} color={theme.colors.muted} />}
            />
          )}

          {/* Contact Number */}
          <TextInput
            label="Contact Number"
            value={contactNumber}
            onChangeText={setContactNumber}
            placeholder="Enter contact number"
            keyboardType="phone-pad"
            style={styles.input}
            leftIcon={<Icon name="phone" size={20} color={theme.colors.muted} />}
          />

          {/* Purpose (for delivery/construction) */}
          {(entryType === 'delivery' || entryType === 'construction') && (
            <TextInput
              label={entryType === 'delivery' ? 'Delivery Details' : 'Construction Details'}
              value={purpose}
              onChangeText={setPurpose}
              placeholder={entryType === 'delivery' ? 'Describe delivery items' : 'Describe construction work'}
              multiline
              numberOfLines={3}
              style={styles.input}
              required
              leftIcon={<Icon name={entryType === 'delivery' ? 'package' : 'hard-hat'} size={20} color={theme.colors.muted} />}
            />
          )}

          {/* Notes */}
          <TextInput
            label="Additional Notes"
            value={entryNotes}
            onChangeText={setEntryNotes}
            placeholder="Add any additional notes..."
            multiline
            numberOfLines={3}
            style={styles.input}
            leftIcon={<Icon name="text" size={20} color={theme.colors.muted} />}
          />
        </Card>

        {/* Photo Capture */}
        <Card style={styles.card} padding={16}>
          <View style={styles.photoSection}>
            <View style={styles.photoHeader}>
              <Text style={textStyles.photosTitle}>Entry Photos</Text>
              <Text style={textStyles.photoTime}>
                {entryPhotos.length}/3 photos
              </Text>
            </View>

            {entryPhotos.length > 0 && (
              <View style={styles.photosList}>
                {entryPhotos.map((photo, index) => (
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
              disabled={entryPhotos.length >= 3}
              variant={entryPhotos.length > 0 ? 'outline' : 'default'}
              icon={<Icon name="camera" size={20} color={entryPhotos.length > 0 ? theme.colors.primary : '#ffffff'} />}
            />
          </View>
        </Card>

        {/* Submit Button */}
        <View style={styles.submitSection}>
          <Button
            title="Record Entry"
            onPress={handleSubmit}
            loading={isProcessing}
            disabled={!vehiclePlate.trim() || isProcessing}
            icon={<Icon name="check" size={20} color="#ffffff" />}
          />
        </View>

        {/* Instructions */}
        <Card style={styles.card} padding={16}>
          <Text style={textStyles.sectionTitle}>Instructions</Text>
          <View style={styles.instructions}>
            <Text style={textStyles.placeholderText}>
              • Enter the vehicle plate number
            </Text>
            <Text style={textStyles.placeholderText}>
              • Select the appropriate entry type
            </Text>
            <Text style={textStyles.placeholderText}>
              • Fill in required information
            </Text>
            <Text style={textStyles.placeholderText}>
              • Take photos for documentation
            </Text>
            <Text style={textStyles.placeholderText}>
              • Record the entry
            </Text>
          </View>
        </Card>
      </ScrollView>

      {/* Photo Capture Modal */}
      {showPhotoCapture && (
        <PhotoCapture
          onPhotoCapture={handlePhotoCapture}
          maxPhotos={3}
          title="Capture Entry Photos"
          subtitle="Take up to 3 photos for documentation"
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  placeholderText: {
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    marginBottom: 16,
  },
  entryTypeGrid: {
    gap: 8,
  },
  stickerFound: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dcfce7',
    gap: 12,
    marginTop: 8,
  },
  stickerInfo: {
    flex: 1,
  },
  stickerNotFound: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fef3c7',
    gap: 12,
    marginTop: 8,
  },
  foundField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
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
  submitSection: {
    paddingVertical: 8,
  },
  instructions: {
    gap: 4,
  },
});