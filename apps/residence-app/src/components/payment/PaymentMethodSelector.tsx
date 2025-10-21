import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StripeCardField } from './StripeCardField';
import paymongoService, { PayMongoPaymentMethod } from '../../services/paymongoService';
import networkStatus from '../../lib/networkStatus';


import { MaterialIcons } from '@expo/vector-icons';

export enum PaymentMethod {
  STRIPE_CARD = 'stripe_card',
  GCASH = 'gcash',
  GRAB_PAY = 'grab_pay',
  PAYMAYA = 'paymaya',
  BANK_TRANSFER = 'bank_transfer',
}

interface PaymentMethodSelectorProps {
  amount: number;
  currency?: string;
  description: string;
  entityId: string;
  entityType: 'fee' | 'permit';
  onSuccess?: (paymentId: string, method: PaymentMethod) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

interface PaymentOption {
  id: PaymentMethod;
  name: string;
  icon: string;
  description: string;
  minAmount?: number;
  available: boolean;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  amount,
  currency = 'PHP',
  description,
  entityId,
  entityType,
  onSuccess,
  onError,
  onCancel,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [paymentOptions, setPaymentOptions] = useState<PaymentOption[]>([]);

  useEffect(() => {
    // Check network status
    setIsOnline(networkStatus.isConnected());

    // Listen for network changes
    const unsubscribe = networkStatus.addListener((connected) => {
      setIsOnline(connected);
      if (!connected) {
        Alert.alert(
          'No Internet Connection',
          'Payment requires an internet connection. Please check your connection and try again.',
          [{ text: 'OK' }]
        );
      }
    });

    // Setup payment options
    setupPaymentOptions();

    return () => {
      unsubscribe();
    };
  }, [amount]);

  const setupPaymentOptions = () => {
    const options: PaymentOption[] = [
      {
        id: PaymentMethod.STRIPE_CARD,
        name: 'Credit/Debit Card',
        icon: <MaterialIcons name="credit-card" size={16} color="#6b7280" />,
        description: 'Visa, Mastercard, American Express',
        available: true,
      },
      {
        id: PaymentMethod.GCASH,
        name: 'GCash',
        icon: <MaterialIcons name="payments" size={16} color="#3b82f6" />,
        description: 'Pay with GCash wallet',
        minAmount: 1,
        available: amount >= 1,
      },
      {
        id: PaymentMethod.GRAB_PAY,
        name: 'GrabPay',
        icon: <MaterialIcons name="payments" size={16} color="#10b981" />,
        description: 'Pay with GrabPay wallet',
        minAmount: 1,
        available: amount >= 1,
      },
      {
        id: PaymentMethod.PAYMAYA,
        name: 'Maya',
        icon: <MaterialIcons name="payments" size={16} color="#8b5cf6" />,
        description: 'Pay with Maya wallet',
        minAmount: 100,
        available: amount >= 100,
      },
      {
        id: PaymentMethod.BANK_TRANSFER,
        name: 'Online Banking',
        icon: <MaterialIcons name="account-balance" size={16} color="#6b7280" />,
        description: 'BPI, BDO, UnionBank, and more',
        minAmount: 1,
        available: amount >= 1,
      },
    ];

    setPaymentOptions(options);
  };

  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    if (!isOnline) {
      Alert.alert(
        'Offline',
        'Payment requires an internet connection. Please connect to the internet and try again.'
      );
      return;
    }

    setSelectedMethod(method);

    // For non-Stripe methods, process immediately
    if (method !== PaymentMethod.STRIPE_CARD) {
      processPayMongoPayment(method);
    }
  };

