import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useHousehold } from '../../hooks/useHousehold';
import { gatePassService } from '../../services/gatePassService';
import { GatePassRequest } from '../../types/gatePasses';
import networkStatus from '../../lib/networkStatus';


import { MaterialIcons } from '@expo/vector-icons';interface RouteParams {
  mode?: 'create' | 'edit';
  gatePassId?: string;
}

export const GatePassRequestScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { mode = 'create', gatePassId } = route.params as RouteParams;
  const { household } = useHousehold();

  const [formData, setFormData] = useState<GatePassRequest>({
    visitor_name: '',
    visitor_contact: '',
    visit_purpose: '',
    visit_date: '',
    visit_time: '',
    expected_departure: '',
    vehicle_details: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<GatePassRequest>>({});

  const visitPurposes = [
    'Personal Visit',
    'Delivery',
    'Service/Maintenance',
    'Emergency',
    'Business Visit',
    'Family Visit',
    'Other',
  ];

  const validateForm = (): boolean => {
    const newErrors: Partial<GatePassRequest> = {};

    if (!formData.visitor_name.trim()) {
      newErrors.visitor_name = 'Visitor name is required';
    }

    if (!formData.visitor_contact.trim()) {
      newErrors.visitor_contact = 'Contact number is required';
    } else if (!/^[+]?[\d\s\-\(\)]+$/.test(formData.visitor_contact)) {
      newErrors.visitor_contact = 'Please enter a valid contact number';
    }

    if (!formData.visit_purpose) {
      newErrors.visit_purpose = 'Visit purpose is required';
    }

    if (!formData.visit_date) {
      newErrors.visit_date = 'Visit date is required';
    } else {
      const visitDate = new Date(formData.visit_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (visitDate < today) {
        newErrors.visit_date = 'Visit date cannot be in the past';
      }
    }

    if (!formData.visit_time) {
      newErrors.visit_time = 'Visit time is required';
    }

    if (!formData.expected_departure) {
      newErrors.expected_departure = 'Expected departure time is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields correctly.');
      return;
    }

    if (!household?.id) {
      Alert.alert('Error', 'Household information not available');
      return;
    }

    setLoading(true);

    try {
      const result = await gatePassService.submitGatePassRequest(
        household.id,
        formData
      );

      if (result.success) {
        Alert.alert(
          'Success',
          'Gate pass request submitted successfully! You will receive a notification when it\'s approved.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Failed to submit gate pass request');
    } finally {
      setLoading(false);
    }
  };

  const updateFormField = (field: keyof GatePassRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const renderInput = (
    label: string,
    field: keyof GatePassRequest,
    placeholder: string,
    keyboardType: 'default' | 'phone-pad' | 'email-address' = 'default',
    multiline: boolean = false
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={[
        styles.input,
        errors[field] && styles.inputError,
        multiline && styles.inputMultiline
      ]}>
        <Text style={styles.inputText}>
          {formData[field] || placeholder}
        </Text>
      </View>
      {errors[field] && (
        <Text style={styles.errorText}>{errors[field]}</Text>
      )}
    </View>
  );

  const renderPurposeSelector = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>Visit Purpose *</Text>
      <View style={styles.purposeContainer}>
        {visitPurposes.map((purpose) => (
          <TouchableOpacity
            key={purpose}
            style={[
              styles.purposeChip,
              formData.visit_purpose === purpose && styles.purposeChipSelected,
            ]}
            onPress={() => updateFormField('visit_purpose', purpose)}
          >
            <Text style={[
              styles.purposeText,
              formData.visit_purpose === purpose && styles.purposeTextSelected,
            ]}>
              {purpose}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors.visit_purpose && (
        <Text style={styles.errorText}>{errors.visit_purpose}</Text>
      )}
    </View>
  );

  if (loading && !formData.visitor_name) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size="large" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {mode === 'edit' ? 'Edit Gate Pass' : 'Request Gate Pass'}
        </Text>
        <Text style={styles.subtitle}>
          Fill in the visitor details to request access to the community.
        </Text>
      </View>

      {!networkStatus.isConnected() && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineIcon}>📡</Text>
          <Text style={styles.offlineText}>
            You're offline. Your request will be submitted when you're back online.
          </Text>
        </View>
      )}

      <Card style={styles.formCard}>
        {renderInput('Visitor Name *', 'visitor_name', 'Enter visitor\'s full name')}
        {renderInput(
          'Contact Number *',
          'visitor_contact',
          'Enter contact number',
          'phone-pad'
        )}

        {renderPurposeSelector()}

        {renderInput(
          'Visit Date *',
          'visit_date',
          'Select visit date'
        )}

        <View style={styles.timeRow}>
          <View style={styles.timeContainer}>
            {renderInput(
              'Visit Time *',
              'visit_time',
              'Select time'
            )}
          </View>
          <View style={styles.timeContainer}>
            {renderInput(
              'Expected Departure *',
              'expected_departure',
              'Select time'
            )}
          </View>
        </View>

        {renderInput(
          'Vehicle Details',
          'vehicle_details',
          'e.g., Toyota Camry - ABC 1234'
        )}

        {renderInput(
          'Additional Notes',
          'notes',
          'Any additional information for security',
          'default',
          true
        )}
      </Card>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Important Information</Text>
        <View style={styles.infoItem}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            All visitors must present a valid ID at the entrance.
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoIcon}>⏰</Text>
          <Text style={styles.infoText}>
            Gate passes are valid only for the specified date and time.
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoIcon}>📱</Text>
          <Text style={styles.infoText}>
            You will receive a notification when your request is approved.
          </Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Submit Request"
          onPress={handleSubmit}
          loading={loading}
          style={styles.submitButton}
        />
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    padding: 20,
    paddingTop: 32,
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
  offlineBanner: {
    backgroundColor: '#fef3c7',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  offlineIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  offlineText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    fontWeight: '500',
  },
  formCard: {
    margin: 20,
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 52,
    justifyContent: 'center',
  },
  inputMultiline: {
    minHeight: 100,
  },
  inputText: {
    fontSize: 16,
    color: '#1f2937',
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444',
    marginTop: 4,
  },
  purposeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  purposeChip: {
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  purposeChipSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  purposeText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  purposeTextSelected: {
    color: '#ffffff',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  timeContainer: {
    flex: 1,
  },
  infoSection: {
    margin: 20,
    marginBottom: 32,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  buttonContainer: {
    padding: 20,
    paddingBottom: 32,
  },
  submitButton: {
    marginBottom: 12,
  },
  cancelButton: {
    alignItems: 'center',
    padding: 16,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
});

export default GatePassRequestScreen;