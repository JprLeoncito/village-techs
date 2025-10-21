import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { useHousehold } from '../../hooks/useHousehold';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { Button } from '../../ui/Button';
import { Avatar } from '../../ui/Avatar';
import { VehicleSticker, StickerFilter } from '../../../types/stickers';

interface StickerListProps {
  onStickerPress?: (sticker: VehicleSticker) => void;
  onRequestNewSticker?: () => void;
  filter?: StickerFilter;
  showSearch?: boolean;
  showStats?: boolean;
  maxItems?: number;
}

export const StickerList: React.FC<StickerListProps> = ({
  onStickerPress,
  onRequestNewSticker,
  filter,
  showSearch = true,
  showStats = true,
  maxItems,
}) => {
  const { household } = useHousehold();
  const [stickers, setStickers] = useState<VehicleSticker[]>([]);
  const [filteredStickers, setFilteredStickers] = useState<VehicleSticker[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  useEffect(() => {
    loadStickers();
  }, [household?.id, filter]);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [stickers, searchQuery, selectedFilter, filter]);

  const loadStickers = async () => {
    if (!household?.id) return;

    try {
      setLoading(true);

      // Import stickerService dynamically to avoid circular dependencies
      const { stickerService } = await import('../../../services/stickerService');

      const result = await stickerService.getHouseholdStickers(household.id, filter);

      if (result.success && result.data) {
        let data = result.data;

        // Apply max items limit if specified
        if (maxItems && maxItems > 0) {
          data = data.slice(0, maxItems);
        }

        setStickers(data);
      } else {
        console.error('Failed to load stickers:', result.error);
        Alert.alert('Error', 'Failed to load vehicle stickers');
      }
    } catch (error) {
      console.error('Load stickers error:', error);
      Alert.alert('Error', 'Failed to load vehicle stickers');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStickers();
    setRefreshing(false);
  };

  const applyFiltersAndSearch = () => {
    let filtered = [...stickers];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(sticker =>
        sticker.license_plate.toLowerCase().includes(query) ||
        sticker.vehicle_make.toLowerCase().includes(query) ||
        sticker.vehicle_model.toLowerCase().includes(query) ||
        sticker.vehicle_color.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(sticker => sticker.status === selectedFilter);
    }

    // Apply external filter
    if (filter?.status) {
      filtered = filtered.filter(sticker => sticker.status === filter.status);
    }
    if (filter?.vehicle_type) {
      filtered = filtered.filter(sticker => sticker.vehicle_type === filter.vehicle_type);
    }
    if (filter?.search) {
      const query = filter.search.toLowerCase();
      filtered = filtered.filter(sticker =>
        sticker.license_plate.toLowerCase().includes(query) ||
        sticker.vehicle_make.toLowerCase().includes(query) ||
        sticker.vehicle_model.toLowerCase().includes(query)
      );
    }

    setFilteredStickers(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'approved':
        return '#10b981';
      case 'issued':
        return '#3b82f6';
      case 'rejected':
        return '#ef4444';
      case 'expired':
        return '#6b7280';
      case 'revoked':
        return '#991b1b';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'ó';
      case 'approved':
        return '';
      case 'issued':
        return '=—';
      case 'rejected':
        return 'L';
      case 'expired':
        return 'ð';
      case 'revoked':
        return '=«';
      default:
        return 'S';
    }
  };

  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType) {
      case 'car':
        return '=—';
      case 'motorcycle':
        return '<Í';
      case 'bicycle':
        return '=²';
      case 'electric_bike':
        return '=ô';
      case 'other':
        return '=';
      default:
        return '=—';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isExpired = (sticker: VehicleSticker) => {
    if (!sticker.expiry_date) return false;
    return new Date(sticker.expiry_date) < new Date();
  };

  const getStats = () => {
    const total = stickers.length;
    const pending = stickers.filter(s => s.status === 'pending').length;
    const active = stickers.filter(s => s.status === 'issued' && !isExpired(s)).length;
    const expired = stickers.filter(s => s.status === 'expired' || isExpired(s)).length;

    return { total, pending, active, expired };
  };

  const renderStickerItem = ({ item: sticker }: { item: VehicleSticker }) => {
    const statusColor = getStatusColor(sticker.status);
    const vehicleIcon = getVehicleIcon(sticker.vehicle_type);
    const statusIcon = getStatusIcon(sticker.status);

    return (
      <TouchableOpacity
        style={styles.stickerItem}
        onPress={() => onStickerPress?.(sticker)}
        activeOpacity={0.7}
      >
        <View style={styles.stickerHeader}>
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleIcon}>{vehicleIcon}</Text>
            <View style={styles.vehicleDetails}>
              <Text style={styles.vehicleName}>
                {sticker.vehicle_make} {sticker.vehicle_model}
              </Text>
              <Text style={styles.vehicleMeta}>
                {sticker.vehicle_color} " {sticker.license_plate}
              </Text>
            </View>
          </View>
          <Badge
            text={`${statusIcon} ${sticker.status}`}
            backgroundColor={statusColor}
            size="sm"
          />
        </View>

        <View style={styles.stickerDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type:</Text>
            <Text style={styles.detailValue}>
              {sticker.vehicle_type.charAt(0).toUpperCase() + sticker.vehicle_type.slice(1)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Requested:</Text>
            <Text style={styles.detailValue}>{formatDate(sticker.created_at)}</Text>
          </View>

          {sticker.issued_date && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Issued:</Text>
              <Text style={styles.detailValue}>{formatDate(sticker.issued_date)}</Text>
            </View>
          )}

          {sticker.expiry_date && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Expires:</Text>
              <Text
                style={[
                  styles.detailValue,
                  isExpired(sticker) && styles.expiredText,
                ]}
              >
                {formatDate(sticker.expiry_date)}
                {isExpired(sticker) && ' (Expired)'}
              </Text>
            </View>
          )}

          {sticker.sticker_number && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Sticker #:</Text>
              <Text style={styles.detailValue}>{sticker.sticker_number}</Text>
            </View>
          )}
        </View>

        {sticker.status === 'rejected' && sticker.rejection_reason && (
          <View style={styles.rejectionReason}>
            <Text style={styles.rejectionLabel}>Reason:</Text>
            <Text style={styles.rejectionText}>{sticker.rejection_reason}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const filterOptions = [
    { value: 'all', label: 'All', count: stickers.length },
    { value: 'pending', label: 'Pending', count: stickers.filter(s => s.status === 'pending').length },
    { value: 'approved', label: 'Approved', count: stickers.filter(s => s.status === 'approved').length },
    { value: 'issued', label: 'Issued', count: stickers.filter(s => s.status === 'issued').length },
    { value: 'expired', label: 'Expired', count: stickers.filter(s => s.status === 'expired' || isExpired(s)).length },
  ];

  const stats = getStats();

  if (loading && stickers.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size="large" />
        <Text style={styles.loadingText}>Loading vehicle stickers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats Section */}
      {showStats && (
        <Card style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.active}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.pending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.expired}</Text>
              <Text style={styles.statLabel}>Expired</Text>
            </View>
          </View>
        </Card>
      )}

      {/* Search and Filter */}
      {showSearch && (
        <Card style={styles.filterCard}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by plate, make, or model..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.filterContainer}>
            <Text style={styles.filterLabel}>Status:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
            >
              {filterOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterChip,
                    selectedFilter === option.value && styles.selectedFilterChip,
                  ]}
                  onPress={() => setSelectedFilter(option.value)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedFilter === option.value && styles.selectedFilterChipText,
                    ]}
                  >
                    {option.label} ({option.count})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Card>
      )}

      {/* Sticker List */}
      {filteredStickers.length === 0 ? (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>=—</Text>
            <Text style={styles.emptyTitle}>
              {searchQuery.trim() || selectedFilter !== 'all'
                ? 'No stickers found'
                : 'No vehicle stickers yet'
              }
            </Text>
            <Text style={styles.emptyMessage}>
              {searchQuery.trim() || selectedFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Request your first vehicle sticker to get started'
              }
            </Text>
            {!searchQuery.trim() && selectedFilter === 'all' && onRequestNewSticker && (
              <Button
                title="Request New Sticker"
                onPress={onRequestNewSticker}
                style={styles.emptyButton}
              />
            )}
          </View>
        </Card>
      ) : (
        <FlatList
          data={filteredStickers}
          renderItem={renderStickerItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Request New Sticker Button */}
      {filteredStickers.length > 0 && onRequestNewSticker && (
        <View style={styles.requestButtonContainer}>
          <Button
            title="Request New Sticker"
            onPress={onRequestNewSticker}
            style={styles.requestButton}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  statsCard: {
    margin: 16,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  filterCard: {
    margin: 16,
    marginTop: 8,
    padding: 16,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  filterContainer: {
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    marginRight: 8,
  },
  selectedFilterChip: {
    backgroundColor: '#3b82f6',
  },
  filterChipText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  selectedFilterChipText: {
    color: '#ffffff',
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  stickerItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  stickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  vehicleIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  vehicleDetails: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  vehicleMeta: {
    fontSize: 14,
    color: '#6b7280',
  },
  stickerDetails: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  expiredText: {
    color: '#ef4444',
    fontWeight: '600',
  },
  rejectionReason: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  rejectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: 14,
    color: '#7f1d1d',
  },
  emptyCard: {
    margin: 16,
    padding: 32,
  },
  emptyContainer: {
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 8,
  },
  requestButtonContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  requestButton: {
    backgroundColor: '#10b981',
  },
});

export default StickerList;