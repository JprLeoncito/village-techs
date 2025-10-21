import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput as RNTextInput,
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
import { EntryCard } from '@/components/lists/EntryCard';
import { TextInput } from '@/components/ui/TextInput';

type EntryStackParamList = {
  EntryList: undefined;
  VehicleEntry: undefined;
  EntryLog: undefined;
  ExitLog: undefined;
  EntryDetails: {
    entryId: string;
  };
};

type ExitLogScreenNavigationProp = StackNavigationProp<EntryStackParamList, 'ExitLog'>;

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

export const ExitLogScreen: React.FC = () => {
  const { theme } = useTheme();
  const { officer } = useAuth();
  const navigation = useNavigation<ExitLogScreenNavigationProp>();

  const [activeEntries, setActiveEntries] = useState<GateEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<GateEntry[]>([]);
  const [recentExits, setRecentExits] = useState<GateEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<GateEntry | null>(null);
  const [exitNotes, setExitNotes] = useState('');
  const [isProcessingExit, setIsProcessingExit] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterEntries();
  }, [activeEntries, searchQuery]);

  const loadData = async () => {
    try {
      if (!officer?.tenantId) return;

      // Load active entries (vehicles that entered but haven't exited)
      const { data: activeData, error: activeError } = await supabase
        .from('gate_entries')
        .select('*')
        .eq('tenant_id', officer.tenantId)
        .eq('direction', 'in')
        .is('exit_timestamp', null)
        .order('entry_timestamp', { ascending: false })
        .limit(50);

      if (activeError) {
        console.error('Error loading active entries:', activeError);
        return;
      }

      setActiveEntries(activeData || []);

      // Load recent exits
      const today = new Date().toISOString().split('T')[0];
      const { data: exitData, error: exitError } = await supabase
        .from('gate_entries')
        .select('*')
        .eq('tenant_id', officer.tenantId)
        .eq('direction', 'out')
        .gte('created_at', today)
        .order('created_at', { ascending: false })
        .limit(20);

      if (exitError) {
        console.error('Error loading recent exits:', exitError);
        return;
      }

      setRecentExits(exitData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterEntries = () => {
    let filtered = activeEntries;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.vehicle_plate?.toLowerCase().includes(query) ||
        entry.household_name?.toLowerCase().includes(query) ||
        entry.visitor_name?.toLowerCase().includes(query) ||
        entry.rfid_code?.toLowerCase().includes(query)
      );
    }

    setFilteredEntries(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleEntryPress = (entry: GateEntry) => {
    setSelectedEntry(entry);
    setExitNotes('');
  };

  const handleRecordExit = async () => {
    if (!selectedEntry) return;

    try {
      setIsProcessingExit(true);

      // Get current gate
      const { data: gateData } = await supabase
        .from('security_shifts')
        .select('gate_id')
        .eq('officer_id', officer.id)
        .eq('status', 'active')
        .single();

      if (!gateData) {
        throw new Error('No active gate found');
      }

      // Update the original entry with exit timestamp
      const { error: updateError } = await supabase
        .from('gate_entries')
        .update({
          exit_timestamp: new Date().toISOString(),
        })
        .eq('id', selectedEntry.id);

      if (updateError) throw updateError;

      // Create exit entry record
      const { error: exitError } = await supabase
        .from('gate_entries')
        .insert([{
          gate_id: gateData.gate_id,
          entry_timestamp: new Date().toISOString(),
          direction: 'out',
          entry_type: selectedEntry.entry_type,
          vehicle_plate: selectedEntry.vehicle_plate,
          household_name: selectedEntry.household_name,
          visitor_name: selectedEntry.visitor_name,
          contact_number: selectedEntry.contact_number,
          linked_entry_id: selectedEntry.id,
          notes: exitNotes || null,
          security_officer_id: officer.id,
        }]);

      if (exitError) throw exitError;

      Alert.alert(
        'Exit Recorded',
        `Successfully recorded exit for ${selectedEntry.vehicle_plate}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setSelectedEntry(null);
              setExitNotes('');
              loadData();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error recording exit:', error);
      Alert.alert(
        'Error',
        'Failed to record exit. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessingExit(false);
    }
  };

  const calculateDuration = (entryTimestamp: string) => {
    const entry = new Date(entryTimestamp);
    const now = new Date();
    const diffMs = now.getTime() - entry.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h ${diffMins}m`;
    }
    return `${diffMins}m`;
  };

  const getEntryTypeColor = (type: string) => {
    switch (type) {
      case 'resident': return 'success';
      case 'guest': return 'warning';
      case 'delivery': return 'primary';
      case 'construction': return 'secondary';
      case 'visitor': return 'info';
      default: return 'primary';
    }
  };

  const textStyles = {
    title: [styles.title, { color: theme.colors.text }],
    subtitle: [styles.subtitle, { color: theme.colors.muted }],
    statsLabel: [styles.statsLabel, { color: theme.colors.muted }],
    statsValue: [styles.statsValue, { color: theme.colors.text }],
    searchPlaceholder: [styles.searchPlaceholder, { color: theme.colors.muted }],
    plateNumber: [styles.plateNumber, { color: theme.colors.text }],
    durationText: [styles.durationText, { color: theme.colors.muted }],
    exitFormTitle: [styles.exitFormTitle, { color: theme.colors.text }],
    noActiveText: [styles.noActiveText, { color: theme.colors.muted }],
    noActiveSubtext: [styles.noActiveSubtext, { color: theme.colors.muted }],
    recentTitle: [styles.recentTitle, { color: theme.colors.text }],
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header title="Exit Log" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={textStyles.title}>Loading exit data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Exit Log" />

      {/* Stats Overview */}
      <Card style={styles.statsCard} padding={16}>
        <Text style={textStyles.subtitle}>Current Status</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={textStyles.statsValue}>{filteredEntries.length}</Text>
            <Text style={textStyles.statsLabel}>Active Vehicles</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={textStyles.statsValue}>{recentExits.length}</Text>
            <Text style={textStyles.statsLabel}>Exits Today</Text>
          </View>
        </View>
      </Card>

      {/* Search */}
      <Card style={styles.searchCard} padding={16}>
        <View style={styles.searchContainer}>
          <Icon name="magnify" size={20} color={theme.colors.muted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search active vehicles..."
            placeholderTextColor={theme.colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </Card>

      {/* Selected Entry for Exit */}
      {selectedEntry && (
        <Card style={styles.selectedCard} padding={16}>
          <View style={styles.selectedHeader}>
            <Text style={textStyles.exitFormTitle}>Record Vehicle Exit</Text>
            <TouchableOpacity onPress={() => setSelectedEntry(null)}>
              <Icon name="close" size={24} color={theme.colors.muted} />
            </TouchableOpacity>
          </View>

          <View style={styles.selectedInfo}>
            <View style={styles.vehicleInfo}>
              <Icon name="car" size={20} color={theme.colors.primary} />
              <Text style={textStyles.plateNumber}>{selectedEntry.vehicle_plate}</Text>
              <Badge
                title={selectedEntry.entry_type}
                variant={getEntryTypeColor(selectedEntry.entry_type) as any}
                size="small"
              />
            </View>

            {selectedEntry.household_name && (
              <View style={styles.infoRow}>
                <Icon name="home" size={16} color={theme.colors.muted} />
                <Text style={textStyles.subtitle}>{selectedEntry.household_name}</Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Icon name="clock" size={16} color={theme.colors.muted} />
              <Text style={textStyles.subtitle}>
                Duration: {calculateDuration(selectedEntry.entry_timestamp)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Icon name="login" size={16} color={theme.colors.muted} />
              <Text style={textStyles.subtitle}>
                Entered: {new Date(selectedEntry.entry_timestamp).toLocaleTimeString()}
              </Text>
            </View>

            <TextInput
              label="Exit Notes (Optional)"
              value={exitNotes}
              onChangeText={setExitNotes}
              placeholder="Add notes about this exit..."
              multiline
              numberOfLines={3}
              style={styles.notesInput}
              leftIcon={<Icon name="text" size={20} color={theme.colors.muted} />}
            />
          </View>

          <Button
            title="Record Exit"
            onPress={handleRecordExit}
            loading={isProcessingExit}
            disabled={isProcessingExit}
            icon={<Icon name="logout" size={20} color="#ffffff" />}
          />
        </Card>
      )}

      {/* Active Vehicles */}
      <Card style={styles.activeCard} padding={16}>
        <View style={styles.sectionHeader}>
          <Text style={textStyles.title}>
            Active Vehicles ({filteredEntries.length})
          </Text>
        </View>

        {filteredEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="car-off" size={48} color={theme.colors.muted} />
            <Text style={textStyles.noActiveText}>No active vehicles</Text>
            <Text style={textStyles.noActiveSubtext}>
              {searchQuery ? 'No vehicles match your search' : 'All vehicles have exited'}
            </Text>
          </View>
        ) : (
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          >
            {filteredEntries.map((entry) => (
              <TouchableOpacity
                key={entry.id}
                style={[styles.activeItem, { borderColor: theme.colors.border }]}
                onPress={() => handleEntryPress(entry)}
              >
                <View style={styles.activeItemHeader}>
                  <View style={styles.vehicleDetails}>
                    <Icon name="car" size={20} color={theme.colors.primary} />
                    <Text style={textStyles.plateNumber}>{entry.vehicle_plate}</Text>
                    <Badge
                      title={entry.entry_type}
                      variant={getEntryTypeColor(entry.entry_type) as any}
                      size="small"
                    />
                  </View>
                  <View style={styles.durationContainer}>
                    <Icon name="clock" size={16} color={theme.colors.muted} />
                    <Text style={textStyles.durationText}>
                      {calculateDuration(entry.entry_timestamp)}
                    </Text>
                  </View>
                </View>

                {entry.household_name && (
                  <View style={styles.activeItemInfo}>
                    <Icon name="home" size={16} color={theme.colors.muted} />
                    <Text style={textStyles.subtitle}>{entry.household_name}</Text>
                  </View>
                )}

                <View style={styles.activeItemFooter}>
                  <Text style={textStyles.durationText}>
                    Entered: {new Date(entry.entry_timestamp).toLocaleTimeString()}
                  </Text>
                  <Icon name="chevron-right" size={20} color={theme.colors.muted} />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </Card>

      {/* Recent Exits */}
      {recentExits.length > 0 && (
        <Card style={styles.recentCard} padding={16}>
          <Text style={textStyles.recentTitle}>Recent Exits</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {recentExits.slice(0, 5).map((exit) => (
              <EntryCard
                key={exit.id}
                entry={exit}
                onPress={() => navigation.navigate('EntryDetails', { entryId: exit.id })}
              />
            ))}
          </ScrollView>
        </Card>
      )}
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
  searchCard: {
    margin: 16,
    marginBottom: 8,
  },
  searchContainer: {
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
  selectedCard: {
    margin: 16,
    marginBottom: 8,
  },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exitFormTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  selectedInfo: {
    gap: 12,
    marginBottom: 16,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  plateNumber: {
    fontSize: 18,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notesInput: {
    marginTop: 8,
  },
  activeCard: {
    flex: 1,
    margin: 16,
    marginTop: 8,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  noActiveText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  noActiveSubtext: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  activeItem: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  activeItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  vehicleDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    fontSize: 14,
  },
  activeItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  activeItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentCard: {
    margin: 16,
    marginTop: 8,
    maxHeight: 200,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  searchPlaceholder: {
    fontSize: 16,
  },
});