import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase, getUserHouseholdId } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { constructionPermitService } from '../services/constructionPermitService';

interface Fee {
  id: string;
  fee_type: string;
  amount: number;
  due_date: string;
  payment_status: string;
  paid_amount: number;
  payment_date?: string;
  payment_method?: string;
}

interface PermitFee {
  id: string;
  project_name: string;
  road_fee_amount: number;
  road_fee_paid: boolean;
  road_fee_paid_at?: string;
  status: string;
  created_at: string;
}

export const FeesScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [fees, setFees] = useState<Fee[]>([]);
  const [permits, setPermits] = useState<PermitFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFees();
  }, []);

  const loadFees = async () => {
    try {
      const householdId = await getUserHouseholdId();
      if (!householdId) {
        console.warn('No household ID found');
        setLoading(false);
        return;
      }

      // Load association fees
      const { data: associationFees, error: feesError } = await supabase
        .from('association_fees')
        .select('*')
        .eq('household_id', householdId)
        .order('due_date', { ascending: false });

      if (feesError) {
        console.error('Error loading association fees:', feesError);
      } else {
        setFees(associationFees || []);
      }

      // Load construction permits with road fees
      try {
        const permits = await constructionPermitService.getPermits(householdId);
        // Filter permits that have road fees
        const permitsWithFees = permits.filter(permit =>
          permit.road_fee_amount && permit.road_fee_amount > 0
        );
        setPermits(permitsWithFees);
      } catch (permitError) {
        console.error('Error loading permits:', permitError);
        setPermits([]);
      }

    } catch (error) {
      console.error('Error loading fees:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadFees();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return theme.colors.success || '#10b981';
      case 'unpaid':
        return theme.colors.primary || '#3b82f6';
      case 'overdue':
        return theme.colors.error || '#ef4444';
      case 'partial':
        return theme.colors.warning || '#f59e0b';
      case 'waived':
        return theme.colors.muted || '#6b7280';
      default:
        return theme.colors.muted || '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const isOverdue = (dueDate: string, status: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    return status !== 'paid' && due < now;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>Loading fees...</Text>
      </View>
    );
  }

  const unpaidFees = fees.filter(f => ['unpaid', 'overdue', 'partial'].includes(f.payment_status));
  const paidFees = fees.filter(f => f.payment_status === 'paid');

  // Calculate permit fees
  const unpaidPermitFees = permits.filter(p => !p.road_fee_paid);
  const paidPermitFees = permits.filter(p => p.road_fee_paid);

  // Calculate totals including both association and permit fees
  const totalUnpaidAmount = unpaidFees.reduce((sum, f) => sum + (f.amount - f.paid_amount), 0) +
                            unpaidPermitFees.reduce((sum, p) => sum + p.road_fee_amount, 0);
  const totalPaidAmount = paidFees.reduce((sum, f) => sum + f.paid_amount, 0) +
                          paidPermitFees.reduce((sum, p) => sum + p.road_fee_amount, 0);
  const totalCount = unpaidFees.length + paidFees.length + unpaidPermitFees.length + paidPermitFees.length;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Association Fees</Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summarySection}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Unpaid</Text>
          <Text style={styles.summaryValue}>{unpaidFees.length + unpaidPermitFees.length}</Text>
          <Text style={styles.summaryAmount}>
            {formatCurrency(totalUnpaidAmount)}
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.card }]}>
          <Text style={styles.summaryLabel}>Paid</Text>
          <Text style={[styles.summaryValue, { color: theme.colors.success }]}>{paidFees.length + paidPermitFees.length}</Text>
          <Text style={styles.summaryAmount}>
            {formatCurrency(totalPaidAmount)}
          </Text>
        </View>
      </View>

      {/* Unpaid Fees */}
      {unpaidFees.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Unpaid Fees</Text>
          {unpaidFees.map((fee) => (
            <View key={fee.id} style={styles.feeCard}>
              <View style={styles.feeHeader}>
                <View>
                  <Text style={styles.feeType}>{fee.fee_type.replace('_', ' ').toUpperCase()}</Text>
                  <Text style={styles.feeDate}>Due: {formatDate(fee.due_date)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(fee.payment_status) }]}>
                  <Text style={styles.statusText}>{getStatusLabel(fee.payment_status)}</Text>
                </View>
              </View>

              <View style={styles.feeDetails}>
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Amount:</Text>
                  <Text style={styles.amountValue}>{formatCurrency(fee.amount)}</Text>
                </View>
                {fee.paid_amount > 0 && (
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Paid:</Text>
                    <Text style={[styles.amountValue, { color: theme.colors.success }]}>
                      {formatCurrency(fee.paid_amount)}
                    </Text>
                  </View>
                )}
                <View style={styles.amountRow}>
                  <Text style={[styles.amountLabel, { fontWeight: 'bold' }]}>Balance:</Text>
                  <Text style={[styles.amountValue, { fontWeight: 'bold', color: '#ef4444' }]}>
                    {formatCurrency(fee.amount - fee.paid_amount)}
                  </Text>
                </View>
              </View>

              {isOverdue(fee.due_date, fee.payment_status) && (
                <Text style={styles.overdueWarning}><MaterialIcons name="warning" size={64} color={theme.colors.warning || '#f59e0b'} /> Overdue</Text>
              )}

              <TouchableOpacity style={styles.payButton}>
                <Text style={styles.payButtonText}>Pay Now</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Unpaid Permit Fees */}
      {unpaidPermitFees.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Unpaid Permit Fees</Text>
          {unpaidPermitFees.map((permit) => (
            <View key={permit.id} style={styles.feeCard}>
              <View style={styles.feeHeader}>
                <View>
                  <Text style={styles.feeType}>CONSTRUCTION PERMIT</Text>
                  <Text style={styles.feeDate}>{permit.project_name}</Text>
                  <Text style={styles.feeDate}>Created: {formatDate(permit.created_at)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor('unpaid') }]}>
                  <Text style={styles.statusText}>{getStatusLabel('unpaid')}</Text>
                </View>
              </View>

              <View style={styles.feeDetails}>
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Road Fee:</Text>
                  <Text style={styles.amountValue}>{formatCurrency(permit.road_fee_amount)}</Text>
                </View>
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Status:</Text>
                  <Text style={styles.statusText}>{permit.status.toUpperCase()}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Paid Permit Fees */}
      {paidPermitFees.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paid Permit Fees</Text>
          {paidPermitFees.map((permit) => (
            <View key={permit.id} style={[styles.feeCard, { backgroundColor: theme.colors.card }]}>
              <View style={styles.feeHeader}>
                <View>
                  <Text style={styles.feeType}>CONSTRUCTION PERMIT</Text>
                  <Text style={styles.feeDate}>{permit.project_name}</Text>
                  <Text style={styles.feeDate}>Paid: {formatDate(permit.road_fee_paid_at!)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor('paid') }]}>
                  <Text style={styles.statusText}>Paid</Text>
                </View>
              </View>

              <View style={styles.feeDetails}>
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Road Fee:</Text>
                  <Text style={styles.amountValue}>{formatCurrency(permit.road_fee_amount)}</Text>
                </View>
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Status:</Text>
                  <Text style={styles.statusText}>{permit.status.toUpperCase()}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Paid Fees */}
      {paidFees.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment History</Text>
          {paidFees.map((fee) => (
            <View key={fee.id} style={[styles.feeCard, { backgroundColor: theme.colors.card }]}>
              <View style={styles.feeHeader}>
                <View>
                  <Text style={styles.feeType}>{fee.fee_type.replace('_', ' ').toUpperCase()}</Text>
                  <Text style={styles.feeDate}>Paid: {formatDate(fee.payment_date!)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor('paid') }]}>
                  <Text style={styles.statusText}>Paid</Text>
                </View>
              </View>

              <View style={styles.feeDetails}>
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Amount:</Text>
                  <Text style={styles.amountValue}>{formatCurrency(fee.amount)}</Text>
                </View>
                {fee.payment_method && (
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Method:</Text>
                    <Text style={styles.paymentMethod}>{fee.payment_method.replace('_', ' ')}</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity style={styles.receiptButton}>
                <Text style={styles.receiptButtonText}>Download Receipt</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {fees.length === 0 && permits.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>₱</Text>
          <Text style={styles.emptyTitle}>No Fees</Text>
          <Text style={styles.emptyText}>You have no association fees or permit fees at this time.</Text>
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
  summarySection: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: theme.colors.card || '#fef2f2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.muted,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.error || '#ef4444',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 14,
    color: theme.colors.text || '#374151',
    fontWeight: '600',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
  },
  feeCard: {
    backgroundColor: theme.colors.card || '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: theme.dark ? '#fff' : '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.dark ? 0.1 : 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  feeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  feeType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  feeDate: {
    fontSize: 14,
    color: theme.colors.muted,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: theme.colors.background || '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  feeDetails: {
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  amountLabel: {
    fontSize: 14,
    color: theme.colors.muted,
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  paymentMethod: {
    fontSize: 14,
    color: theme.colors.text || '#374151',
    textTransform: 'capitalize',
  },
  overdueWarning: {
    fontSize: 12,
    color: theme.colors.error || '#ef4444',
    fontWeight: '600',
    marginBottom: 8,
  },
  payButton: {
    backgroundColor: theme.colors.success || '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  payButtonText: {
    color: theme.colors.background || '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  receiptButton: {
    backgroundColor: theme.colors.card || '#f3f4f6',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  receiptButtonText: {
    color: theme.colors.text || '#374151',
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
    fontWeight: 'bold',
    color: theme.colors.success || '#10b981',
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
  },
});

export default FeesScreen;
