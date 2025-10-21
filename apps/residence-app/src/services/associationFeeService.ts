import { supabase } from '../lib/supabase';
import networkStatus from '../lib/networkStatus';
import { CacheService } from '../lib/cache';
import { OfflineQueue } from '../lib/offlineQueue';

// Database interface matching the Supabase schema
export interface AssociationFee {
  id: string;
  tenant_id: string;
  household_id: string;
  fee_type: 'monthly' | 'quarterly' | 'annual' | 'special_assessment';
  amount: number;
  due_date: string;
  payment_status: 'unpaid' | 'paid' | 'overdue' | 'waived' | 'partial';
  paid_amount: number;
  payment_date?: string;
  payment_method?: 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'online';
  receipt_url?: string;
  waived_by?: string;
  waived_at?: string;
  waiver_reason?: string;
  recorded_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FeePaymentRequest {
  feeId: string;
  amount: number;
  paymentMethod: AssociationFee['payment_method'];
  paymentDetails?: {
    // For online payments
    transactionId?: string;
    paymentGateway?: 'stripe' | 'paymongo' | 'gcash';
    // For check/bank transfers
    checkNumber?: string;
    bankName?: string;
    accountNumber?: string;
    // Reference numbers
    referenceNumber?: string;
  };
  notes?: string;
}

export interface FeeFilter {
  status?: AssociationFee['payment_status'];
  feeType?: AssociationFee['fee_type'];
  dateRange?: {
    start: string;
    end: string;
  };
  search?: string;
  sortBy?: 'due_date' | 'amount' | 'created_at' | 'payment_date';
  sortOrder?: 'asc' | 'desc';
}

export interface FeeStatistics {
  total: number;
  unpaid: number;
  paid: number;
  overdue: number;
  waived: number;
  partial: number;
  totalAmount: number;
  paidAmount: number;
  outstandingBalance: number;
  byType: {
    monthly: number;
    quarterly: number;
    annual: number;
    special_assessment: number;
  };
}

export interface FeeServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

class AssociationFeeService {
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get all fees for the current household
   */
  async getFees(householdId: string, filter?: FeeFilter): Promise<AssociationFee[]> {
    try {
      // Try cache first
      const cacheKey = `fees_${householdId}_${JSON.stringify(filter)}`;
      const cachedFees = await CacheService.getCachedData<AssociationFee[]>(cacheKey);
      if (cachedFees) {
        return cachedFees;
      }

      // Build query
      let query = supabase
        .from('association_fees')
        .select('*')
        .eq('household_id', householdId);

      // Apply filters
      if (filter?.status) {
        query = query.eq('payment_status', filter.status);
      }

      if (filter?.feeType) {
        query = query.eq('fee_type', filter.feeType);
      }

      if (filter?.search) {
        query = query.or(`notes.ilike.%${filter.search}%,fee_type.ilike.%${filter.search}%`);
      }

      if (filter?.dateRange) {
        query = query
          .gte('due_date', filter.dateRange.start)
          .lte('due_date', filter.dateRange.end);
      }

      // Apply sorting
      const sortBy = filter?.sortBy || 'due_date';
      const sortOrder = filter?.sortOrder || 'asc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching fees:', error);
        return [];
      }

      const fees = (data || []) as AssociationFee[];

      // Update overdue status for unpaid fees
      const updatedFees = await this.updateOverdueStatus(fees);

      // Cache the data
      await CacheService.setCachedData(cacheKey, updatedFees, this.CACHE_DURATION);

