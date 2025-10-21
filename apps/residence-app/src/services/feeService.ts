import { supabase } from '../lib/supabase';
import database from '../database';
import { Fee } from '../database/models/Fee';
import { FeePayment } from '../database/models/FeePayment';
import syncQueueService, { SyncPriority, SyncAction } from './syncQueue';
import networkStatus from '../lib/networkStatus';
import { Q } from '@nozbe/watermelondb';
import constructionPermitService from './constructionPermitService';

export interface FeeData {
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
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentRequest {
  feeId: string;
  amount: number;
  paymentMethod: 'stripe' | 'paymongo' | 'gcash';
  paymentDetails: {
    // Stripe payment details
    cardNumber?: string;
    expiryDate?: string;
    cvc?: string;
    cardholderName?: string;
    postalCode?: string;
    // PayMongo payment details
    email?: string;
    phoneNumber?: string;
    gcash?: boolean;
    grabpay?: boolean;
    maya?: boolean;
    // Save card for future use
    saveCard?: boolean;
  };
  metadata?: {
    construction_permit_id?: string;
    fee_type?: string;
  };
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  receiptUrl?: string;
  paymentGatewayId?: string;
  error?: string;
  data?: any;
}

export interface FeePaymentResult {
  success: boolean;
  paymentId?: string;
  feeId?: string;
  transactionId?: string;
  receiptUrl?: string;
  error?: string;
  data?: any;
}

class FeeService {
  /**
   * Get all fees for the current household
   */
  async getFees(filter?: 'all' | 'unpaid' | 'paid' | 'overdue'): Promise<FeeData[]> {
    try {
      // Try to get from local database first
      const feesCollection = database.get<Fee>('fees');
      let query = feesCollection.query();

      if (filter && filter !== 'all') {
        if (filter === 'overdue') {
          const now = new Date();
          query = query.where('dueDate', Q.lt(now)).where('status', Q.notEq('paid'));
        } else {
          query = query.where('status', filter);
        }
      }

      query = query.sortBy('dueDate', Q.asc);

      const localFees = await query.fetch();

      // If online, sync with server
      if (networkStatus.isConnected()) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return this.mapLocalFees(localFees);

        const householdId = user.user_metadata?.household_id;
        if (!householdId) return this.mapLocalFees(localFees);

        let serverQuery = supabase
          .from('association_fees')
          .select('*')
          .eq('household_id', householdId)
          .order('due_date', { ascending: true });

        if (filter && filter !== 'all') {
          if (filter === 'overdue') {
            const now = new Date().toISOString();
            serverQuery = serverQuery
              .lt('due_date', now)
              .neq('status', 'paid');
          } else {
            serverQuery = serverQuery.eq('status', filter);
          }
        }

        const { data, error } = await serverQuery;

        if (!error && data) {
          // Update local database
          await this.syncLocalFees(data);
          return data.map(this.mapServerFee);
        }
      }

      // Return local data
      return this.mapLocalFees(localFees);
    } catch (error) {
      console.error('Failed to get fees:', error);
      return [];
    }
  }

