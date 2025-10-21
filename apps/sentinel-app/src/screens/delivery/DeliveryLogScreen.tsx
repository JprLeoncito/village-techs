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

type DeliveryLogScreenNavigationProp = StackNavigationProp<DeliveryStackParamList, 'DeliveryLog'>;

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

interface DeliveryStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  byType: {
    package: number;
    food: number;
    document: number;
    furniture: number;
    other: number;
  };
  byStatus: {
    pending: number;
    at_gate: number;
    handed_off: number;
    picked_up: number;
    returned: number;
  };
  averageHandoffTime: number;
  topCompanies: Array<{
    company: string;
    count: number;
  }>;
}

type FilterType = 'all' | 'today' | 'week' | 'month' | 'pending' | 'handed_off' | 'picked_up' | 'returned';

export const DeliveryLogScreen: React.FC = () => {
  const { theme } = useTheme();
  const { officer } = useAuth();
  const navigation = useNavigation<DeliveryLogScreenNavigationProp>();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState<Delivery[]>([]);
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'day' | 'week' | 'month' | 'all'>('all');

  const timeFilters: { value: typeof selectedTimeRange; label: string; icon: string }[] = [
    { value: 'day', label: 'Today', icon: 'calendar-today' },
    { value: 'week', label: 'This Week', icon: 'calendar-week' },
    { value: 'month', label: 'This Month', icon: 'calendar-month' },
    { value: 'all', label: 'All Time', icon: 'calendar-blank' },
  ];

  const statusFilters: { value: FilterType; label: string; icon: string; color: string }[] = [
    { value: 'all', label: 'All', icon: 'select-all', color: 'default' },
    { value: 'pending', label: 'Pending', icon: 'clock-outline', color: 'warning' },
    { value: 'handed_off', label: 'Handed Off', icon: 'package-check', color: 'success' },
    { value: 'picked_up', label: 'Picked Up', icon: 'check-circle', color: 'success' },
    { value: 'returned', label: 'Returned', icon: 'undo', color: 'error' },
  ];

  useEffect(() => {
    loadDeliveryData();
  }, []);

  useEffect(() => {
    filterDeliveries();
  }, [deliveries, searchQuery, selectedFilter, selectedTimeRange]);

  const loadDeliveryData = async () => {
    try {
      if (!officer?.tenantId) return;

      // Load deliveries
      const { data: deliveryData, error: deliveryError } = await supabase
        .from('deliveries')
        .select('*')
        .eq('tenant_id', officer.tenantId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (deliveryError) {
        console.error('Error loading deliveries:', deliveryError);
        return;
      }

      setDeliveries(deliveryData || []);

      // Calculate stats
      const calculatedStats = calculateDeliveryStats(deliveryData || []);
      setStats(calculatedStats);
    } catch (error) {
      console.error('Error loading delivery data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDeliveryStats = (deliveryData: Delivery[]): DeliveryStats => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const todayDeliveries = deliveryData.filter(d => new Date(d.created_at) >= today);
    const weekDeliveries = deliveryData.filter(d => new Date(d.created_at) >= weekAgo);
    const monthDeliveries = deliveryData.filter(d => new Date(d.created_at) >= monthAgo);

    const byType = {
      package: deliveryData.filter(d => d.delivery_type === 'package').length,
      food: deliveryData.filter(d => d.delivery_type === 'food').length,
      document: deliveryData.filter(d => d.delivery_type === 'document').length,
      furniture: deliveryData.filter(d => d.delivery_type === 'furniture').length,
      other: deliveryData.filter(d => d.delivery_type === 'other').length,
    };

    const byStatus = {
      pending: deliveryData.filter(d => d.status === 'pending').length,
      at_gate: deliveryData.filter(d => d.status === 'at_gate').length,
      handed_off: deliveryData.filter(d => d.status === 'handed_off').length,
      picked_up: deliveryData.filter(d => d.status === 'picked_up').length,
      returned: deliveryData.filter(d => d.status === 'returned').length,
    };

    // Calculate average handoff time
    const completedDeliveries = deliveryData.filter(d => d.handoff_timestamp && d.created_at);
    const avgHandoffTime = completedDeliveries.length > 0
      ? completedDeliveries.reduce((sum, d) => {
          const created = new Date(d.created_at);
          const handedOff = new Date(d.handoff_timestamp!);
          return sum + (handedOff.getTime() - created.getTime()) / (1000 * 60);
        }, 0) / completedDeliveries.length
      : 0;

    // Top companies
    const companyCounts = deliveryData.reduce((acc, d) => {
      acc[d.delivery_company] = (acc[d.delivery_company] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topCompanies = Object.entries(companyCounts)
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total: deliveryData.length,
      today: todayDeliveries.length,
      thisWeek: weekDeliveries.length,
      thisMonth: monthDeliveries.length,
      byType,
      byStatus,
      averageHandoffTime,
      topCompanies,
    };
  };

  const filterDeliveries = () => {
    let filtered = deliveries;

    // Apply time range filter
    if (selectedTimeRange !== 'all') {
      const now = new Date();
      let cutoffDate: Date;

      switch (selectedTimeRange) {
        case 'day':
          cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffDate = new Date(0);
      }

      filtered = filtered.filter(delivery => new Date(delivery.created_at) >= cutoffDate);
    }

    // Apply status filter
    if (selectedFilter !== 'all' && statusFilters.find(f => f.value === selectedFilter)) {
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
        delivery.unit_number?.toLowerCase().includes(query) ||
        delivery.notes?.toLowerCase().includes(query)
      );
    }

    setFilteredDeliveries(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDeliveryData();
    setRefreshing(false);
  };

  const handleDeliveryPress = (delivery: Delivery) => {
    navigation.navigate('DeliveryHandoff', { deliveryId: delivery.id });
  };

  const handleNewDelivery = () => {
    navigation.navigate('DeliveryList');
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const textStyles = {
    title: [styles.title, { color: theme.colors.text }],
    subtitle: [styles.subtitle, { color: theme.colors.muted }],
    statsLabel: [styles.statsLabel, { color: theme.colors.muted }],
    statsValue: [styles.statsValue, { color: theme.colors.text }],
    searchPlaceholder: [styles.searchPlaceholder, { color: theme.colors.muted }],
    filterLabel: [styles.filterLabel, { color: theme.colors.text }],
    noResultsText: [styles.noResultsText, { color: theme.colors.muted }],
    metricValue: [styles.metricValue, { color: theme.colors.text }],
    metricLabel: [styles.metricLabel, { color: theme.colors.muted }],
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header title="Delivery Log" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={textStyles.title}>Loading delivery data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Delivery Log" />

      {/* Stats Overview */}
      {stats && (
        <Card style={styles.statsCard} padding={16}>
          <Text style={textStyles.subtitle}>Delivery Analytics</Text>

          <View style={styles.mainStats}>
            <View style={styles.mainStatItem}>
              <Text style={textStyles.statsValue}>{stats.today}</Text>
              <Text style={textStyles.statsLabel}>Today</Text>
            </View>
            <View style={styles.mainStatItem}>
              <Text style={textStyles.statsValue}>{stats.thisWeek}</Text>
              <Text style={textStyles.statsLabel}>This Week</Text>
            </View>
            <View style={styles.mainStatItem}>
              <Text style={textStyles.statsValue}>{stats.thisMonth}</Text>
              <Text style={textStyles.statsLabel}>This Month</Text>
            </View>
            <View style={styles.mainStatItem}>
              <Text style={textStyles.statsValue}>{formatDuration(stats.averageHandoffTime)}</Text>
              <Text style={textStyles.statsLabel}>Avg. Handoff</Text>
            </View>
          </View>

          <View style={styles.secondaryStats}>
            <View style={styles.typeStats}>
              <Text style={textStyles.statsLabel}>By Type:</Text>
              <View style={styles.typeRow}>
                <View style={styles.typeItem}>
                  <Icon name="package" size={16} color={theme.colors.primary} />
                  <Text style={textStyles.statsLabel}>{stats.byType.package}</Text>
                </View>
                <View style={styles.typeItem}>
                  <Icon name="food" size={16} color={theme.colors.warning} />
                  <Text style={textStyles.statsLabel}>{stats.byType.food}</Text>
                </View>
                <View style={styles.typeItem}>
                  <Icon name="file-document" size={16} color={theme.colors.info} />
                  <Text style={textStyles.statsLabel}>{stats.byType.document}</Text>
                </View>
                <View style={styles.typeItem}>
                  <Icon name="sofa" size={16} color={theme.colors.secondary} />
                  <Text style={textStyles.statsLabel}>{stats.byType.furniture}</Text>
                </View>
              </View>
            </View>

            {stats.topCompanies.length > 0 && (
              <View style={styles.companyStats}>
                <Text style={textStyles.statsLabel}>Top Companies:</Text>
                {stats.topCompanies.map((company, index) => (
                  <View key={company.company} style={styles.companyItem}>
                    <Text style={textStyles.statsLabel}>{index + 1}. {company.company}</Text>
                    <Badge title={company.count.toString()} variant="primary" size="small" />
                  </View>
                ))}
              </View>
            )}
          </View>
        </Card>
      )}

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

        {/* Time Range Filter */}
        <View style={styles.timeFilterContainer}>
          <Text style={textStyles.filterLabel}>Time Range:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.timeFilterPills}>
              {timeFilters.map((filter) => (
                <TouchableOpacity
                  key={filter.value}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: selectedTimeRange === filter.value
                        ? theme.colors.primary
                        : theme.colors.card,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => setSelectedTimeRange(filter.value)}
                >
                  <Icon
                    name={filter.icon}
                    size={16}
                    color={selectedTimeRange === filter.value
                      ? '#ffffff'
                      : theme.colors.text
                    }
                  />
                  <Text
                    style={[
                      styles.filterPillText,
                      {
                        color: selectedTimeRange === filter.value
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

        {/* Status Filters */}
        {showFilters && (
          <View style={styles.filtersContainer}>
            <Text style={textStyles.filterLabel}>Filter by status:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterPills}>
                {statusFilters.map((filter) => (
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
        {(selectedFilter !== 'all' || selectedTimeRange !== 'all') && (
          <View style={styles.activeFilter}>
            <Text style={textStyles.subtitle}>
              Filters: {timeFilters.find(f => f.value === selectedTimeRange)?.label}
              {selectedFilter !== 'all' && ` • ${statusFilters.find(f => f.value === selectedFilter)?.label}`}
            </Text>
            <TouchableOpacity onPress={() => {
              setSelectedFilter('all');
              setSelectedTimeRange('all');
            }}>
              <Icon name="close" size={16} color={theme.colors.muted} />
            </TouchableOpacity>
          </View>
        )}
      </Card>

      {/* Quick Actions */}
      <Card style={styles.actionsCard} padding={16}>
        <Button
          title="Register New Delivery"
          onPress={handleNewDelivery}
          icon={<Icon name="plus" size={20} color="#ffffff" />}
        />
      </Card>

      {/* Deliveries List */}
      <Card style={styles.listCard} padding={16}>
        <View style={styles.listHeader}>
          <Text style={textStyles.title}>
            Delivery History
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
              {searchQuery || selectedFilter !== 'all' || selectedTimeRange !== 'all'
                ? 'No deliveries match your search criteria'
                : 'No deliveries found'
              }
            </Text>
            {searchQuery || selectedFilter !== 'all' || selectedTimeRange !== 'all' ? (
              <Text style={textStyles.subtitle}>
                Try adjusting your search or filters
              </Text>
            ) : (
              <Button
                title="Register First Delivery"
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
                showActions={false}
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
  mainStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
  },
  mainStatItem: {
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
  secondaryStats: {
    gap: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  typeStats: {
    gap: 8,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  typeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  companyStats: {
    gap: 4,
  },
  companyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  timeFilterContainer: {
    marginTop: 12,
    gap: 8,
  },
  timeFilterPills: {
    flexDirection: 'row',
    gap: 8,
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
  actionsCard: {
    margin: 16,
    marginBottom: 8,
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
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  metricLabel: {
    fontSize: 14,
  },
  searchPlaceholder: {
    fontSize: 16,
  },
});