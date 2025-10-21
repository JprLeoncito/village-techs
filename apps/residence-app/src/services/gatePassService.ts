import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import networkStatus from '../lib/networkStatus';
import { CacheService } from '../lib/cache';
import { OfflineQueue } from '../lib/offlineQueue';
import {
  GatePass,
  GatePassRequest,
  GatePassFilter,
  GatePassStatistics,
} from '../types/gatePasses';

export interface GatePassServiceResult {
  success: boolean;
  data?: any;
  error?: string;
}

class GatePassService {
  private readonly STORAGE_KEY = 'gate_passes_data';

  /**
   * Submit a new gate pass request
   */
  async submitGatePassRequest(householdId: string, requestData: GatePassRequest): Promise<GatePassServiceResult> {
    try {
      if (!networkStatus.isConnected()) {
        // Queue for offline sync
        await OfflineQueue.addAction('gate_pass_request', {
          householdId,
          requestData,
        });
        return {
          success: true,
          data: { id: `offline_${Date.now()}`, status: 'pending', ...requestData },
        };
      }

      // Create gate pass request in Supabase
      const { data, error } = await supabase
        .from('gate_passes')
        .insert({
          household_id: householdId,
          visitor_name: requestData.visitor_name,
          visitor_contact: requestData.visitor_contact,
          visit_purpose: requestData.visit_purpose,
          visit_date: requestData.visit_date,
          visit_time: requestData.visit_time,
          expected_departure: requestData.expected_departure,
          vehicle_details: requestData.vehicle_details,
          notes: requestData.notes,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating gate pass request:', error);
        return { success: false, error: error.message };
      }

      // Generate QR code (placeholder implementation)
      const qrCode = `GP_${data.id}_${Date.now()}`;

      // Update record with QR code
      const { data: updatedData, error: updateError } = await supabase
        .from('gate_passes')
        .update({ qr_code: qrCode })
        .eq('id', data.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating QR code:', updateError);
      }

      // Clear cache
      await CacheService.clearCache(householdId);

      return {
        success: true,
        data: { ...updatedData || data, qr_code: qrCode },
      };
    } catch (error) {
      console.error('Failed to submit gate pass request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit request',
      };
    }
  }

  /**
   * Get all gate passes for the current household
   */
  async getGatePasses(householdId: string, filter?: GatePassFilter): Promise<GatePass[]> {
    try {
      // Try cache first
      const cachedGatePasses = await CacheService.getCachedData<GatePass[]>('GATE_PASSES', householdId);
      if (cachedGatePasses) {
        return this.applyFilter(cachedGatePasses, filter);
      }

      // If online, fetch from server
      if (networkStatus.isConnected()) {
        let query = supabase
          .from('gate_passes')
          .select('*')
          .eq('household_id', householdId)
          .order('created_at', { ascending: false });

        // Apply filters if provided
        if (filter?.status) {
          query = query.eq('status', filter.status);
        }
        if (filter?.date_range) {
          query = query
            .gte('visit_date', filter.date_range.start)
            .lte('visit_date', filter.date_range.end);
        }

        const { data, error } = await query;

        if (!error && data) {
          const transformedData = data as GatePass[];

          // Cache the data
          await CacheService.setCachedData('GATE_PASSES', householdId, transformedData);

          return this.applyFilter(transformedData, filter);
        }
      }

      // Return empty array if offline and no cache
      return [];
    } catch (error) {
      console.error('Failed to get gate passes:', error);
      return [];
    }
  }

  /**
   * Get a specific gate pass by ID
   */
  async getGatePassById(gatePassId: string): Promise<GatePassServiceResult> {
    try {
      // Try cache first
      const cachedData = await AsyncStorage.getItem(`${this.STORAGE_KEY}_${gatePassId}`);
      if (cachedData) {
        const gatePass = JSON.parse(cachedData);
        return { success: true, data: gatePass };
      }

      // If online, fetch from server
      if (networkStatus.isConnected()) {
        const { data, error } = await supabase
          .from('gate_passes')
          .select('*')
          .eq('id', gatePassId)
          .single();

        if (!error && data) {
          const gatePass = data as GatePass;

          // Cache the data
          await AsyncStorage.setItem(`${this.STORAGE_KEY}_${gatePassId}`, JSON.stringify(gatePass));

          return { success: true, data: gatePass };
        }
      }

      return { success: false, error: 'Gate pass not found' };
    } catch (error) {
      console.error('Failed to get gate pass:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get gate pass',
      };
    }
  }

  /**
   * Cancel a gate pass request
   */
  async cancelGatePassRequest(gatePassId: string, reason: string): Promise<GatePassServiceResult> {
    try {
      if (!networkStatus.isConnected()) {
        return { success: false, error: 'Cannot cancel request while offline' };
      }

      const { data, error } = await supabase
        .from('gate_passes')
        .update({
          status: 'cancelled',
          notes: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gatePassId)
        .select()
        .single();

      if (error) {
        console.error('Error cancelling gate pass request:', error);
        return { success: false, error: error.message };
      }

      // Clear cache
      const cachedData = await AsyncStorage.getItem(`${this.STORAGE_KEY}_${gatePassId}`);
      if (cachedData) {
        await AsyncStorage.removeItem(`${this.STORAGE_KEY}_${gatePassId}`);
      }

      return { success: true, data };
    } catch (error) {
      console.error('Failed to cancel gate pass request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel request',
      };
    }
  }

  /**
   * Get gate pass statistics
   */
  async getGatePassStatistics(householdId: string): Promise<GatePassStatistics> {
    try {
      const gatePasses = await this.getGatePasses(householdId);

      const stats: GatePassStatistics = {
        total: gatePasses.length,
        pending: 0,
        approved: 0,
        rejected: 0,
        completed: 0,
        byPurpose: {},
      };

      gatePasses.forEach(gatePass => {
        // Count by status
        switch (gatePass.status) {
          case 'pending':
            stats.pending++;
            break;
          case 'approved':
            stats.approved++;
            break;
          case 'rejected':
            stats.rejected++;
            break;
          case 'completed':
            stats.completed++;
            break;
        }

        // Count by purpose
        stats.byPurpose[gatePass.visit_purpose] = (stats.byPurpose[gatePass.visit_purpose] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Failed to get gate pass statistics:', error);
      return {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        completed: 0,
        byPurpose: {},
      };
    }
  }

  /**
   * Apply filters to gate pass list
   */
  private applyFilter(gatePasses: GatePass[], filter?: GatePassFilter): GatePass[] {
    if (!filter) return gatePasses;

    return gatePasses.filter(gatePass => {
      if (filter.status && gatePass.status !== filter.status) return false;
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        const matchesSearch =
          gatePass.visitor_name.toLowerCase().includes(searchLower) ||
          gatePass.visit_purpose.toLowerCase().includes(searchLower) ||
          gatePass.visitor_contact.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      if (filter.date_range) {
        const visitDate = new Date(gatePass.visit_date);
        const startDate = new Date(filter.date_range.start);
        const endDate = new Date(filter.date_range.end);
        if (visitDate < startDate || visitDate > endDate) return false;
      }
      return true;
    });
  }
}

// Export singleton instance
export const gatePassService = new GatePassService();
export default gatePassService;