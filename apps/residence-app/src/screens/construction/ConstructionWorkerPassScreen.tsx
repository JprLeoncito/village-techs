import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme, Theme } from '../../contexts/ThemeContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ThemedDatePicker } from '../../components/ui/ThemedDatePicker';
import constructionPermitService from '../../services/constructionPermitService';
import { MaterialIcons } from '@expo/vector-icons';
import { formatDistanceToNow, formatDate } from '../../lib/dateUtils';

interface ConstructionWorker {
  id: string;
  name: string;
  contact?: string;
  company?: string;
  role?: string;
}

interface WorkerPass {
  id: string;
  construction_permit_id: string;
  worker_name: string;
  worker_contact?: string;
  worker_company?: string;
  scheduled_date: string;
  scheduled_time: string;
  purpose: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  check_in_time?: string;
  check_out_time?: string;
  created_at: string;
  updated_at: string;
}

interface ConstructionWorkerPassScreenProps {
  visible: boolean;
  onClose: () => void;
  permitId: string;
  permitStatus: string;
}

export const ConstructionWorkerPassScreen: React.FC<ConstructionWorkerPassScreenProps> = ({
  visible,
  onClose,
  permitId,
  permitStatus,
}) => {
  const { householdId } = useAuth();
  const { theme } = useTheme();
  const [workerPasses, setWorkerPasses] = useState<WorkerPass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPassForm, setShowAddPassForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    worker_name: '',
    worker_contact: '',
    worker_company: '',
    scheduled_date: '',
    scheduled_time: '',
    purpose: '',
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  const styles = createStyles(theme);

  useEffect(() => {
    if (visible && permitId) {
      loadWorkerPasses();
    }
  }, [visible, permitId]);

  const loadWorkerPasses = async () => {
    try {
      setLoading(true);
      // In a real implementation, you would fetch worker passes from the database
      // For now, we'll use placeholder data
      const mockPasses: WorkerPass[] = [];
      setWorkerPasses(mockPasses);
    } catch (error) {
      console.error('Error loading worker passes:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDateChange = (date: Date) => {
    setTempDate(date);
    // Format as YYYY-MM-DD in local timezone to avoid UTC conversion issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const localDateString = `${year}-${month}-${day}`;
    updateFormData('scheduled_date', localDateString);
    setShowDatePicker(false);
  };

  
  const validateForm = (): boolean => {
    if (!formData.worker_name.trim()) {
      Alert.alert('Validation Error', 'Please enter worker name');
      return false;
    }
    if (!formData.scheduled_date) {
      Alert.alert('Validation Error', 'Please select a date');
      return false;
    }
    if (!formData.scheduled_time) {
      Alert.alert('Validation Error', 'Please enter a time');
      return false;
    }
    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(formData.scheduled_time)) {
      Alert.alert('Validation Error', 'Please enter a valid time in HH:MM format (e.g., 09:00)');
      return false;
    }
    if (!formData.purpose.trim()) {
      Alert.alert('Validation Error', 'Please enter the purpose of visit');
      return false;
    }
    return true;
  };

  const handleSubmitPass = async () => {
    if (!validateForm()) return;

    if (permitStatus !== 'in_progress' && permitStatus !== 'approved') {
      Alert.alert(
        'Cannot Schedule Pass',
        'Worker passes can only be scheduled for permits that are approved or in progress.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // In a real implementation, you would save to the database
      const newPass: WorkerPass = {
        id: `pass_${Date.now()}`,
        construction_permit_id: permitId,
        worker_name: formData.worker_name,
        worker_contact: formData.worker_contact,
        worker_company: formData.worker_company,
        scheduled_date: formData.scheduled_date,
        scheduled_time: formData.scheduled_time,
        purpose: formData.purpose,
        status: 'scheduled',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setWorkerPasses(prev => [newPass, ...prev]);

      Alert.alert(
        'Pass Scheduled',
        `Worker pass has been scheduled for ${formData.worker_name} on ${formatDate(formData.scheduled_date)} at ${formData.scheduled_time}.`,
        [
          {
            text: 'OK',
            onPress: () => {
              handleCloseForm();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error scheduling worker pass:', error);
      Alert.alert('Error', 'Failed to schedule worker pass');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelPass = async (passId: string) => {
    Alert.alert(
      'Cancel Worker Pass',
      'Are you sure you want to cancel this worker pass?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              // In a real implementation, you would update the database
              setWorkerPasses(prev =>
                prev.map(pass =>
                  pass.id === passId
                    ? { ...pass, status: 'cancelled', updated_at: new Date().toISOString() }
                    : pass
                )
              );
              Alert.alert('Success', 'Worker pass cancelled');
            } catch (error) {
              console.error('Error cancelling pass:', error);
              Alert.alert('Error', 'Failed to cancel worker pass');
            }
          },
        },
      ]
    );
  };

  const handleCloseForm = () => {
    setFormData({
      worker_name: '',
      worker_contact: '',
      worker_company: '',
      scheduled_date: '',
      scheduled_time: '',
      purpose: '',
    });
    setShowAddPassForm(false);
  };

  const getStatusColor = (status: WorkerPass['status']) => {
    switch (status) {
      case 'scheduled':
        return theme.colors.primary;
      case 'active':
        return theme.colors.success;
      case 'completed':
        return theme.colors.muted;
      case 'cancelled':
        return theme.colors.error;
      default:
        return theme.colors.muted;
    }
  };

  const getStatusIcon = (status: WorkerPass['status']): keyof typeof MaterialIcons.glyphMap => {
    switch (status) {
      case 'scheduled':
        return 'event';
      case 'active':
        return 'play-circle';
      case 'completed':
        return 'check-circle';
      case 'cancelled':
        return 'cancel';
      default:
        return 'help';
    }
  };

  const renderWorkerPassItem = (pass: WorkerPass) => (
    <Card key={pass.id} style={styles.passCard}>
      <View style={styles.passHeader}>
        <View style={styles.passInfo}>
          <Text style={styles.workerName}>{pass.worker_name}</Text>
          {pass.worker_company && (
            <Text style={styles.companyName}>{pass.worker_company}</Text>
          )}
          <View style={styles.passMeta}>
            <MaterialIcons name="event" size={16} color={theme.colors.muted} />
            <Text style={styles.metaText}>
              {formatDate(pass.scheduled_date)} at {pass.scheduled_time}
            </Text>
          </View>
        </View>
        <View style={styles.passStatus}>
          <Badge
            variant={pass.status === 'cancelled' ? 'error' : 'default'}
            size="sm"
          >
            <MaterialIcons
              name={getStatusIcon(pass.status)}
              size={12}
              color={getStatusColor(pass.status)}
            />
            <Text style={[styles.statusText, { color: getStatusColor(pass.status) }]}>
              {pass.status.toUpperCase()}
            </Text>
          </Badge>
        </View>
      </View>

      <View style={styles.passDetails}>
        <Text style={styles.purposeLabel}>Purpose:</Text>
        <Text style={styles.purposeText}>{pass.purpose}</Text>

        {pass.check_in_time && (
          <View style={styles.timeRow}>
            <MaterialIcons name="login" size={16} color={theme.colors.success} />
            <Text style={styles.timeText}>Check-in: {pass.check_in_time}</Text>
          </View>
        )}

        {pass.check_out_time && (
          <View style={styles.timeRow}>
            <MaterialIcons name="logout" size={16} color={theme.colors.muted} />
            <Text style={styles.timeText}>Check-out: {pass.check_out_time}</Text>
          </View>
        )}
      </View>

      {pass.status === 'scheduled' && (
        <View style={styles.passActions}>
          <Button
            variant="outline"
            size="sm"
            style={styles.cancelButton}
            onPress={() => handleCancelPass(pass.id)}
          >
            <MaterialIcons name="cancel" size={16} color={theme.colors.error} />
            <Text style={styles.cancelButtonText}>Cancel Pass</Text>
          </Button>
        </View>
      )}
    </Card>
  );

  if (loading) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.loadingContainer}>
          <MaterialIcons name="engineering" size={48} color={theme.colors.muted} />
          <Text style={styles.loadingText}>Loading worker passes...</Text>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Construction Worker Passes</Text>
          <TouchableOpacity
            onPress={() => setShowAddPassForm(true)}
            style={styles.addButton}
            disabled={permitStatus !== 'in_progress' && permitStatus !== 'approved'}
          >
            <MaterialIcons name="add" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {permitStatus !== 'in_progress' && permitStatus !== 'approved' && (
            <Card style={styles.warningCard}>
              <MaterialIcons name="warning" size={24} color={theme.colors.warning} />
              <Text style={styles.warningText}>
                Worker passes can only be scheduled for approved permits or permits that are currently in progress.
              </Text>
            </Card>
          )}

          {workerPasses.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="engineering" size={64} color={theme.colors.muted} />
              <Text style={styles.emptyTitle}>No Worker Passes</Text>
              <Text style={styles.emptyText}>
                Schedule gate passes for construction workers to access the site.
              </Text>
            </View>
          ) : (
            <View style={styles.passList}>
              {workerPasses.map(renderWorkerPassItem)}
            </View>
          )}
        </ScrollView>

        {/* Add Pass Form Modal */}
        <Modal
          visible={showAddPassForm}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={handleCloseForm}
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <TouchableOpacity onPress={handleCloseForm} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={styles.title}>Schedule Worker Pass</Text>
              <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.scrollView}>
              <Card style={styles.formCard}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Worker Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.worker_name}
                    onChangeText={(value) => updateFormData('worker_name', value)}
                    placeholder="Enter worker's full name"
                    placeholderTextColor={theme.colors.muted}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Contact Number</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.worker_contact}
                    onChangeText={(value) => updateFormData('worker_contact', value)}
                    placeholder="Phone number"
                    placeholderTextColor={theme.colors.muted}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Company</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.worker_company}
                    onChangeText={(value) => updateFormData('worker_company', value)}
                    placeholder="Company name"
                    placeholderTextColor={theme.colors.muted}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Scheduled Date *</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <MaterialIcons name="event" size={20} color={theme.colors.muted} />
                    <Text style={styles.dateText}>
                      {formData.scheduled_date || 'Select date'}
                    </Text>
                    <MaterialIcons name="chevron-right" size={20} color={theme.colors.muted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Scheduled Time *</Text>
                  <View style={styles.timeInputContainer}>
                    <MaterialIcons name="schedule" size={20} color={theme.colors.muted} style={styles.timeIcon} />
                    <TextInput
                      style={[styles.textInput, styles.timeInput]}
                      value={formData.scheduled_time}
                      onChangeText={(value) => updateFormData('scheduled_time', value)}
                      placeholder="HH:MM (e.g., 09:00)"
                      placeholderTextColor={theme.colors.muted}
                      keyboardType="numeric"
                      maxLength={5}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Purpose of Visit *</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={formData.purpose}
                    onChangeText={(value) => updateFormData('purpose', value)}
                    placeholder="Describe the purpose of this visit"
                    placeholderTextColor={theme.colors.muted}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </Card>
            </ScrollView>

            <View style={styles.formFooter}>
              <Button
                variant="outline"
                onPress={handleCloseForm}
                style={styles.cancelFormButton}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onPress={handleSubmitPass}
                style={styles.submitButton}
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                Schedule Pass
              </Button>
            </View>

            {/* Date Picker */}
            <ThemedDatePicker
              visible={showDatePicker}
              value={tempDate}
              onChange={handleDateChange}
              onClose={() => setShowDatePicker(false)}
              title="Select Date"
              minimumDate={new Date(new Date().setHours(0, 0, 0, 0))}
            />
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.muted,
    marginTop: 16,
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
  addButton: {
    padding: 4,
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
    backgroundColor: theme.isDark ? theme.colors.warning + '20' : '#fef3c7',
    borderColor: theme.colors.warning,
    borderWidth: 1,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: 12,
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  passList: {
    gap: 12,
  },
  passCard: {
    padding: 16,
  },
  passHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  passInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  companyName: {
    fontSize: 14,
    color: theme.colors.muted,
    marginBottom: 4,
  },
  passMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: theme.colors.muted,
    marginLeft: 4,
  },
  passStatus: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  passDetails: {
    marginBottom: 12,
  },
  purposeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.muted,
    marginBottom: 4,
  },
  purposeText: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timeText: {
    fontSize: 12,
    color: theme.colors.muted,
    marginLeft: 4,
  },
  passActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.error,
    marginLeft: 4,
  },
  formCard: {
    padding: 20,
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
  },
  textArea: {
    height: 80,
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
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    marginLeft: 8,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    backgroundColor: theme.colors.card,
  },
  timeIcon: {
    marginLeft: 12,
  },
  timeInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginLeft: 8,
  },
  formFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 12,
  },
  cancelFormButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});

export default ConstructionWorkerPassScreen;