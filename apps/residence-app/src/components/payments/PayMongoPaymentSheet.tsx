import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';


import { MaterialIcons } from '@expo/vector-icons';interface PaymentDetails {
  email?: string;
  phoneNumber?: string;
  paymentMethod: 'gcash' | 'grabpay' | 'maya' | 'card';
  cardDetails?: {
    cardNumber: string;
    expiryDate: string;
    cvc: string;
    cardholderName: string;
  };
}

interface PayMongoPaymentSheetProps {
  visible: boolean;
  amount: number;
  feeDescription: string;
  isSubmitting?: boolean;
  onSubmit?: (paymentDetails: PaymentDetails) => void;
  onCancel?: () => void;
  supportedMethods?: Array<'gcash' | 'grabpay' | 'maya' | 'card'>;
}

interface PaymentMethodInfo {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  backgroundColor: string;
}

const PAYMENT_METHODS: Record<string, PaymentMethodInfo> = {
  gcash: {
    id: 'gcash',
    name: 'GCash',
    icon: <MaterialIcons name="smartphone" size={16} color="#6b7280" />,
    description: 'Pay with GCash mobile wallet',
    color: '#0066cc',
    backgroundColor: '#e6f3ff',
  },
  grabpay: {
    id: 'grabpay',
    name: 'GrabPay',
    icon: <MaterialIcons name="directions-car" size={64} color="#3b82f6" />,
    description: 'Pay with GrabPay wallet',
    color: '#00aa13',
    backgroundColor: '#e8f5e8',
  },
  maya: {
    id: 'maya',
    name: 'Maya',
    icon: '💎',
    description: 'Pay with Maya wallet',
    color: '#ff6b35',
    backgroundColor: '#fff0eb',
  },
  card: {
    id: 'card',
    name: 'Credit/Debit Card',
    icon: <MaterialIcons name="credit-card" size={16} color="#6b7280" />,
    description: 'Pay with credit or debit card',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
  },
};

