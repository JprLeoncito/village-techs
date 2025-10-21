import { supabase } from '../lib/supabase';
import networkStatus from '../lib/networkStatus';
import { CacheService } from '../lib/cache';
import { OfflineQueue } from '../lib/offlineQueue';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Database interface matching the Supabase schema
export interface VehicleSticker {
  id: string;
  tenant_id: string;
  household_id: string;
  member_id?: string;
  vehicle_plate: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_color?: string;
  rfid_code?: string;
  or_cr_document_url?: string;
  status: 'requested' | 'approved' | 'active' | 'expiring' | 'expired' | 'rejected' | 'revoked';
  expiry_date?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  revocation_reason?: string;
  revoked_by?: string;
  revoked_at?: string;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface StickerRequest {
  vehicle_plate: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_color?: string;
  or_cr_document?: File;
}

export interface StickerFilter {
  status?: VehicleSticker['status'];
  search?: string;
  sortBy?: 'created_at' | 'expiry_date' | 'vehicle_plate';
  sortOrder?: 'asc' | 'desc';
}

export interface StickerStatistics {
  total: number;
  requested: number;
  approved: number;
  active: number;
  expiring: number;
  expired: number;
  rejected: number;
  revoked: number;
}

export interface StickerServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

class VehicleStickerService {
  private readonly STORAGE_KEY = 'vehicle_stickers_data';
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Submit a new vehicle sticker request
   */
  async submitStickerRequest(householdId: string, requestData: StickerRequest): Promise<StickerServiceResult<VehicleSticker>> {
    try {
      if (!networkStatus.isConnected()) {
        // Queue for offline sync
        await OfflineQueue.addAction('sticker_request', {
          householdId,
          requestData,
        });
        return {
          success: true,
          data: {
            id: `offline_${Date.now()}`,
            household_id: householdId,
            vehicle_plate: requestData.vehicle_plate,
            vehicle_make: requestData.vehicle_make,
            vehicle_model: requestData.vehicle_model,
            vehicle_color: requestData.vehicle_color,
            status: 'requested',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as VehicleSticker,
        };
      }

      // Upload OR/CR document if provided
      let documentUrl: string | undefined;
      if (requestData.or_cr_document) {
        const uploadResult = await this.uploadDocument(requestData.or_cr_document, householdId);
        if (uploadResult.success && uploadResult.url) {
          documentUrl = uploadResult.url;
        }
      }

      // Create sticker request in Supabase
      const { data, error } = await supabase
        .from('vehicle_stickers')
        .insert({
          household_id: householdId,
          vehicle_plate: requestData.vehicle_plate.toUpperCase(),
          vehicle_make: requestData.vehicle_make,
          vehicle_model: requestData.vehicle_model,
          vehicle_color: requestData.vehicle_color,
          or_cr_document_url: documentUrl,
          status: 'requested',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating sticker request:', error);
        return { success: false, error: error.message };
      }

      // Clear cache
      await this.clearCache(householdId);

      return {
        success: true,
        data: data as VehicleSticker,
      };
    } catch (error) {
      console.error('Failed to submit sticker request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit request',
      };
    }
  }

  /**
   * Get all stickers for the current household
   */
  async getStickers(householdId: string, filter?: StickerFilter): Promise<VehicleSticker[]> {
    try {
      // Try cache first (use predefined cache key)
      const cachedStickers = await CacheService.getCachedData<VehicleSticker[]>('household_stickers', householdId);
      if (cachedStickers) {
        return cachedStickers;
      }

      // Build query
      let query = supabase
        .from('vehicle_stickers')
        .select('*')
        .eq('household_id', householdId)
        .is('deleted_at', null);

      // Apply filters
      if (filter?.status) {
        query = query.eq('status', filter.status);
      }

      if (filter?.search) {
        query = query.or(`vehicle_plate.ilike.%${filter.search}%,vehicle_make.ilike.%${filter.search}%,vehicle_model.ilike.%${filter.search}%`);
      }

      // Apply sorting
      const sortBy = filter?.sortBy || 'created_at';
      const sortOrder = filter?.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching stickers:', error);
        return [];
      }

      const stickers = (data || []) as VehicleSticker[];

      // Cache the data
      await CacheService.setCachedData('household_stickers', householdId, stickers);

      return stickers;
    } catch (error) {
      console.error('Failed to get stickers:', error);
      return [];
    }
  }

  /**
   * Get a specific sticker by ID
   */
  async getStickerById(stickerId: string): Promise<StickerServiceResult<VehicleSticker>> {
    try {
      // Try cache first (use predefined cache key)
      const cachedSticker = await CacheService.getCachedData<VehicleSticker>('sticker', stickerId);
      if (cachedSticker) {
        return { success: true, data: cachedSticker };
      }

      const { data, error } = await supabase
        .from('vehicle_stickers')
        .select('*')
        .eq('id', stickerId)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) {
        console.error('Error fetching sticker:', error);
        return { success: false, error: 'Sticker not found' };
      }

      if (!data) {
        return { success: false, error: 'Sticker not found' };
      }

      const sticker = data as VehicleSticker;

      // Cache the data
      await CacheService.setCachedData('sticker', stickerId, sticker);

      return { success: true, data: sticker };
    } catch (error) {
      console.error('Failed to get sticker:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get sticker',
      };
    }
  }