  /**
   * Get a specific fee by ID
   */
  async getFee(feeId: string): Promise<FeeData | null> {
    try {
      // Try local database first
      const feesCollection = database.get<Fee>('fees');
      const localFee = await feesCollection.find(feeId).catch(() => null);

      if (localFee) {
        return this.mapLocalFee(localFee);
      }

      // If online, fetch from server
      if (networkStatus.isConnected()) {
        const { data, error } = await supabase
          .from('association_fees')
          .select('*')
          .eq('id', feeId)
          .single();

        if (!error && data) {
          await this.storeLocalFee(data);
          return this.mapServerFee(data);
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to get fee:', error);
      return null;
    }
  }

  /**
   * Process payment for a fee
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    try {
      const isOnline = networkStatus.isConnected();

      if (!isOnline) {
        // Queue for offline sync
        return await this.queueOfflinePayment(request);
      }

      // Get household ID from current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const householdId = user.user_metadata?.household_id;
      if (!householdId) {
        return { success: false, error: 'Household ID not found' };
      }

      // Process payment based on method
      let paymentResult: PaymentResult;

      switch (request.paymentMethod) {
        case 'stripe':
          paymentResult = await this.processStripePayment(request, householdId);
          break;
        case 'paymongo':
          paymentResult = await this.processPayMongoPayment(request, householdId);
          break;
        case 'gcash':
          paymentResult = await this.processGCashPayment(request, householdId);
          break;
        default:
          return { success: false, error: 'Unsupported payment method' };
      }

      if (paymentResult.success) {
        // Update fee status
        await this.updateFeeStatus(request.feeId, 'paid', {
          paidAmount: request.amount,
          paymentMethod: request.paymentMethod,
          transactionId: paymentResult.transactionId,
          receiptUrl: paymentResult.receiptUrl,
        });

        // Store payment record
        await this.createPaymentRecord({
          feeId: request.feeId,
          householdId,
          amount: request.amount,
          paymentMethod: request.paymentMethod,
          transactionId: paymentResult.transactionId!,
          receiptUrl: paymentResult.receiptUrl,
          paymentGatewayId: paymentResult.paymentGatewayId,
          status: 'completed',
        });

        // Check if this is a construction permit fee and update permit status
        if (request.metadata?.construction_permit_id && request.metadata?.fee_type === 'construction_road_fee') {
          try {
            await constructionPermitService.updatePermitStatusAfterPayment(request.metadata.construction_permit_id);
            console.log('Updated construction permit status to in_progress after payment');
          } catch (permitError) {
            console.error('Failed to update construction permit status:', permitError);
            // Don't fail the payment if permit update fails
          }
        }
      }

      return paymentResult;
    } catch (error) {
      console.error('Failed to process payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed',
      };
    }
  }

  /**
   * Process Stripe payment
   */
  private async processStripePayment(request: PaymentRequest, householdId: string): Promise<PaymentResult> {
    try {
      const { data, error } = await supabase.functions.invoke('process-stripe-payment', {
        body: {
          householdId,
          feeId: request.feeId,
          amount: request.amount,
          cardDetails: {
            number: request.paymentDetails.cardNumber,
            exp_month: request.paymentDetails.expiryDate?.split('/')[0],
            exp_year: `20${request.paymentDetails.expiryDate?.split('/')[1]}`,
            cvc: request.paymentDetails.cvc,
            name: request.paymentDetails.cardholderName,
            postal_code: request.paymentDetails.postalCode,
          },
          saveCard: request.paymentDetails.saveCard,
        },
      });

      if (error) {
        console.error('Stripe payment error:', error);
        return { success: false, error: error.message };
      }

      return {
        success: data.success,
        transactionId: data.transactionId,
        receiptUrl: data.receiptUrl,
        paymentGatewayId: data.paymentGatewayId,
        data,
      };
    } catch (error) {
      console.error('Failed to process Stripe payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Stripe payment failed',
      };
    }
  }

  /**
   * Process PayMongo payment
   */
  private async processPayMongoPayment(request: PaymentRequest, householdId: string): Promise<PaymentResult> {
    try {
      const paymentMethodData: any = {
        type: request.paymentDetails.gcash ? 'gcash' :
              request.paymentDetails.grabpay ? 'grab_pay' :
              request.paymentDetails.maya ? 'maya' : null,
      };

      if (request.paymentDetails.email) {
        paymentMethodData.billing = {
          email: request.paymentDetails.email,
          phone: request.paymentDetails.phoneNumber,
          name: request.paymentDetails.cardholderName,
        };
      }

      const { data, error } = await supabase.functions.invoke('process-paymongo-payment', {
        body: {
          householdId,
          feeId: request.feeId,
          amount: request.amount,
          paymentMethod: paymentMethodData,
          cardDetails: request.paymentDetails.cardNumber ? {
            number: request.paymentDetails.cardNumber,
            exp_month: request.paymentDetails.expiryDate?.split('/')[0],
            exp_year: `20${request.paymentDetails.expiryDate?.split('/')[1]}`,
            cvc: request.paymentDetails.cvc,
            name: request.paymentDetails.cardholderName,
          } : null,
        },
      });

      if (error) {
        console.error('PayMongo payment error:', error);
        return { success: false, error: error.message };
      }

      return {
        success: data.success,
        transactionId: data.transactionId,
        receiptUrl: data.receiptUrl,
        paymentGatewayId: data.paymentGatewayId,
        data,
      };
    } catch (error) {
      console.error('Failed to process PayMongo payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PayMongo payment failed',
      };
    }
  }

  /**
   * Process GCash payment
   */
  private async processGCashPayment(request: PaymentRequest, householdId: string): Promise<PaymentResult> {
    try {
      const { data, error } = await supabase.functions.invoke('process-gcash-payment', {
        body: {
          householdId,
          feeId: request.feeId,
          amount: request.amount,
          phoneNumber: request.paymentDetails.phoneNumber,
        },
      });

      if (error) {
        console.error('GCash payment error:', error);
        return { success: false, error: error.message };
      }

      return {
        success: data.success,
        transactionId: data.transactionId,
        receiptUrl: data.receiptUrl,
        paymentGatewayId: data.paymentGatewayId,
        data,
      };
    } catch (error) {
      console.error('Failed to process GCash payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'GCash payment failed',
      };
    }
  }

  /**
   * Queue offline payment for sync
   */
  private async queueOfflinePayment(request: PaymentRequest): Promise<PaymentResult> {
    try {
      // Generate temporary transaction ID
      const tempTransactionId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store payment record locally
      const { data: { user } } = await supabase.auth.getUser();
      const householdId = user?.user_metadata?.household_id;

      if (householdId) {
        await this.createPaymentRecord({
          feeId: request.feeId,
          householdId,
          amount: request.amount,
          paymentMethod: request.paymentMethod,
          transactionId: tempTransactionId,
          status: 'pending',
          isOffline: true,
        });
      }

      // Add to sync queue
      await syncQueueService.addToQueue({
        entityType: 'fee_payment',
        entityId: request.feeId,
        action: SyncAction.CREATE,
        payload: request,
        priority: SyncPriority.HIGH,
      });

      return {
        success: true,
        transactionId: tempTransactionId,
        data: { isOffline: true },
      };
    } catch (error) {
      console.error('Failed to queue offline payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to queue payment',
      };
    }
  }

  /**
   * Get payment history for a household
   */
  async getPaymentHistory(): Promise<any[]> {
    try {
      const paymentsCollection = database.get<FeePayment>('fee_payments');
      const query = paymentsCollection
        .query()
        .sortBy('createdAt', Q.desc);

      const localPayments = await query.fetch();

      // If online, sync with server
      if (networkStatus.isConnected()) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return this.mapLocalPayments(localPayments);

        const householdId = user.user_metadata?.household_id;
        if (!householdId) return this.mapLocalPayments(localPayments);

        const { data, error } = await supabase
          .from('fee_payments')
          .select('*')
          .eq('household_id', householdId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          await this.syncLocalPayments(data);
          return data;
        }
      }

      return this.mapLocalPayments(localPayments);
    } catch (error) {
      console.error('Failed to get payment history:', error);
      return [];
    }
  }

  /**
   * Get receipt URL for a payment
   */
  async getReceiptUrl(transactionId: string): Promise<string | null> {
    try {
      if (networkStatus.isConnected()) {
        const { data, error } = await supabase.functions.invoke('generate-receipt', {
          body: { transactionId },
        });

        if (!error && data?.receiptUrl) {
          return data.receiptUrl;
        }
      }

      // Try to get from local database
      const paymentsCollection = database.get<FeePayment>('fee_payments');
      const payment = await paymentsCollection
        .query(Q.where('transactionId', transactionId))
        .fetch();

      return payment.length > 0 ? payment[0].receiptUrl : null;
    } catch (error) {
      console.error('Failed to get receipt URL:', error);
      return null;
    }
  }

  /**
   * Calculate late fee for a given fee
   */
  calculateLateFee(fee: FeeData): number {
    if (fee.status === 'paid') return 0;

    const now = new Date();
    const dueDate = new Date(fee.dueDate);
    const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysOverdue <= 0) return 0;

    // Late fee calculation (2% per month overdue, minimum 100)
    const monthlyRate = 0.02;
    const monthlyFee = Math.floor(daysOverdue / 30) + 1;
    const calculatedFee = fee.amount * monthlyRate * monthlyFee;
    return Math.max(calculatedFee, 100);
  }