export const PayMongoPaymentSheet: React.FC<PayMongoPaymentSheetProps> = ({
  visible,
  amount,
  feeDescription,
  isSubmitting = false,
  onSubmit,
  onCancel,
  supportedMethods = ['gcash', 'grabpay', 'maya', 'card'],
}) => {
  const [selectedMethod, setSelectedMethod] = useState<string>('gcash');
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    paymentMethod: 'gcash',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCardForm, setShowCardForm] = useState(false);

  useEffect(() => {
    if (visible) {
      setPaymentDetails({
        paymentMethod: supportedMethods[0] as any,
      });
      setSelectedMethod(supportedMethods[0]);
      setErrors({});
      setShowCardForm(false);
    }
  }, [visible, supportedMethods]);

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const chunks = cleaned.match(/.{1,4}/g) || [];
    return chunks.join(' ').substr(0, 19);
  };

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email or phone number validation
    if (!paymentDetails.email && !paymentDetails.phoneNumber) {
      newErrors.contact = 'Email or phone number is required';
    } else {
      if (paymentDetails.email && !isValidEmail(paymentDetails.email)) {
        newErrors.email = 'Invalid email address';
      }
      if (paymentDetails.phoneNumber && !isValidPhoneNumber(paymentDetails.phoneNumber)) {
        newErrors.phoneNumber = 'Invalid phone number';
      }
    }

    // Card validation for card payments
    if (selectedMethod === 'card') {
      const cardDetails = paymentDetails.cardDetails;
      if (!cardDetails) {
        newErrors.card = 'Card details are required';
      } else {
        const cardNumber = cardDetails.cardNumber.replace(/\s/g, '');
        if (cardNumber.length < 13 || cardNumber.length > 19) {
          newErrors.cardNumber = 'Invalid card number';
        }

        const expiryMatch = cardDetails.expiryDate.match(/^(0[1-9]|1[0-2])\/\d{2}$/);
        if (!expiryMatch) {
          newErrors.expiryDate = 'Invalid expiry date (MM/YY)';
        }

        if (!cardDetails.cvc || cardDetails.cvc.length < 3 || cardDetails.cvc.length > 4) {
          newErrors.cvc = 'Invalid CVC';
        }

        if (!cardDetails.cardholderName || cardDetails.cardholderName.trim().length < 3) {
          newErrors.cardholderName = 'Cardholder name required';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPhoneNumber = (phone: string): boolean => {
    // Philippine phone number validation (10-11 digits)
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 11;
  };

  const handleInputChange = (field: keyof PaymentDetails, value: string) => {
    let formattedValue = value;

    if (field === 'phoneNumber') {
      formattedValue = value.replace(/\D/g, '');
    }

    setPaymentDetails(prev => ({ ...prev, [field]: formattedValue }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCardInputChange = (field: string, value: string) => {
    let formattedValue = value;

    if (field === 'cardNumber') {
      formattedValue = formatCardNumber(value);
    } else if (field === 'expiryDate') {
      formattedValue = formatExpiryDate(value);
    } else if (field === 'cvc') {
      formattedValue = value.replace(/\D/g, '').slice(0, 4);
    }

    setPaymentDetails(prev => ({
      ...prev,
      cardDetails: {
        ...prev.cardDetails,
        [field]: formattedValue,
      },
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePaymentMethodSelect = (method: string) => {
    setSelectedMethod(method);
    setPaymentDetails(prev => ({
      ...prev,
      paymentMethod: method as any,
      cardDetails: method === 'card' ? prev.cardDetails : undefined,
    }));
    setShowCardForm(method === 'card');
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    const submissionDetails: PaymentDetails = {
      ...paymentDetails,
      paymentMethod: selectedMethod as any,
    };

    onSubmit?.(submissionDetails);
  };

  const availableMethods = supportedMethods.map(method => PAYMENT_METHODS[method]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Button
            variant="ghost"
            onPress={onCancel}
            style={styles.cancelButton}
          >
            Cancel
          </Button>
          <Text style={styles.title}>PayMongo Payment</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Payment Summary */}
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Payment Summary</Text>
          <Text style={styles.feeDescription}>{feeDescription}</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Total Amount:</Text>
            <Text style={styles.amountValue}>₱{amount.toFixed(2)}</Text>
          </View>
        </Card>

        {/* Payment Methods */}
        <Card style={styles.methodsCard}>
          <Text style={styles.methodsTitle}>Select Payment Method</Text>
          <View style={styles.methodsList}>
            {availableMethods.map(method => (
              <Pressable
                key={method.id}
                style={[
                  styles.methodItem,
                  selectedMethod === method.id && {
                    borderColor: method.color,
                    backgroundColor: method.backgroundColor,
                  },
                ]}
                onPress={() => handlePaymentMethodSelect(method.id)}
              >
                <View style={styles.methodInfo}>
                  <Text style={styles.methodIcon}>{method.icon}</Text>
                  <View style={styles.methodDetails}>
                    <Text style={styles.methodName}>{method.name}</Text>
                    <Text style={styles.methodDescription}>{method.description}</Text>
                  </View>
                </View>
                <View style={[
                  styles.radioButton,
                  selectedMethod === method.id && {
                    borderColor: method.color,
                    backgroundColor: method.color,
                  },
                ]}>
                  <View style={styles.radioButtonInner} />
                </View>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* Contact Information */}
        <Card style={styles.contactCard}>
          <Text style={styles.contactTitle}>Contact Information</Text>
          <Text style={styles.contactSubtitle}>
            We'll use this to send payment confirmation
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <Input
              value={paymentDetails.email || ''}
              onChangeText={(value) => handleInputChange('email', value)}
              placeholder="john@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <Input
              value={paymentDetails.phoneNumber || ''}
              onChangeText={(value) => handleInputChange('phoneNumber', value)}
              placeholder="09123456789"
              keyboardType="phone-pad"
              error={errors.phoneNumber}
            />
          </View>

          {errors.contact && (
            <Text style={styles.errorText}>{errors.contact}</Text>
          )}
        </Card>

        {/* Card Details Form (shown only when card is selected) */}
        {selectedMethod === 'card' && (
          <Card style={styles.cardFormCard}>
            <Text style={styles.formTitle}>Card Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Card Number</Text>
              <Input
                value={paymentDetails.cardDetails?.cardNumber || ''}
                onChangeText={(value) => handleCardInputChange('cardNumber', value)}
                placeholder="1234 5678 9012 3456"
                keyboardType="numeric"
                maxLength={19}
                error={errors.cardNumber}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.inputLabel}>Expiry Date</Text>
                <Input
                  value={paymentDetails.cardDetails?.expiryDate || ''}
                  onChangeText={(value) => handleCardInputChange('expiryDate', value)}
                  placeholder="MM/YY"
                  keyboardType="numeric"
                  maxLength={5}
                  error={errors.expiryDate}
                />
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.inputLabel}>CVC</Text>
                <Input
                  value={paymentDetails.cardDetails?.cvc || ''}
                  onChangeText={(value) => handleCardInputChange('cvc', value)}
                  placeholder="123"
                  keyboardType="numeric"
                  maxLength={4}
                  error={errors.cvc}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Cardholder Name</Text>
              <Input
                value={paymentDetails.cardDetails?.cardholderName || ''}
                onChangeText={(value) => handleCardInputChange('cardholderName', value)}
                placeholder="John Doe"
                autoCapitalize="words"
                error={errors.cardholderName}
              />
            </View>
          </Card>
        )}

        {/* Method-specific Instructions */}
        {selectedMethod !== 'card' && (
          <Card style={styles.instructionCard}>
            <View style={styles.instructionHeader}>
              <Text style={styles.instructionIcon}>
                {PAYMENT_METHODS[selectedMethod].icon}
              </Text>
              <Text style={styles.instructionTitle}>
                How to pay with {PAYMENT_METHODS[selectedMethod].name}
              </Text>
            </View>
            <Text style={styles.instructionText}>
              {selectedMethod === 'gcash' && (
                'You will be redirected to the GCash app to complete your payment. Make sure you have sufficient balance in your GCash wallet.'
              )}
              {selectedMethod === 'grabpay' && (
                'You will be redirected to the Grab app to complete your payment. Make sure you have sufficient balance in your GrabPay wallet.'
              )}
              {selectedMethod === 'maya' && (
                'You will be redirected to the Maya app to complete your payment. Make sure you have sufficient balance in your Maya wallet.'
              )}
            </Text>
          </Card>
        )}

        {/* Security Notice */}
        <Card style={styles.securityCard}>
          <View style={styles.securityHeader}>
            <Text style={styles.securityIcon}>🔒</Text>
            <Text style={styles.securityTitle}>Secure Payment</Text>
          </View>
          <Text style={styles.securityText}>
            Your payment information is encrypted and secure. We never store your payment details on our servers.
          </Text>
          <Text style={styles.securityText}>
            All payments are processed through PayMongo's secure payment gateway.
          </Text>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            variant="outline"
            onPress={onCancel}
            disabled={isSubmitting}
            style={styles.cancelButton}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onPress={handleSubmit}
            disabled={isSubmitting}
            loading={isSubmitting}
            style={styles.payButton}
          >
            {isSubmitting ? 'Processing...' : `Pay ₱${amount.toFixed(2)}`}
          </Button>
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  placeholder: {
    width: 60,
  },
  summaryCard: {
    margin: 16,
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  feeDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  amountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  amountValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  methodsCard: {
    margin: 16,
    marginBottom: 8,
  },
  methodsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  methodsList: {
    gap: 12,
  },
  methodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  methodDetails: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  methodDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  contactCard: {
    margin: 16,
    marginBottom: 8,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  contactSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: -12,
    marginBottom: 12,
  },
  cardFormCard: {
    margin: 16,
    marginBottom: 8,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  instructionCard: {
    margin: 16,
    marginBottom: 8,
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  instructionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  instructionText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
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
  actions: {
    flexDirection: 'row',
    gap: 12,
    margin: 16,
    marginTop: 8,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
  },
  payButton: {
    flex: 2,
  },
});

export default PayMongoPaymentSheet;