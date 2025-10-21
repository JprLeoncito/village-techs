import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  CardField,
  useStripe,
  CardFieldInput,
  PaymentMethodCreateParams,
} from '@stripe/stripe-react-native';
import paymentService from '../../services/payment';


import { MaterialIcons } from '@expo/vector-icons';interface StripeCardFieldProps {
  amount: number;
  currency?: string;
  description: string;
  entityId: string;
  entityType: 'fee' | 'permit';
  onSuccess?: (paymentId: string, receiptUrl?: string) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

export const StripeCardField: React.FC<StripeCardFieldProps> = ({
  amount,
  currency = 'PHP',
  description,
  entityId,
  entityType,
  onSuccess,
  onError,
  onCancel,
}) => {
  const stripe = useStripe();
  const [cardDetails, setCardDetails] = useState<CardFieldInput.Details | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentIntentClientSecret, setPaymentIntentClientSecret] = useState<string>('');

  useEffect(() => {
    // Initialize payment when component mounts
    initializePayment();
  }, []);

  const initializePayment = async () => {
    try {
      setIsProcessing(true);

      // Initiate payment based on type
      const result = entityType === 'fee'
        ? await paymentService.initiateFeePayment(entityId, amount, description)
        : await paymentService.initiatePermitPayment(entityId, amount, description);

      if (!result.success) {
        throw new Error(result.error || 'Failed to initialize payment');
      }

      // Get payment intent client secret from server
      const response = await fetch('/api/payment-intent/' + result.paymentId);
      const { clientSecret } = await response.json();
      setPaymentIntentClientSecret(clientSecret);
    } catch (error) {
      console.error('Payment initialization error:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to initialize payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayPress = async () => {
    if (!cardDetails?.complete || !stripe || !paymentIntentClientSecret) {
      Alert.alert('Error', 'Please enter complete card details');
      return;
    }

    try {
      setIsProcessing(true);

      // Create payment method
      const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
        paymentMethodType: 'Card',
        paymentMethodData: {
          billingDetails: {
            // You can add billing details here if needed
          },
        },
      });

      if (pmError) {
        throw new Error(pmError.message);
      }

      // Confirm payment
      const { paymentIntent, error: confirmError } = await stripe.confirmPayment(
        paymentIntentClientSecret,
        {
          paymentMethodType: 'Card',
          paymentMethodData: {
            paymentMethodId: paymentMethod?.id,
          },
        }
      );

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      if (paymentIntent?.status === 'Succeeded') {
        // Record payment success
        const result = await paymentService.confirmPayment(
          paymentIntent.id,
          paymentMethod?.id
        );

        if (result.success) {
          Alert.alert(
            'Success',
            'Payment completed successfully!',
            [
              {
                text: 'OK',
                onPress: () => onSuccess?.(paymentIntent.id, result.receiptUrl),
              },
            ]
          );
        } else {
          throw new Error(result.error || 'Failed to confirm payment');
        }
      } else {
        throw new Error('Payment was not successful');
      }
    } catch (error) {
      console.error('Payment error:', error);
      const errorMessage = paymentService.handlePaymentFailure(error).error;

      Alert.alert(
        'Payment Failed',
        errorMessage || 'An error occurred during payment',
        [
          { text: 'Retry', onPress: () => handlePayPress() },
          { text: 'Cancel', style: 'cancel', onPress: onCancel },
        ]
      );

      onError?.(errorMessage || 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Payment Details</Text>
        <Text style={styles.amount}>
          {currency} {amount.toFixed(2)}
        </Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      <View style={styles.cardContainer}>
        <Text style={styles.label}>Card Information</Text>
        <CardField
          postalCodeEnabled={false}
          placeholders={{
            number: '4242 4242 4242 4242',
          }}
          cardStyle={styles.card}
          style={styles.cardField}
          onCardChange={(details) => {
            setCardDetails(details);
          }}
        />
      </View>

      <View style={styles.securityNote}>
        <Text style={styles.securityIcon}>🔒</Text>
        <Text style={styles.securityText}>
          Your payment information is encrypted and secure
        </Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}
          disabled={isProcessing}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.payButton,
            (!cardDetails?.complete || isProcessing) && styles.disabledButton,
          ]}
          onPress={handlePayPress}
          disabled={!cardDetails?.complete || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.payButtonText}>
              Pay {currency} {amount.toFixed(2)}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Test mode indicator */}
      {__DEV__ && (
        <View style={styles.testMode}>
          <Text style={styles.testModeText}>TEST MODE</Text>
          <Text style={styles.testCardText}>
            Use card: 4242 4242 4242 4242, Any future date, Any CVC
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  amount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
  },
  cardContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  cardField: {
    width: '100%',
    height: 50,
  },
  card: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
    placeholderColor: '#9ca3af',
    textColor: '#111827',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  securityIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  securityText: {
    fontSize: 12,
    color: '#0369a1',
    flex: 1,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
  },
  payButton: {
    backgroundColor: '#10b981',
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  disabledButton: {
    opacity: 0.5,
  },
  testMode: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  testModeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 4,
  },
  testCardText: {
    fontSize: 11,
    color: '#92400e',
  },
});

export default StripeCardField;