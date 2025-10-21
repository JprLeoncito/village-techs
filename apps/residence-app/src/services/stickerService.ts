import { supabase } from '../lib/supabase';
import { storageService } from '../lib/storage';
import networkStatus from '../lib/networkStatus';
import { CacheService } from '../lib/cache';
import { OfflineQueue } from '../lib/offlineQueue';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  VehicleSticker,
  StickerRequest,
  StickerRequestValidation,
  StickerStatistics,
  StickerFilter,
  VehicleDocument
} from '../types/stickers';

export interface StickerServiceResult {
  success: boolean;
  data?: any;
  error?: string;
}

class StickerService {
  private readonly STORAGE_KEY = 'stickers_data';

  /**
   * Submit a new sticker request
   */
  async submitStickerRequest(householdId: string, requestData: StickerRequest): Promise<StickerServiceResult> {
    try {
      console.log('=== Sticker Service Debug ===');
      console.log('Submitting sticker request for household ID:', householdId);
      console.log('Request data:', requestData);
      console.log('========================');

      if (!networkStatus.isConnected()) {
        // Queue for offline sync
        await OfflineQueue.addAction('sticker_request', {
          householdId,
          requestData,
        });
        return {
          success: true,
          data: { id: `offline_${Date.now()}`, status: 'pending', ...requestData },
        };
      }

      // Upload documents first
      const uploadedDocuments = [];
      for (const doc of requestData.documents) {
        // For now, we'll skip actual file upload and just store the file info
        // In a real implementation, you'd use the appropriate storage service method
        uploadedDocuments.push({
          document_type: doc.document_type,
          file_url: `uploads/${Date.now()}_${doc.file.name}`,
          file_name: doc.file.name,
          file_type: doc.file.type,
          file_size: 0, // Would be calculated from actual file
        });
      }

      // Get tenant_id from household
      console.log('Looking up household for ID:', householdId);
      const { data: household, error: householdError } = await supabase
        .from('households')
        .select('tenant_id')
        .eq('id', householdId)
        .maybeSingle();

      if (householdError) {
        console.error('Error looking up household:', householdError);
        return { success: false, error: `Database error: ${householdError.message}` };
      }

      if (!household) {
        console.error('Household not found for ID:', householdId);
        return { success: false, error: 'Household not found' };
      }

      console.log('Found household with tenant_id:', household.tenant_id);

      // Create sticker request in Supabase
      const { data, error } = await supabase
        .from('vehicle_stickers')
        .insert({
          tenant_id: household.tenant_id,
          household_id: householdId,
          vehicle_make: requestData.vehicle_make,
          vehicle_model: requestData.vehicle_model,
          vehicle_color: requestData.vehicle_color,
          vehicle_plate: requestData.vehicle_plate,
          status: 'requested',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating sticker request:', error);
        return { success: false, error: error.message };
      }

      // Upload documents separately
      if (uploadedDocuments.length > 0) {
        for (const doc of uploadedDocuments) {
          await supabase
            .from('vehicle_documents')
            .insert({
              sticker_id: data.id,
              ...doc,
              uploaded_at: new Date().toISOString(),
            });
        }
      }

      // Clear cache
      await CacheService.clearCache(householdId);

      return {
        success: true,
        data: { ...data, documents: uploadedDocuments },
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
      // Try cache first
      const cachedStickers = await CacheService.getCachedData<VehicleSticker[]>('STICKERS', householdId);
      if (cachedStickers) {
        return this.applyFilter(cachedStickers, filter);
      }

      // If online, fetch from server
      if (networkStatus.isConnected()) {
        const { data, error } = await supabase
          .from('vehicle_stickers')
          .select('*')
          .eq('household_id', householdId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const transformedData = data as VehicleSticker[];

          // Cache the data
          await CacheService.setCachedData('STICKERS', householdId, transformedData);

          return this.applyFilter(transformedData, filter);
        }
      }

      // Return empty array if offline and no cache
      return [];
    } catch (error) {
      console.error('Failed to get stickers:', error);
      return [];
    }
  }

  /**
   * Get a specific sticker by ID
   */
  async getStickerById(stickerId: string): Promise<StickerServiceResult> {
    try {
      // Try cache first
      const cachedData = await AsyncStorage.getItem(`${this.STORAGE_KEY}_${stickerId}`);
      if (cachedData) {
        const sticker = JSON.parse(cachedData);
        return { success: true, data: sticker };
      }

      // If online, fetch from server
      if (networkStatus.isConnected()) {
        const { data, error } = await supabase
          .from('vehicle_stickers')
          .select('*')
          .eq('id', stickerId)
          .maybeSingle();

        if (!error && data) {
          const sticker = data as VehicleSticker;

          // Cache the data
          await AsyncStorage.setItem(`${this.STORAGE_KEY}_${stickerId}`, JSON.stringify(sticker));

          return { success: true, data: sticker };
        }
      }

      return { success: false, error: 'Sticker not found' };
    } catch (error) {
      console.error('Failed to get sticker:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get sticker',
      };
    }
  }

  /**
   * Cancel a sticker request
   */
  async cancelStickerRequest(stickerId: string, reason: string): Promise<StickerServiceResult> {
    try {
      if (!networkStatus.isConnected()) {
        return { success: false, error: 'Cannot cancel request while offline' };
      }

      const { data, error } = await supabase
        .from('vehicle_stickers')
        .update({
          status: 'cancelled',
          rejection_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', stickerId)
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
      const cachedData = await AsyncStorage.getItem(`${this.STORAGE_KEY}_${stickerId}`);
      if (cachedData) {
        await AsyncStorage.removeItem(`${this.STORAGE_KEY}_${stickerId}`);
      }

      return { success: true, data };
    } catch (error) {
      console.error('Failed to cancel sticker request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel request',
      };
    }
  }

  /**
   * Download a document
   */
  async downloadDocument(documentId: string): Promise<StickerServiceResult & { url?: string }> {
    try {
      const { data, error } = await supabase
        .from('vehicle_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (error || !data) {
        return { success: false, error: 'Document not found' };
      }

      // Get signed URL from Supabase storage
      const { data: urlData } = await supabase.storage
        .from('stickers')
        .createSignedUrl(data.file_url, 3600); // 1 hour expiry

      if (!urlData?.signedUrl) {
        return { success: false, error: 'Failed to generate download URL' };
      }

      return { success: true, url: urlData.signedUrl };
    } catch (error) {
      console.error('Failed to download document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to download document',
      };
    }
  }

  /**
   * Get sticker statistics
   */
  async getStickerStatistics(householdId: string): Promise<StickerStatistics> {
    try {
      console.log('=== Getting Sticker Statistics ===');
      console.log('Household ID:', householdId);

      const stickers = await this.getStickers(householdId);
      console.log('Fetched stickers:', stickers);
      console.log('Number of stickers:', stickers.length);

      const stats: StickerStatistics = {
        total: stickers.length,
        pending: 0,
        approved: 0,
        issued: 0,
        expired: 0,
        byType: {},
      };

      stickers.forEach(sticker => {
        console.log(`Processing sticker: ${sticker.id}, status: ${sticker.status}`);

        // Count by status - handle all possible statuses
        switch (sticker.status) {
          case 'requested':
            stats.pending++;
            break;
          case 'pending':
            stats.pending++;
            break;
          case 'approved':
            stats.approved++;
            break;
          case 'active':
            stats.issued++;
            break;
          case 'issued':
            stats.issued++;
            break;
          case 'expired':
            stats.expired++;
            break;
          case 'rejected':
            // Not counted in main stats
            break;
          case 'cancelled':
            // Not counted in main stats
            break;
          default:
            console.warn('Unknown sticker status:', sticker.status);
            // Count as pending for unknown statuses
            stats.pending++;
        }

        // Count by type (using make as placeholder since vehicle_type column doesn't exist)
        const make = sticker.vehicle_make || 'Unknown';
        stats.byType[make] = (stats.byType[make] || 0) + 1;
      });

      console.log('Final statistics:', stats);
      return stats;
    } catch (error) {
      console.error('Failed to get sticker statistics:', error);
      return {
        total: 0,
        pending: 0,
        approved: 0,
        issued: 0,
        expired: 0,
        byType: {},
      };
    }
  }

  /**
   * Apply filters to sticker list
   */
  private applyFilter(stickers: VehicleSticker[], filter?: StickerFilter): VehicleSticker[] {
    if (!filter) return stickers;

    return stickers.filter(sticker => {
      if (filter.status && sticker.status !== filter.status) return false;
      if (filter.vehicle_type && sticker.vehicle_make !== filter.vehicle_type) return false; // Use vehicle_make instead since vehicle_type doesn't exist
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        const matchesSearch =
          sticker.vehicle_make.toLowerCase().includes(searchLower) ||
          sticker.vehicle_model.toLowerCase().includes(searchLower) ||
          sticker.vehicle_plate.toLowerCase().includes(searchLower) ||
          sticker.vehicle_color.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      if (filter.date_range) {
        const createdDate = new Date(sticker.created_at);
        const startDate = new Date(filter.date_range.start);
        const endDate = new Date(filter.date_range.end);
        if (createdDate < startDate || createdDate > endDate) return false;
      }
      return true;
    });
  }
}

// Export singleton instance
export const stickerService = new StickerService();
export default stickerService;