import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { useTheme, Theme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { constructionPermitService, ConstructionPermit } from '../../services/constructionPermitService';
import { MaterialIcons } from '@expo/vector-icons';
import realtimeService from '../../lib/realtime';

// Define status type locally to avoid import conflicts
type PermitStatus = ConstructionPermit['status'];
import ConstructionPermitForm from './ConstructionPermitForm';


const ConstructionPermitsScreen = () => {
  const { theme } = useTheme();
  const { householdId } = useAuth();
  const styles = createStyles(theme);

  // State management
  const [permits, setPermits] = useState<ConstructionPermit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);

  // Load permits data
  const loadPermits = useCallback(async () => {
    if (!householdId) {
      console.log('⚠️ No household ID found, skipping permit load');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Starting to load permits...');
      const data = await constructionPermitService.getPermits(householdId);
      console.log('📊 Permits loaded:', data?.length || 0, 'items');
      console.log('🔍 Sample permit data:', data?.[0]);

      setPermits(data);
      console.log('✅ Permits state set');
    } catch (error) {
      console.error('Failed to load permits:', error);
      Alert.alert('Error', 'Failed to load construction permits');
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  
  // Handle form submission
  const handleFormSubmit = useCallback(() => {
    setShowFormModal(false);
    loadPermits();
  }, [loadPermits]);

  // Load data on mount and when householdId changes
  useEffect(() => {
    if (householdId) {
      loadPermits();
    }
  }, [householdId, loadPermits]);

  // Subscribe to real-time permit updates
  useEffect(() => {
    if (!householdId) return;

    const unsubscribe = realtimeService.subscribePermitApprovals(
      householdId,
      (payload) => {
        console.log('🏗️ Real-time permit update received:', payload);
        if (payload.type === 'permit_approval') {
          // Reload permits to get the latest data
          loadPermits();
        }
      }
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [householdId, loadPermits]);

  // Calculate statistics
  const stats = {
    total: permits.length,
    pending: permits.filter(p => p.status === 'pending').length,
    approved: permits.filter(p => p.status === 'approved').length,
    inProgress: permits.filter(p => p.status === 'in_progress').length,
    totalFees: permits.reduce((sum, p) => sum + (p.road_fee_amount || 0), 0),
    paidFees: permits.filter(p => p.road_fee_paid).reduce((sum, p) => sum + (p.road_fee_amount || 0), 0),
    unpaidFees: permits.filter(p => !p.road_fee_paid && p.road_fee_amount > 0).reduce((sum, p) => sum + (p.road_fee_amount || 0), 0),
  };
  console.log('📈 Stats calculated:', stats);

  // Get status color
  const getStatusColor = (status: PermitStatus): string => {
    switch (status) {
      case 'pending': return theme.colors.warning;
      case 'approved': return theme.colors.primary;
      case 'in_progress': return theme.colors.info;
      case 'completed': return theme.colors.success;
      case 'rejected': return theme.colors.error;
      default: return theme.colors.muted;
    }
  };

  // Format date
  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  // Handle fee payment
  const handlePayFee = async (permit: ConstructionPermit) => {
    try {
      if (!permit.road_fee_amount) {
        Alert.alert('Error', 'No road fee amount set for this permit');
        return;
      }

      Alert.alert(
        'Pay Road Fee',
        `Pay road fee of ${permit.road_fee_amount.toLocaleString()} for this construction permit?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Pay',
            onPress: async () => {
              const result = await constructionPermitService.payRoadFee(permit.id, permit.road_fee_amount, 'mobile');
              if (result.success) {
                Alert.alert('Success', 'Road fee paid successfully!');
                loadPermits(); // Reload to update status
              } else {
                Alert.alert('Error', result.error || 'Failed to pay road fee');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error handling fee payment:', error);
      Alert.alert('Error', 'Failed to process fee payment');
    }
  };

  // Render permit card
  const renderPermitCard = (permit: ConstructionPermit) => {
    console.log('🏗️ Rendering permit card:', permit.id, permit.project_description);
    try {
      const hasFee = permit.road_fee_amount && permit.road_fee_amount > 0;
      const feePaid = permit.road_fee_paid;

      return (
        <Card key={permit.id} padding="m" margin="s" shadow="m">
          <View style={styles.permitHeader}>
            <View style={styles.permitTitle}>
              <Text style={styles.projectTitle}>{permit.project_description || 'Untitled Project'}</Text>
              <Text style={styles.contractorName}>{permit.contractor_name}</Text>
              {permit.estimated_worker_count && (
                <Text style={styles.workerCount}>{permit.estimated_worker_count} workers</Text>
              )}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(permit.status) }]}>
              <Text style={styles.statusText}>{permit.status.replace('_', ' ').toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.permitDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Contact:</Text>
              <Text style={styles.detailValue}>{permit.contractor_contact || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Project Period:</Text>
              <Text style={styles.detailValue}>
                {formatDate(permit.project_start_date)} - {formatDate(permit.project_end_date)}
              </Text>
            </View>
            {permit.estimated_worker_count && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Workers:</Text>
                <Text style={styles.detailValue}>{permit.estimated_worker_count}</Text>
              </View>
            )}
          </View>

          {/* Road Fee Section */}
          {hasFee && (
            <View style={styles.feeSection}>
              <View style={styles.feeHeader}>
                <View style={styles.feeInfo}>
                  <Text style={styles.feeLabel}>Road Fee</Text>
                  <View style={styles.feeAmountContainer}>
                    <Text style={[styles.feeCurrency, { color: theme.colors.text }]}>₱</Text>
                    <Text style={styles.feeAmount}>{permit.road_fee_amount.toLocaleString()}</Text>
                  </View>
                </View>
                <View style={[
                  styles.feeStatusBadge,
                  { backgroundColor: feePaid ? theme.colors.success : theme.colors.warning }
                ]}>
                  <Text style={styles.feeStatusText}>
                    {feePaid ? 'PAID' : 'PENDING'}
                  </Text>
                </View>
              </View>

              {!feePaid && permit.status === 'approved' && (
                <TouchableOpacity
                  style={[styles.payFeeButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => handlePayFee(permit)}
                >
                  <Text style={[styles.payFeeButtonText, { color: theme.colors.background }]}>
                    Pay Road Fee
                  </Text>
                </TouchableOpacity>
              )}

              {feePaid && permit.road_fee_paid_at && (
                <Text style={styles.paidDateText}>
                  Paid on {formatDate(permit.road_fee_paid_at)}
                </Text>
              )}
            </View>
          )}

          {/* Contractor License */}
          {permit.contractor_license && (
            <View style={styles.licenseSection}>
              <Text style={styles.licenseLabel}>License: {permit.contractor_license}</Text>
            </View>
          )}
        </Card>
      );
    } catch (error) {
      console.error('❌ Error rendering permit card:', error);
      return null;
    }
  };

  
  // Render statistics cards
  const renderStatsCards = () => (
    <View>
      <View style={styles.statsContainer}>
        <Card padding="m" margin="s" shadow="s" style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Permits</Text>
        </Card>
        <Card padding="m" margin="s" shadow="s" style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </Card>
        <Card padding="m" margin="s" shadow="s" style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.approved}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </Card>
        <Card padding="m" margin="s" shadow="s" style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.inProgress}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </Card>
      </View>

      {/* Fees Summary */}
      <View style={styles.feeStatsContainer}>
        <Card padding="m" margin="s" shadow="s" style={styles.feeStatCard}>
          <View style={styles.feeStatAmountContainer}>
            <Text style={[styles.feeCurrency, { color: theme.colors.text }]}>₱</Text>
            <Text style={styles.feeStatNumber}>{stats.totalFees.toLocaleString()}</Text>
          </View>
          <Text style={styles.feeStatLabel}>Total Fees</Text>
        </Card>
        <Card padding="m" margin="s" shadow="s" style={styles.feeStatCard}>
          <View style={styles.feeStatAmountContainer}>
            <Text style={[styles.feeCurrency, { color: theme.colors.success }]}>₱</Text>
            <Text style={[styles.feeStatNumber, { color: theme.colors.success }]}>
              {stats.paidFees.toLocaleString()}
            </Text>
          </View>
          <Text style={styles.feeStatLabel}>Paid</Text>
        </Card>
        <Card padding="m" margin="s" shadow="s" style={styles.feeStatCard}>
          <View style={styles.feeStatAmountContainer}>
            <Text style={[styles.feeCurrency, { color: theme.colors.warning }]}>₱</Text>
            <Text style={[styles.feeStatNumber, { color: theme.colors.warning }]}>
              {stats.unpaidFees.toLocaleString()}
            </Text>
          </View>
          <Text style={styles.feeStatLabel}>Unpaid</Text>
        </Card>
      </View>
    </View>
  );

  console.log('🎨 Starting render...');
  try {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Construction Permits</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Statistics Cards */}
          {renderStatsCards()}

  
          {/* Permits List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading permits...</Text>
            </View>
          ) : permits.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No construction permits found</Text>
              <Button
                title="Apply for New Permit"
                onPress={() => setShowFormModal(true)}
                variant="outline"
                style={styles.emptyButton}
              />
            </View>
          ) : (
            permits.map(renderPermitCard)
          )}
        </View>

        {/* Floating Action Button */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={() => setShowFormModal(true)}
        >
          <Text style={[styles.fabText, { color: theme.colors.background }]}>+</Text>
        </TouchableOpacity>

        {/* Form Modal */}
        <ConstructionPermitForm
          visible={showFormModal}
          onClose={() => setShowFormModal(false)}
          onSubmit={handleFormSubmit}
        />
      </View>
    );
  } catch (error) {
    console.error('❌ Error in render:', error);
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Construction Permits</Text>
        <Text style={styles.subtitle}>Error loading permits</Text>
      </View>
    );
  }
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.muted,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.muted,
    textAlign: 'center',
  },
    permitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  permitTitle: {
    flex: 1,
    marginRight: 12,
    paddingLeft: 8,
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 6,
    lineHeight: 22,
  },
  contractorName: {
    fontSize: 15,
    color: theme.colors.muted,
    marginBottom: 4,
    fontWeight: '500',
  },
  workerCount: {
    fontSize: 13,
    color: theme.colors.muted,
    fontStyle: 'italic',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 80,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginTop: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.background,
    letterSpacing: 0.3,
  },
  permitDetails: {
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginVertical: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: theme.colors.muted,
    fontWeight: '600',
    flex: 0.45,
    letterSpacing: 0.2,
  },
  detailValue: {
    fontSize: 14,
    color: theme.colors.text,
    flex: 0.55,
    textAlign: 'right',
    fontWeight: '600',
    letterSpacing: 0.1,
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
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.muted,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyButton: {
    minWidth: 200,
  },
  // Fee styles
  feeStatsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  feeStatCard: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  feeStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  feeStatAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    marginBottom: 4,
  },
  feeCurrency: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 2,
  },
  feeStatLabel: {
    fontSize: 12,
    color: theme.colors.muted,
    textAlign: 'center',
  },
  feeSection: {
    marginTop: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  feeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  feeInfo: {
    flex: 1,
  },
  feeLabel: {
    fontSize: 15,
    color: theme.colors.muted,
    fontWeight: '600',
    marginBottom: 4,
  },
  feeAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  feeAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  feeStatusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 90,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  feeStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.background,
    letterSpacing: 0.3,
  },
  payFeeButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  payFeeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  paidDateText: {
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
    paddingHorizontal: 8,
  },
  // License section
  licenseSection: {
    marginTop: 8,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  licenseLabel: {
    fontSize: 11,
    color: theme.colors.muted,
    fontStyle: 'italic',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  fabText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default ConstructionPermitsScreen;