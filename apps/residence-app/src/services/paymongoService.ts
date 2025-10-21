import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';


import { MaterialIcons } from '@expo/vector-icons';

// PayMongo API configuration
const PAYMONGO_API_URL = 'https://api.paymongo.com/v1';
const PAYMONGO_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY || '';
const PAYMONGO_SECRET_KEY = process.env.EXPO_PUBLIC_PAYMONGO_SECRET_KEY || '';

export enum PayMongoPaymentMethod {
  GCASH = 'gcash',
  GRAB_PAY = 'grab_pay',
  PAYMAYA = 'paymaya',
  BANK_TRANSFER = 'dob', // DragonPay Online Banking
  CARD = 'card',
}

export interface PayMongoPaymentIntent {
  id: string;
  type: string;
  attributes: {
    amount: number;
    currency: string;
    description?: string;
    status: string;
    payment_method_allowed: string[];
    payment_method_options?: any;
    metadata?: Record<string, any>;
    next_action?: {
      type: string;
      redirect?: {
        url: string;
        return_url: string;
      };
    };
  };
}

export interface PayMongoPaymentResult {
  success: boolean;
  paymentIntentId?: string;
  checkoutUrl?: string;
  status?: string;
  error?: string;
}

class PayMongoService {
  private headers: HeadersInit;

