import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase, getUserHouseholdId } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';

interface Sticker {
  id: string;
  vehicle_plate: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_color: string;
  status: string;
  expiry_date: string;
  rfid_code?: string;
  member_id?: string;
}

export const StickersScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStickers();
  }, []);

  const loadStickers = async () => {
    try {
      const householdId = await getUserHouseholdId();
      if (!householdId) {
        console.warn('No household ID found');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('vehicle_stickers')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading stickers:', error);
      } else {
        setStickers(data || []);
      }
    } catch (error) {
      console.error('Error loading stickers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadStickers();
  };

  const handleRequestSticker = () => {
    navigation.navigate('StickerRequest' as any);
  };

  const handleViewDetails = (stickerId: string) => {
    navigation.navigate('StickerDetails' as any, { stickerId });
  };

  const handleRenewSticker = (sticker: Sticker) => {
    navigation.navigate('StickerRequest' as any, { renewalStickerId: sticker.id });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#10b981';
      case 'expiring':
        return '#f59e0b';
      case 'expired':
        return '#ef4444';
      case 'requested':
        return '#3b82f6';
      case 'rejected':
        return '#dc2626';
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const isExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const styles = createStyles(theme);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>Loading stickers...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Vehicle Stickers</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleRequestSticker}>
          <Text style={styles.addButtonText}>+ Request New</Text>
        </TouchableOpacity>
      </View>

      {stickers.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="directions-car" size={64} color={theme.colors.primary} />
          <Text style={styles.emptyTitle}>No Vehicle Stickers</Text>
          <Text style={styles.emptyText}>You haven't requested any vehicle stickers yet.</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={handleRequestSticker}>
            <Text style={styles.emptyButtonText}>Request Your First Sticker</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.stickersList}>
          {stickers.map((sticker) => (
            <View key={sticker.id} style={styles.stickerCard}>
              <View style={styles.stickerHeader}>
                <Text style={styles.vehiclePlate}>{sticker.vehicle_plate}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(sticker.status) }]}>
                  <Text style={styles.statusText}>{getStatusLabel(sticker.status)}</Text>
                </View>
              </View>

              <View style={styles.stickerDetails}>
                <Text style={styles.vehicleInfo}>
                  {sticker.vehicle_make} {sticker.vehicle_model}
                </Text>
                <Text style={styles.vehicleColor}>Color: {sticker.vehicle_color}</Text>
                {sticker.rfid_code && (
                  <Text style={styles.rfidCode}>RFID: {sticker.rfid_code}</Text>
                )}
              </View>

              {sticker.expiry_date && (
                <View style={styles.expirySection}>
                  <Text style={styles.expiryLabel}>Expires:</Text>
                  <Text style={[
                    styles.expiryDate,
                    isExpiringSoon(sticker.expiry_date) && styles.expiryWarning
                  ]}>
                    {formatDate(sticker.expiry_date)}
                  </Text>
                  {isExpiringSoon(sticker.expiry_date) && (
                    <Text style={styles.warningText}><MaterialIcons name="warning" size={12} color="#f59e0b" /> Expiring soon!</Text>
                  )}
                </View>
              )}

              <View style={styles.actions}>
                <TouchableOpacity style={styles.viewButton} onPress={() => handleViewDetails(sticker.id)}>
                  <Text style={styles.viewButtonText}>View Details</Text>
                </TouchableOpacity>
                {isExpiringSoon(sticker.expiry_date) && (
                  <TouchableOpacity style={styles.renewButton} onPress={() => handleRenewSticker(sticker)}>
                    <Text style={styles.renewButtonText}>Renew</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.muted,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
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
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  stickersList: {
    padding: 16,
  },
  stickerCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  stickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehiclePlate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
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
  stickerDetails: {
    marginBottom: 12,
  },
  vehicleInfo: {
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 4,
  },
  vehicleColor: {
    fontSize: 14,
    color: theme.colors.muted,
    marginBottom: 2,
  },
  rfidCode: {
    fontSize: 14,
    color: theme.colors.muted,
  },
  expirySection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginBottom: 12,
  },
  expiryLabel: {
    fontSize: 14,
    color: theme.colors.muted,
    marginRight: 8,
  },
  expiryDate: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  expiryWarning: {
    color: '#f59e0b',
  },
  warningText: {
    fontSize: 12,
    color: '#f59e0b',
    marginLeft: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  viewButton: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  viewButtonText: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  renewButton: {
    flex: 1,
    backgroundColor: theme.colors.success,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  renewButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default StickersScreen;
