import React from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { format, differenceInDays, isAfter, isBefore } from 'date-fns';


import { MaterialIcons } from '@expo/vector-icons';interface Fee {
  id: string;
  type: 'monthly' | 'quarterly' | 'annual' | 'special' | 'late_fee';
  title: string;
  description: string;
  amount: number;
  dueDate: Date;
  status: 'unpaid' | 'paid' | 'overdue' | 'processing';
  paidDate?: Date;
  paidAmount?: number;
  paymentMethod?: 'stripe' | 'paymongo' | 'gcash';
  lateFee?: number;
  receiptUrl?: string;
  recurring?: boolean;
}

interface FeeListProps {
  fees: Fee[];
  filter?: 'all' | 'unpaid' | 'paid' | 'overdue';
  onFeePress?: (fee: Fee) => void;
  onPayPress?: (fee: Fee) => void;
  onViewReceipt?: (fee: Fee) => void;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  showPaymentActions?: boolean;
}

export const FeeList: React.FC<FeeListProps> = ({
  fees,
  filter = 'all',
  onFeePress,
  onPayPress,
  onViewReceipt,
  isRefreshing,
  onRefresh,
  showPaymentActions = true,
}) => {
  const getStatusColor = (status: string, isOverdue: boolean = false) => {
    if (isOverdue) return '#ef4444';
    switch (status) {
      case 'paid':
        return '#10b981';
      case 'unpaid':
        return '#3b82f6';
      case 'overdue':
        return '#dc2626';
      case 'processing':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: string, isOverdue: boolean = false) => {
    if (isOverdue) <MaterialIcons name="warning" size={16} color="#f59e0b" />;
    switch (status) {
      case 'paid':
        return <MaterialIcons name="check-circle" size={16} color="#10b981" />;
      case 'unpaid':
        <MaterialIcons name="hourglass-empty" size={16} color="#6b7280" />;
      case 'overdue':
        return <MaterialIcons name="cancel" size={16} color="#ef4444" />;
      case 'processing':
        return <MaterialIcons name="refresh" size={16} color="#3b82f6" />;
      default:
        return <MaterialIcons name="circle" size={8} color="#6b7280" />;
    }
  };

  const getFeeTypeColor = (type: string) => {
    switch (type) {
      case 'monthly':
        return '#3b82f6';
      case 'quarterly':
        return '#8b5cf6';
      case 'annual':
        return '#10b981';
      case 'special':
        return '#f59e0b';
      case 'late_fee':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getFeeTypeLabel = (type: string) => {
    switch (type) {
      case 'monthly':
        return 'Monthly';
      case 'quarterly':
        return 'Quarterly';
      case 'annual':
        return 'Annual';
      case 'special':
        return 'Special';
      case 'late_fee':
        return 'Late Fee';
      default:
        return type;
    }
  };

  const calculateDaysOverdue = (dueDate: Date): number => {
    const now = new Date();
    return differenceInDays(now, dueDate);
  };

  const calculateLateFee = (fee: Fee): number => {
    if (fee.status === 'paid') return 0;

    const daysOverdue = calculateDaysOverdue(fee.dueDate);
    if (daysOverdue <= 0) return 0;

    // Late fee calculation (2% per month overdue, minimum 100)
    const monthlyRate = 0.02;
    const monthlyFee = Math.floor(daysOverdue / 30) + 1;
    const calculatedFee = fee.amount * monthlyRate * monthlyFee;
    return Math.max(calculatedFee, 100);
  };

  const getTotalAmount = (fee: Fee): number => {
    const lateFee = calculateLateFee(fee);
    return fee.amount + lateFee;
  };

  const isFeeOverdue = (fee: Fee): boolean => {
    if (fee.status === 'paid') return false;
    return isAfter(new Date(), fee.dueDate);
  };

  const handlePayFee = (fee: Fee) => {
    if (fee.status === 'processing') {
      Alert.alert('Payment in Progress', 'This payment is currently being processed. Please wait a moment and try again.');
      return;
    }

    if (fee.status === 'paid') {
      Alert.alert('Already Paid', 'This fee has already been paid.');
      return;
    }

    const totalAmount = getTotalAmount(fee);
    const isOverdue = isFeeOverdue(fee);

    Alert.alert(
      isOverdue ? 'Overdue Fee Payment' : 'Pay Fee',
      isOverdue
        ? `This fee is ${calculateDaysOverdue(fee.dueDate)} days overdue. Total amount: ₱${totalAmount.toFixed(2)} (including ₱${calculateLateFee(fee).toFixed(2)} late fee). Continue?`
        : `Pay ₱${totalAmount.toFixed(2)} for ${fee.title}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay Now',
          onPress: () => onPayPress?.(fee),
        },
      ]
    );
  };

  const renderFee = ({ item }: { item: Fee }) => {
    const isOverdue = isFeeOverdue(item);
    const totalAmount = getTotalAmount(item);
    const lateFee = calculateLateFee(item);
    const daysOverdue = calculateDaysOverdue(item.dueDate);

    return (
      <TouchableOpacity
        onPress={() => onFeePress?.(item)}
        activeOpacity={0.7}
      >
        <Card style={[styles.feeCard, item.status === 'cancelled' && styles.cancelledCard]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.feeInfo}>
              <View style={styles.titleRow}>
                <Text style={styles.feeTitle} numberOfLines={1}>{item.title}</Text>
                <Badge
                  variant="neutral"
                  size="sm"
                  style={styles.typeBadge}
                >
                  {getFeeTypeLabel(item.type)}
                </Badge>
              </View>
              <Text style={styles.feeDescription} numberOfLines={2}>
                {item.description}
              </Text>
            </View>
            <Badge
              variant={
                item.status === 'paid' ? 'success' :
                item.status === 'processing' ? 'warning' :
                isOverdue ? 'error' : 'info'
              }
            >
              {getStatusIcon(item.status, isOverdue)} {item.status.toUpperCase()}
            </Badge>
          </View>

          {/* Amount and Due Date */}
          <View style={styles.amountSection}>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Amount:</Text>
              <Text style={styles.amountValue}>₱{item.amount.toFixed(2)}</Text>
            </View>

            {lateFee > 0 && (
              <View style={styles.lateFeeRow}>
                <Text style={styles.lateFeeLabel}>Late Fee:</Text>
                <Text style={styles.lateFeeValue}>₱{lateFee.toFixed(2)}</Text>
              </View>
            )}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={[styles.totalValue, isOverdue && styles.overdueAmount]}>
                ₱{totalAmount.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Due Date */}
          <View style={styles.dueDateSection}>
            <Text style={styles.dueDateLabel}>Due Date:</Text>
            <Text style={[
              styles.dueDateValue,
              isOverdue && styles.overdueDate,
            ]}>
              {format(item.dueDate, 'MMM dd, yyyy')}
            </Text>
            {isOverdue && (
              <Text style={styles.overdueText}>
                {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
              </Text>
            )}
          </View>

          {/* Overdue Warning */}
          {isOverdue && (
            <View style={styles.overdueWarning}>
              <Text style={styles.overdueIcon}>⚠️</Text>
              <View style={styles.overdueContent}>
                <Text style={styles.overdueTitle}>
                  Payment Overdue
                </Text>
                <Text style={styles.overdueMessage}>
                  Late fees may apply. Please pay immediately to avoid penalties.
                </Text>
              </View>
            </View>
          )}

          {/* Payment Status */}
          {item.status === 'paid' && (
            <View style={styles.paidInfo}>
              <Text style={styles.paidIcon}>✅</Text>
              <View style={styles.paidDetails}>
                <Text style={styles.paidText}>
                  Paid on {format(item.paidDate!, 'MMM dd, yyyy')}
                </Text>
                {item.paymentMethod && (
                  <Text style={styles.paymentMethod}>
                    via {item.paymentMethod.toUpperCase()}
                  </Text>
                )}
              </View>
            </View>
          )}

          {item.status === 'processing' && (
            <View style={styles.processingInfo}>
              <Text style={styles.processingIcon}>🔄</Text>
              <Text style={styles.processingText}>
                Payment processing...
              </Text>
            </View>
          )}

          {/* Actions */}
          {showPaymentActions && item.status === 'unpaid' && (
            <View style={styles.actions}>
              {item.receiptUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => onViewReceipt?.(item)}
                  style={styles.actionButton}
                >
                  📄 Receipt
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                onPress={() => handlePayFee(item)}
                style={styles.actionButton}
                disabled={isOverdue && item.status === 'unpaid'}
              >
                💳 Pay Now
              </Button>
            </View>
          )}

          {showPaymentActions && item.status === 'paid' && item.receiptUrl && (
            <View style={styles.receiptActions}>
              <Button
                variant="outline"
                size="sm"
                onPress={() => onViewReceipt?.(item)}
                style={styles.receiptButton}
              >
                📄 View Receipt
              </Button>
            </View>
          )}

          {/* Recurring Badge */}
          {item.recurring && (
            <View style={styles.recurringBadge}>
              <Text style={styles.recurringIcon}>🔄</Text>
              <Text style={styles.recurringText}>Recurring</Text>
            </View>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>💰</Text>
      <Text style={styles.emptyTitle}>No Fees Found</Text>
      <Text style={styles.emptyText}>
        {filter === 'all'
          ? "No fees available for your household"
          : `No ${filter} fees found`}
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.headerTitle}>Association Fees</Text>
      <Text style={styles.headerSubtitle}>
        {filter === 'all' && 'All fees'}
        {filter === 'unpaid' && 'Unpaid fees'}
        {filter === 'paid' && 'Paid fees'}
        {filter === 'overdue' && 'Overdue fees'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      <FlatList
        data={fees}
        renderItem={renderFee}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#10b981']}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  listHeader: {
    padding: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  feeCard: {
    marginBottom: 12,
  },
  cancelledCard: {
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  feeInfo: {
    flex: 1,
    marginRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  feeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    marginRight: 8,
  },
  typeBadge: {
    backgroundColor: '#f3f4f6',
  },
  feeDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  amountSection: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  amountLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  lateFeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  lateFeeLabel: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '500',
  },
  lateFeeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 4,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 13,
    color: '#1f2937',
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  overdueAmount: {
    color: '#ef4444',
  },
  dueDateSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dueDateLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  dueDateValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  overdueDate: {
    color: '#ef4444',
    fontWeight: '600',
  },
  overdueText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 2,
    fontWeight: '500',
  },
  overdueWarning: {
    flexDirection: 'row',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  overdueIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  overdueContent: {
    flex: 1,
  },
  overdueTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: 4,
  },
  overdueMessage: {
    fontSize: 12,
    color: '#7f1d1d',
    lineHeight: 16,
  },
  paidInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  paidIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  paidDetails: {
    flex: 1,
  },
  paidText: {
    fontSize: 13,
    color: '#166534',
    marginBottom: 2,
  },
  paymentMethod: {
    fontSize: 12,
    color: '#166534',
    fontStyle: 'italic',
  },
  processingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  processingIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  processingText: {
    fontSize: 13,
    color: '#92400e',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  actionButton: {
    flex: 1,
  },
  receiptActions: {
    alignItems: 'center',
    paddingTop: 12,
  },
  receiptButton: {
    paddingHorizontal: 32,
  },
  recurringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  recurringIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  recurringText: {
    fontSize: 11,
    color: '#1e40af',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default FeeList;