      return updatedFees;
    } catch (error) {
      console.error('Failed to get fees:', error);
      return [];
    }
  }

  /**
   * Get a specific fee by ID
   */
  async getFeeById(feeId: string): Promise<FeeServiceResult<AssociationFee>> {
    try {
      // Try cache first
      const cacheKey = `fee_${feeId}`;
      const cachedFee = await CacheService.getCachedData<AssociationFee>(cacheKey);
      if (cachedFee) {
        return { success: true, data: cachedFee };
      }

      const { data, error } = await supabase
        .from('association_fees')
        .select('*')
        .eq('id', feeId)
        .single();

      if (error) {
        console.error('Error fetching fee:', error);
        return { success: false, error: 'Fee not found' };
      }

      const fee = data as AssociationFee;

      // Check and update overdue status
      const updatedFee = await this.checkAndUpdateOverdueStatus(fee);

      // Cache the data
      await CacheService.setCachedData(cacheKey, updatedFee, this.CACHE_DURATION);

      return { success: true, data: updatedFee };
    } catch (error) {
      console.error('Failed to get fee:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get fee',
      };
    }
  }

  /**
   * Process payment for a fee
   */
  async processPayment(householdId: string, paymentRequest: FeePaymentRequest): Promise<FeeServiceResult<AssociationFee>> {
    try {
      if (!networkStatus.isConnected()) {
        // Queue for offline sync
        await OfflineQueue.addAction('fee_payment', {
          householdId,
          paymentRequest,
        });
        return {
          success: true,
          data: {
            id: paymentRequest.feeId,
            household_id: householdId,
            payment_status: 'processing',
            paid_amount: paymentRequest.amount,
            payment_method: paymentRequest.paymentMethod,
            updated_at: new Date().toISOString(),
          } as AssociationFee,
        };
      }

      // Get current fee to check status
      const { data: currentFee, error: fetchError } = await supabase
        .from('association_fees')
        .select('*')
        .eq('id', paymentRequest.feeId)
        .eq('household_id', householdId)
        .single();

      if (fetchError || !currentFee) {
        return { success: false, error: 'Fee not found' };
      }

      // Calculate new payment status and amount
      const newPaidAmount = currentFee.paid_amount + paymentRequest.amount;
      let newStatus: AssociationFee['payment_status'];

      if (newPaidAmount >= currentFee.amount) {
        newStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newStatus = 'partial';
      } else {
        newStatus = 'unpaid';
      }

      // Update fee with payment
      const { data, error } = await supabase
        .from('association_fees')
        .update({
          payment_status: newStatus,
          paid_amount: newPaidAmount,
          payment_date: new Date().toISOString(),
          payment_method: paymentRequest.paymentMethod,
          notes: paymentRequest.notes || currentFee.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentRequest.feeId)
        .eq('household_id', householdId)
        .select()
        .single();

      if (error) {
        console.error('Error processing payment:', error);
        return { success: false, error: error.message };
      }

      // Clear cache
      await this.clearCache(householdId);
      await this.clearCacheForFee(paymentRequest.feeId);

      return { success: true, data: data as AssociationFee };
    } catch (error) {
      console.error('Failed to process payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process payment',
      };
    }
  }

  /**
   * Get fee statistics for the household
   */
  async getFeeStatistics(householdId: string): Promise<FeeStatistics> {
    try {
      const fees = await this.getFees(householdId);

      const stats: FeeStatistics = {
        total: fees.length,
        unpaid: 0,
        paid: 0,
        overdue: 0,
        waived: 0,
        partial: 0,
        totalAmount: 0,
        paidAmount: 0,
        outstandingBalance: 0,
        byType: {
          monthly: 0,
          quarterly: 0,
          annual: 0,
          special_assessment: 0,
        },
      };

      fees.forEach(fee => {
        // Count by status
        switch (fee.payment_status) {
          case 'unpaid':
            stats.unpaid++;
            break;
          case 'paid':
            stats.paid++;
            break;
          case 'overdue':
            stats.overdue++;
            break;
          case 'waived':
            stats.waived++;
            break;
          case 'partial':
            stats.partial++;
            break;
        }

        // Count by type
        stats.byType[fee.fee_type]++;

        // Calculate amounts
        stats.totalAmount += fee.amount;
        stats.paidAmount += fee.paid_amount;
        stats.outstandingBalance += (fee.amount - fee.paid_amount);
      });

      return stats;
    } catch (error) {
      console.error('Failed to get fee statistics:', error);
      return {
        total: 0,
        unpaid: 0,
        paid: 0,
        overdue: 0,
        waived: 0,
        partial: 0,
        totalAmount: 0,
        paidAmount: 0,
        outstandingBalance: 0,
        byType: {
          monthly: 0,
          quarterly: 0,
          annual: 0,
          special_assessment: 0,
        },
      };
    }
  }

  /**
   * Get upcoming fees (next 30 days)
   */
  async getUpcomingFees(householdId: string): Promise<AssociationFee[]> {
    try {
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);

      const { data, error } = await supabase
        .from('association_fees')
        .select('*')
        .eq('household_id', householdId)
        .in('payment_status', ['unpaid', 'partial'])
        .gte('due_date', today.toISOString())
        .lte('due_date', thirtyDaysFromNow.toISOString())
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Error fetching upcoming fees:', error);
        return [];
      }

      return (data || []) as AssociationFee[];
    } catch (error) {
      console.error('Failed to get upcoming fees:', error);
      return [];
    }
  }

  /**
   * Get overdue fees
   */
  async getOverdueFees(householdId: string): Promise<AssociationFee[]> {
    try {
      const today = new Date();

      const { data, error } = await supabase
        .from('association_fees')
        .select('*')
        .eq('household_id', householdId)
        .in('payment_status', ['unpaid', 'partial'])
        .lt('due_date', today.toISOString())
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Error fetching overdue fees:', error);
        return [];
      }

      // Update status to overdue for these fees
      const overdueFees = (data || []) as AssociationFee[];
      await this.updateFeesToOverdue(overdueFees);

      return overdueFees;
    } catch (error) {
      console.error('Failed to get overdue fees:', error);
      return [];
    }
  }

  /**
   * Calculate late fee for overdue fees
   */
  calculateLateFee(fee: AssociationFee, daysOverdue: number): number {
    // Late fee calculation: 2% per month overdue, minimum ₱100
    const monthlyRate = 0.02;
    const monthsOverdue = Math.ceil(daysOverdue / 30);
    const calculatedFee = fee.amount * monthlyRate * monthsOverdue;
    return Math.max(calculatedFee, 100);
  }

  /**
   * Get payment history for the household
   */
  async getPaymentHistory(householdId: string, limit = 50): Promise<AssociationFee[]> {
    try {
      const { data, error } = await supabase
        .from('association_fees')
        .select('*')
        .eq('household_id', householdId)
        .in('payment_status', ['paid', 'partial'])
        .not('payment_date', 'is', null)
        .order('payment_date', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching payment history:', error);
        return [];
      }

      return (data || []) as AssociationFee[];
    } catch (error) {
      console.error('Failed to get payment history:', error);
      return [];
    }
  }

  /**
   * Check and update overdue status for a single fee
   */
  private async checkAndUpdateOverdueStatus(fee: AssociationFee): Promise<AssociationFee> {
    try {
      if (fee.payment_status === 'paid' || fee.payment_status === 'waived') {
        return fee;
      }

      const today = new Date();
      const dueDate = new Date(fee.due_date);

      if (dueDate < today && fee.payment_status !== 'overdue') {
        // Update to overdue
        const { data, error } = await supabase
          .from('association_fees')
          .update({ payment_status: 'overdue' })
          .eq('id', fee.id);

        if (!error && data) {
          return { ...fee, payment_status: 'overdue' } as AssociationFee;
        }
      }

      return fee;
    } catch (error) {
      console.error('Failed to check overdue status:', error);
      return fee;
    }
  }

  /**
   * Update overdue status for multiple fees
   */
  private async updateOverdueStatus(fees: AssociationFee[]): Promise<AssociationFee[]> {
    try {
      const today = new Date();
      const feesToUpdate: string[] = [];

      fees.forEach(fee => {
        if (fee.payment_status !== 'paid' &&
            fee.payment_status !== 'waived' &&
            fee.payment_status !== 'overdue') {
          const dueDate = new Date(fee.due_date);
          if (dueDate < today) {
            feesToUpdate.push(fee.id);
          }
        }
      });

      if (feesToUpdate.length > 0) {
        await supabase
          .from('association_fees')
          .update({ payment_status: 'overdue' })
          .in('id', feesToUpdate);

        // Update local array
        return fees.map(fee =>
          feesToUpdate.includes(fee.id)
            ? { ...fee, payment_status: 'overdue' as const }
            : fee
        );
      }

      return fees;
    } catch (error) {
      console.error('Failed to update overdue status:', error);
      return fees;
    }
  }

  /**
   * Update specific fees to overdue status
   */
  private async updateFeesToOverdue(fees: AssociationFee[]): Promise<void> {
    try {
      const feeIds = fees.map(fee => fee.id);

      if (feeIds.length > 0) {
        await supabase
          .from('association_fees')
          .update({ payment_status: 'overdue' })
          .in('id', feeIds)
          .in('payment_status', ['unpaid', 'partial']);
      }
    } catch (error) {
      console.error('Failed to update fees to overdue:', error);
    }
  }

  /**
   * Clear cache for a specific household
   */
  private async clearCache(householdId: string): Promise<void> {
    try {
      await CacheService.clearCache(`fees_${householdId}`);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Clear cache for a specific fee
   */
  private async clearCacheForFee(feeId: string): Promise<void> {
    try {
      await CacheService.clearCache(`fee_${feeId}`);
    } catch (error) {
      console.error('Failed to clear fee cache:', error);
    }
  }
}

// Export singleton instance
export const associationFeeService = new AssociationFeeService();
export default associationFeeService;