import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Header } from '@/components/shared/Header';
import { DeliveryCard } from '@/components/lists/DeliveryCard';

type DeliveryStackParamList = {
  DeliveryList: undefined;
  DeliveryLog: undefined;
  DeliveryHandoff: {
    deliveryId: string;
  };
};

type DeliveryListScreenNavigationProp = StackNavigationProp<DeliveryStackParamList, 'DeliveryList'>;

interface Delivery {
  id: string;
  tracking_number?: string;
  delivery_company: string;
  delivery_person_name: string;
  delivery_person_contact: string;
  recipient_name: string;
  household_id: string;
  household_name: string;
  unit_number?: string;
  delivery_type: 'package' | 'food' | 'document' | 'furniture' | 'other';
  status: 'pending' | 'at_gate' | 'handed_off' | 'picked_up' | 'returned';
  special_instructions?: string;
  photos?: string[];
  notes?: string;
  gate_entry_id?: string;
  security_officer_id?: string;
  security_officer_name?: string;
  handoff_timestamp?: string;
  pickup_timestamp?: string;
  created_at: string;
  updated_at: string;
}

type FilterType = 'all' | 'pending' | 'at_gate' | 'handed_off' | 'picked_up' | 'returned';

export const DeliveryListScreen: React.FC = () => {
  const { theme } = useTheme();
  const { officer } = useAuth();
  const navigation = useNavigation<DeliveryListScreenNavigationProp>();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filters: { value: FilterType; label: string; icon: string; color: string }[] = [
    { value: 'all', label: 'All', icon: 'select-all', color: 'default' },
    { value: 'pending', label: 'Pending', icon: 'clock-outline', color: 'warning' },
    { value: 'at_gate', label: 'At Gate', icon: 'map-marker', color: 'primary' },
    { value: 'handed_off', label: 'Handed Off', icon: 'package-check', color: 'success' },
    { value: 'picked_up', label: 'Picked Up', icon: 'check-circle', color: 'success' },
    { value: 'returned', label: 'Returned', icon: 'undo', color: 'error' },
  ];

  useEffect(() => {
    loadDeliveries();
  }, []);

  useEffect(() => {
    filterDeliveries();
  }, [deliveries, searchQuery, selectedFilter]);

  const loadDeliveries = async () => {
    try {
      if (!officer?.tenantId) return;

      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('tenant_id', officer.tenantId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading deliveries:', error);
        return;
      }

      setDeliveries(data || []);
    } catch (error) {
      console.error('Error loading deliveries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterDeliveries = () => {
    let filtered = deliveries;

    // Apply filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(delivery => delivery.status === selectedFilter);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(delivery =>
        delivery.tracking_number?.toLowerCase().includes(query) ||
        delivery.delivery_company.toLowerCase().includes(query) ||
        delivery.delivery_person_name.toLowerCase().includes(query) ||
        delivery.recipient_name.toLowerCase().includes(query) ||
        delivery.household_name.toLowerCase().includes(query) ||
        delivery.unit_number?.toLowerCase().includes(query)
      );
    }

    setFilteredDeliveries(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDeliveries();
    setRefreshing(false);
  };

  const handleDeliveryPress = (delivery: Delivery) => {
    if (delivery.status === 'at_gate' || delivery.status === 'pending') {
      navigation.navigate('DeliveryHandoff', { deliveryId: delivery.id });
    } else {
      navigation.navigate('DeliveryLog');
    }
  };

  const handleNewDelivery = () => {
    // This would typically open a form to create a new delivery
    // For now, we'll navigate to the delivery log
    navigation.navigate('DeliveryLog');
  };

  const getDeliveryStats = () => {
    const today = new Date().toDateString();
    const todayDeliveries = deliveries.filter(delivery =>
      new Date(delivery.created_at).toDateString() === today
    );

    const byStatus = {
      pending: deliveries.filter(d => d.status === 'pending').length,
      at_gate: deliveries.filter(d => d.status === 'at_gate').length,
      handed_off: deliveries.filter(d => d.status === 'handed_off').length,
      picked_up: deliveries.filter(d => d.status === 'picked_up').length,
    };

    return {
      total: todayDeliveries.length,
      awaiting_handoff: deliveries.filter(d => ['pending', 'at_gate'].includes(d.status)).length,
      byStatus,
    };
  };

  const stats = getDeliveryStats();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'at_gate': return 'primary';
      case 'handed_off': return 'success';
      case 'picked_up': return 'success';
      case 'returned': return 'error';
      default: return 'default';
    }
  };

  const getDeliveryTypeIcon = (type: string) => {
    switch (type) {
      case 'package': return 'package';
      case 'food': return 'food';
      case 'document': return 'file-document';
      case 'furniture': return 'sofa';
      case 'other': return 'help-circle';
      default: return 'package';
    }
  };

  const textStyles = {
    title: [styles.title, { color: theme.colors.text }],
    subtitle: [styles.subtitle, { color: theme.colors.muted }],
    statsLabel: [styles.statsLabel, { color: theme.colors.muted }],
    statsValue: [styles.statsValue, { color: theme.colors.text }],
    searchPlaceholder: [styles.searchPlaceholder, { color: theme.colors.muted }],
    filterLabel: [styles.filterLabel, { color: theme.colors.text }],
    noResultsText: [styles.noResultsText, { color: theme.colors.muted }],
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header title="Delivery Management" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={textStyles.title}>Loading deliveries...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Delivery Management" />

      {/* Stats Overview */}
      <Card style={styles.statsCard} padding={16}>
        <Text style={textStyles.subtitle}>Today's Overview</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={textStyles.statsValue}>{stats.total}</Text>
            <Text style={textStyles.statsLabel}>Total Deliveries</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={textStyles.statsValue}>{stats.awaiting_handoff}</Text>
            <Text style={textStyles.statsLabel}>Awaiting Handoff</Text>
          </View>
        </View>
        <View style={styles.statusStats}>
          <View style={styles.statusStat}>
            <Icon name="clock-outline" size={16} color={theme.colors.warning} />
            <Text style={textStyles.statsLabel}>{stats.byStatus.pending}</Text>
          </View>
          <View style={styles.statusStat}>
            <Icon name="map-marker" size={16} color={theme.colors.primary} />
            <Text style={textStyles.statsLabel}>{stats.byStatus.at_gate}</Text>
          </View>
          <View style={styles.statusStat}>
            <Icon name="package-check" size={16} color={theme.colors.success} />
            <Text style={textStyles.statsLabel}>{stats.byStatus.handed_off}</Text>
          </View>
          <View style={styles.statusStat}>
            <Icon name="check-circle" size={16} color={theme.colors.success} />
            <Text style={textStyles.statsLabel}>{stats.byStatus.picked_up}</Text>
          </View>
        </View>
      </Card>

      {/* Quick Actions */}
      <Card style={styles.actionsCard} padding={16}>
        <View style={styles.actionsRow}>
          <Button
            title="New Delivery"
            onPress={handleNewDelivery}
            icon={<Icon name="plus" size={20} color="#ffffff" />}
          />
          <Button
            title="Scan Tracking"
            onPress={() => {/* QR/Barcode scanner */}}
            variant="outline"
            icon={<Icon name="qrcode" size={20} color={theme.colors.primary} />}
          />
        </View>
      </Card>

      {/* Search and Filter */}
      <Card style={styles.searchCard} padding={16}>
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Icon name="magnify" size={20} color={theme.colors.muted} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="Search deliveries..."
              placeholderTextColor={theme.colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            style={[styles.filterButton, { borderColor: theme.colors.border }]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Icon name="filter" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Filter Pills */}
        {showFilters && (
          <View style={styles.filtersContainer}>
            <Text style={textStyles.filterLabel}>Filter by status:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterPills}>
                {filters.map((filter) => (
                  <TouchableOpacity
                    key={filter.value}
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor: selectedFilter === filter.value
                          ? theme.colors.primary
                          : theme.colors.card,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    onPress={() => setSelectedFilter(filter.value)}
                  >
                    <Icon
                      name={filter.icon}
                      size={16}
                      color={selectedFilter === filter.value
                        ? '#ffffff'
                        : theme.colors.text
                      }
                    />
                    <Text
                      style={[
                        styles.filterPillText,
                        {
                          color: selectedFilter === filter.value
                            ? '#ffffff'
                            : theme.colors.text,
                        },
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Active Filter Display */}
        {selectedFilter !== 'all' && (
          <View style={styles.activeFilter}>
            <Text style={textStyles.subtitle}>
              Showing: {filters.find(f => f.value === selectedFilter)?.label}
            </Text>
            <TouchableOpacity onPress={() => setSelectedFilter('all')}>
              <Icon name="close" size={16} color={theme.colors.muted} />
            </TouchableOpacity>
          </View>
        )}
      </Card>

      {/* Deliveries List */}
      <Card style={styles.listCard} padding={16}>
        <View style={styles.listHeader}>
          <Text style={textStyles.title}>
            Deliveries
            {filteredDeliveries.length > 0 && ` (${filteredDeliveries.length})`}
          </Text>
          <Text style={textStyles.subtitle}>
            {filteredDeliveries.length} of {deliveries.length} deliveries
          </Text>
        </View>

        {filteredDeliveries.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="package-search" size={48} color={theme.colors.muted} />
            <Text style={textStyles.noResultsText}>
              {searchQuery || selectedFilter !== 'all'
                ? 'No deliveries match your search criteria'
                : 'No deliveries today'
              }
            </Text>
            {searchQuery || selectedFilter !== 'all' ? (
              <Text style={textStyles.subtitle}>
                Try adjusting your search or filters
              </Text>
            ) : (
              <Button
                title="Register New Delivery"
                onPress={handleNewDelivery}
                variant="outline"
                icon={<Icon name="plus" size={20} color={theme.colors.primary} />}
              />
            )}
          </View>
        ) : (
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          >
            {filteredDeliveries.map((delivery) => (
              <DeliveryCard
                key={delivery.id}
                delivery={delivery}
                onPress={() => handleDeliveryPress(delivery)}
                showActions={true}
              />
            ))}
          </ScrollView>
        )}
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 2,
  },
  statsCard: {
    margin: 16,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statsValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statsLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  statusStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  statusStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionsCard: {
    margin: 16,
    marginBottom: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  searchCard: {
    margin: 16,
    marginBottom: 8,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  filterButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersContainer: {
    marginTop: 12,
    gap: 8,
  },
  filterPills: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  activeFilter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  listCard: {
    flex: 1,
    margin: 16,
    marginTop: 8,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  searchPlaceholder: {
    fontSize: 16,
  },
});