import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';


import { MaterialIcons } from '@expo/vector-icons';interface CardDetails {
  cardNumber: string;
  expiryDate: string;
  cvc: string;
  cardholderName: string;
  postalCode?: string;
}

interface StripePaymentSheetProps {
  visible: boolean;
  amount: number;
  feeDescription: string;
  isSubmitting?: boolean;
  onSubmit?: (cardDetails: CardDetails) => void;
  onCancel?: () => void;
  savedCards?: SavedCard[];
  onUseSavedCard?: (cardId: string) => void;
}

interface SavedCard {
  id: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  cardholderName: string;
  isDefault?: boolean;
}

export const StripePaymentSheet: React.FC<StripePaymentSheetProps> = ({
  visible,
  amount,
  feeDescription,
  isSubmitting = false,
  onSubmit,
  onCancel,
  savedCards = [],
  onUseSavedCard,
}) => {
  const [cardDetails, setCardDetails] = useState<CardDetails>({
    cardNumber: '',
    expiryDate: '',
    cvc: '',
    cardholderName: '',
    postalCode: '',
  });

  const [useNewCard, setUseNewCard] = useState(true);
  const [errors, setErrors] = useState<Partial<CardDetails>>({});
  const [showCVC, setShowCVC] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setCardDetails({
        cardNumber: '',
        expiryDate: '',
        cvc: '',
        cardholderName: '',
        postalCode: '',
      });
      setErrors({});
      setUseNewCard(true);
      setShowCVC(false);
    }
  }, [visible]);

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
    const newErrors: Partial<CardDetails> = {};

    // Card number validation (basic Luhn check)
    const cardNumber = cardDetails.cardNumber.replace(/\s/g, '');
    if (cardNumber.length < 13 || cardNumber.length > 19) {
      newErrors.cardNumber = 'Invalid card number';
    } else if (!luhnCheck(cardNumber)) {
      newErrors.cardNumber = 'Invalid card number';
    }

    // Expiry date validation
    const expiryMatch = cardDetails.expiryDate.match(/^(0[1-9]|1[0-2])\/\d{2}$/);
    if (!expiryMatch) {
      newErrors.expiryDate = 'Invalid expiry date (MM/YY)';
    } else {
      const [month, year] = expiryMatch[1].split('/').map(Number);
      const currentYear = new Date().getFullYear() % 100;
      const currentMonth = new Date().getMonth() + 1;

      if (year < currentYear || (year === currentYear && month < currentMonth)) {
        newErrors.expiryDate = 'Card has expired';
      }
    }

    // CVC validation
    if (!cardDetails.cvc || cardDetails.cvc.length < 3 || cardDetails.cvc.length > 4) {
      newErrors.cvc = 'Invalid CVC';
    }

    // Cardholder name validation
    if (!cardDetails.cardholderName || cardDetails.cardholderName.trim().length < 3) {
      newErrors.cardholderName = 'Cardholder name required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const luhnCheck = (cardNumber: string): boolean => {
    let sum = 0;
    let isEven = false;

    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  };

  const handleInputChange = (field: keyof CardDetails, value: string) => {
    let formattedValue = value;

    if (field === 'cardNumber') {
      formattedValue = formatCardNumber(value);
    } else if (field === 'expiryDate') {
      formattedValue = formatExpiryDate(value);
    } else if (field === 'cvc') {
      formattedValue = value.replace(/\D/g, '').slice(0, 4);
    }

    setCardDetails(prev => ({ ...prev, [field]: formattedValue }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    onSubmit?.({
      ...cardDetails,
      cardNumber: cardDetails.cardNumber.replace(/\s/g, ''),
    });
  };

  const getCardBrand = (cardNumber: string): string => {
    const cleaned = cardNumber.replace(/\s/g, '');

    if (cleaned.startsWith('4')) return 'visa';
    if (cleaned.startsWith('5') || cleaned.startsWith('2')) return 'mastercard';
    if (cleaned.startsWith('3')) {
      if (cleaned.startsWith('34') || cleaned.startsWith('37')) return 'amex';
      if (cleaned.startsWith('65') || cleaned.startsWith('2131') || cleaned.startsWith('1800')) return 'jcb';
      if (cleaned.startsWith('36') || cleaned.startsWith('38')) return 'diners';
    }
    if (cleaned.startsWith('6')) return 'discover';

    return 'unknown';
  };

  const getCardBrandIcon = (brand: string): string => {
    switch (brand) {
      case 'visa': <MaterialIcons name="credit-card" size={16} color="#6b7280" />;
      case 'mastercard': <MaterialIcons name="credit-card" size={16} color="#6b7280" />;
      case 'amex': <MaterialIcons name="credit-card" size={16} color="#6b7280" />;
      case 'jcb': <MaterialIcons name="credit-card" size={16} color="#6b7280" />;
      case 'diners': <MaterialIcons name="credit-card" size={16} color="#6b7280" />;
      case 'discover': <MaterialIcons name="credit-card" size={16} color="#6b7280" />;
      default: <MaterialIcons name="credit-card" size={16} color="#6b7280" />;
    }
  };

  const cardBrand = getCardBrand(cardDetails.cardNumber);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Button
            variant="ghost"
            onPress={onCancel}
            style={styles.cancelButton}
          >
            Cancel
          </Button>
          <Text style={styles.title}>Stripe Payment</Text>
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

        {/* Saved Cards */}
        {savedCards.length > 0 && (
          <Card style={styles.savedCardsCard}>
            <Text style={styles.savedCardsTitle}>Saved Cards</Text>
            <View style={styles.savedCardsList}>
              {savedCards.map(card => (
                <Pressable
                  key={card.id}
                  style={[
                    styles.savedCardItem,
                    !useNewCard && card.id === savedCards.find(c => c.isDefault)?.id && styles.selectedCard
                  ]}
                  onPress={() => {
                    setUseNewCard(false);
                    onUseSavedCard?.(card.id);
                  }}
                >
                  <View style={styles.savedCardInfo}>
                    <Text style={styles.savedCardBrand}>
                      {getCardBrandIcon(card.brand)} {card.brand.toUpperCase()}
                    </Text>
                    <Text style={styles.savedCardNumber}>
                      •••• •••• •••• {card.last4}
                    </Text>
                    <Text style={styles.savedCardName}>{card.cardholderName}</Text>
                  </View>
                  <View style={styles.savedCardMeta}>
                    <Text style={styles.savedCardExpiry}>
                      {card.expiryMonth.toString().padStart(2, '0')}/{card.expiryYear.toString().slice(-2)}
                    </Text>
                    {card.isDefault && (
                      <Badge variant="primary" size="sm">Default</Badge>
                    )}
                  </View>
                </Pressable>
              ))}
              <Pressable
                style={[
                  styles.newCardOption,
                  useNewCard && styles.selectedCard
                ]}
                onPress={() => setUseNewCard(true)}
              >
                <Text style={styles.newCardText}>+ Add New Card</Text>
              </Pressable>
            </View>
          </Card>
        )}

        {/* New Card Form */}
        {useNewCard && (
          <Card style={styles.cardFormCard}>
            <Text style={styles.formTitle}>Card Details</Text>

            {/* Card Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Card Number</Text>
              <Input
                value={cardDetails.cardNumber}
                onChangeText={(value) => handleInputChange('cardNumber', value)}
                placeholder="1234 5678 9012 3456"
                keyboardType="numeric"
                maxLength={19}
                error={errors.cardNumber}
                style={styles.cardInput}
                leftIcon={getCardBrandIcon(cardBrand)}
              />
            </View>

            {/* Expiry Date and CVC */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.inputLabel}>Expiry Date</Text>
                <Input
                  value={cardDetails.expiryDate}
                  onChangeText={(value) => handleInputChange('expiryDate', value)}
                  placeholder="MM/YY"
                  keyboardType="numeric"
                  maxLength={5}
                  error={errors.expiryDate}
                />
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.inputLabel}>CVC</Text>
                <View style={styles.cvcContainer}>
                  <Input
                    value={showCVC ? cardDetails.cvc : cardDetails.cvc.replace(/./g, <MaterialIcons name="circle" size={8} color="#6b7280" />)}
                    onChangeText={(value) => handleInputChange('cvc', value)}
                    placeholder="123"
                    keyboardType="numeric"
                    maxLength={4}
                    error={errors.cvc}
                    style={styles.cvcInput}
                  />
                  <Pressable
                    style={styles.cvcToggle}
                    onPress={() => setShowCVC(!showCVC)}
                  >
                    <Text style={styles.cvcToggleText}>{showCVC ? <MaterialIcons name="visibility" size={16} color="#6b7280" /> : <MaterialIcons name="lock" size={16} color="#6b7280" />}</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Cardholder Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Cardholder Name</Text>
              <Input
                value={cardDetails.cardholderName}
                onChangeText={(value) => handleInputChange('cardholderName', value)}
                placeholder="John Doe"
                autoCapitalize="words"
                error={errors.cardholderName}
              />
            </View>

            {/* Postal Code */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Postal Code (Optional)</Text>
              <Input
                value={cardDetails.postalCode}
                onChangeText={(value) => handleInputChange('postalCode', value)}
                placeholder="12345"
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
          </Card>
        )}

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
            All payments are processed through Stripe's secure payment gateway.
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
            disabled={isSubmitting || (!useNewCard && savedCards.length === 0)}
            loading={isSubmitting}
            style={styles.payButton}
          >
            {isSubmitting ? 'Processing...' : `Pay ₱${amount.toFixed(2)}`}
          </Button>
        </View>
      </View>
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
  savedCardsCard: {
    margin: 16,
    marginBottom: 8,
  },
  savedCardsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  savedCardsList: {
    gap: 8,
  },
  savedCardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectedCard: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  savedCardInfo: {
    flex: 1,
  },
  savedCardBrand: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  savedCardNumber: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  savedCardName: {
    fontSize: 12,
    color: '#6b7280',
  },
  savedCardMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  savedCardExpiry: {
    fontSize: 12,
    color: '#6b7280',
  },
  newCardOption: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  newCardText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
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
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  cardInput: {
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  cvcContainer: {
    position: 'relative',
  },
  cvcInput: {
    paddingRight: 40,
  },
  cvcToggle: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cvcToggleText: {
    fontSize: 16,
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
  },
  cancelButton: {
    flex: 1,
  },
  payButton: {
    flex: 2,
  },
});

export default StripePaymentSheet;