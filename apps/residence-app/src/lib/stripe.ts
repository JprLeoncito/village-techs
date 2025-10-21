/**
 * Mock Stripe Service
 *
 * This file provides mock Stripe functionality for development purposes.
 * Since we're using mock payments, this service just provides placeholder
 * functions to maintain compatibility with existing code.
 */

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StripeConfig {
  publishableKey: string;
  merchantIdentifier?: string;
  urlScheme?: string;
  setReturnUrlSchemeOnAndroid?: boolean;
}

class MockStripeService {
  private isInitialized = false;
  private config: StripeConfig;

  constructor() {
    this.config = {
      publishableKey: 'mock-key',
      merchantIdentifier: 'merchant.com.villagetech.residence',
      urlScheme: 'residence-app',
      setReturnUrlSchemeOnAndroid: true,
    };
  }

  /**
   * Initialize mock Stripe
   */
  async initialize(): Promise<boolean> {
    this.isInitialized = true;
    console.log('Mock Stripe initialized successfully');
    return true;
  }

  /**
   * Get mock Stripe configuration
   */
  getConfig(): StripeConfig {
    return this.config;
  }

  /**
   * Check if mock Stripe is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Store customer ID for future use
   */
  async setCustomerId(customerId: string): Promise<void> {
    try {
      await AsyncStorage.setItem('stripe_customer_id', customerId);
    } catch (error) {
      console.error('Failed to store customer ID:', error);
    }
  }

  /**
   * Get stored customer ID
   */
  async getCustomerId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('stripe_customer_id');
    } catch (error) {
      console.error('Failed to retrieve customer ID:', error);
      return null;
    }
  }

  /**
   * Clear stored customer data
   */
  async clearCustomerData(): Promise<void> {
    try {
      await AsyncStorage.removeItem('stripe_customer_id');
    } catch (error) {
      console.error('Failed to clear customer data:', error);
    }
  }
}

// Export singleton instance
export const stripeService = new MockStripeService();

/**
 * Mock Stripe Provider component wrapper
 * This just returns children without providing any Stripe functionality
 */
export const StripeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return React.createElement(React.Fragment, null, children);
};

export default stripeService;