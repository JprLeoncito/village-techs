import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
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
  description: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  created_at: string;
  assigned_to?: string;
}

export const IncidentListScreen = ({ navigation }: any) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIncidents(data || []);
    } catch (error) {
      console.error('Error loading incidents:', error);
      Alert.alert('Error', 'Failed to load incidents');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadIncidents();
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

  const renderIncident = ({ item }: { item: Incident }) => (
    <TouchableOpacity
      style={[
        styles.incidentCard,
        { backgroundColor: theme.colors.card, borderColor: theme.colors.border }
      ]}
      onPress={() => navigation.navigate('IncidentDetails', { incidentId: item.id })}
    >
      <View style={styles.incidentHeader}>
        <View style={styles.incidentTitleRow}>
          <Icon name="alert" size={20} color={getSeverityColor(item.severity)} />
          <Text style={[styles.incidentType, { color: theme.colors.text }]}>
            {item.type.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
        <View style={[
          styles.severityBadge,
          { backgroundColor: getSeverityColor(item.severity) }
        ]}>
          <Text style={[styles.severityText, { color: '#ffffff' }]}>
            {item.severity.toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={[styles.incidentDescription, { color: theme.colors.text }]}>
        {item.description}
      </Text>

      <View style={styles.incidentFooter}>
        <View style={styles.incidentLocation}>
          <Icon name="map-marker" size={16} color={theme.colors.muted} />
          <Text style={[styles.locationText, { color: theme.colors.muted }]}>
            {item.location}
          </Text>
        </View>
        <Text style={[styles.timestamp, { color: theme.colors.muted }]}>
          {format(new Date(item.created_at), 'MMM dd, HH:mm')}
        </Text>
      </View>

      <View style={[
        styles.statusBadge,
        { backgroundColor: getStatusColor(item.status) }
      ]}>
        <Text style={[styles.statusText, { color: '#ffffff' }]}>
          {item.status.replace('_', ' ').toUpperCase()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>
          Loading incidents...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={incidents}
        renderItem={renderIncident}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="alert-outline" size={64} color={theme.colors.muted} />
            <Text style={[styles.emptyText, { color: theme.colors.muted }]}>
              No incidents reported
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('IncidentReport')}
      >
        <Icon name="plus" size={24} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
  },
  incidentCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  incidentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  incidentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  incidentType: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  incidentDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  incidentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  incidentLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 12,
    marginLeft: 4,
  },
  timestamp: {
    fontSize: 12,
  },
  statusBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 32,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});