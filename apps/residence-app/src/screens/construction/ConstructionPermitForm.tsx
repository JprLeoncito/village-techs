import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme, Theme } from '../../contexts/ThemeContext';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ThemedDatePicker from '../../components/ui/ThemedDatePicker';
import constructionPermitService, { PermitRequest } from '../../services/constructionPermitService';
import { MaterialIcons } from '@expo/vector-icons';

interface ConstructionPermitFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (permit: any) => void;
  householdId: string;
}

export const ConstructionPermitForm: React.FC<ConstructionPermitFormProps> = ({
  visible,
  onClose,
  onSubmit,
  householdId,
}) => {
  const { theme } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<PermitRequest>({
    project_description: '',
    project_start_date: '',
    project_end_date: '',
    contractor_name: '',
    contractor_contact: '',
    contractor_license: '',
    estimated_worker_count: undefined,
    notes: '',
  });

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date());
  const styles = createStyles(theme);

  // Ensure theme colors are available for Android
  React.useEffect(() => {
    // Force re-render on theme change to ensure Android gets updated colors
  }, [theme]);

  const updateFormData = (field: keyof PermitRequest, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleStartDateChange = (date: Date) => {
    setTempStartDate(date);
    // Format as YYYY-MM-DD in local timezone to avoid UTC conversion issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const localDateString = `${year}-${month}-${day}`;
    updateFormData('project_start_date', localDateString);
    setShowStartDatePicker(false);
  };

  const handleEndDateChange = (date: Date) => {
    setTempEndDate(date);
    // Format as YYYY-MM-DD in local timezone to avoid UTC conversion issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const localDateString = `${year}-${month}-${day}`;
    updateFormData('project_end_date', localDateString);
    setShowEndDatePicker(false);
  };

  const validateForm = (): boolean => {
    if (!formData.project_description.trim()) {
      Alert.alert('Validation Error', 'Please enter a project description');
      return false;
    }
    if (!formData.project_start_date) {
      Alert.alert('Validation Error', 'Please select a project start date');
      return false;
    }
    if (!formData.project_end_date) {
      Alert.alert('Validation Error', 'Please select a project end date');
      return false;
    }
    if (!formData.contractor_name.trim()) {
      Alert.alert('Validation Error', 'Please enter the contractor name');
      return false;
    }
    if (new Date(formData.project_end_date) < new Date(formData.project_start_date)) {
      Alert.alert('Validation Error', 'End date must be after start date');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const result = await constructionPermitService.submitPermitRequest(householdId, formData);
      if (result.success) {
        Alert.alert(
          'Permit Submitted',
          'Your construction permit request has been submitted successfully. You will be notified when it\'s approved.',
          [
            {
              text: 'OK',
              onPress: () => {
                onSubmit(result.data);
                handleClose();
              },
            },
          ]
        );
      } else {
        Alert.alert('Submission Failed', result.error || 'Failed to submit permit request');
      }
    } catch (error) {
      console.error('Error submitting permit:', error);
      Alert.alert('Submission Failed', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        project_description: '',
        project_start_date: '',
        project_end_date: '',
        contractor_name: '',
        contractor_contact: '',
        contractor_license: '',
        estimated_worker_count: undefined,
        notes: '',
      });
      onClose();
    }
  };

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return 'Select date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Construction Permit Request</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Card style={styles.card}>
            {/* Project Description */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Project Description *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  // Android fallback for theme colors
                  Platform.OS === 'android' && {
                    backgroundColor: theme.colors.card,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  }
                ]}
                value={formData.project_description}
                onChangeText={(value) => updateFormData('project_description', value)}
                placeholder="Describe your construction project"
                placeholderTextColor={theme.colors.muted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Project Dates */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Project Start Date *</Text>
              <TouchableOpacity
                style={[
                  styles.dateButton,
                  // Android fallback for theme colors
                  Platform.OS === 'android' && {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                  }
                ]}
                onPress={() => setShowStartDatePicker(true)}
              >
                <MaterialIcons name="event" size={20} color={theme.colors.muted} />
                <Text style={[
                  styles.dateText,
                  // Android fallback for theme colors
                  Platform.OS === 'android' && {
                    color: theme.colors.text,
                  }
                ]}>
                  {formatDateDisplay(formData.project_start_date)}
                </Text>
                <MaterialIcons name="chevron-right" size={20} color={theme.colors.muted} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Project End Date *</Text>
              <TouchableOpacity
                style={[
                  styles.dateButton,
                  // Android fallback for theme colors
                  Platform.OS === 'android' && {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                  }
                ]}
                onPress={() => setShowEndDatePicker(true)}
              >
                <MaterialIcons name="event" size={20} color={theme.colors.muted} />
                <Text style={[
                  styles.dateText,
                  // Android fallback for theme colors
                  Platform.OS === 'android' && {
                    color: theme.colors.text,
                  }
                ]}>
                  {formatDateDisplay(formData.project_end_date)}
                </Text>
                <MaterialIcons name="chevron-right" size={20} color={theme.colors.muted} />
              </TouchableOpacity>
            </View>

            {/* Contractor Information */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Contractor Name *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.contractor_name}
                onChangeText={(value) => updateFormData('contractor_name', value)}
                placeholder="Enter contractor or company name"
                placeholderTextColor={theme.colors.muted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Contractor Contact</Text>
              <TextInput
                style={styles.textInput}
                value={formData.contractor_contact}
                onChangeText={(value) => updateFormData('contractor_contact', value)}
                placeholder="Phone number or email"
                placeholderTextColor={theme.colors.muted}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Contractor License</Text>
              <TextInput
                style={styles.textInput}
                value={formData.contractor_license}
                onChangeText={(value) => updateFormData('contractor_license', value)}
                placeholder="License number (if applicable)"
                placeholderTextColor={theme.colors.muted}
              />
            </View>

            {/* Estimated Workers */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Estimated Number of Workers</Text>
              <TextInput
                style={styles.textInput}
                value={formData.estimated_worker_count?.toString() || ''}
                onChangeText={(value) => updateFormData('estimated_worker_count', value ? parseInt(value) : undefined)}
                placeholder="Number of workers"
                placeholderTextColor={theme.colors.muted}
                keyboardType="numeric"
              />
            </View>

            {/* Notes */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Additional Notes</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.notes}
                onChangeText={(value) => updateFormData('notes', value)}
                placeholder="Any additional information or special requirements"
                placeholderTextColor={theme.colors.muted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </Card>

          {/* Information Card */}
          <Card style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <MaterialIcons name="info" size={20} color={theme.colors.primary} />
              <Text style={styles.infoTitle}>Permit Process</Text>
            </View>
            <Text style={styles.infoText}>
              1. Submit your construction permit request{'\n'}
              2. Wait for admin approval{'\n'}
              3. Pay road fees (if applicable){'\n'}
              4. Construction can begin{'\n'}
              5. Schedule worker gate passes as needed
            </Text>
          </Card>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Button
            variant="outline"
            onPress={handleClose}
            style={styles.cancelButton}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onPress={handleSubmit}
            style={styles.submitButton}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            Submit Request
          </Button>
        </View>

        {/* Date Pickers */}
        <ThemedDatePicker
          visible={showStartDatePicker}
          value={tempStartDate}
          onChange={handleStartDateChange}
          onClose={() => setShowStartDatePicker(false)}
          title="Select Start Date"
          minimumDate={new Date(new Date().setHours(0, 0, 0, 0))}
        />

        <ThemedDatePicker
          visible={showEndDatePicker}
          value={tempEndDate}
          onChange={handleEndDateChange}
          onClose={() => setShowEndDatePicker(false)}
          title="Select End Date"
          minimumDate={tempStartDate}
        />
      </View>
    </Modal>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  card: {
    padding: 20,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.card,
    // Android-specific fixes
    elevation: 1,
    shadowColor: Platform.OS === 'android' ? '#000' : undefined,
    shadowOffset: Platform.OS === 'android' ? { width: 0, height: 1 } : undefined,
    shadowOpacity: Platform.OS === 'android' ? 0.1 : undefined,
    shadowRadius: Platform.OS === 'android' ? 1 : undefined,
    // Ensure theme colors are applied correctly on Android
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      textAlignVertical: 'center',
    }),
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: theme.colors.card,
    // Android-specific fixes
    elevation: 1,
    shadowColor: Platform.OS === 'android' ? '#000' : undefined,
    shadowOffset: Platform.OS === 'android' ? { width: 0, height: 1 } : undefined,
    shadowOpacity: Platform.OS === 'android' ? 0.1 : undefined,
    shadowRadius: Platform.OS === 'android' ? 1 : undefined,
    minHeight: 48, // Ensure minimum touch target size for Android
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    marginLeft: 8,
  },
  infoCard: {
    padding: 16,
    marginBottom: 16,
    backgroundColor: theme.isDark ? theme.colors.card + '20' : theme.colors.primary + '10',
    borderColor: theme.colors.primary,
    borderWidth: 1,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});

export default ConstructionPermitForm;