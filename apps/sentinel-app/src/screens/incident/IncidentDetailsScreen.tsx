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
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

interface Incident {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  location_gps?: string;
  description: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  created_at: string;
  assigned_to?: string;
  reporting_officer_id?: string;
  photos?: string[];
  videos?: string[];
  resolution_notes?: string;
}

export const IncidentDetailsScreen = ({ route, navigation }: any) => {
  const { incidentId } = route.params;
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const { theme } = useTheme();

  useEffect(() => {
    loadIncident();
  }, [incidentId]);

  const loadIncident = async () => {
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .eq('id', incidentId)
        .single();

      if (error) throw error;
      setIncident(data);
      setResolutionNotes(data.resolution_notes || '');
    } catch (error) {
      console.error('Error loading incident:', error);
      Alert.alert('Error', 'Failed to load incident details');
    } finally {
      setLoading(false);
    }
  };

  const updateIncidentStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      const updateData: any = { status: newStatus };

      if (newStatus === 'resolved' || newStatus === 'closed') {
        updateData.resolution_notes = resolutionNotes;
      }

      const { error } = await supabase
        .from('incidents')
        .update(updateData)
        .eq('id', incidentId);

      if (error) throw error;

      setIncident(prev => prev ? { ...prev, ...updateData } : null);
      setShowResolutionModal(false);
      Alert.alert('Success', `Incident status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating incident:', error);
      Alert.alert('Error', 'Failed to update incident status');
    } finally {
      setUpdating(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return theme.colors.error;
      case 'high': return theme.colors.warning;
      case 'medium': return theme.colors.info;
      case 'low': return theme.colors.success;
      default: return theme.colors.text;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return theme.colors.error;
      case 'investigating': return theme.colors.warning;
      case 'resolved': return theme.colors.success;
      case 'closed': return theme.colors.text;
      default: return theme.colors.text;
    }
  };

  const formatIncidentType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>
          Loading incident details...
        </Text>
      </View>
    );
  }

  if (!incident) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          Incident not found
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={[styles.incidentType, { color: theme.colors.text }]}>
              {formatIncidentType(incident.type)}
            </Text>
            <View style={[
              styles.severityBadge,
              { backgroundColor: getSeverityColor(incident.severity) }
            ]}>
              <Text style={[styles.severityText, { color: '#ffffff' }]}>
                {incident.severity.toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(incident.status) }
          ]}>
            <Text style={[styles.statusText, { color: '#ffffff' }]}>
              {incident.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Details Card */}
        <View style={[
          styles.card,
          { backgroundColor: theme.colors.card, borderColor: theme.colors.border }
        ]}>
          <View style={styles.detailRow}>
            <Icon name="calendar" size={20} color={theme.colors.muted} />
            <Text style={[styles.detailLabel, { color: theme.colors.muted }]}>
              Reported:
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {format(new Date(incident.created_at), 'MMM dd, yyyy HH:mm')}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Icon name="map-marker" size={20} color={theme.colors.muted} />
            <Text style={[styles.detailLabel, { color: theme.colors.muted }]}>
              Location:
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {incident.location}
            </Text>
          </View>

          {incident.location_gps && (
            <View style={styles.detailRow}>
              <Icon name="map" size={20} color={theme.colors.muted} />
              <Text style={[styles.detailLabel, { color: theme.colors.muted }]}>
                GPS:
              </Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                {incident.location_gps}
              </Text>
            </View>
          )}
        </View>

        {/* Description */}
        <View style={[
          styles.card,
          { backgroundColor: theme.colors.card, borderColor: theme.colors.border }
        ]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            Description
          </Text>
          <Text style={[styles.description, { color: theme.colors.text }]}>
            {incident.description}
          </Text>
        </View>

        {/* Photos */}
        {incident.photos && incident.photos.length > 0 && (
          <View style={[
            styles.card,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.border }
          ]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              Photos ({incident.photos.length})
            </Text>
            {incident.photos.map((photo, index) => (
              <View key={index} style={styles.photoItem}>
                <Icon name="image" size={20} color={theme.colors.primary} />
                <Text style={[styles.photoText, { color: theme.colors.text }]}>
                  Photo {index + 1}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Resolution Notes */}
        {(incident.resolution_notes || incident.status === 'resolved' || incident.status === 'closed') && (
          <View style={[
            styles.card,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.border }
          ]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              Resolution Notes
            </Text>
            {incident.resolution_notes ? (
              <Text style={[styles.resolutionText, { color: theme.colors.text }]}>
                {incident.resolution_notes}
              </Text>
            ) : (
              <Text style={[styles.noResolutionText, { color: theme.colors.muted }]}>
                No resolution notes provided
              </Text>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {incident.status === 'open' && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: theme.colors.warning }
              ]}
              onPress={() => updateIncidentStatus('investigating')}
              disabled={updating}
            >
              <Icon name="magnify" size={20} color="#ffffff" />
              <Text style={styles.actionButtonText}>
                Start Investigation
              </Text>
            </TouchableOpacity>
          )}

          {incident.status === 'investigating' && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: theme.colors.success }
              ]}
              onPress={() => setShowResolutionModal(true)}
              disabled={updating}
            >
              <Icon name="check" size={20} color="#ffffff" />
              <Text style={styles.actionButtonText}>
                Mark Resolved
              </Text>
            </TouchableOpacity>
          )}

          {incident.status === 'resolved' && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: theme.colors.text }
              ]}
              onPress={() => updateIncidentStatus('closed')}
              disabled={updating}
            >
              <Icon name="close" size={20} color="#ffffff" />
              <Text style={styles.actionButtonText}>
                Close Incident
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Resolution Modal */}
      <Modal
        visible={showResolutionModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowResolutionModal(false)}>
              <Icon name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Resolution Notes
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.modalContent}>
            <Text style={[styles.modalLabel, { color: theme.colors.text }]}>
              Please provide resolution details:
            </Text>
            <TextInput
              style={[
                styles.resolutionInput,
                {
                  backgroundColor: theme.colors.card,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                }
              ]}
              multiline
              numberOfLines={8}
              placeholder="Enter resolution details..."
              placeholderTextColor={theme.colors.muted}
              value={resolutionNotes}
              onChangeText={setResolutionNotes}
            />

            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: theme.colors.primary }
              ]}
              onPress={() => updateIncidentStatus('resolved')}
              disabled={updating || !resolutionNotes.trim()}
            >
              {updating ? (
                <Text style={styles.submitButtonText}>Updating...</Text>
              ) : (
                <Text style={styles.submitButtonText}>Mark as Resolved</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  header: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  incidentType: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    flex: 1,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  photoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  photoText: {
    fontSize: 14,
    marginLeft: 8,
  },
  resolutionText: {
    fontSize: 16,
    lineHeight: 24,
  },
  noResolutionText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  actionButtons: {
    marginTop: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalLabel: {
    fontSize: 16,
    marginBottom: 12,
  },
  resolutionInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    height: 200,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  submitButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 32,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 32,
  },
});