import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ThemedDatePicker } from '../ui/ThemedDatePicker';
import { useTheme } from '../../contexts/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';

export interface GuestFormData {
  guestName: string;
  guestPhone: string;
  vehiclePlate?: string;
  purpose: string;
  visitType: 'day-trip' | 'multi-day';
  arrivalDate: Date;
  departureDate?: Date;
}

interface GuestScheduleFormProps {
  onSubmit: (data: GuestFormData) => void;
  isSubmitting?: boolean;
  defaultValues?: Partial<GuestFormData>;
}

export const GuestScheduleForm: React.FC<GuestScheduleFormProps> = ({
  onSubmit,
  isSubmitting = false,
  defaultValues,
}) => {
  const { theme } = useTheme();

  // Helper function to get today's date at midnight (start of day) - preserves local timezone
  const getTodayDate = () => {
    const now = new Date();
    // Get current local date and set to start of day (midnight) preserving local timezone
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  };

  const [formData, setFormData] = useState<GuestFormData>({
    guestName: defaultValues?.guestName || '',
    guestPhone: defaultValues?.guestPhone || '',
    vehiclePlate: defaultValues?.vehiclePlate || '',
    purpose: defaultValues?.purpose || '',
    visitType: defaultValues?.visitType || 'day-trip',
    arrivalDate: defaultValues?.arrivalDate || getTodayDate(),
    departureDate: defaultValues?.departureDate,
  });

  const [showArrivalPicker, setShowArrivalPicker] = useState(false);
  const [showDeparturePicker, setShowDeparturePicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.guestName.trim()) {
      newErrors.guestName = 'Guest name is required';
    }

    if (!formData.guestPhone.trim()) {
      newErrors.guestPhone = 'Phone number is required';
    } else if (!validatePhoneNumber(formData.guestPhone)) {
      newErrors.guestPhone = 'Invalid phone number format';
    }

    if (!formData.purpose.trim()) {
      newErrors.purpose = 'Purpose of visit is required';
    }

    // Validate arrival date is not in past - use local timezone comparison
    const today = getTodayDate();
    const arrival = new Date(formData.arrivalDate.getFullYear(), formData.arrivalDate.getMonth(), formData.arrivalDate.getDate());

    if (arrival < today) {
      newErrors.arrivalDate = 'Arrival date cannot be in the past';
    }

    // Validate departure date if multi-day
    if (formData.visitType === 'multi-day') {
      if (!formData.departureDate) {
        newErrors.departureDate = 'Departure date is required for multi-day visits';
      } else {
        const departure = new Date(formData.departureDate);
        if (departure <= formData.arrivalDate) {
          newErrors.departureDate = 'Departure must be after arrival';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePhoneNumber = (phone: string): boolean => {
    // Philippine phone number format
    const phoneRegex = /^(\+63|0)9\d{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData);
    } else {
      Alert.alert(
        'Validation Error',
        'Please check all required fields',
        [{ text: 'OK' }]
      );
    }
  };

  const handleVisitTypeChange = (type: 'day-trip' | 'multi-day') => {
    setFormData({
      ...formData,
      visitType: type,
      departureDate: type === 'day-trip' ? undefined : formData.departureDate,
    });
  };

  const handleArrivalDateChange = (selectedDate: Date) => {
    setFormData({ ...formData, arrivalDate: selectedDate });
    setShowArrivalPicker(false);
  };

  const handleDepartureDateChange = (selectedDate: Date) => {
    setFormData({ ...formData, departureDate: selectedDate });
    setShowDeparturePicker(false);
  };

  const styles = createStyles(theme);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Card style={[styles.formCard, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Guest Information</Text>

        <Input
          testID="guest-name-input"
          label="Guest Name *"
          value={formData.guestName}
          onChangeText={(text) => setFormData({ ...formData, guestName: text })}
          placeholder="Enter guest full name"
          error={errors.guestName}
        />

        <Input
          testID="guest-phone-input"
          label="Phone Number *"
          value={formData.guestPhone}
          onChangeText={(text) => setFormData({ ...formData, guestPhone: text })}
          placeholder="+639123456789"
          keyboardType="phone-pad"
          error={errors.guestPhone}
        />

        <Input
          testID="guest-plate-input"
          label="Vehicle Plate Number"
          value={formData.vehiclePlate}
          onChangeText={(text) => setFormData({ ...formData, vehiclePlate: text })}
          placeholder="ABC 123 (optional)"
          autoCapitalize="characters"
        />

        <Input
          testID="guest-purpose-input"
          label="Purpose of Visit *"
          value={formData.purpose}
          onChangeText={(text) => setFormData({ ...formData, purpose: text })}
          placeholder="e.g., Family visit, Delivery, Contractor"
          multiline
          numberOfLines={2}
          error={errors.purpose}
        />
      </Card>

      <Card style={[styles.formCard, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Visit Details</Text>

        <View style={styles.visitTypeContainer}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Visit Type</Text>
          <View style={styles.visitTypeButtons} testID="visit-type-selector">
            <Button
              testID="day-trip-option"
              variant={formData.visitType === 'day-trip' ? 'primary' : 'outline'}
              size="sm"
              onPress={() => handleVisitTypeChange('day-trip')}
              style={styles.visitTypeButton}
            >
              Day Trip
            </Button>
            <Button
              testID="multi-day-option"
              variant={formData.visitType === 'multi-day' ? 'primary' : 'outline'}
              size="sm"
              onPress={() => handleVisitTypeChange('multi-day')}
              style={styles.visitTypeButton}
            >
              Multi-Day
            </Button>
          </View>
        </View>

        <View style={styles.dateContainer}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Arrival Date *</Text>
          <Button
            testID="arrival-date-picker"
            variant="outline"
            onPress={() => setShowArrivalPicker(true)}
          >
            {format(formData.arrivalDate, 'MMM dd, yyyy')}
          </Button>
          {errors.arrivalDate && (
            <Text style={styles.errorText}>{errors.arrivalDate}</Text>
          )}
        </View>

        <ThemedDatePicker
          visible={showArrivalPicker}
          value={formData.arrivalDate}
          onChange={handleArrivalDateChange}
          minimumDate={getTodayDate()}
          onClose={() => setShowArrivalPicker(false)}
          title="Select Arrival Date"
        />

        {formData.visitType === 'multi-day' && (
          <>
            <View style={styles.dateContainer}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Departure Date *</Text>
              <Button
                testID="departure-date-picker"
                variant="outline"
                onPress={() => setShowDeparturePicker(true)}
              >
                {formData.departureDate ? format(formData.departureDate, 'MMM dd, yyyy') : 'Select departure date'}
              </Button>
              {errors.departureDate && (
                <Text style={styles.errorText}>{errors.departureDate}</Text>
              )}
            </View>

            <ThemedDatePicker
              visible={showDeparturePicker}
              value={formData.departureDate || new Date()}
              onChange={handleDepartureDateChange}
              minimumDate={formData.arrivalDate}
              onClose={() => setShowDeparturePicker(false)}
              title="Select Departure Date"
            />
          </>
        )}
      </Card>

      <View style={[styles.noticeCard, { backgroundColor: theme.dark ? '#374151' : '#eff6ff' }]}>
        <Text style={styles.noticeIcon}>ℹ️</Text>
        <Text style={[styles.noticeText, { color: theme.dark ? '#60a5fa' : '#1e40af' }]}>
          A QR code will be generated for your guest. Please share it with them for gate access.
        </Text>
      </View>

      <Button
        testID="submit-guest-button"
        variant="primary"
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={isSubmitting}
        fullWidth
        style={styles.submitButton}
      >
        Schedule Guest
      </Button>
    </ScrollView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  formCard: {
    marginBottom: 16,
    shadowColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: theme.colors.text,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: theme.colors.text,
  },
  visitTypeContainer: {
    marginBottom: 16,
  },
  visitTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  visitTypeButton: {
    flex: 1,
  },
  dateContainer: {
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  noticeCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  noticeIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.text,
  },
  submitButton: {
    marginBottom: 32,
  },
});

export default GuestScheduleForm;