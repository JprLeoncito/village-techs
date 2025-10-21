import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { supabase, getUserHouseholdId } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';


import { MaterialIcons } from '@expo/vector-icons';

interface Delivery {
  id: string;
  delivery_company: string;
  tracking_number?: string;
  arrival_timestamp: string;
  status: string;
  received_at?: string;
  notes?: string;
}

export const DeliveriesScreen: React.FC = () => {
  const { theme } = useTheme();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDeliveries();
  }, []);

  const loadDeliveries = async () => {
    try {
      const householdId = await getUserHouseholdId();
      if (!householdId) {
        console.warn('No household ID found');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('household_id', householdId)
        .order('arrival_timestamp', { ascending: false });

      if (error) {
        console.error('Error loading deliveries:', error);
      } else {
        setDeliveries(data || []);
      }
    } catch (error) {
      console.error('Error loading deliveries:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDeliveries();
  };

  const handleMarkReceived = async (deliveryId: string) => {
    Alert.alert(
      'Confirm Receipt',
      'Have you received this delivery?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('deliveries')
                .update({
                  status: 'received',
                  received_at: new Date().toISOString(),
                })
                .eq('id', deliveryId);

              if (error) {
                Alert.alert('Error', 'Failed to mark delivery as received');
              } else {
                Alert.alert('Success', 'Delivery marked as received');
                loadDeliveries();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to update delivery status');
            }
          },
        },
      ]
    );
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const styles = createStyles(theme);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>Loading deliveries...</Text>
      </View>
    );
  }

  const pendingDeliveries = deliveries.filter(d => d.status === 'pending');
  const receivedDeliveries = deliveries.filter(d => d.status === 'received');

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Pending Deliveries */}
      {pendingDeliveries.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📦 Awaiting Pickup ({pendingDeliveries.length})</Text>
          {pendingDeliveries.map((delivery) => (
            <View key={delivery.id} style={styles.deliveryCard}>
              <View style={styles.deliveryHeader}>
                <Text style={styles.companyName}>{delivery.delivery_company}</Text>
                <View style={[styles.statusBadge, { backgroundColor: '#3b82f6' }]}>
                  <Text style={styles.statusText}>Pending</Text>
                </View>
              </View>

              <View style={styles.deliveryDetails}>
                {delivery.tracking_number && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Tracking:</Text>
                    <Text style={styles.detailValue}>{delivery.tracking_number}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Arrived:</Text>
                  <Text style={styles.detailValue}>{formatDateTime(delivery.arrival_timestamp)}</Text>
                </View>
                {delivery.notes && (
                  <View style={styles.notesRow}>
                    <Text style={styles.notesLabel}>Notes:</Text>
                    <Text style={styles.notesText}>{delivery.notes}</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.receiveButton}
                onPress={() => handleMarkReceived(delivery.id)}
              >
                <Text style={styles.receiveButtonText}>✓ Mark as Received</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Received Deliveries */}
      {receivedDeliveries.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✅ Received ({receivedDeliveries.length})</Text>
          {receivedDeliveries.map((delivery) => (
            <View key={delivery.id} style={[styles.deliveryCard, { backgroundColor: '#f9fafb' }]}>
              <View style={styles.deliveryHeader}>
                <Text style={styles.companyName}>{delivery.delivery_company}</Text>
                <View style={[styles.statusBadge, { backgroundColor: '#10b981' }]}>
                  <Text style={styles.statusText}>Received</Text>
                </View>
              </View>

              <View style={styles.deliveryDetails}>
                {delivery.tracking_number && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Tracking:</Text>
                    <Text style={styles.detailValue}>{delivery.tracking_number}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Arrived:</Text>
                  <Text style={styles.detailValue}>{formatDateTime(delivery.arrival_timestamp)}</Text>
                </View>
                {delivery.received_at && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Received:</Text>
                    <Text style={[styles.detailValue, { color: '#10b981' }]}>
                      {formatDateTime(delivery.received_at)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {deliveries.length === 0 && (
        <View style={styles.emptyState}>
          <MaterialIcons name="local-shipping" size={64} color="#8b5cf6" />
          <Text style={styles.emptyTitle}>No Deliveries</Text>
          <Text style={styles.emptyText}>You have no package deliveries at this time.</Text>
        </View>
      )}
    </ScrollView>
  );
};

const createStyles = (theme: any) => {
  // Provide fallback values if theme or theme.colors is undefined
  const colors = theme?.colors || {};
  const isDark = theme?.dark || false;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background || '#f9fafb',
    },
    centerContent: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
      color: colors.muted || '#6b7280',
    },
    header: {
      padding: 20,
      backgroundColor: colors.card || '#ffffff',
      borderBottomWidth: 1,
      borderBottomColor: colors.border || '#e5e7eb',
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text || '#1f2937',
    },
    section: {
      padding: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text || '#1f2937',
      marginBottom: 12,
    },
    deliveryCard: {
      backgroundColor: colors.card || '#ffffff',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    receivedCard: {
      backgroundColor: isDark ? '#374151' : '#f9fafb',
    },
    deliveryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    companyName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text || '#1f2937',
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '600',
    },
    deliveryDetails: {
      marginBottom: 12,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    detailLabel: {
      fontSize: 14,
      color: colors.muted || '#6b7280',
    },
    detailValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text || '#1f2937',
    },
    notesRow: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border || '#e5e7eb',
    },
    notesLabel: {
      fontSize: 14,
      color: colors.muted || '#6b7280',
      marginBottom: 4,
    },
    notesText: {
      fontSize: 14,
      color: colors.text || '#1f2937',
    },
    receiveButton: {
      backgroundColor: colors.primary || '#10b981',
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    receiveButtonText: {
      color: '#ffffff',
      fontWeight: '600',
      fontSize: 16,
    },
    emptyState: {
      padding: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyIcon: {
      fontSize: 64,
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text || '#1f2937',
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      color: colors.muted || '#6b7280',
      textAlign: 'center',
    },
  });
};

export default DeliveriesScreen;