  constructor() {
    // Basic auth header for PayMongo API
    const authString = Buffer.from(`${PAYMONGO_PUBLIC_KEY}:`).toString('base64');
    this.headers = {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  /**
   * Create a payment intent for GCash/GrabPay
   */
  async createPaymentIntent(
    amount: number,
    currency: string = 'PHP',
    description: string,
    paymentMethod: PayMongoPaymentMethod,
    metadata?: Record<string, any>
  ): Promise<PayMongoPaymentResult> {
    try {
      // Call Edge Function to create payment intent server-side
      const { data, error } = await supabase.functions.invoke(
        'create-paymongo-intent',
        {
          body: {
            amount: Math.round(amount * 100), // Convert to cents
            currency: currency.toLowerCase(),
            description,
            payment_method_allowed: [paymentMethod],
            metadata: {
              ...metadata,
              platform: Platform.OS,
            },
          },
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      const paymentIntent = data as PayMongoPaymentIntent;

      // Store payment intent for recovery
      await this.storePaymentIntent(paymentIntent);

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.attributes.status,
      };
    } catch (error) {
      console.error('PayMongo payment intent creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment intent',
      };
    }
  }

  /**
   * Attach payment method and get checkout URL
   */
  async attachPaymentMethod(
    paymentIntentId: string,
    paymentMethod: PayMongoPaymentMethod,
    returnUrl: string
  ): Promise<PayMongoPaymentResult> {
    try {
      // Call Edge Function to attach payment method server-side
      const { data, error } = await supabase.functions.invoke(
        'attach-paymongo-method',
        {
          body: {
            payment_intent_id: paymentIntentId,
            payment_method_type: paymentMethod,
            return_url: returnUrl,
          },
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      const updatedIntent = data as PayMongoPaymentIntent;

      // Get checkout URL from next_action
      const checkoutUrl = updatedIntent.attributes.next_action?.redirect?.url;

      if (!checkoutUrl) {
        throw new Error('No checkout URL received');
      }

      return {
        success: true,
        paymentIntentId: updatedIntent.id,
        checkoutUrl,
        status: updatedIntent.attributes.status,
      };
    } catch (error) {
      console.error('PayMongo payment method attachment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to attach payment method',
      };
    }
  }

  /**
   * Process GCash payment
   */
  async processGCashPayment(
    amount: number,
    description: string,
    metadata?: Record<string, any>
  ): Promise<PayMongoPaymentResult> {
    try {
      // Create payment intent
      const intentResult = await this.createPaymentIntent(
        amount,
        'PHP',
        description,
        PayMongoPaymentMethod.GCASH,
        metadata
      );

      if (!intentResult.success || !intentResult.paymentIntentId) {
        throw new Error(intentResult.error || 'Failed to create payment intent');
      }

      // Generate return URL for app deep link
      const returnUrl = this.generateReturnUrl(intentResult.paymentIntentId);

      // Attach GCash payment method
      const attachResult = await this.attachPaymentMethod(
        intentResult.paymentIntentId,
        PayMongoPaymentMethod.GCASH,
        returnUrl
      );

      if (!attachResult.success || !attachResult.checkoutUrl) {
        throw new Error(attachResult.error || 'Failed to get checkout URL');
      }

      // Open GCash checkout in browser
      await this.openCheckoutUrl(attachResult.checkoutUrl);

      return attachResult;
    } catch (error) {
      console.error('GCash payment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'GCash payment failed',
      };
    }
  }

  /**
   * Process GrabPay payment
   */
  async processGrabPayPayment(
    amount: number,
    description: string,
    metadata?: Record<string, any>
  ): Promise<PayMongoPaymentResult> {
    try {
      // Create payment intent
      const intentResult = await this.createPaymentIntent(
        amount,
        'PHP',
        description,
        PayMongoPaymentMethod.GRAB_PAY,
        metadata
      );

      if (!intentResult.success || !intentResult.paymentIntentId) {
        throw new Error(intentResult.error || 'Failed to create payment intent');
      }

      // Generate return URL for app deep link
      const returnUrl = this.generateReturnUrl(intentResult.paymentIntentId);

      // Attach GrabPay payment method
      const attachResult = await this.attachPaymentMethod(
        intentResult.paymentIntentId,
        PayMongoPaymentMethod.GRAB_PAY,
        returnUrl
      );

      if (!attachResult.success || !attachResult.checkoutUrl) {
        throw new Error(attachResult.error || 'Failed to get checkout URL');
      }

      // Open GrabPay checkout in browser
      await this.openCheckoutUrl(attachResult.checkoutUrl);

      return attachResult;
    } catch (error) {
      console.error('GrabPay payment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'GrabPay payment failed',
      };
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(paymentIntentId: string): Promise<PayMongoPaymentResult> {
    try {
      const { data, error } = await supabase.functions.invoke(
        'check-paymongo-status',
        {
          body: { payment_intent_id: paymentIntentId },
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      const paymentIntent = data as PayMongoPaymentIntent;

      return {
        success: paymentIntent.attributes.status === 'succeeded',
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.attributes.status,
      };
    } catch (error) {
      console.error('PayMongo status check error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check payment status',
      };
    }
  }

  /**
   * Handle payment redirect return
   */
  async handleRedirectReturn(paymentIntentId: string): Promise<PayMongoPaymentResult> {
    try {
      // Check payment status after redirect
      const statusResult = await this.checkPaymentStatus(paymentIntentId);

      if (statusResult.status === 'succeeded') {
        // Clear stored payment intent
        await this.clearStoredPaymentIntent(paymentIntentId);

        // Record payment success via Edge Function
        await supabase.functions.invoke('confirm-paymongo-payment', {
          body: { payment_intent_id: paymentIntentId },
        });
      }

      return statusResult;
    } catch (error) {
      console.error('PayMongo redirect handling error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to handle payment return',
      };
    }
  }

  /**
   * Generate return URL for deep linking
   */
  private generateReturnUrl(paymentIntentId: string): string {
    // Use Expo linking to generate deep link URL
    const scheme = 'residence-app';
    return `${scheme}://payment-return?payment_intent_id=${paymentIntentId}`;
  }

  /**
   * Open checkout URL in browser
   */
  private async openCheckoutUrl(url: string): Promise<void> {
    const canOpen = await Linking.canOpenURL(url);

    if (canOpen) {
      await Linking.openURL(url);
    } else {
      throw new Error('Cannot open payment URL');
    }
  }

  /**
   * Store payment intent for recovery
   */
  private async storePaymentIntent(paymentIntent: PayMongoPaymentIntent): Promise<void> {
    try {
      const key = `paymongo_intent_${paymentIntent.id}`;
      await AsyncStorage.setItem(key, JSON.stringify({
        ...paymentIntent,
        stored_at: Date.now(),
      }));
    } catch (error) {
      console.error('Failed to store PayMongo payment intent:', error);
    }
  }

  /**
   * Clear stored payment intent
   */
  private async clearStoredPaymentIntent(paymentIntentId: string): Promise<void> {
    try {
      const key = `paymongo_intent_${paymentIntentId}`;
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to clear PayMongo payment intent:', error);
    }
  }

  /**
   * Recover abandoned PayMongo payment
   */
  async recoverAbandonedPayment(paymentIntentId: string): Promise<PayMongoPaymentResult | null> {
    try {
      const key = `paymongo_intent_${paymentIntentId}`;
      const stored = await AsyncStorage.getItem(key);

      if (!stored) {
        return null;
      }

      const storedIntent = JSON.parse(stored);

      // Check if intent is still valid (within 24 hours)
      const age = Date.now() - storedIntent.stored_at;
      if (age > 24 * 60 * 60 * 1000) {
        await AsyncStorage.removeItem(key);
        return null;
      }

      // Check current status
      return await this.checkPaymentStatus(paymentIntentId);
    } catch (error) {
      console.error('Failed to recover PayMongo payment:', error);
      return null;
    }
  }

  /**
   * Get supported payment methods for the amount
   */
  getSupportedMethods(amount: number): PayMongoPaymentMethod[] {
    const methods: PayMongoPaymentMethod[] = [];

    // GCash minimum is PHP 1.00
    if (amount >= 1) {
      methods.push(PayMongoPaymentMethod.GCASH);
    }

    // GrabPay minimum is PHP 1.00
    if (amount >= 1) {
      methods.push(PayMongoPaymentMethod.GRAB_PAY);
    }

    // PayMaya minimum is PHP 100.00
    if (amount >= 100) {
      methods.push(PayMongoPaymentMethod.PAYMAYA);
    }

    // Bank transfer minimum is PHP 1.00
    if (amount >= 1) {
      methods.push(PayMongoPaymentMethod.BANK_TRANSFER);
    }

    return methods;
  }

  /**
   * Get payment method display name
   */
  getPaymentMethodName(method: PayMongoPaymentMethod): string {
    switch (method) {
      case PayMongoPaymentMethod.GCASH:
        return 'GCash';
      case PayMongoPaymentMethod.GRAB_PAY:
        return 'GrabPay';
      case PayMongoPaymentMethod.PAYMAYA:
        return 'Maya';
      case PayMongoPaymentMethod.BANK_TRANSFER:
        return 'Online Banking';
      case PayMongoPaymentMethod.CARD:
        return 'Credit/Debit Card';
      default:
        return method;
    }
  }

  /**
   * Get payment method icon name
   */
  getPaymentMethodIconName(method: PayMongoPaymentMethod): string {
    switch (method) {
      case PayMongoPaymentMethod.GCASH:
        return 'payments'; // GCash blue
      case PayMongoPaymentMethod.GRAB_PAY:
        return 'payments'; // GrabPay green
      case PayMongoPaymentMethod.PAYMAYA:
        return 'payments'; // PayMaya/Maya purple
      case PayMongoPaymentMethod.BANK_TRANSFER:
        return 'account-balance'; // Bank
      case PayMongoPaymentMethod.CARD:
        return 'credit-card'; // Card
      default:
        return 'payments';
    }
  }

  /**
   * Get payment method icon color
   */
  getPaymentMethodIconColor(method: PayMongoPaymentMethod): string {
    switch (method) {
      case PayMongoPaymentMethod.GCASH:
        return '#3b82f6'; // GCash blue
      case PayMongoPaymentMethod.GRAB_PAY:
        return '#10b981'; // GrabPay green
      case PayMongoPaymentMethod.PAYMAYA:
        return '#8b5cf6'; // PayMaya/Maya purple
      case PayMongoPaymentMethod.BANK_TRANSFER:
        return '#6b7280'; // Bank
      case PayMongoPaymentMethod.CARD:
        return '#3b82f6'; // Card
      default:
        return '#10b981';
    }
  }
}

// Export singleton instance
export const paymongoService = new PayMongoService();
export default paymongoService;