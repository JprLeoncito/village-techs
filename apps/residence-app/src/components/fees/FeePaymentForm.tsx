import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import PaymentMethodSelector from '../payment/PaymentMethodSelector';
import { format } from 'date-fns';


import { MaterialIcons } from '@expo/vector-icons';interface Fee {
  id: string;
  title: string;
  amount: number;
  dueDate: Date;
  type: 'monthly' | 'quarterly' | 'annual' | 'special' | 'late_fee';
  status: 'unpaid' | 'paid' | 'overdue' | 'processing';
  lateFee?: number;
}

interface FeePaymentFormProps {
  fee: Fee;
  onSubmit?: (paymentMethod: string, paymentDetails: any) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  availableMethods?: string[];
}

export const FeePaymentForm: React.FC<FeePaymentFormProps> = ({
  fee,
  onSubmit,
  onCancel,
  isSubmitting = false,
  availableMethods = ['stripe', 'paymongo', 'gcash'],
}) => {
  const [selectedMethod, setSelectedMethod] = useState<string>('stripe');
  const [paymentDetails, setPaymentDetails] = useState<any>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const totalAmount = fee.amount + (fee.lateFee || 0);
  const isOverdue = fee.status === 'overdue';

  useEffect(() => {
    // Set default method to first available
    if (availableMethods.length > 0 && !availableMethods.includes(selectedMethod)) {
      setSelectedMethod(availableMethods[0]);
    }
  }, [availableMethods, selectedMethod]);

  const handlePaymentMethodChange = (method: string) => {
    setSelectedMethod(method);
    // Clear previous payment details when changing method
    setPaymentDetails({});
  };

  const handleSubmit = async () => {
    if (!selectedMethod) {
      Alert.alert('Payment Method Required', 'Please select a payment method');
      return;
    }

    // Validate payment details based on method
    if (!validatePaymentDetails(selectedMethod, paymentDetails)) {
      return;
    }

    setIsProcessing(true);

    try {
      onSubmit?.(selectedMethod, paymentDetails);
    } catch (error) {
      console.error('Payment submission error:', error);
      Alert.alert('Payment Error', 'Failed to process payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const validatePaymentDetails = (method: string, details: any): boolean => {
    switch (method) {
      case 'stripe':
        return details.cardNumber && details.expiryDate && details.cvc && details.cardholderName;
      case 'paymongo':
        return details.email || details.phoneNumber;
      case 'gcash':
        return details.phoneNumber;
      default:
        return true;
    }
  };

  const getMethodDescription = (method: string): string => {
    switch (method) {
      case 'stripe':
        return 'Pay with credit/debit card';
      case 'paymongo':
        return 'Pay with GCash, GrabPay, or Maya';
      case 'gcash':
        return 'Pay with GCash';
      default:
        return 'Select payment method';
    }
  };

  const getMethodIcon = (method: string): string => {
    switch (method) {
      case 'stripe':
        return <MaterialIcons name="credit-card" size={16} color="#6b7280" />;
      case 'paymongo':
        <MaterialIcons name="smartphone" size={16} color="#6b7280" />;
      case 'gcash':
        return '🇵🇳';
      default:
        <MaterialIcons name="credit-card" size={16} color="#6b7280" />;
    }
  };

  const getMethodFeatures = (method: string): string[] => {
    switch (method) {
      case 'stripe':
        return ['Secure payments', 'All major cards', 'Instant confirmation'];
      case 'paymongo':
        return ['GCash', 'GrabPay', 'Maya'];
      case 'gcash':
        return ['Mobile wallet', 'Instant'];
      default:
        return [];
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Card style={styles.feeSummaryCard}>
        <Text style={styles.summaryTitle}>Payment Summary</Text>

        <View style={styles.feeDetails}>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Fee Type:</Text>
            <Text style={styles.feeValue}>{fee.type.charAt(0).toUpperCase() + fee.type.slice(1)}</Text>
          </View>

          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Fee Amount:</Text>
            <Text style={styles.feeValue}>₱{fee.amount.toFixed(2)}</Text>
          </View>

          {fee.lateFee && fee.lateFee > 0 && (
            <View style={styles.lateFeeRow}>
              <Text style={styles.lateFeeLabel}>Late Fee:</Text>
              <Text style={styles.lateFeeValue}>₱{fee.lateFee.toFixed(2)}</Text>
            </View>
          )}

          <View style={[styles.totalRow, styles.borderTop]}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={[styles.totalValue, isOverdue && styles.overdueTotal]}>
              ₱{totalAmount.toFixed(2)}
            </Text>
          </View>

          <View style={styles.dueDateRow}>
            <Text style={styles.dueDateLabel}>Due Date:</Text>
            <Text style={styles.dueDateValue}>
              {format(fee.dueDate, 'MMMM dd, yyyy')}
            </Text>
          </View>

          {isOverdue && (
            <View style={styles.overdueWarning}>
              <Text style={styles.overdueIcon}>⚠️</Text>
              <Text style={styles.overdueText}>
                This payment is {Math.ceil((new Date().getTime() - fee.dueDate.getTime()) / (1000 * 60 * 60 * 24))} days overdue
              </Text>
            </View>
          )}
        </View>
      </Card>

      <Card style={styles.paymentMethodCard}>
        <Text style={styles.sectionTitle}>Select Payment Method</Text>

        <PaymentMethodSelector
          selectedMethod={selectedMethod}
          onMethodChange={handlePaymentMethodChange}
          availableMethods={availableMethods}
        />

        <View style={styles.methodDetails}>
          <Text style={styles.methodTitle}>
            {getMethodIcon(selectedMethod)} {getMethodDescription(selectedMethod)}
          </Text>
          <View style={styles.methodFeatures}>
            {getMethodFeatures(selectedMethod).map((feature, index) => (
              <Text key={index} style={styles.featureText}>• {feature}</Text>
            ))}
          </View>
        </View>
      </Card>

      {/* Payment Form - Dynamic based on selected method */}
      <Card style={styles.paymentFormCard}>
        <Text style={styles.sectionTitle}>
          Payment Details
        </Text>

        {selectedMethod === 'stripe' && (
          <View style={styles.stripeForm}>
            <Text style={styles.instructionText}>
              Enter your card details securely
            </Text>
            <View style={styles.cardPreview}>
              <View style={styles.cardChip}>
                <Text style={styles.cardChipText}>Card</Text>
              </View>
              <Text style={styles.cardNumber}>••••• ••••• •••• 4242</Text>
            </View>
          </View>
        )}

        {selectedMethod === 'paymongo' && (
          <View style={styles.paymongoForm}>
            <Text style={styles.instructionText}>
              Choose your preferred payment method
            </Text>
            <View style={styles.methodIcons}>
              <View style={styles.methodIcon}>
                <Text style={styles.methodIconText}>📱</Text>
              </View>
              <Text style={styles.methodIconLabel}>Mobile Wallet</Text>
            </View>
          </View>
        )}

        {selectedMethod === 'gcash' && (
          <View style={styles.gcashForm}>
            <Text style={styles.instructionText}>
              Pay with your GCash account
            </Text>
            <View style={styles.gcashPreview}>
              <View style={styles.gcashLogo}>
                <Text style={styles.gcashLogoText}>GCash</Text>
              </View>
              <Text style={styles.gcashInfo}>
                Fast and secure mobile payments
              </Text>
            </View>
          </View>
        )}
      </Card>

      {/* Security Notice */}
      <Card style={styles.securityCard}>
        <View style={styles.securityHeader}>
          <Text style={styles.securityIcon}>🔒</Text>
          <Text style={styles.securityTitle}>Secure Payment</Text>
        </View>
        <Text style={styles.securityText}>
          Your payment information is encrypted and secure. We never store your card details on our servers.
        </Text>
        <Text style={styles.securityText}>
          All payments are processed through trusted payment gateways.
        </Text>
      </Card>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          variant="outline"
          onPress={onCancel}
          disabled={isSubmitting || isProcessing}
          style={styles.cancelButton}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onPress={handleSubmit}
          disabled={isSubmitting || isProcessing || !selectedMethod}
          loading={isSubmitting || isProcessing}
          style={styles.payButton}
        >
          {isProcessing ? 'Processing...' : `Pay ₱${totalAmount.toFixed(2)}`}
        </Button>
      </View>

      {/* Terms */}
      <View style={styles.termsSection}>
        <Text style={styles.termsText}>
          By proceeding, you agree to the terms of service and privacy policy. All payments are final and non-refundable.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  feeSummaryCard: {
    margin: 16,
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  feeDetails: {
    gap: 8,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  feeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  lateFeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lateFeeLabel: {
    fontSize: 14,
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
    paddingTop: 8,
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  totalLabel: {
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  overdueTotal: {
    color: '#ef4444',
  },
  dueDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  dueDateLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  dueDateValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  overdueWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  overdueIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  overdueText: {
    fontSize: 12,
    color: '#991b1b',
    flex: 1,
  },
  paymentMethodCard: {
    margin: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  methodDetails: {
    alignItems: 'center',
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  methodFeatures: {
    alignItems: 'center',
    gap: 4,
  },
  featureText: {
    fontSize: 12,
    color: '#6b7280',
  },
  instructionText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  stripeForm: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  cardPreview: {
    width: '80%',
    height: 200,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  cardChip: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  cardChipText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '500',
  },
  cardNumber: {
    fontSize: 16,
    color: '#6b7280',
    letterSpacing: 2,
  },
  paymongoForm: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  methodIcons: {
    alignItems: 'center',
  },
  methodIcon: {
    width: 60,
    height: 60,
    backgroundColor: '#1e40af',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  methodIconText: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  methodIconLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  gcashForm: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  gcashPreview: {
    alignItems: 'center',
    backgroundColor: '#0066cc',
    padding: 16,
    borderRadius: 12,
    width: '80%',
    marginBottom: 12,
  },
  gcashLogo: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  gcashLogoText: {
    fontSize: 16,
    color: '#0066cc',
    fontWeight: 'bold',
  },
  gcashInfo: {
    fontSize: 12,
    color: '#ffffff',
    textAlign: 'center',
  },
  paymentFormCard: {
    margin: 16,
    marginBottom: 8,
  },
  securityCard: {
    margin: 16,
    marginBottom: 8,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  securityIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  securityText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  cancelButton: {
    flex: 1,
  },
  payButton: {
    flex: 2,
  },
  termsSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  termsText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default FeePaymentForm;