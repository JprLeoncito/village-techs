import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';

interface IncidentData {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  description: string;
}

const INCIDENT_TYPES = [
  { value: 'security_breach', label: 'Security Breach', icon: 'shield-alert' },
  { value: 'theft', label: 'Theft', icon: 'package-alert' },
  { value: 'vandalism', label: 'Vandalism', icon: 'hammer' },
  { value: 'assault', label: 'Assault', icon: 'human-handsdown' },
  { value: 'suspicious_activity', label: 'Suspicious Activity', icon: 'eye-alert' },
  { value: 'accident', label: 'Accident', icon: 'car-emergency' },
  { value: 'fire', label: 'Fire', icon: 'fire' },
  { value: 'medical_emergency', label: 'Medical Emergency', icon: 'medical-bag' },
  { value: 'noise_complaint', label: 'Noise Complaint', icon: 'volume-high' },
  { value: 'other', label: 'Other', icon: 'alert-circle' },
];

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low', color: '#10b981' },
  { value: 'medium', label: 'Medium', color: '#3b82f6' },
  { value: 'high', label: 'High', color: '#f59e0b' },
  { value: 'critical', label: 'Critical', color: '#ef4444' },
];

export const IncidentReportScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [incidentData, setIncidentData] = useState<IncidentData>({
    type: '',
    severity: 'medium',
    location: '',
    description: '',
  });
  const { theme } = useTheme();

  const selectIncidentType = (type: string) => {
    setIncidentData(prev => ({ ...prev, type }));
  };

  const selectSeverity = (severity: 'low' | 'medium' | 'high' | 'critical') => {
    setIncidentData(prev => ({ ...prev, severity }));
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotos(prev => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    if (!incidentData.type) {
      Alert.alert('Error', 'Please select an incident type');
      return false;
    }
    if (!incidentData.location.trim()) {
      Alert.alert('Error', 'Please enter the location');
      return false;
    }
    if (!incidentData.description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return false;
    }
    return true;
  };

  const submitReport = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const officerId = (await supabase.auth.getUser()).data.user?.id;

      const { error } = await supabase
        .from('incidents')
        .insert({
          type: incidentData.type,
          severity: incidentData.severity,
          location: incidentData.location,
          description: incidentData.description,
          status: 'open',
          reporting_officer_id: officerId,
          photos: photos,
        });

      if (error) throw error;

      Alert.alert(
        'Success',
        'Incident reported successfully',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error submitting incident:', error);
      Alert.alert('Error', 'Failed to submit incident report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Report Incident
        </Text>

        {/* Incident Type Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Incident Type
          </Text>
          <View style={styles.typeGrid}>
            {INCIDENT_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeCard,
                  {
                    backgroundColor: incidentData.type === type.value
                      ? theme.colors.primary
                      : theme.colors.card,
                    borderColor: theme.colors.border,
                  }
                ]}
                onPress={() => selectIncidentType(type.value)}
              >
                <Icon
                  name={type.icon}
                  size={24}
                  color={incidentData.type === type.value ? '#ffffff' : theme.colors.text}
                />
                <Text style={[
                  styles.typeLabel,
                  {
                    color: incidentData.type === type.value ? '#ffffff' : theme.colors.text,
                  }
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Severity Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Severity Level
          </Text>
          <View style={styles.severityContainer}>
            {SEVERITY_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.value}
                style={[
                  styles.severityCard,
                  {
                    backgroundColor: incidentData.severity === level.value
                      ? level.color
                      : theme.colors.card,
                    borderColor: theme.colors.border,
                  }
                ]}
                onPress={() => selectSeverity(level.value as any)}
              >
                <View style={[
                  styles.severityDot,
                  { backgroundColor: level.color }
                ]} />
                <Text style={[
                  styles.severityLabel,
                  {
                    color: incidentData.severity === level.value ? '#ffffff' : theme.colors.text,
                  }
                ]}>
                  {level.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Location
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.card,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              }
            ]}
            placeholder="Enter incident location"
            placeholderTextColor={theme.colors.muted}
            value={incidentData.location}
            onChangeText={(text) => setIncidentData(prev => ({ ...prev, location: text }))}
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Description
          </Text>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: theme.colors.card,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              }
            ]}
            placeholder="Describe the incident in detail"
            placeholderTextColor={theme.colors.muted}
            multiline
            numberOfLines={6}
            value={incidentData.description}
            onChangeText={(text) => setIncidentData(prev => ({ ...prev, description: text }))}
          />
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Photos (Optional)
          </Text>
          <TouchableOpacity
            style={[
              styles.photoButton,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              }
            ]}
            onPress={takePhoto}
          >
            <Icon name="camera" size={24} color={theme.colors.primary} />
            <Text style={[styles.photoButtonText, { color: theme.colors.primary }]}>
              Take Photo
            </Text>
          </TouchableOpacity>

          {photos.length > 0 && (
            <View style={styles.photoGrid}>
              {photos.map((photo, index) => (
                <View key={index} style={styles.photoContainer}>
                  <Text style={[styles.photoText, { color: theme.colors.text }]}>
                    Photo {index + 1}
                  </Text>
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => removePhoto(index)}
                  >
                    <Icon name="close" size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: theme.colors.primary }
          ]}
          onPress={submitReport}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Report</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  typeCard: {
    width: '48%',
    marginHorizontal: '1%',
    marginVertical: 4,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  severityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  severityCard: {
    flex: 1,
    marginHorizontal: 4,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  severityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  severityLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    height: 120,
    textAlignVertical: 'top',
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  photoButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  photoContainer: {
    width: 100,
    height: 100,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 4,
    position: 'relative',
  },
  photoText: {
    fontSize: 12,
    fontWeight: '500',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default IncidentReportScreen;