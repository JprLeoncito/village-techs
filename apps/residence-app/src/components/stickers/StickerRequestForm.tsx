import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import stickerService from '../../services/stickerService';
import storageService from '../../lib/storage';
import database from '../../database';
import { HouseholdMember } from '../../database/models/HouseholdMember';


import { MaterialIcons } from '@expo/vector-icons';interface StickerRequestFormProps {
  onSuccess?: (stickerId: string) => void;
  onCancel?: () => void;
  existingPlates?: string[];
  isRenewal?: boolean;
  renewalStickerId?: string;
}

const VEHICLE_TYPES = ['Car', 'SUV', 'Motorcycle', 'Van', 'Truck'];

export const StickerRequestForm: React.FC<StickerRequestFormProps> = ({
  onSuccess,
  onCancel,
  existingPlates = [],
  isRenewal = false,
  renewalStickerId,
}) => {
  const { householdId } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([]);

  // Form state
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehicleType, setVehicleType] = useState('Car');
  const [documentUri, setDocumentUri] = useState<string>('');
  const [documentName, setDocumentName] = useState<string>('');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadHouseholdMembers();
    if (isRenewal && renewalStickerId) {
      loadRenewalData();
    }
  }, []);

  const loadHouseholdMembers = async () => {
    try {
      const members = await database
        .get<HouseholdMember>('household_members')
        .query()
        .where('household_id', householdId)
        .fetch();

      setHouseholdMembers(members);
    } catch (error) {
      console.error('Failed to load household members:', error);
    }
  };

  const loadRenewalData = async () => {
    if (!renewalStickerId) return;

    try {
      const sticker = await stickerService.getSticker(renewalStickerId);
      if (sticker) {
        setVehiclePlate(sticker.vehiclePlate);
        setVehicleMake(sticker.vehicleMake);
        setVehicleModel(sticker.vehicleModel);
        setVehicleColor(sticker.vehicleColor);
        setVehicleType(sticker.vehicleType);
        setSelectedMember(sticker.householdMemberId);
      }
    } catch (error) {
      console.error('Failed to load renewal data:', error);
    }
  };

  const validatePlateNumber = (plate: string): boolean => {
    // Philippine plate number format validation
    const plateRegex = /^[A-Z]{1,3}\s?\d{3,5}$|^[A-Z]{2}\s?\d{4}$/i;
    return plateRegex.test(plate.trim());
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedMember) {
      newErrors.member = 'Please select a household member';
    }

    if (!vehiclePlate) {
      newErrors.plate = 'Vehicle plate is required';
    } else if (!validatePlateNumber(vehiclePlate)) {
      newErrors.plate = 'Invalid plate format (e.g., ABC 1234)';
    } else if (existingPlates.includes(vehiclePlate.toUpperCase().replace(/\s+/g, ' ').trim())) {
      newErrors.plate = 'Vehicle plate already registered';
    }

    if (!vehicleMake) {
      newErrors.make = 'Vehicle make is required';
    }

    if (!vehicleModel) {
      newErrors.model = 'Vehicle model is required';
    }

    if (!vehicleColor) {
      newErrors.color = 'Vehicle color is required';
    }

    if (!documentUri && !isRenewal) {
      newErrors.document = 'OR/CR document is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDocumentPicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.type === 'success') {
        // Check file size (5MB limit)
        if (result.size && result.size > 5 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please select a file smaller than 5MB');
          return;
        }

        setDocumentUri(result.uri);
        setDocumentName(result.name);
        setErrors(prev => ({ ...prev, document: '' }));
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to select document');
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields correctly');
      return;
    }

    setIsLoading(true);

    try {
      // Upload document to storage
      let documentUrl = '';
      if (documentUri) {
        const uploadResult = await storageService.uploadFile(
          documentUri,
          'or-cr',
          `stickers/${householdId}/${Date.now()}_${documentName}`
        );

        if (uploadResult.success) {
          documentUrl = uploadResult.url!;
        } else {
          throw new Error('Failed to upload document');
        }
      }

      // Format vehicle plate
      const formattedPlate = vehiclePlate.toUpperCase().replace(/\s+/g, ' ').trim();

      // Create sticker request
      const requestData = {
        householdMemberId: selectedMember,
        vehiclePlate: formattedPlate,
        vehicleMake,
        vehicleModel,
        vehicleColor,
        vehicleType,
        documentUrl,
        isRenewal,
        previousStickerId: renewalStickerId,
      };

      const result = isRenewal && renewalStickerId
        ? await stickerService.requestRenewal(renewalStickerId)
        : await stickerService.createRequest(requestData, { uri: documentUri, url: documentUrl });

      if (result.success) {
        // Show success message and close form immediately
        Alert.alert(
          'Success!',
          isRenewal
            ? 'Sticker renewal request submitted successfully'
            : 'Sticker request submitted successfully',
          [
            {
              text: 'OK',
              onPress: () => onSuccess?.(result.stickerId!)
            }
          ]
        );
      } else {
        throw new Error(result.error || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to submit request');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Card style={styles.formCard}>
        <Text style={styles.title}>
          {isRenewal ? 'Renew Vehicle Sticker' : 'Request Vehicle Sticker'}
        </Text>

        {/* Household Member Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Assigned To <Text style={styles.required}>*</Text></Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.memberList}>
            {householdMembers.map(member => (
              <TouchableOpacity
                key={member.id}
                style={[
                  styles.memberCard,
                  selectedMember === member.id && styles.selectedMember,
                ]}
                onPress={() => setSelectedMember(member.id)}
                testID="member-selector"
              >
                <Text style={styles.memberName}>{member.name}</Text>
                {member.relationship && (
                  <Badge size="xs" variant="neutral">{member.relationship}</Badge>
                )}
                {selectedMember === member.id && (
                  <View testID={`type-selected-${member.id}`} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          {errors.member && <Text style={styles.errorText}>{errors.member}</Text>}
        </View>

        {/* Vehicle Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Information</Text>

          <Input
            label="Plate Number"
            placeholder="ABC 1234"
            value={vehiclePlate}
            onChangeText={(text) => {
              setVehiclePlate(text.toUpperCase());
              setErrors(prev => ({ ...prev, plate: '' }));
            }}
            error={errors.plate}
            required
            autoCapitalize="characters"
          />

          <Input
            label="Make"
            placeholder="Toyota"
            value={vehicleMake}
            onChangeText={setVehicleMake}
            error={errors.make}
            required
          />

          <Input
            label="Model"
            placeholder="Camry"
            value={vehicleModel}
            onChangeText={setVehicleModel}
            error={errors.model}
            required
          />

          <Input
            label="Color"
            placeholder="Silver"
            value={vehicleColor}
            onChangeText={setVehicleColor}
            error={errors.color}
            required
          />
        </View>

        {/* Vehicle Type Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Vehicle Type <Text style={styles.required}>*</Text></Text>
          <View style={styles.typeContainer}>
            {VEHICLE_TYPES.map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeButton,
                  vehicleType === type && styles.selectedType,
                ]}
                onPress={() => setVehicleType(type)}
              >
                <Text
                  style={[
                    styles.typeText,
                    vehicleType === type && styles.selectedTypeText,
                  ]}
                >
                  {type}
                </Text>
                {vehicleType === type && (
                  <View testID={`type-selected-${type}`} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Document Upload */}
        <View style={styles.section}>
          <Text style={styles.label}>
            OR/CR Document {!isRenewal && <Text style={styles.required}>*</Text>}
          </Text>
          <TouchableOpacity style={styles.uploadButton} onPress={handleDocumentPicker}>
            {documentName ? (
              <View style={styles.uploadedFile}>
                <Text style={styles.fileIcon}>📄</Text>
                <Text style={styles.fileName} numberOfLines={1}>{documentName}</Text>
                <TouchableOpacity onPress={() => {
                  setDocumentUri('');
                  setDocumentName('');
                }}>
                  <Text style={styles.removeFile}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.uploadIcon}>📁</Text>
                <Text style={styles.uploadText}>Upload OR/CR</Text>
                <Text style={styles.uploadHint}>JPG, PNG, or PDF (max 5MB)</Text>
              </>
            )}
          </TouchableOpacity>
          {errors.document && <Text style={styles.errorText}>{errors.document}</Text>}
        </View>

        {/* Submit Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            variant="outline"
            onPress={onCancel}
            disabled={isLoading}
            style={styles.button}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onPress={handleSubmit}
            loading={isLoading}
            style={styles.button}
          >
            {isRenewal ? 'Submit Renewal' : 'Submit Request'}
          </Button>
        </View>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  formCard: {
    margin: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  memberList: {
    flexDirection: 'row',
  },
  memberCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  selectedMember: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  memberName: {
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 4,
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  selectedType: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  typeText: {
    fontSize: 14,
    color: '#6b7280',
  },
  selectedTypeText: {
    color: '#10b981',
    fontWeight: '500',
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  uploadIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  uploadHint: {
    fontSize: 12,
    color: '#6b7280',
  },
  uploadedFile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  removeFile: {
    fontSize: 20,
    color: '#ef4444',
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
  },
});

export default StickerRequestForm;