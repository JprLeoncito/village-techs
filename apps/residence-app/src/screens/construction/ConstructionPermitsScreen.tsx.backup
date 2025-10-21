import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme, Theme } from '../../contexts/ThemeContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { FAB } from '../../components/ui/FAB';
import constructionPermitService, { PermitFilter, ConstructionPermit } from '../../services/constructionPermitService';
import { MaterialIcons } from '@expo/vector-icons';
import { formatDistanceToNow, formatDate } from '../../lib/dateUtils';
import networkStatus from '../../lib/networkStatus';
import ConstructionPermitForm from './ConstructionPermitForm';
import ConstructionWorkerPassScreen from './ConstructionWorkerPassScreen';

interface FilterTab {
  key: 'all' | 'pending' | 'approved' | 'in_progress' | 'completed' | 'rejected';
  label: string;
  icon: string;
  color: string;
}

const ConstructionPermitsScreen: React.FC = () => {
  const { householdId } = useAuth();
  const { theme } = useTheme();
  const [permits, setPermits] = useState<ConstructionPermit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab['key']>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPermitForm, setShowPermitForm] = useState(false);
  const [showWorkerPassScreen, setShowWorkerPassScreen] = useState(false);
  const [selectedPermit, setSelectedPermit] = useState<ConstructionPermit | null>(null);
  const styles = createStyles(theme);

  const filterTabs: FilterTab[] = [
    { key: 'all', label: 'All', icon: 'content-paste', color: theme.colors.muted },
    { key: 'pending', label: 'Pending', icon: 'hourglass-empty', color: theme.colors.warning },
    { key: 'approved', label: 'Approved', icon: 'check-circle', color: theme.colors.success },
    { key: 'in_progress', label: 'In Progress', icon: 'build', color: theme.colors.primary },
    { key: 'completed', label: 'Completed', icon: 'done-all', color: theme.colors.success },
    { key: 'rejected', label: 'Rejected', icon: 'cancel', color: theme.colors.error },
  ];

  useEffect(() => {
    if (householdId) {
      loadPermits();
    }
  }, [householdId, activeFilter, searchQuery]);

  const loadPermits = async () => {
    if (!householdId) {
      console.log('❌ No householdId available');
      setError('No household associated with your account');
      return;
    }

    // Check network status
    if (!networkStatus.isConnected()) {
      console.log('❌ No network connection');
      setError('No network connection. Please check your internet connection.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Loading permits for household:', householdId);

      const filter: PermitFilter = {
        ...(activeFilter !== 'all' && { status: activeFilter }),
        ...(searchQuery && { search: searchQuery }),
        sortBy: 'created_at' as const,
        sortOrder: 'desc' as const,
      };

      const permitData = await constructionPermitService.getPermits(householdId, filter);
      console.log('✅ Successfully loaded permits:', permitData.length);
      setPermits(permitData);

      // Clear error if we successfully loaded data (even if empty)
      // No permits is a valid state, not an error
      setError(null);
    } catch (error) {
      console.error('❌ Error loading permits:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load construction permits';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPermits();
  };

  const handleNewPermit = () => {
    setShowPermitForm(true);
  };

  const handlePermitSubmitted = (permit: ConstructionPermit) => {
    loadPermits();
  };

  const handleScheduleWorkerPass = (permit: ConstructionPermit) => {
    setSelectedPermit(permit);
    setShowWorkerPassScreen(true);
  };

  const handleCancelPermit = async (permitId: string) => {
    Alert.alert(
      'Cancel Permit Request',
      'Are you sure you want to cancel this permit request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await constructionPermitService.cancelPermitRequest(permitId);
              if (result.success) {
                Alert.alert('Success', 'Permit request cancelled successfully');
                loadPermits();
              } else {
                Alert.alert('Error', result.error || 'Failed to cancel request');
              }
            } catch (error) {
              console.error('Failed to cancel permit:', error);
              Alert.alert('Error', 'Failed to cancel permit request');
            }
          },
        },
      ]
    );
  };

  const handlePayRoadFee = async (permitId: string, amount: number) => {
    Alert.alert(
      'Pay Road Fee',
      `Road fee of $${amount.toFixed(2)} needs to be paid for this permit. A fee entry will be created and you can pay it in the Fees section.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create Fee Entry',
          style: 'default',
          onPress: async () => {
            try {
              // Create fee entry for construction permit
              const result = await constructionPermitService.createRoadFeeEntry(permitId, householdId, amount);

              if (result.success) {
                Alert.alert(
                  'Fee Created',
                  'A road fee entry has been created for your construction permit. Please go to the Fees tab to complete the payment. After successful payment, the permit status will automatically update to "In Progress".',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        loadPermits(); // Refresh permits to show updated status
                      },
                    },
                  ]
                );
              } else {
                Alert.alert('Error', result.error || 'Failed to create fee entry');
              }
            } catch (error) {
              console.error('Failed to create road fee entry:', error);
              Alert.alert('Error', 'Failed to create road fee entry');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: ConstructionPermit['status']) => {
    switch (status) {
      case 'pending':
        return theme.colors.warning;
      case 'approved':
        return theme.colors.success;
      case 'rejected':
        return theme.colors.error;
      case 'in_progress':
        return theme.colors.primary;
      case 'completed':
        return theme.colors.success;
      default:
        return theme.colors.muted;
    }
  };

  const getStatusIcon = (status: ConstructionPermit['status']): keyof typeof MaterialIcons.glyphMap => {
    switch (status) {
      case 'pending':
        return 'hourglass-empty';
      case 'approved':
        return 'check-circle';
      case 'rejected':
        return 'cancel';
      case 'in_progress':
        return 'build';
      case 'completed':
        return 'done-all';
      default:
        return 'help';
    }
  };

  
  const getStats = () => {
    const total = permits.length;
    const pending = permits.filter(p => p.status === 'pending').length;
    const approved = permits.filter(p => p.status === 'approved').length;
    const inProgress = permits.filter(p => p.status === 'in_progress').length;
    const completed = permits.filter(p => p.status === 'completed').length;
    const rejected = permits.filter(p => p.status === 'rejected').length;

    return { total, pending, approved, inProgress, completed, rejected };
  };

  const stats = getStats();
  const filteredPermits = activeFilter === 'all'
    ? permits
    : permits.filter(permit => permit.status === activeFilter);

  const renderPermitItem = (permit: ConstructionPermit) => (
    <TouchableOpacity
      key={permit.id}
      style={styles.permitItem}
      onPress={() => {
        Alert.alert(
          'Construction Permit Details',
          `${permit.project_description}\n\nContractor: ${permit.contractor_name}${permit.contractor_contact ? `\nContact: ${permit.contractor_contact}` : ''}${permit.estimated_worker_count ? `\nWorkers: ${permit.estimated_worker_count}` : ''}\nDuration: ${formatDate(permit.project_start_date)} - ${formatDate(permit.project_end_date)}\nStatus: ${permit.status.replace('-', ' ').toUpperCase()}`,
          [{ text: 'OK', style: 'default' }]
        );
      }}
    >
      <View style={styles.permitHeader}>
        <View style={styles.permitInfo}>
          <Text style={styles.permitTitle} numberOfLines={2}>
            {permit.project_description}
          </Text>
          <View style={styles.permitMeta}>
            <MaterialIcons
              name="business"
              size={14}
              color={theme.colors.muted}
              style={styles.permitIcon}
            />
            <Text style={styles.contractorName}>{permit.contractor_name}</Text>
          </View>
        </View>
        <View style={styles.permitStatusContainer}>
          <View
            style={[styles.statusBadge, { backgroundColor: getStatusColor(permit.status) }]}
          >
            <Text style={styles.statusText}>
              {permit.status.replace('-', ' ').toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.permitDetails}>
        <View style={styles.detailRow}>
          <MaterialIcons name="event" size={16} color={theme.colors.muted} />
          <Text style={styles.detailValue}>
            {formatDate(permit.project_start_date)} - {formatDate(permit.project_end_date)}
          </Text>
        </View>

        {permit.estimated_worker_count && (
          <View style={styles.detailRow}>
            <MaterialIcons name="people" size={16} color={theme.colors.muted} />
            <Text style={styles.detailValue}>
              Estimated Workers: {permit.estimated_worker_count}
            </Text>
          </View>
        )}

        {permit.road_fee_amount && (
          <View style={styles.detailRow}>
            <MaterialIcons
              name={permit.road_fee_paid ? "payments" : "payment"}
              size={16}
              color={permit.road_fee_paid ? theme.colors.success : theme.colors.warning}
            />
            <Text style={[
              styles.detailValue,
              { color: permit.road_fee_paid ? theme.colors.success : theme.colors.warning }
            ]}>
              Road Fee: ${permit.road_fee_amount.toFixed(2)}
              {permit.road_fee_paid ? ' (Paid)' : ' (Pending)'}
            </Text>
          </View>
        )}

        {permit.rejection_reason && (
          <View style={styles.detailRow}>
            <MaterialIcons name="error" size={16} color={theme.colors.error} />
            <Text style={[styles.detailValue, { color: theme.colors.error }]}>
              {permit.rejection_reason}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.permitFooter}>
        <View style={styles.statusContainer}>
          <MaterialIcons
            name={getStatusIcon(permit.status)}
            size={16}
            color={getStatusColor(permit.status)}
          />
          <Text style={styles.statusText}>
            {permit.status === 'pending' && 'Request submitted'}
            {permit.status === 'approved' && 'Permit approved'}
            {permit.status === 'rejected' && 'Request rejected'}
            {permit.status === 'in_progress' && 'Construction in progress'}
            {permit.status === 'completed' && 'Project completed'}
          </Text>
          <Text style={styles.timeAgo}>
            {formatDistanceToNow(new Date(permit.created_at), { addSuffix: true })}
          </Text>
        </View>

        <View style={styles.actionButtons}>
          {permit.status === 'pending' && (
            <Button
              variant="outline"
              size="sm"
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => handleCancelPermit(permit.id)}
            >
              <MaterialIcons name="cancel" size={16} color={theme.colors.error} />
              <Text style={[styles.actionButtonText, styles.cancelButtonText]}>Cancel</Text>
            </Button>
          )}

          {permit.status === 'approved' && !permit.road_fee_paid && permit.road_fee_amount && (
            <Button
              variant="outline"
              size="sm"
              style={[styles.actionButton, styles.payButton]}
              onPress={() => handlePayRoadFee(permit.id, permit.road_fee_amount!)}
            >
              <MaterialIcons name="payment" size={16} color={theme.colors.success} />
              <Text style={[styles.actionButtonText, styles.payButtonText]}>Pay Fee</Text>
            </Button>
          )}

          {(permit.status === 'approved' || permit.status === 'in_progress') && (
            <Button
              variant="outline"
              size="sm"
              style={[styles.actionButton, styles.workerPassButton]}
              onPress={() => handleScheduleWorkerPass(permit)}
            >
              <MaterialIcons name="engineering" size={16} color={theme.colors.primary} />
              <Text style={[styles.actionButtonText, styles.workerPassButtonText]}>Worker Pass</Text>
            </Button>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialIcons name="construction" size={48} color={theme.colors.muted} />
        <Text style={styles.loadingText}>Loading construction permits...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={20} color={theme.colors.muted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search permits..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={theme.colors.muted}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="clear" size={20} color={theme.colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statNumber}>{stats.total}</Text>
              <MaterialIcons name="content-paste" size={20} color={theme.colors.text} />
            </View>
            <Text style={styles.statLabel}>Total Permits</Text>
          </Card>
          <Card style={[styles.statCard, styles.pendingCard]}>
            <View style={styles.statHeader}>
              <Text style={styles.statNumber}>{stats.pending}</Text>
              <MaterialIcons name="hourglass-empty" size={20} color={theme.colors.warning} />
            </View>
            <Text style={styles.statLabel}>Pending</Text>
          </Card>
          <Card style={[styles.statCard, styles.activeCard]}>
            <View style={styles.statHeader}>
              <Text style={styles.statNumber}>{stats.approved + stats.inProgress}</Text>
              <MaterialIcons name="build" size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.statLabel}>Active</Text>
          </Card>
        </View>

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
        >
          {filterTabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.filterTab,
                activeFilter === tab.key && styles.filterTabActive,
              ]}
              onPress={() => setActiveFilter(tab.key)}
            >
              <MaterialIcons
                name={tab.icon}
                size={16}
                color={activeFilter === tab.key ? theme.colors.background : theme.colors.muted}
                style={styles.filterIcon}
              />
              <Text
                style={[
                  styles.filterText,
                  activeFilter === tab.key && styles.filterTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {error ? (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error" size={48} color={theme.colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadPermits}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filteredPermits.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="construction" size={64} color={theme.colors.muted} />
            <Text style={styles.emptyTitle}>
              {activeFilter === 'all' ? 'No Construction Permits' : `No ${activeFilter} permits`}
            </Text>
            <Text style={styles.emptyText}>
              {activeFilter === 'all'
                ? 'Submit your first construction permit request to begin your project.'
                : `No ${activeFilter} construction permits found.`}
            </Text>
            {activeFilter === 'all' && (
              <Button
                onPress={handleNewPermit}
                style={styles.emptyButton}
              >
                Request First Permit
              </Button>
            )}
          </View>
        ) : (
          <View style={styles.permitList}>
            {filteredPermits.map(renderPermitItem)}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        icon="add"
        onPress={handleNewPermit}
      />

      {/* Construction Permit Form */}
      <ConstructionPermitForm
        visible={showPermitForm}
        onClose={() => setShowPermitForm(false)}
        onSubmit={handlePermitSubmitted}
        householdId={householdId}
      />

      {/* Construction Worker Pass Screen */}
      {selectedPermit && (
        <ConstructionWorkerPassScreen
          visible={showWorkerPassScreen}
          onClose={() => {
            setShowWorkerPassScreen(false);
            setSelectedPermit(null);
          }}
          permitId={selectedPermit.id}
          permitStatus={selectedPermit.status}
        />
      )}
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.muted,
    marginTop: 16,
  },
  searchContainer: {
    backgroundColor: theme.colors.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.isDark ? '#374151' : '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: theme.isDark ? '#000' : '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.isDark ? 0.1 : 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  pendingCard: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.warning,
  },
  activeCard: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  filterContainer: {
    backgroundColor: theme.colors.card,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.isDark ? '#374151' : '#f3f4f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginRight: 8,
    minWidth: 80,
    minHeight: 48,
    justifyContent: 'center',
  },
  filterTabActive: {
    backgroundColor: theme.colors.primary,
  },
  filterIcon: {
    marginRight: 6,
  },
  filterText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.muted,
    textAlign: 'center',
  },
  filterTextActive: {
    color: theme.colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error,
    marginTop: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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
    lineHeight: 20,
  },
  emptyButton: {
    paddingHorizontal: 24,
  },
  permitList: {
    padding: 16,
    gap: 12,
  },
  permitItem: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: theme.isDark ? '#000' : '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.isDark ? 0.1 : 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  permitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  permitInfo: {
    flex: 1,
    marginRight: 12,
  },
  permitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  permitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  permitIcon: {
    marginRight: 4,
  },
  contractorName: {
    fontSize: 14,
    color: theme.colors.muted,
  },
  permitStatusContainer: {
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: theme.colors.background,
    fontSize: 10,
    fontWeight: '700',
  },
  permitDetails: {
    marginBottom: 16,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailValue: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
    marginLeft: 8,
  },
  permitFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  timeAgo: {
    fontSize: 11,
    color: theme.colors.muted,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  cancelButton: {
    borderColor: theme.colors.error,
  },
  cancelButtonText: {
    color: theme.colors.error,
  },
  payButton: {
    borderColor: theme.colors.success,
  },
  payButtonText: {
    color: theme.colors.success,
  },
  workerPassButton: {
    borderColor: theme.colors.primary,
  },
  workerPassButtonText: {
    color: theme.colors.primary,
  },
});

export default ConstructionPermitsScreen;