  const processPayMongoPayment = async (method: PaymentMethod) => {
    setIsProcessing(true);

    try {
      let result;
      const metadata = {
        entity_id: entityId,
        entity_type: entityType,
        payment_method: method,
      };

      switch (method) {
        case PaymentMethod.GCASH:
          result = await paymongoService.processGCashPayment(amount, description, metadata);
          break;

        case PaymentMethod.GRAB_PAY:
          result = await paymongoService.processGrabPayPayment(amount, description, metadata);
          break;

        case PaymentMethod.PAYMAYA:
          result = await paymongoService.createPaymentIntent(
            amount,
            currency,
            description,
            PayMongoPaymentMethod.PAYMAYA,
            metadata
          );
          if (result.success && result.paymentIntentId) {
            const returnUrl = `residence-app://payment-return?payment_intent_id=${result.paymentIntentId}`;
            result = await paymongoService.attachPaymentMethod(
              result.paymentIntentId,
              PayMongoPaymentMethod.PAYMAYA,
              returnUrl
            );
          }
          break;

        case PaymentMethod.BANK_TRANSFER:
          result = await paymongoService.createPaymentIntent(
            amount,
            currency,
            description,
            PayMongoPaymentMethod.BANK_TRANSFER,
            metadata
          );
          if (result.success && result.paymentIntentId) {
            const returnUrl = `residence-app://payment-return?payment_intent_id=${result.paymentIntentId}`;
            result = await paymongoService.attachPaymentMethod(
              result.paymentIntentId,
              PayMongoPaymentMethod.BANK_TRANSFER,
              returnUrl
            );
          }
          break;

        default:
          throw new Error('Invalid payment method');
      }

      if (result?.success && result.paymentIntentId) {
        // Payment initiated successfully
        Alert.alert(
          'Payment Initiated',
          'You will be redirected to complete your payment. Please return to the app after completing the payment.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Store payment intent for later checking
                onSuccess?.(result.paymentIntentId!, method);
              },
            },
          ]
        );
      } else {
        throw new Error(result?.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert(
        'Payment Failed',
        error instanceof Error ? error.message : 'An error occurred during payment',
        [
          { text: 'Retry', onPress: () => processPayMongoPayment(method) },
          { text: 'Cancel', style: 'cancel', onPress: () => setSelectedMethod(null) },
        ]
      );
      onError?.(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderPaymentOption = (option: PaymentOption) => {
    const isSelected = selectedMethod === option.id;
    const isDisabled = !option.available || !isOnline;

    return (
      <TouchableOpacity
        key={option.id}
        style={[
          styles.paymentOption,
          isSelected && styles.selectedOption,
          isDisabled && styles.disabledOption,
        ]}
        onPress={() => handlePaymentMethodSelect(option.id)}
        disabled={isDisabled}
      >
        <View style={styles.optionContent}>
          <Text style={styles.optionIcon}>{option.icon}</Text>
          <View style={styles.optionText}>
            <Text style={[styles.optionName, isDisabled && styles.disabledText]}>
              {option.name}
            </Text>
            <Text style={[styles.optionDescription, isDisabled && styles.disabledText]}>
              {option.description}
            </Text>
            {option.minAmount && !option.available && (
              <Text style={styles.minAmountText}>
                Minimum: {currency} {option.minAmount.toFixed(2)}
              </Text>
            )}
          </View>
          {isSelected && (
            <View style={styles.selectedIndicator}>
              <Text style={styles.checkmark}>✓</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // If Stripe Card is selected, show the card input form
  if (selectedMethod === PaymentMethod.STRIPE_CARD) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setSelectedMethod(null)}
        >
          <Text style={styles.backButtonText}>← Choose Different Method</Text>
        </TouchableOpacity>

        <StripeCardField
          amount={amount}
          currency={currency}
          description={description}
          entityId={entityId}
          entityType={entityType}
          onSuccess={(paymentId, receiptUrl) => {
            onSuccess?.(paymentId, PaymentMethod.STRIPE_CARD);
          }}
          onError={onError}
          onCancel={() => setSelectedMethod(null)}
        />
      </View>
    );
  }

  // Show payment method selection
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Payment Method</Text>
        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>Amount to Pay:</Text>
          <Text style={styles.amount}>
            {currency} {amount.toFixed(2)}
          </Text>
        </View>
        <Text style={styles.description}>{description}</Text>
      </View>

      {!isOnline && (
        <View style={styles.offlineWarning}>
          <Text style={styles.offlineIcon}>⚠️</Text>
          <Text style={styles.offlineText}>
            No internet connection. Payment requires an active connection.
          </Text>
        </View>
      )}

      <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Card Payment</Text>
        {renderPaymentOption(paymentOptions.find(o => o.id === PaymentMethod.STRIPE_CARD)!)}

        <Text style={styles.sectionTitle}>E-Wallets</Text>
        {paymentOptions
          .filter(o => [PaymentMethod.GCASH, PaymentMethod.GRAB_PAY, PaymentMethod.PAYMAYA].includes(o.id))
          .map(renderPaymentOption)}

        <Text style={styles.sectionTitle}>Bank Transfer</Text>
        {renderPaymentOption(paymentOptions.find(o => o.id === PaymentMethod.BANK_TRANSFER)!)}
      </ScrollView>

      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.processingText}>Processing payment...</Text>
        </View>
      )}

      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelButtonText}>Cancel Payment</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  amountLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
  },
  amount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
  },
  offlineWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 8,
  },
  offlineIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  offlineText: {
    flex: 1,
    fontSize: 14,
    color: '#991b1b',
  },
  optionsList: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 12,
    marginTop: 20,
  },
  paymentOption: {
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  selectedOption: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  disabledOption: {
    opacity: 0.5,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  optionText: {
    flex: 1,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  disabledText: {
    color: '#9ca3af',
  },
  minAmountText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  backButton: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButtonText: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '600',
  },
  cancelButton: {
    margin: 20,
    padding: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#4b5563',
    fontWeight: '600',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
});

export default PaymentMethodSelector;