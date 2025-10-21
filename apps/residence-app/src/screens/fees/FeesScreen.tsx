import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { FAB } from '../../components/ui/FAB';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import FeeList from '../../components/fees/FeeList';
import FeePaymentForm from '../../components/fees/FeePaymentForm';
import StripePaymentSheet from '../../components/payments/StripePaymentSheet';
import PayMongoPaymentSheet from '../../components/payments/PayMongoPaymentSheet';
import ReceiptViewer from '../../components/payments/ReceiptViewer';
import feeService, { FeeData, PaymentRequest } from '../../services/feeService';
import networkStatus from '../../lib/networkStatus';
import { format, differenceInDays, isAfter } from 'date-fns';


import { MaterialIcons } from '@expo/vector-icons';interface PaymentFormData {
  method: string;
  details: any;
}

type ScreenMode = 'list' | 'payment' | 'history';
type PaymentMethod = 'stripe' | 'paymongo' | 'gcash';

export const FeesScreen: React.FC = () => {
  const [fees, setFees] = useState<FeeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [screenMode, setScreenMode] = useState<ScreenMode>('list');
  const [selectedFee, setSelectedFee] = useState<FeeData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unpaid' | 'paid' | 'overdue'>('all');
  const [isOffline, setIsOffline] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState<PaymentFormData | null>(null);
  const [showStripeSheet, setShowStripeSheet] = useState(false);
  const [showPayMongoSheet, setShowPayMongoSheet] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  useEffect(() => {
    checkNetworkStatus();
    const unsubscribe = networkStatus.addListener((connected) => {
      setIsOffline(!connected);
      if (connected) {
        loadFees(); // Refresh when coming online
      }
    });

    return () => {
      networkStatus.removeListener(unsubscribe);
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadFees();
    }, [])
  );

  const checkNetworkStatus = () => {
    setIsOffline(!networkStatus.isConnected());
  };

  const loadFees = async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      let filter: 'all' | 'unpaid' | 'paid' | 'overdue' | undefined;
      if (activeTab !== 'all') {
        filter = activeTab;
      }

      const data = await feeService.getFees(filter);
      setFees(data);
    } catch (error) {
      console.error('Failed to load fees:', error);
      Alert.alert('Error', 'Failed to load fees');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handlePayFee = (fee: FeeData) => {
    if (fee.status === 'processing') {
      Alert.alert('Payment in Progress', 'This payment is currently being processed. Please wait a moment and try again.');
      return;
    }

    if (fee.status === 'paid') {
      Alert.alert('Already Paid', 'This fee has already been paid.');
      return;
    }

    const lateFee = feeService.calculateLateFee(fee);
    const totalAmount = fee.amount + (lateFee || 0);
    const isOverdue = isAfter(new Date(), fee.dueDate);

    setSelectedFee(fee);
    setScreenMode('payment');
  };

  const handlePaymentSubmit = async (paymentMethod: string, paymentDetails: any) => {
    if (!selectedFee) return;

    setIsSubmitting(true);
    setPaymentFormData({ method: paymentMethod, details: paymentDetails });

    try {
      const lateFee = feeService.calculateLateFee(selectedFee);
      const totalAmount = selectedFee.amount + (lateFee || 0);

      const paymentRequest: PaymentRequest = {
        feeId: selectedFee.id,
        amount: totalAmount,
        paymentMethod: paymentMethod as PaymentMethod,
        paymentDetails,
      };

      // Show appropriate payment sheet
      if (paymentMethod === 'stripe') {
        setShowStripeSheet(true);
      } else if (paymentMethod === 'paymongo') {
        setShowPayMongoSheet(true);
      } else if (paymentMethod === 'gcash') {
        // Process GCash payment directly
        await processPayment(paymentRequest);
      }
    } catch (error) {
      console.error('Payment submission error:', error);
      Alert.alert('Payment Error', 'Failed to process payment. Please try again.');
      setIsSubmitting(false);
    }
  };

  const processPayment = async (paymentRequest: PaymentRequest) => {
    try {
      const result = await feeService.processPayment(paymentRequest);

      if (result.success) {
        Alert.alert(
          'Payment Successful',
          'Your payment has been processed successfully.',
          [
            {
              text: 'View Receipt',
              onPress: () => {
                if (result.transactionId) {
                  handleViewReceipt(result.transactionId);
                }
              },
            },
            {
              text: 'Done',
              onPress: () => {
                setScreenMode('list');
                loadFees();
              },
            },
          ]
        );
      } else {
        Alert.alert('Payment Failed', result.error || 'Payment processing failed. Please try again.');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      Alert.alert('Payment Error', 'An error occurred while processing your payment.');
    } finally {
      setIsSubmitting(false);
      setShowStripeSheet(false);
      setShowPayMongoSheet(false);
    }
  };

  const handleStripePaymentSubmit = async (cardDetails: any) => {
    if (!paymentFormData || !selectedFee) return;

    const lateFee = feeService.calculateLateFee(selectedFee);
    const totalAmount = selectedFee.amount + (lateFee || 0);

    const paymentRequest: PaymentRequest = {
      feeId: selectedFee.id,
      amount: totalAmount,
      paymentMethod: 'stripe',
      paymentDetails: cardDetails,
    };

    await processPayment(paymentRequest);
  };

  const handlePayMongoPaymentSubmit = async (paymentDetails: any) => {
    if (!paymentFormData || !selectedFee) return;

    const lateFee = feeService.calculateLateFee(selectedFee);
    const totalAmount = selectedFee.amount + (lateFee || 0);

    const paymentRequest: PaymentRequest = {
      feeId: selectedFee.id,
      amount: totalAmount,
      paymentMethod: 'paymongo',
      paymentDetails,
    };

    await processPayment(paymentRequest);
  };

  const handleViewReceipt = async (transactionId: string) => {
    try {
      const paymentHistory = await feeService.getPaymentHistory();
      const payment = paymentHistory.find(p => p.transactionId === transactionId);

      if (payment) {
        setSelectedReceipt({
          id: payment.id,
          transactionId: payment.transactionId,
          feeId: payment.feeId,
          feeTitle: selectedFee?.title || 'Fee Payment',
          feeType: selectedFee?.type || 'monthly',
          amount: payment.amount,
          totalAmount: payment.amount,
          paidAmount: payment.amount,
          paymentMethod: payment.paymentMethod,
          paymentStatus: payment.status,
          paidAt: new Date(payment.createdAt),
          dueDate: selectedFee?.dueDate || new Date(),
          receiptUrl: payment.receiptUrl,
          paymentGatewayId: payment.payment_gateway_id,
          billingAddress: {
            name: 'Resident', // This would come from user profile
            email: 'resident@example.com',
          },
        });
        setShowReceipt(true);
      }
    } catch (error) {
      console.error('Failed to load receipt:', error);
      Alert.alert('Error', 'Failed to load receipt');
    }
  };

  const getFeeStats = () => {
    const unpaid = fees.filter(f => f.status === 'unpaid').length;
    const overdue = fees.filter(f => {
      return f.status === 'unpaid' && isAfter(new Date(), f.dueDate);
    }).length;
    const paid = fees.filter(f => f.status === 'paid').length;
    const total = fees.reduce((sum, fee) => sum + fee.amount, 0);
    const totalPaid = fees
      .filter(f => f.status === 'paid')
      .reduce((sum, fee) => sum + (fee.paidAmount || 0), 0);

    return {
      unpaid,
      overdue,
      paid,
      total,
      totalPaid,
      totalDue: total - totalPaid,
    };
  };

  const stats = getFeeStats();

  const renderContent = () => {
    switch (screenMode) {
      case 'payment':
        return (
          <View style={styles.formContainer}>
            <View style={styles.formHeader}>
              <Button
                variant="ghost"
                onPress={() => setScreenMode('list')}
                style={styles.backButton}
              >
                ← Back
              </Button>
              <Text style={styles.formTitle}>Pay Fee</Text>
            </View>

            {selectedFee && (
              <FeePaymentForm
                fee={selectedFee}
                onSubmit={handlePaymentSubmit}
                onCancel={() => setScreenMode('list')}
                isSubmitting={isSubmitting}
              />
            )}
          </View>
        );

      case 'history':
        return (
          <View style={styles.historyContainer}>
            <View style={styles.historyHeader}>
              <Button
                variant="ghost"
                onPress={() => setScreenMode('list')}
                style={styles.backButton}
              >
                ← Back
              </Button>
              <Text style={styles.formTitle}>Payment History</Text>
            </View>
            <Text style={styles.comingSoonText}>Payment history coming soon...</Text>
          </View>
        );

      default:
        return (
          <ScrollView
            style={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => loadFees(true)}
                colors={['#10b981']}
              />
            }
            showsVerticalScrollIndicator={false}
          >
            {/* Network Status Banner */}
            {isOffline && (
              <View style={styles.offlineBanner}>
                <Text style={styles.offlineIcon}>📡</Text>
                <Text style={styles.offlineText}>
                  You're offline - Changes will sync when online
                </Text>
              </View>
            )}

            {/* Stats Overview */}
            <Card style={styles.statsCard}>
              <Text style={styles.statsTitle}>Fee Overview</Text>
              <View style={styles.statsGrid}>
                <StatItem
                  label="Unpaid"
                  value={stats.unpaid}
                  color="#ef4444"
                  icon="📊"
                />
                <StatItem
                  label="Overdue"
                  value={stats.overdue}
                  color="#f59e0b"
                  icon={<MaterialIcons name="warning" size={64} color="#f59e0b" />}
                />
                <StatItem
                  label="Paid"
                  value={stats.paid}
                  color="#10b981"
                  icon={<MaterialIcons name="check-circle" size={64} color="#10b981" />}
                />
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Due:</Text>
                <Text style={styles.totalValue}>₱{stats.totalDue.toFixed(2)}</Text>
              </View>
            </Card>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
              {(['all', 'unpaid', 'paid', 'overdue'] as const).map(tab => (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.tab,
                    activeTab === tab && styles.activeTab,
                  ]}
                  onPress={() => {
                    setActiveTab(tab);
                    loadFees();
                  }}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === tab && styles.activeTabText,
                    ]}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                  {tab === 'unpaid' && stats.unpaid > 0 && (
                    <Badge
                      size="sm"
                      variant={activeTab === 'unpaid' ? 'error' : 'neutral'}
                      style={styles.tabBadge}
                    >
                      {stats.unpaid}
                    </Badge>
                  )}
                  {tab === 'overdue' && stats.overdue > 0 && (
                    <Badge
                      size="sm"
                      variant={activeTab === 'overdue' ? 'error' : 'neutral'}
                      style={styles.tabBadge}
                    >
                      {stats.overdue}
                    </Badge>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Fee List */}
            <FeeList
              fees={fees}
              filter={activeTab}
              onFeePress={handlePayFee}
              onPayPress={handlePayFee}
              onViewReceipt={handleViewReceipt}
              isRefreshing={isRefreshing}
              onRefresh={() => loadFees(true)}
            />

            {/* Empty State */}
            {fees.length === 0 && !isLoading && (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>₱</Text>
                <Text style={styles.emptyTitle}>No Fees Found</Text>
                <Text style={styles.emptyText}>
                  {activeTab === 'all'
                    ? 'No fees available for your household'
                    : `No ${activeTab} fees found`}
                </Text>
              </Card>
            )}

            {/* History Button */}
            <View style={styles.historyButtonContainer}>
              <Button
                variant="outline"
                onPress={() => setScreenMode('history')}
                style={styles.historyButton}
              >
                📄 View Payment History
              </Button>
            </View>
          </ScrollView>
        );
    }
  };

  return (
    <View style={styles.container}>
      {renderContent()}

      {/* Stripe Payment Sheet */}
      {selectedFee && paymentFormData && (
        <StripePaymentSheet
          visible={showStripeSheet}
          amount={selectedFee.amount + (feeService.calculateLateFee(selectedFee) || 0)}
          feeDescription={selectedFee.title}
          isSubmitting={isSubmitting}
          onSubmit={handleStripePaymentSubmit}
          onCancel={() => {
            setShowStripeSheet(false);
            setIsSubmitting(false);
          }}
        />
      )}

      {/* PayMongo Payment Sheet */}
      {selectedFee && paymentFormData && (
        <PayMongoPaymentSheet
          visible={showPayMongoSheet}
          amount={selectedFee.amount + (feeService.calculateLateFee(selectedFee) || 0)}
          feeDescription={selectedFee.title}
          isSubmitting={isSubmitting}
          onSubmit={handlePayMongoPaymentSubmit}
          onCancel={() => {
            setShowPayMongoSheet(false);
            setIsSubmitting(false);
          }}
        />
      )}

      {/* Receipt Viewer */}
      {selectedReceipt && (
        <ReceiptViewer
          visible={showReceipt}
          receipt={selectedReceipt}
          onClose={() => {
            setShowReceipt(false);
            setSelectedReceipt(null);
          }}
          onDownloadPDF={async (receiptId) => {
            const url = await feeService.getReceiptUrl(selectedReceipt.transactionId);
            return url || '';
          }}
        />
      )}
    </View>
  );
};

// Helper Components
const StatItem: React.FC<{
  label: string;
  value: number;
  color: string;
  icon: string;
}> = ({ label, value, color, icon }) => (
  <View style={styles.statItem}>
    <View style={[styles.statIconContainer, { backgroundColor: `${color}20` }]}>
      <Text style={styles.statIcon}>{icon}</Text>
    </View>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  listContainer: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
  },
  historyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  comingSoonText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  offlineBanner: {
    backgroundColor: '#fef3c7',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  offlineIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  offlineText: {
    fontSize: 14,
    color: '#92400e',
    flex: 1,
  },
  statsCard: {
    margin: 16,
    marginBottom: 8,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 20,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 6,
    position: 'relative',
  },
  activeTab: {
    backgroundColor: '#eff6ff',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#3b82f6',
  },
  tabBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  emptyCard: {
    margin: 16,
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#10b981',
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
    paddingHorizontal: 20,
  },
  historyButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  historyButton: {
    width: '100%',
  },
});

export default FeesScreen;