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
import { GuestCard } from '../../components/lists/GuestCard';

type GuestStackParamList = {
  GuestList: undefined;
  GuestVerification: {
    guestId?: string;
  };
  WalkInGuest: undefined;
  GuestDeparture: {
    guestId: string;
  };
};

type GuestListScreenNavigationProp = StackNavigationProp<GuestStackParamList, 'GuestList'>;

interface Guest {
  id: string;
  name: string;
  contact_number: string;
  email?: string;
  purpose: string;
  expected_arrival?: string;
  expected_departure?: string;
  household_id: string;
  household_name: string;
  status: 'pending' | 'approved' | 'checked_in' | 'checked_out' | 'expired';
  qr_code?: string;
  notes?: string;
  host_name?: string;
  created_at: string;
  updated_at: string;
}

type FilterType = 'all' | 'pending' | 'approved' | 'checked_in' | 'checked_out';

export const GuestListScreen: React.FC = () => {
  const { theme } = useTheme();
  const { officer } = useAuth();
  const navigation = useNavigation<GuestListScreenNavigationProp>();

  const [guests, setGuests] = useState<Guest[]>([]);
  const [filteredGuests, setFilteredGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filters: { value: FilterType; label: string; icon: string; color: string }[] = [
    { value: 'all', label: 'All', icon: 'select-all', color: 'default' },
    { value: 'pending', label: 'Pending', icon: 'clock-outline', color: 'warning' },
    { value: 'approved', label: 'Approved', icon: 'check-circle-outline', color: 'success' },
    { value: 'checked_in', label: 'Checked In', icon: 'login', color: 'primary' },
    { value: 'checked_out', label: 'Checked Out', icon: 'logout', color: 'muted' },
  ];

  useEffect(() => {
    loadGuests();
  }, []);

  useEffect(() => {
    filterGuests();
  }, [guests, searchQuery, selectedFilter]);

  const loadGuests = async () => {
    try {
      if (!officer?.tenantId) return;

      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('tenant_id', officer.tenantId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading guests:', error);
        return;
      }

      setGuests(data || []);
    } catch (error) {
      console.error('Error loading guests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterGuests = () => {
    let filtered = guests;

    // Apply filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(guest => guest.status === selectedFilter);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(guest =>
        guest.name.toLowerCase().includes(query) ||
        guest.contact_number.toLowerCase().includes(query) ||
        guest.email?.toLowerCase().includes(query) ||
        guest.household_name.toLowerCase().includes(query) ||
        guest.purpose.toLowerCase().includes(query) ||
        guest.host_name?.toLowerCase().includes(query)
      );
    }

    setFilteredGuests(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGuests();
    setRefreshing(false);
  };

  const handleGuestPress = (guest: Guest) => {
    if (guest.status === 'pending') {
      navigation.navigate('GuestVerification', { guestId: guest.id });
    } else if (guest.status === 'approved') {
      navigation.navigate('GuestVerification', { guestId: guest.id });
    } else if (guest.status === 'checked_in') {
      navigation.navigate('GuestDeparture', { guestId: guest.id });
    } else {
      navigation.navigate('GuestVerification', { guestId: guest.id });
    }
  };

  const handleWalkInGuest = () => {
    navigation.navigate('WalkInGuest');
  };

  const getGuestStats = () => {
    const today = new Date().toDateString();
    const todayGuests = guests.filter(guest =>
      new Date(guest.created_at).toDateString() === today
    );

    const byStatus = {
      pending: guests.filter(g => g.status === 'pending').length,
      approved: guests.filter(g => g.status === 'approved').length,
      checked_in: guests.filter(g => g.status === 'checked_in').length,
      checked_out: guests.filter(g => g.status === 'checked_out').length,
    };

    return {
      total: todayGuests.length,
      active: guests.filter(g => ['approved', 'checked_in'].includes(g.status)).length,
      byStatus,
    };
  };

  const stats = getGuestStats();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'checked_in': return 'primary';
      case 'checked_out': return 'muted';
      case 'expired': return 'error';
      default: return 'default';
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
        <Header title="Guest Management" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={textStyles.title}>Loading guest list...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Guest Management" />

      {/* Stats Overview */}
      <Card style={styles.statsCard} padding={16}>
        <Text style={textStyles.subtitle}>Today's Overview</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={textStyles.statsValue}>{stats.total}</Text>
            <Text style={textStyles.statsLabel}>Total Guests</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={textStyles.statsValue}>{stats.active}</Text>
            <Text style={textStyles.statsLabel}>Active Guests</Text>
          </View>
        </View>
        <View style={styles.statusStats}>
          <View style={styles.statusStat}>
            <Icon name="clock-outline" size={16} color={theme.colors.warning} />
            <Text style={textStyles.statsLabel}>{stats.byStatus.pending}</Text>
          </View>
          <View style={styles.statusStat}>
            <Icon name="check-circle-outline" size={16} color={theme.colors.success} />
            <Text style={textStyles.statsLabel}>{stats.byStatus.approved}</Text>
          </View>
          <View style={styles.statusStat}>
            <Icon name="login" size={16} color={theme.colors.primary} />
            <Text style={textStyles.statsLabel}>{stats.byStatus.checked_in}</Text>
          </View>
          <View style={styles.statusStat}>
            <Icon name="logout" size={16} color={theme.colors.muted} />
            <Text style={textStyles.statsLabel}>{stats.byStatus.checked_out}</Text>
          </View>
        </View>
      </Card>

      {/* Quick Actions */}
      <Card style={styles.actionsCard} padding={16}>
        <View style={styles.actionsRow}>
          <Button
            title="Walk-in Guest"
            onPress={handleWalkInGuest}
            icon={<Icon name="account-plus" size={20} color="#ffffff" />}
          />
          <Button
            title="QR Scanner"
            onPress={() => {/* QR Scanner functionality */}}
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
              placeholder="Search guests..."
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

      {/* Guests List */}
      <Card style={styles.listCard} padding={16}>
        <View style={styles.listHeader}>
          <Text style={textStyles.title}>
            Guest List
            {filteredGuests.length > 0 && ` (${filteredGuests.length})`}
          </Text>
          <Text style={textStyles.subtitle}>
            {filteredGuests.length} of {guests.length} guests
          </Text>
        </View>

        {filteredGuests.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="account-search" size={48} color={theme.colors.muted} />
            <Text style={textStyles.noResultsText}>
              {searchQuery || selectedFilter !== 'all'
                ? 'No guests match your search criteria'
                : 'No guests registered today'
              }
            </Text>
            {searchQuery || selectedFilter !== 'all' ? (
              <Text style={textStyles.subtitle}>
                Try adjusting your search or filters
              </Text>
            ) : (
              <Button
                title="Register Walk-in Guest"
                onPress={handleWalkInGuest}
                variant="outline"
                icon={<Icon name="account-plus" size={20} color={theme.colors.primary} />}
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
            {filteredGuests.map((guest) => (
              <GuestCard
                key={guest.id}
                guest={guest}
                onPress={() => handleGuestPress(guest)}
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