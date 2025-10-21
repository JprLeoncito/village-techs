import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput as RNTextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ThemedDatePicker } from '../../components/ui/ThemedDatePicker';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { householdMemberService, CreateHouseholdMemberRequest, UpdateHouseholdMemberRequest } from '../../services/householdMemberService';
import { useTheme } from '../../contexts/ThemeContext';
import { Icons, IconColors } from '../../constants/icons';
import networkStatus from '../../lib/networkStatus';

interface RouteParams {
  memberId?: string;
  mode?: 'create' | 'edit';
}

const RELATIONSHIPS = [
  'self',
  'spouse',
  'child',
  'parent',
  'sibling',
  'grandparent',
  'grandchild',
  'domestic_partner',
  'roommate',
  'other',
];

const MEMBER_TYPES = [
  { value: 'resident', label: 'Resident', description: 'Lives in the household' },
  { value: 'beneficial_user', label: 'Beneficial User', description: 'Has access rights' },
];

export const AddEditHouseholdMemberScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { mode = 'create', memberId } = route.params as RouteParams;
  const { theme } = useTheme();

  const [formData, setFormData] = useState<CreateHouseholdMemberRequest>({
    first_name: '',
    last_name: '',
    relationship_to_head: '',
    date_of_birth: '',
    contact_email: '',
    contact_phone: '',
    member_type: 'resident',
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<CreateHouseholdMemberRequest>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && memberId) {
      loadMember();
    }
  }, [mode, memberId]);

  const loadMember = async () => {
    if (!memberId) return;

    try {
      setLoading(true);
      const member = await householdMemberService.getHouseholdMember(memberId);
      if (member) {
        setFormData({
          first_name: member.first_name,
          last_name: member.last_name,
          relationship_to_head: member.relationship_to_head,
          date_of_birth: member.date_of_birth || '',
          contact_email: member.contact_email || '',
          contact_phone: member.contact_phone || '',
          member_type: member.member_type,
        });
      }
    } catch (error) {
      console.error('Error loading member:', error);
      Alert.alert('Error', 'Failed to load member data');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<CreateHouseholdMemberRequest> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    if (!formData.relationship_to_head) {
      newErrors.relationship_to_head = 'Relationship is required';
    }

    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      newErrors.contact_email = 'Please enter a valid email address';
    }

    if (formData.contact_phone && !/^[+]?[\d\s\-\(\)]+$/.test(formData.contact_phone)) {
      newErrors.contact_phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields correctly.');
      return;
    }

    setSaving(true);

    try {
      let result;
      if (mode === 'edit' && memberId) {
        result = await householdMemberService.updateHouseholdMember(memberId, formData as UpdateHouseholdMemberRequest);
      } else {
        result = await householdMemberService.createHouseholdMember(formData);
      }

      if (result.success) {
        Alert.alert(
          'Success',
          mode === 'edit' ? 'Household member updated successfully!' : 'Household member added successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to save household member');
      }
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Failed to save household member');
    } finally {
      setSaving(false);
    }
  };

  const updateFormField = (field: keyof CreateHouseholdMemberRequest, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleDateChange = (selectedDate: Date) => {
    const dateString = selectedDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    updateFormField('date_of_birth', dateString);
  };

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return 'Select Date of Birth';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Select Date of Birth';
    }
  };

  const renderInput = (
    label: string,
    field: keyof CreateHouseholdMemberRequest,
    placeholder: string,
    keyboardType: 'default' | 'email-address' | 'phone-pad' = 'default',
    multiline: boolean = false
  ) => (
    <View style={styles.inputContainer}>
      <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
      <View style={[
        styles.input,
        { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
        errors[field] && styles.inputError,
        multiline && styles.inputMultiline
      ]}>
        <RNTextInput
          style={[styles.inputText, { color: theme.colors.text }]}
          value={formData[field] as string}
          onChangeText={(value) => updateFormField(field, value)}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.muted}
          keyboardType={keyboardType}
          multiline={multiline}
          autoCapitalize="words"
        />
      </View>
      {errors[field] && (
        <Text style={styles.errorText}>{errors[field]}</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <LoadingSpinner size="large" />
        <Text style={[styles.loadingText, { color: theme.colors.muted }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {mode === 'edit' ? 'Edit Household Member' : 'Add Household Member'}
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          {mode === 'edit' ? 'Update member information' : 'Add a new member to your household'}
        </Text>
      </View>

      {!networkStatus.isConnected() && (
        <View style={styles.offlineBanner}>
          <MaterialIcons name="signal-wifi-off" size={20} color={IconColors.warning} />
          <Text style={styles.offlineText}>
            You're offline. Changes will be synced when you're back online.
          </Text>
        </View>
      )}

      <Card style={[styles.formCard, { backgroundColor: theme.colors.card }]}>
        {renderInput('First Name *', 'first_name', 'Enter first name')}
        {renderInput('Last Name *', 'last_name', 'Enter last name')}

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Relationship * </Text>
          <View style={styles.relationshipContainer}>
            {RELATIONSHIPS.map((relationship) => (
              <TouchableOpacity
                key={relationship}
                style={[
                  styles.relationshipChip,
                  { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                  formData.relationship_to_head === relationship && [styles.relationshipChipSelected, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }],
                ]}
                onPress={() => updateFormField('relationship_to_head', relationship)}
              >
                <Text style={[
                  styles.relationshipText,
                  { color: theme.colors.muted },
                  formData.relationship_to_head === relationship && styles.relationshipTextSelected,
                ]}>
                  {relationship.replace('_', ' ').charAt(0).toUpperCase() + relationship.slice(1).replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.relationship_to_head && (
            <Text style={styles.errorText}>{errors.relationship_to_head}</Text>
          )}
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Date of Birth</Text>
          <TouchableOpacity
            style={[
              styles.input,
              { backgroundColor: theme.colors.background, borderColor: theme.colors.border }
            ]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={[styles.inputText, { color: formData.date_of_birth ? theme.colors.text : theme.colors.muted }]}>
              {formatDateDisplay(formData.date_of_birth)}
            </Text>
          </TouchableOpacity>
          {errors.date_of_birth && (
            <Text style={styles.errorText}>{errors.date_of_birth}</Text>
          )}
        </View>
        {renderInput('Email', 'contact_email', 'Enter email address', 'email-address')}
        {renderInput('Phone', 'contact_phone', 'Enter phone number', 'phone-pad')}

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Member Type</Text>
          <View style={styles.memberTypeContainer}>
            {MEMBER_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.memberTypeCard,
                  { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                  formData.member_type === type.value && [styles.memberTypeCardSelected, { backgroundColor: theme.colors.card, borderColor: theme.colors.primary }],
                ]}
                onPress={() => updateFormField('member_type', type.value as 'resident' | 'beneficial_user')}
              >
                <Text style={[
                  styles.memberTypeTitle,
                  { color: theme.colors.text },
                  formData.member_type === type.value && styles.memberTypeTitleSelected,
                ]}>
                  {type.label}
                </Text>
                <Text style={[styles.memberTypeDescription, { color: theme.colors.muted }]}>
                  {type.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Card>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleSubmit}
          disabled={saving}
        >
          <Text style={[styles.submitButtonText]}>
            {saving ? 'Saving...' : (mode === 'edit' ? 'Update Member' : 'Add Member')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.cancelButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderWidth: 1 }]}
          onPress={() => navigation.goBack()}
          disabled={saving}
        >
          <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Date Picker Modal */}
      <ThemedDatePicker
        visible={showDatePicker}
        value={formData.date_of_birth ? new Date(formData.date_of_birth) : new Date()}
        onChange={handleDateChange}
        maximumDate={new Date()}
        minimumDate={new Date(1900, 0, 1)}
        onClose={() => setShowDatePicker(false)}
        title="Select Date of Birth"
      />
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
  relationshipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  relationshipChip: {
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  relationshipChipSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  relationshipText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  relationshipTextSelected: {
    color: '#ffffff',
  },
  memberTypeContainer: {
    gap: 12,
  },
  memberTypeCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  memberTypeCardSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  memberTypeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  memberTypeTitleSelected: {
    color: '#3b82f6',
  },
  memberTypeDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    marginRight: 12,
  },
  checkboxInner: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#1f2937',
  },
  buttonContainer: {
    padding: 20,
    paddingBottom: 32,
  },
  submitButton: {
    marginBottom: 12,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
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

export default AddEditHouseholdMemberScreen;