  /**
   * Update sticker information
   */
  async updateSticker(stickerId: string, updates: Partial<VehicleSticker>): Promise<StickerServiceResult<VehicleSticker>> {
    try {
      if (!networkStatus.isConnected()) {
        return { success: false, error: 'Cannot update sticker while offline' };
      }

      const { data, error } = await supabase
        .from('vehicle_stickers')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', stickerId)
        .select()
        .maybeSingle();

      if (error) {
        console.error('Error updating sticker:', error);
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: 'Sticker not found' };
      }

      // Clear cache
      await this.clearCacheForSticker(stickerId);

      return {
        success: true,
        data: data as VehicleSticker,
      };
    } catch (error) {
      console.error('Failed to update sticker:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update sticker',
      };
    }
  }

  /**
   * Cancel a sticker request
   */
  async cancelStickerRequest(stickerId: string): Promise<StickerServiceResult<VehicleSticker>> {
    try {
      if (!networkStatus.isConnected()) {
        return { success: false, error: 'Cannot cancel request while offline' };
      }

      const { data, error } = await supabase
        .from('vehicle_stickers')
        .update({
          status: 'rejected',
          rejection_reason: 'Cancelled by resident',
          updated_at: new Date().toISOString(),
        })
        .eq('id', stickerId)
        .eq('status', 'requested')
        .select()
        .maybeSingle();

      if (error) {
        console.error('Error cancelling sticker request:', error);
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: 'Sticker not found' };
      }

      // Clear cache
      await this.clearCacheForSticker(stickerId);

      return { success: true, data: data as VehicleSticker };
    } catch (error) {
      console.error('Failed to cancel sticker request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel request',
      };
    }
  }

  /**
   * Delete a sticker request (soft delete by setting deleted_at)
   */
  async deleteSticker(stickerId: string): Promise<StickerServiceResult<VehicleSticker>> {
    try {
      if (!networkStatus.isConnected()) {
        return { success: false, error: 'Cannot delete sticker while offline' };
      }

      // First check if sticker exists and can be deleted
      const stickerResult = await this.getStickerById(stickerId);
      if (!stickerResult.success) {
        return { success: false, error: 'Sticker not found' };
      }

      const sticker = stickerResult.data!;

      // Only allow deletion of sticker requests that are not active
      if (['active'].includes(sticker.status)) {
        return {
          success: false,
          error: 'Cannot delete active stickers. Please contact support to revoke.'
        };
      }

      const { data, error } = await supabase
        .from('vehicle_stickers')
        .update({
          status: 'cancelled',
          rejection_reason: 'Cancelled by resident',
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', stickerId)
        .select()
        .maybeSingle();

      if (error) {
        console.error('Error deleting sticker:', error);
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: 'Sticker not found' };
      }

      // Clear cache
      await this.clearCacheForSticker(stickerId);

      return { success: true, data: data as VehicleSticker };
    } catch (error) {
      console.error('Failed to delete sticker:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete sticker',
      };
    }
  }

  /**
   * Get sticker statistics for the household
   */
  async getStickerStatistics(householdId: string): Promise<StickerStatistics> {
    try {
      const stickers = await this.getStickers(householdId);

      const stats: StickerStatistics = {
        total: stickers.length,
        requested: 0,
        approved: 0,
        active: 0,
        expiring: 0,
        expired: 0,
        rejected: 0,
        revoked: 0,
      };

      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);

      stickers.forEach(sticker => {
        switch (sticker.status) {
          case 'requested':
            stats.requested++;
            break;
          case 'approved':
            stats.approved++;
            break;
          case 'active':
            stats.active++;
            // Check if expiring within 30 days
            if (sticker.expiry_date) {
              const expiryDate = new Date(sticker.expiry_date);
              if (expiryDate <= thirtyDaysFromNow && expiryDate > today) {
                stats.expiring++;
              }
            }
            break;
          case 'expiring':
            stats.expiring++;
            break;
          case 'expired':
            stats.expired++;
            break;
          case 'rejected':
            stats.rejected++;
            break;
          case 'revoked':
            stats.revoked++;
            break;
        }
      });

      return stats;
    } catch (error) {
      console.error('Failed to get sticker statistics:', error);
      return {
        total: 0,
        requested: 0,
        approved: 0,
        active: 0,
        expiring: 0,
        expired: 0,
        rejected: 0,
        revoked: 0,
      };
    }
  }

  /**
   * Upload document to Supabase storage
   */
  private async uploadDocument(file: File, householdId: string): Promise<StickerServiceResult & { url?: string }> {
    try {
      const fileName = `or_cr_${Date.now()}_${file.name}`;
      const filePath = `documents/${householdId}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('vehicle_documents')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        console.error('Error uploading document:', error);
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('vehicle_documents')
        .getPublicUrl(filePath);

      return {
        success: true,
        url: urlData.publicUrl,
      };
    } catch (error) {
      console.error('Failed to upload document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload document',
      };
    }
  }

  /**
   * Clear cache for a specific household
   */
  private async clearCache(householdId: string): Promise<void> {
    try {
      await CacheService.clearCache(householdId);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Clear cache for a specific sticker - we need to clear household stickers cache
   */
  private async clearCacheForSticker(stickerId: string): Promise<void> {
    try {
      // Get the sticker to find which household it belongs to
      const stickerResult = await this.getStickerById(stickerId);
      if (stickerResult.success && stickerResult.data?.household_id) {
        // Clear household stickers cache to force refresh
        await this.clearCache(stickerResult.data.household_id);
      }
    } catch (error) {
      console.error('Failed to clear sticker cache:', error);
    }
  }
}

// Export singleton instance
export const vehicleStickerService = new VehicleStickerService();
export default vehicleStickerService;