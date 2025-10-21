import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { GuestScheduleForm, GuestFormData } from '../../components/guests/GuestScheduleForm';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import guestVisitorService from '../../services/guestVisitorService';
import { useAuth } from '../../contexts/AuthContext';

export const GuestScheduleScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { householdId } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdGuest, setCreatedGuest] = useState<any>(null);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSubmit = async (formData: GuestFormData) => {
    if (!householdId) {
      Alert.alert('Error', 'Household information not available');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await guestVisitorService.scheduleGuestVisit(householdId, {
        guest_name: formData.guestName,
        guest_phone: formData.guestPhone,
        vehicle_plate: formData.vehiclePlate,
        purpose: formData.purpose,
        visit_type: formData.visitType === 'day-trip' ? 'day_trip' : 'multi_day',
        expected_arrival: formData.arrivalDate.toISOString(),
        expected_departure: formData.departureDate?.toISOString(),
        notes: formData.vehiclePlate ? `Vehicle: ${formData.vehiclePlate}` : '',
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to schedule guest');
      }

      const newGuest = result.data;

      setCreatedGuest(newGuest);
      setShowSuccessModal(true);

      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 2000);

    } catch (error) {
      console.error('Failed to schedule guest:', error);
      Alert.alert(
        'Error',
        'Failed to schedule guest. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const styles = createStyles(theme);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Schedule Guest</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Form */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          <GuestScheduleForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Guest Scheduled Successfully!"
      >
        <View style={[styles.successContent, { backgroundColor: theme.colors.card }]}>
          <MaterialIcons name="check-circle" size={64} color="#10b981" />
          <Text style={[styles.successTitle, { color: theme.colors.text }]}>
            Guest Visit Scheduled
          </Text>
          <Text style={[styles.successMessage, { color: theme.colors.muted }]}>
            {createdGuest?.guest_name || createdGuest?.name} has been scheduled for
            {createdGuest?.expected_arrival ?
              new Date(createdGuest.expected_arrival).toLocaleDateString() :
              'today'
            }.
            A QR code has been generated for easy access.
          </Text>
          <Button
            variant="primary"
            onPress={() => {
              setShowSuccessModal(false);
              navigation.goBack();
            }}
            style={styles.successButton}
          >
            Done
          </Button>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginRight: 40, // Compensate for back button
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  successContent: {
    alignItems: 'center',
    padding: 24,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  successButton: {
    paddingHorizontal: 32,
  },
});

export default GuestScheduleScreen;