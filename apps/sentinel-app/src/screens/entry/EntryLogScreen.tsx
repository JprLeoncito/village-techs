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
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Header } from '../../components/shared/Header';
import { EntryCard } from '../../components/lists/EntryCard';

type EntryStackParamList = {
  EntryList: undefined;
  VehicleEntry: undefined;
  EntryLog: undefined;
  ExitLog: undefined;
  EntryDetails: {
    entryId: string;
  };
};

type EntryLogScreenNavigationProp = StackNavigationProp<EntryStackParamList, 'EntryLog'>;

interface GateEntry {
  id: string;
  entry_timestamp: string;
  exit_timestamp?: string;
  direction: 'in' | 'out';
  entry_type: 'resident' | 'guest' | 'delivery' | 'construction' | 'visitor';
  vehicle_plate?: string;
  rfid_code?: string;
  household_name?: string;
  visitor_name?: string;
  contact_number?: string;
  purpose?: string;
  photos?: string[];
  notes?: string;
  security_officer_id: string;
  security_officer_name?: string;
  gate_name?: string;
  linked_entry_id?: string;
  created_at: string;
}

type FilterType = 'all' | 'in' | 'out' | 'resident' | 'guest' | 'delivery' | 'construction' | 'visitor';

export const EntryLogScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<EntryLogScreenNavigationProp>();

  // Real data will be fetched from API
  const [entries, setEntries] = useState<GateEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<GateEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filters: { value: FilterType; label: string; icon: string }[] = [
    { value: 'all', label: 'All', icon: 'select-all' },
    { value: 'in', label: 'Entry Only', icon: 'login' },
    { value: 'out', label: 'Exit Only', icon: 'logout' },
    { value: 'resident', label: 'Residents', icon: 'home' },
    { value: 'guest', label: 'Guests', icon: 'account-group' },
    { value: 'delivery', label: 'Deliveries', icon: 'package' },
    { value: 'construction', label: 'Construction', icon: 'hard-hat' },
    { value: 'visitor', label: 'Visitors', icon: 'account' },
  ];

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    filterEntries();
  }, [entries, searchQuery, selectedFilter]);

  const loadEntries = async () => {
    try {
      // Real data will be fetched from API
      // For now, keeping empty state
      setEntries([]);
    } catch (error) {
      console.error('Error loading entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterEntries = () => {
    let filtered = entries;

    // Apply filter
    if (selectedFilter !== 'all') {
      if (selectedFilter === 'in') {
        filtered = filtered.filter(entry => entry.direction === 'in' && !entry.exit_timestamp);
      } else if (selectedFilter === 'out') {
        filtered = filtered.filter(entry => entry.direction === 'out');
      } else {
        filtered = filtered.filter(entry => entry.entry_type === selectedFilter);
      }
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.vehicle_plate?.toLowerCase().includes(query) ||
        entry.household_name?.toLowerCase().includes(query) ||
        entry.visitor_name?.toLowerCase().includes(query) ||
        entry.rfid_code?.toLowerCase().includes(query) ||
        entry.notes?.toLowerCase().includes(query)
      );
    }

    setFilteredEntries(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEntries();
    setRefreshing(false);
  };

  const handleEntryPress = (entry: GateEntry) => {
    navigation.navigate('EntryDetails', { entryId: entry.id });
  };

  const getEntryStats = () => {
    const today = new Date().toDateString();
    const todayEntries = entries.filter(entry =>
      new Date(entry.entry_timestamp).toDateString() === today
    );

    const activeVehicles = todayEntries.filter(entry =>
      entry.direction === 'in' && !entry.exit_timestamp
    );

    const byType = {
      resident: todayEntries.filter(e => e.entry_type === 'resident').length,
      guest: todayEntries.filter(e => e.entry_type === 'guest').length,
      delivery: todayEntries.filter(e => e.entry_type === 'delivery').length,
      construction: todayEntries.filter(e => e.entry_type === 'construction').length,
      visitor: todayEntries.filter(e => e.entry_type === 'visitor').length,
    };

    return {
      total: todayEntries.length,
      active: activeVehicles.length,
      byType,
    };
  };

  const stats = getEntryStats();

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
        <Header title="Entry Log" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={textStyles.title}>Loading entry logs...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Entry Log" />

      {/* Stats Overview */}
      <Card style={styles.statsCard} padding={16}>
        <Text style={textStyles.subtitle}>Today's Overview</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={textStyles.statsValue}>{stats.total}</Text>
            <Text style={textStyles.statsLabel}>Total Entries</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={textStyles.statsValue}>{stats.active}</Text>
            <Text style={textStyles.statsLabel}>Active Vehicles</Text>
          </View>
        </View>
        <View style={styles.typeStats}>
          <View style={styles.typeStat}>
            <Icon name="home" size={16} color={theme.colors.success} />
            <Text style={textStyles.statsLabel}>{stats.byType.resident}</Text>
          </View>
          <View style={styles.typeStat}>
            <Icon name="account-group" size={16} color={theme.colors.warning} />
            <Text style={textStyles.statsLabel}>{stats.byType.guest}</Text>
          </View>
          <View style={styles.typeStat}>
            <Icon name="package" size={16} color={theme.colors.primary} />
            <Text style={textStyles.statsLabel}>{stats.byType.delivery}</Text>
          </View>
          <View style={styles.typeStat}>
            <Icon name="hard-hat" size={16} color={theme.colors.secondary} />
            <Text style={textStyles.statsLabel}>{stats.byType.construction}</Text>
          </View>
          <View style={styles.typeStat}>
            <Icon name="account" size={16} color={theme.colors.info} />
            <Text style={textStyles.statsLabel}>{stats.byType.visitor}</Text>
          </View>
        </View>
      </Card>

      {/* Search and Filter */}
      <Card style={styles.searchCard} padding={16}>
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Icon name="magnify" size={20} color={theme.colors.muted} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="Search by plate, name, RFID..."
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
            <Text style={textStyles.filterLabel}>Filter by:</Text>
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

      {/* Entries List */}
      <Card style={styles.listCard} padding={16}>
        <View style={styles.listHeader}>
          <Text style={textStyles.title}>
            Entry History
            {filteredEntries.length > 0 && ` (${filteredEntries.length})`}
          </Text>
          <Text style={textStyles.subtitle}>
            {filteredEntries.length} of {entries.length} entries
          </Text>
        </View>

        {filteredEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="text-search" size={48} color={theme.colors.muted} />
            <Text style={textStyles.noResultsText}>
              {searchQuery || selectedFilter !== 'all'
                ? 'No entries match your search criteria'
                : 'No entries recorded today'
              }
            </Text>
            {searchQuery || selectedFilter !== 'all' ? (
              <Text style={textStyles.subtitle}>
                Try adjusting your search or filters
              </Text>
            ) : (
              <Text style={textStyles.subtitle}>
                Start by recording vehicle entries
              </Text>
            )}
          </View>
        ) : (
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          >
            {filteredEntries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onPress={() => handleEntryPress(entry)}
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
  typeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  typeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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

export default EntryLogScreen;