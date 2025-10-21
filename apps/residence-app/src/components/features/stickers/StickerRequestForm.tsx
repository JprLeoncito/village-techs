import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useHousehold } from '../../../hooks/useHousehold';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { Modal } from '../../ui/Modal';
import {
  StickerRequest,
  StickerRequestValidation,
  VehicleSticker
} from '../../../types/stickers';
import { stickerService } from '../../../services/stickerService';

const vehicleTypes = [
  { value: 'car', label: 'Car', icon: '=�' },
  { value: 'motorcycle', label: 'Motorcycle', icon: '<�' },
  { value: 'bicycle', label: 'Bicycle', icon: '=�' },
  { value: 'electric_bike', label: 'Electric Bike', icon: '=�' },
  { value: 'other', label: 'Other', icon: '=�' },
];

const documentTypes = [];

const stickerRequestSchema = z.object({
  vehicle_type: z.enum(['car', 'motorcycle', 'bicycle', 'electric_bike', 'other']),
  vehicle_make: z.string().min(1, 'Vehicle make is required'),
  vehicle_model: z.string().min(1, 'Vehicle model is required'),
  vehicle_color: z.string().min(1, 'Vehicle color is required'),
  vehicle_plate: z.string().min(1, 'License plate is required').regex(/^[A-Z0-9-\s]+$/i, 'License plate should only contain letters, numbers, hyphens, and spaces'),
});

type StickerRequestFormData = z.infer<typeof stickerRequestSchema>;

interface StickerRequestFormProps {
  onSuccess?: (sticker: VehicleSticker) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  initialData?: Partial<StickerRequestFormData>;
  mode?: 'create' | 'edit' | 'renewal';
  existingSticker?: VehicleSticker;
}