  /**
   * Update fee status locally
   */
  private async updateFeeStatus(
    feeId: string,
    status: 'unpaid' | 'paid' | 'overdue' | 'processing',
    updates: Partial<FeeData> = {}
  ): Promise<void> {
    try {
      const feesCollection = database.get<Fee>('fees');
      const fee = await feesCollection.find(feeId);

      if (fee) {
        await database.write(async () => {
          await fee.update(f => {
            f.status = status;
            if (updates.paidAmount) f.paidAmount = updates.paidAmount;
            if (updates.paymentMethod) f.paymentMethod = updates.paymentMethod;
            if (updates.transactionId) f.transactionId = updates.transactionId;
            if (updates.receiptUrl) f.receiptUrl = updates.receiptUrl;
            if (status === 'paid') f.paidDate = new Date();
          });
        });
      }
    } catch (error) {
      console.error('Failed to update fee status:', error);
    }
  }

  /**
   * Create payment record
   */
  private async createPaymentRecord(paymentData: {
    feeId: string;
    householdId: string;
    amount: number;
    paymentMethod: string;
    transactionId: string;
    receiptUrl?: string;
    paymentGatewayId?: string;
    status: string;
    isOffline?: boolean;
  }): Promise<void> {
    try {
      await database.write(async () => {
        const paymentsCollection = database.get<FeePayment>('fee_payments');
        await paymentsCollection.create(payment => {
          payment.feeId = paymentData.feeId;
          payment.householdId = paymentData.householdId;
          payment.amount = paymentData.amount;
          payment.paymentMethod = paymentData.paymentMethod;
          payment.transactionId = paymentData.transactionId;
          payment.receiptUrl = paymentData.receiptUrl;
          payment.paymentGatewayId = paymentData.paymentGatewayId;
          payment.status = paymentData.status;
          payment.isOffline = paymentData.isOffline || false;
        });
      });
    } catch (error) {
      console.error('Failed to create payment record:', error);
    }
  }

  /**
   * Map server fee data to local format
   */
  private mapServerFee = (data: any): FeeData => ({
    id: data.id,
    type: data.type,
    title: data.title,
    description: data.description,
    amount: data.amount,
    dueDate: new Date(data.due_date),
    status: data.status,
    paidDate: data.paid_date ? new Date(data.paid_date) : undefined,
    paidAmount: data.paid_amount,
    paymentMethod: data.payment_method,
    lateFee: data.late_fee,
    receiptUrl: data.receipt_url,
    recurring: data.recurring,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  });

  /**
   * Map local fee to data format
   */
  private mapLocalFee = (fee: Fee): FeeData => ({
    id: fee.id,
    type: fee.type,
    title: fee.title,
    description: fee.description,
    amount: fee.amount,
    dueDate: fee.dueDate,
    status: fee.status,
    paidDate: fee.paidDate,
    paidAmount: fee.paidAmount,
    paymentMethod: fee.paymentMethod,
    lateFee: fee.lateFee,
    receiptUrl: fee.receiptUrl,
    recurring: fee.recurring,
    createdAt: fee.createdAt,
    updatedAt: fee.updatedAt,
  });

  /**
   * Map local fees array
   */
  private mapLocalFees = (fees: Fee[]): FeeData[] =>
    fees.map(this.mapLocalFee);