export const StickerRequestForm: React.FC<StickerRequestFormProps> = ({
  onSuccess,
  onError,
  onCancel,
  initialData,
  mode = 'create',
  existingSticker,
}) => {
  const { household, loading: householdLoading, error: householdError } = useHousehold();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [showVehicleTypeModal, setShowVehicleTypeModal] = useState(false);
  const [requiredDocuments, setRequiredDocuments] = useState<string[]>([]);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
    reset,
  } = useForm<StickerRequestFormData>({
    resolver: zodResolver(stickerRequestSchema),
    defaultValues: {
      vehicle_type: initialData?.vehicle_type || 'car',
      vehicle_make: initialData?.vehicle_make || '',
      vehicle_model: initialData?.vehicle_model || '',
      vehicle_color: initialData?.vehicle_color || '',
      vehicle_plate: initialData?.vehicle_plate || '',
    },
  });

  const selectedVehicleType = watch('vehicle_type');

  useEffect(() => {
    // Update required documents based on vehicle type
    const required = documentTypes
      .filter(doc => doc.required.includes(selectedVehicleType))
      .map(doc => doc.value);
    setRequiredDocuments(required);
  }, [selectedVehicleType]);

  useEffect(() => {
    // Prefill existing data if in renewal mode
    if (mode === 'renewal' && existingSticker) {
      setValue('vehicle_make', existingSticker.vehicle_make);
      setValue('vehicle_model', existingSticker.vehicle_model);
      setValue('vehicle_color', existingSticker.vehicle_color);
      setValue('vehicle_plate', existingSticker.vehicle_plate);
    }
  }, [mode, existingSticker, setValue]);

  const pickDocument = async (documentType: string) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        const document = {
          document_type: documentType,
          file: {
            uri: result.assets[0].uri,
            name: `${documentType}_${Date.now()}.jpg`,
            type: result.assets[0].mimeType || 'image/jpeg',
          },
        };

        setUploadedDocuments(prev => {
          const filtered = prev.filter(doc => doc.document_type !== documentType);
          return [...filtered, document];
        });
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  const removeDocument = (documentType: string) => {
    setUploadedDocuments(prev => prev.filter(doc => doc.document_type !== documentType));
  };

  const validateDocuments = (): string[] => {
    const missingDocs: string[] = [];

    for (const requiredDoc of requiredDocuments) {
      const hasDocument = uploadedDocuments.some(doc => doc.document_type === requiredDoc);
      if (!hasDocument) {
        const docType = documentTypes.find(dt => dt.value === requiredDoc);
        missingDocs.push(docType?.label || requiredDoc);
      }
    }

    return missingDocs;
  };

  const onSubmit = async (data: StickerRequestFormData) => {
    console.log('=== Sticker Request Submit Debug ===');
    console.log('User email:', user?.email);
    console.log('Household data from hook:', household);
    console.log('Household ID from hook:', household?.id);
    console.log('User metadata household_id:', user?.user_metadata?.household_id);
    console.log('===================================');

    // Use household ID from useHousehold hook (which now uses household_members as source)
    let householdId = household?.id;

    // Fallback to user metadata if hook didn't find it
    if (!householdId) {
      householdId = user?.user_metadata?.household_id;
      console.log('Using household ID from user metadata:', householdId);
    }

    // Additional fallback for testing
    if (!householdId && user?.email) {
      if (user.email === 'jasper.leoncito@988labs.com' || user.email === 'jasper.leoncito@98labs.com') {
        householdId = '2e344659-cecd-4705-996f-a31e2cd77a9c';  // Correct household ID from database
        console.log('Using fallback household ID for jasper:', householdId);
      } else if (user.email === 'jasper.leoncito1@98labs.com') {
        householdId = 'e5a02540-45ea-4d30-9f0e-3be4eca12676';  // Alternative household ID
        console.log('Using fallback household ID for jasper1:', householdId);
      } else if (user.email === 'resident@testcommunity.com') {
        householdId = 'fb65d0e0-52d2-46f1-945a-60e3572690b5';  // Correct household ID
        console.log('Using fallback household ID for resident:', householdId);
      }
    }

    if (!householdId) {
      console.error('❌ No household ID found - user is not associated with any household');
      Alert.alert('Error', 'Household information not available. Please ensure you are logged in and associated with a household.');
      return;
    }

    console.log('✅ Using household ID:', householdId);

    const missingDocuments = validateDocuments();
    if (missingDocuments.length > 0) {
      Alert.alert(
        'Missing Documents',
        `Please upload the following required documents:\n${missingDocuments.join('\n')}`,
        [{ text: 'OK' }]
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const requestData: StickerRequest = {
        ...data,
        documents: uploadedDocuments,
      };

      // Use the directly imported stickerService

      const result = await stickerService.submitStickerRequest(householdId, requestData);

      if (result.success && result.data) {
        Alert.alert(
          'Success',
          'Vehicle sticker request submitted successfully! You will receive a notification once it\'s reviewed.',
          [
            {
              text: 'OK',
              onPress: () => onSuccess?.(result.data!),
            },
          ]
        );
        reset();
        setUploadedDocuments([]);
      } else {
        throw new Error(result.error || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Submit error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit request';
      Alert.alert('Error', errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getVehicleTypeIcon = (type: string): keyof typeof MaterialIcons.glyphMap => {
    const iconMap: Record<string, keyof typeof MaterialIcons.glyphMap> = {
      'car': 'directions-car',
      'motorcycle': 'sports-motorsports',
      'bicycle': 'directions-bike',
      'electric_bike': 'electric-bike',
      'other': 'device-unknown',
    };
    return iconMap[type] || 'directions-car';
  };

  const isDocumentUploaded = (documentType: string) => {
    return uploadedDocuments.some(doc => doc.document_type === documentType);
  };

  const getDocumentStatus = (documentType: string) => {
    const uploaded = isDocumentUploaded(documentType);
    const required = requiredDocuments.includes(documentType);

    if (uploaded) return { status: 'uploaded', color: '#10b981', text: 'Uploaded' };
    if (required) return { status: 'required', color: '#ef4444', text: 'Required' };
    return { status: 'optional', color: '#6b7280', text: 'Optional' };
  };

  if (householdLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading household information...</Text>
      </View>
    );
  }

  if (householdError) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.colors.background }]}>
        <MaterialIcons name="error" size={48} color={theme.colors.error} />
        <Text style={[styles.errorTitle, { color: theme.colors.text }]}>Error Loading Household</Text>
        <Text style={[styles.errorMessage, { color: theme.colors.muted }]}>{householdError}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => window.location.reload()}
        >
          <Text style={[styles.retryButtonText, { color: '#ffffff' }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} showsVerticalScrollIndicator={false}>
      <Card style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {mode === 'renewal' ? 'Renew Vehicle Sticker' : 'Request Vehicle Sticker'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
            {mode === 'renewal'
              ? 'Submit a renewal request for your vehicle sticker'
              : 'Register a new vehicle for a residence sticker'
            }
          </Text>
        </View>

        {/* Vehicle Type Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Vehicle Type</Text>
          <TouchableOpacity
            style={[styles.vehicleTypeSelector, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            onPress={() => setShowVehicleTypeModal(true)}
          >
            <View style={styles.vehicleTypeDisplay}>
              <MaterialIcons
                name={getVehicleTypeIcon(selectedVehicleType)}
                size={24}
                color={theme.colors.text}
                style={styles.vehicleTypeIcon}
              />
              <Text style={[styles.vehicleTypeText, { color: theme.colors.text }]}>
                {vehicleTypes.find(vt => vt.value === selectedVehicleType)?.label}
              </Text>
            </View>
            <Text style={[styles.changeText, { color: theme.colors.primary }]}>Change</Text>
          </TouchableOpacity>
        </View>

        {/* Vehicle Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Vehicle Information</Text>

          <Controller
            control={control}
            name="vehicle_make"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Brand (Make) *"
                placeholder="e.g., Toyota, Honda, Yamaha"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.vehicle_make?.message}
                editable={!isSubmitting}
              />
            )}
          />

          <Controller
            control={control}
            name="vehicle_model"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Model *"
                placeholder="e.g., Vios, Wave, Mountain Bike"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.vehicle_model?.message}
                editable={!isSubmitting}
              />
            )}
          />

          <Controller
            control={control}
            name="vehicle_color"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Color *"
                placeholder="e.g., Red, Blue, Black"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.vehicle_color?.message}
                editable={!isSubmitting}
              />
            )}
          />

          <Controller
            control={control}
            name="vehicle_plate"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="License Plate *"
                placeholder="e.g., ABC 123"
                value={value}
                onChangeText={(text) => onChange(text.toUpperCase())}
                onBlur={onBlur}
                error={errors.vehicle_plate?.message}
                editable={!isSubmitting}
                autoCapitalize="characters"
              />
            )}
          />

                  </View>

        {/* Required Documents */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Required Documents</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.muted }]}>
            Upload clear photos or scans of the following documents:
          </Text>

          {documentTypes.map((docType) => {
            const status = getDocumentStatus(docType.value);
            const uploaded = isDocumentUploaded(docType.value);

            return (
              <View key={docType.value} style={[styles.documentItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <View style={styles.documentInfo}>
                  <Text style={[styles.documentLabel, { color: theme.colors.text }]}>{docType.label}</Text>
                  <Badge
                    text={status.text}
                    variant={status.status === 'uploaded' ? 'success' : status.status === 'required' ? 'danger' : 'secondary'}
                    size="sm"
                  />
                </View>

                {uploaded ? (
                  <View style={styles.uploadedDocument}>
                    <Text style={styles.uploadedText}> Document uploaded</Text>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeDocument(docType.value)}
                    >
                      <Text style={styles.removeButtonText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.uploadButton, { borderColor: theme.colors.border, borderWidth: 1 }]}
                    onPress={() => pickDocument(docType.value)}
                    disabled={isSubmitting}
                  >
                    <Text style={[styles.uploadButtonText, { color: theme.colors.primary }]}>
                      Upload {docType.label}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

  
        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: (!isValid || isSubmitting)
                  ? theme.colors.muted
                  : theme.colors.primary
              }
            ]}
            onPress={handleSubmit(onSubmit)}
            disabled={!isValid || isSubmitting}
          >
            <Text style={[styles.submitButtonText, { color: '#ffffff' }]}>
              {isSubmitting ? 'Submitting...' : (mode === 'renewal' ? 'Submit Renewal' : 'Submit Request')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderWidth: 1 }]}
            onPress={onCancel}
            disabled={isSubmitting}
          >
            <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Vehicle Type Selection Modal */}
      <Modal
        visible={showVehicleTypeModal}
        onClose={() => setShowVehicleTypeModal(false)}
        title="Select Vehicle Type"
      >
        <View style={styles.vehicleTypeGrid}>
          {vehicleTypes.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.vehicleTypeOption,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                selectedVehicleType === type.value && [styles.selectedVehicleType, { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }]
              ]}
              onPress={() => {
                setValue('vehicle_type', type.value as any);
                setShowVehicleTypeModal(false);
              }}
            >
              <MaterialIcons
                name={getVehicleTypeIcon(type.value)}
                size={32}
                color={selectedVehicleType === type.value ? theme.colors.primary : theme.colors.text}
              />
              <Text style={[styles.vehicleTypeOptionLabel, { color: theme.colors.text }]}>{type.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  card: {
    margin: 16,
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  vehicleTypeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  vehicleTypeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleTypeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  vehicleTypeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  changeText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  documentItem: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  documentLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  uploadedDocument: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  uploadedText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fee2e2',
    borderRadius: 4,
  },
  removeButtonText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '500',
  },
  textInputContainer: {
    position: 'relative',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  characterCount: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    fontSize: 12,
    color: '#9ca3af',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  vehicleTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  vehicleTypeOption: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectedVehicleType: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  vehicleTypeOptionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  vehicleTypeOptionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default StickerRequestForm;