  /**
   * Map local payments
   */
  private mapLocalPayments = (payments: FeePayment[]): any[] =>
    payments.map(payment => ({
      id: payment.id,
      feeId: payment.feeId,
      householdId: payment.householdId,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      transactionId: payment.transactionId,
      receiptUrl: payment.receiptUrl,
      paymentGatewayId: payment.paymentGatewayId,
      status: payment.status,
      isOffline: payment.isOffline,
      createdAt: payment.createdAt,
    }));

  /**
   * Store fee in local database
   */
  private async storeLocalFee(feeData: any): Promise<void> {
    try {
      await database.write(async () => {
        const feesCollection = database.get<Fee>('fees');

        // Check if exists
        const existing = await feesCollection
          .query(Q.where('remote_id', feeData.id))
          .fetch();

        if (existing.length > 0) {
          // Update existing
          await existing[0].update(fee => {
            this.updateFeeFields(fee, feeData);
          });
        } else {
          // Create new
          await feesCollection.create(fee => {
            fee.remoteId = feeData.id;
            this.updateFeeFields(fee, feeData);
          });
        }
      });
    } catch (error) {
      console.error('Failed to store local fee:', error);
    }
  }

  /**
   * Update fee fields
   */
  private updateFeeFields(fee: Fee, data: any): void {
    fee.type = data.type;
    fee.title = data.title;
    fee.description = data.description;
    fee.amount = data.amount;
    fee.dueDate = new Date(data.due_date);
    fee.status = data.status;
    fee.paidDate = data.paid_date ? new Date(data.paid_date) : undefined;
    fee.paidAmount = data.paid_amount;
    fee.paymentMethod = data.payment_method;
    fee.lateFee = data.late_fee;
    fee.receiptUrl = data.receipt_url;
    fee.recurring = data.recurring;
  }

  /**
   * Sync local fees with server data
   */
  private async syncLocalFees(serverData: any[]): Promise<void> {
    try {
      await database.write(async () => {
        const feesCollection = database.get<Fee>('fees');

        for (const serverFee of serverData) {
          const existing = await feesCollection
            .query(Q.where('remote_id', serverFee.id))
            .fetch();

          if (existing.length > 0) {
            await existing[0].update(fee => {
              this.updateFeeFields(fee, serverFee);
            });
          } else {
            await feesCollection.create(fee => {
              fee.remoteId = serverFee.id;
              this.updateFeeFields(fee, serverFee);
            });
          }
        }
      });
    } catch (error) {
      console.error('Failed to sync local fees:', error);
    }
  }

  /**
   * Sync local payments with server data
   */
  private async syncLocalPayments(serverData: any[]): Promise<void> {
    try {
      await database.write(async () => {
        const paymentsCollection = database.get<FeePayment>('fee_payments');

        for (const serverPayment of serverData) {
          const existing = await paymentsCollection
            .query(Q.where('transactionId', serverPayment.transaction_id))
            .fetch();

          if (existing.length > 0) {
            await existing[0].update(payment => {
              payment.status = serverPayment.status;
              payment.receiptUrl = serverPayment.receipt_url;
              payment.paymentGatewayId = serverPayment.payment_gateway_id;
              payment.isOffline = false;
            });
          } else {
            await paymentsCollection.create(payment => {
              payment.feeId = serverPayment.fee_id;
              payment.householdId = serverPayment.household_id;
              payment.amount = serverPayment.amount;
              payment.paymentMethod = serverPayment.payment_method;
              payment.transactionId = serverPayment.transaction_id;
              payment.receiptUrl = serverPayment.receipt_url;
              payment.paymentGatewayId = serverPayment.payment_gateway_id;
              payment.status = serverPayment.status;
              payment.isOffline = false;
            });
          }
        }
      });
    } catch (error) {
      console.error('Failed to sync local payments:', error);
    }
  }
}

// Export singleton instance
export const feeService = new FeeService();
export default feeService;