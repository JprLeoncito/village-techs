import database from '../database';
import { Sticker } from '../database/models/Sticker';
import { SyncQueueItem } from '../database/models/SyncQueueItem';
import networkStatus from '../lib/networkStatus';
import { supabase } from '../lib/supabase';
import syncQueueService, { SyncPriority, SyncAction } from './syncQueue';
import { Q } from '@nozbe/watermelondb';

interface StickerQueueResult {
  success: boolean;
  queued?: boolean;
  stickerId?: string;
  queueId?: string;
  error?: string;
}

interface SyncResult {
  successful: number;
  failed: number;
  errors?: string[];
}

class StickerSyncService {
  private isSyncing = false;
  private syncInterval: NodeJS.Timer | null = null;

  /**
   * Initialize sync service
   */
  async initialize() {
    // Listen for network changes
    networkStatus.addListener((isConnected) => {
      if (isConnected && !this.isSyncing) {
        this.syncPendingRequests();
      }
    });

    // Start periodic sync if online
    if (networkStatus.isConnected()) {
      this.startPeriodicSync();
    }
  }

  /**
   * Queue sticker request for offline sync
   */
  async queueStickerRequest(stickerData: any): Promise<StickerQueueResult> {
    try {
      const isOnline = networkStatus.isConnected();

      if (isOnline) {
        // Try to sync immediately
        const syncResult = await this.syncStickerToServer(stickerData);
        if (syncResult.success) {
          return {
            success: true,
            queued: false,
            stickerId: syncResult.stickerId,
          };
        }
      }

      // Store locally and queue for sync
      const localSticker = await this.storeLocalSticker(stickerData);

      // Add to sync queue
      const queueItem = await syncQueueService.addToQueue({
        entityType: 'sticker',
        entityId: localSticker.id,
        action: SyncAction.CREATE,
        payload: stickerData,
        priority: stickerData.isRenewal ? SyncPriority.HIGH : SyncPriority.NORMAL,
      });

      return {
        success: true,
        queued: true,
        queueId: queueItem.id,
        stickerId: localSticker.id,
      };
    } catch (error) {
      console.error('Failed to queue sticker request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to queue request',
      };
    }
  }

  /**
   * Sync pending sticker requests
   */
  async syncPendingRequests(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return { successful: 0, failed: 0 };
    }

    if (!networkStatus.isConnected()) {
      console.log('Cannot sync - offline');
      return { successful: 0, failed: 0 };
    }

    this.isSyncing = true;
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      // Get pending sticker requests from sync queue
      const syncQueueCollection = database.get<SyncQueueItem>('sync_queue');
      const pendingItems = await syncQueueCollection
        .query(
          Q.and(
            Q.where('entity_type', 'sticker'),
            Q.where('synced', false)
          )
        )
        .fetch();

      console.log(`Found ${pendingItems.length} pending sticker requests to sync`);

      // Sort by priority
      pendingItems.sort((a, b) => a.priority - b.priority);

      for (const item of pendingItems) {
        try {
          // Check retry count
          if (!item.canRetry) {
            console.log(`Skipping item ${item.id} - max retries reached`);
            failed++;
            continue;
          }

          // Sync to server
          const result = await this.syncStickerToServer(item.payload);

          if (result.success) {
            // Mark as synced
            await database.write(async () => {
              await item.update(record => {
                record.synced = true;
              });
            });

            // Update local sticker with remote ID
            if (result.stickerId) {
              await this.updateLocalStickerRemoteId(item.entityId, result.stickerId);
            }

            successful++;
          } else {
            // Update retry count
            await database.write(async () => {
              await item.update(record => {
                record.retryCount += 1;
                record.lastError = result.error || 'Unknown error';
              });
            });

            failed++;
            errors.push(result.error || 'Unknown error');
          }
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error);
          failed++;
          errors.push(error instanceof Error ? error.message : 'Unknown error');

          // Update error in queue
          await database.write(async () => {
            await item.update(record => {
              record.retryCount += 1;
              record.lastError = error instanceof Error ? error.message : 'Unknown error';
            });
          });
        }
      }

      console.log(`Sync completed: ${successful} successful, ${failed} failed`);
    } catch (error) {
      console.error('Error during sync:', error);
    } finally {
      this.isSyncing = false;
    }

    return { successful, failed, errors };
  }

  /**
   * Sync single sticker to server
   */
  private async syncStickerToServer(stickerData: any): Promise<StickerQueueResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const householdId = user.user_metadata?.household_id;
      if (!householdId) {
        return { success: false, error: 'Household ID not found' };
      }

      // Prepare data for server
      const serverData = {
        household_id: householdId,
        household_member_id: stickerData.householdMemberId,
        vehicle_plate: stickerData.vehiclePlate,
        vehicle_make: stickerData.vehicleMake,
        vehicle_model: stickerData.vehicleModel,
        vehicle_color: stickerData.vehicleColor,
        vehicle_type: stickerData.vehicleType,
        document_url: stickerData.documentUrl,
        status: 'pending',
        is_renewal: stickerData.isRenewal || false,
        previous_sticker_id: stickerData.previousStickerId,
        requested_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('vehicle_stickers')
        .insert(serverData)
        .select()
        .single();

      if (error) {
        // Handle duplicate plate error
        if (error.code === '23505' && error.message.includes('vehicle_plate')) {
          return { success: false, error: 'Vehicle plate already registered' };
        }
        return { success: false, error: error.message };
      }

      return {
        success: true,
        queued: false,
        stickerId: data.id,
      };
    } catch (error) {
      console.error('Failed to sync sticker to server:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      };
    }
  }

  /**
   * Store sticker locally
   */
  private async storeLocalSticker(stickerData: any): Promise<Sticker> {
    return await database.write(async () => {
      const stickersCollection = database.get<Sticker>('stickers');
      return await stickersCollection.create(sticker => {
        sticker.vehiclePlate = stickerData.vehiclePlate;
        sticker.vehicleMake = stickerData.vehicleMake;
        sticker.vehicleModel = stickerData.vehicleModel;
        sticker.vehicleColor = stickerData.vehicleColor;
        sticker.vehicleType = stickerData.vehicleType;
        sticker.status = 'pending';
        sticker.isRenewal = stickerData.isRenewal || false;
        sticker.documentUrl = stickerData.documentUrl || '';
        sticker.householdMemberId = stickerData.householdMemberId;
        sticker.expiryDate = new Date(); // Will be updated when approved
      });
    });
  }

  /**
   * Update local sticker with remote ID after successful sync
   */
  private async updateLocalStickerRemoteId(localId: string, remoteId: string): Promise<void> {
    try {
      await database.write(async () => {
        const stickersCollection = database.get<Sticker>('stickers');
        const sticker = await stickersCollection.find(localId);
        await sticker.update(record => {
          record.remoteId = remoteId;
        });
      });
    } catch (error) {
      console.error('Failed to update local sticker remote ID:', error);
    }
  }

  /**
   * Start periodic sync
   */
  private startPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Sync every 5 minutes
    this.syncInterval = setInterval(() => {
      if (networkStatus.isConnected()) {
        this.syncPendingRequests();
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Batch sync multiple stickers
   */
  async batchSync(stickers: any[]): Promise<SyncResult> {
    if (!networkStatus.isConnected()) {
      // Queue all for later sync
      for (const sticker of stickers) {
        await this.queueStickerRequest(sticker);
      }
      return { successful: 0, failed: stickers.length };
    }

    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { successful: 0, failed: stickers.length, errors: ['User not authenticated'] };
      }

      const householdId = user.user_metadata?.household_id;
      if (!householdId) {
        return { successful: 0, failed: stickers.length, errors: ['Household ID not found'] };
      }

      // Prepare batch data
      const batchData = stickers.map(sticker => ({
        household_id: householdId,
        household_member_id: sticker.householdMemberId,
        vehicle_plate: sticker.vehiclePlate,
        vehicle_make: sticker.vehicleMake,
        vehicle_model: sticker.vehicleModel,
        vehicle_color: sticker.vehicleColor,
        vehicle_type: sticker.vehicleType,
        document_url: sticker.documentUrl,
        status: 'pending',
        is_renewal: sticker.isRenewal || false,
        previous_sticker_id: sticker.previousStickerId,
        requested_at: new Date().toISOString(),
      }));

      // Batch insert
      const { data, error } = await supabase
        .from('vehicle_stickers')
        .insert(batchData)
        .select();

      if (error) {
        failed = stickers.length;
        errors.push(error.message);
      } else if (data) {
        successful = data.length;
        failed = stickers.length - data.length;
      }
    } catch (error) {
      console.error('Batch sync failed:', error);
      failed = stickers.length;
      errors.push(error instanceof Error ? error.message : 'Batch sync failed');
    }

    return { successful, failed, errors };
  }

  /**
   * Resolve sync conflict between local and server data
   */
  async resolveConflict(localSticker: any, serverSticker: any): Promise<any> {
    // Server wins strategy for authoritative fields
    const merged = {
      ...localSticker,
      status: serverSticker.status, // Server status is authoritative
      expiryDate: serverSticker.expiry_date || localSticker.expiryDate,
      rejectionReason: serverSticker.rejection_reason,
      approvalNote: serverSticker.approval_note,
      remoteId: serverSticker.id,
    };

    // Update local sticker
    await database.write(async () => {
      const stickersCollection = database.get<Sticker>('stickers');
      const sticker = await stickersCollection.find(localSticker.id);
      await sticker.update(record => {
        record.status = merged.status;
        record.expiryDate = merged.expiryDate ? new Date(merged.expiryDate) : record.expiryDate;
        record.rejectionReason = merged.rejectionReason;
        record.remoteId = merged.remoteId;
      });
    });

    return merged;
  }

  /**
   * Retry failed sync with exponential backoff
   */
  async retryWithBackoff(
    fn: () => Promise<any>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<any> {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const delay = baseDelay * Math.pow(2, i);
        console.log(`Retry attempt ${i + 1} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return {
      success: false,
      error: `Max retries exceeded: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`,
    };
  }

  /**
   * Process sync queue in priority order
   */
  async processQueue(queue: any[]): Promise<any[]> {
    // Sort by priority (lower number = higher priority)
    const sorted = [...queue].sort((a, b) => a.priority - b.priority);
    const processed = [];

    for (const item of sorted) {
      const result = await this.syncStickerToServer(item.payload);
      processed.push({ ...item, result });
    }

    return processed;
  }

  /**
   * Cache active stickers locally
   */
  async cacheActiveStickers(stickers: any[]): Promise<void> {
    await database.write(async () => {
      const stickersCollection = database.get<Sticker>('stickers');

      for (const stickerData of stickers) {
        const existing = await stickersCollection
          .query(Q.where('remote_id', stickerData.id))
          .fetch();

        if (existing.length > 0) {
          await existing[0].update(sticker => {
            this.updateStickerFromServer(sticker, stickerData);
          });
        } else {
          await stickersCollection.create(sticker => {
            sticker.remoteId = stickerData.id;
            this.updateStickerFromServer(sticker, stickerData);
          });
        }
      }
    });
  }

  /**
   * Update sticker from server data
   */
  private updateStickerFromServer(sticker: Sticker, data: any): void {
    sticker.vehiclePlate = data.vehicle_plate;
    sticker.vehicleMake = data.vehicle_make;
    sticker.vehicleModel = data.vehicle_model;
    sticker.vehicleColor = data.vehicle_color;
    sticker.vehicleType = data.vehicle_type;
    sticker.status = data.status;
    sticker.expiryDate = data.expiry_date ? new Date(data.expiry_date) : sticker.expiryDate;
    sticker.rejectionReason = data.rejection_reason;
    sticker.isRenewal = data.is_renewal || false;
    sticker.documentUrl = data.document_url || '';
    sticker.householdMemberId = data.household_member_id;
  }

  /**
   * Get cached stickers
   */
  async getCachedStickers(): Promise<any[]> {
    const stickersCollection = database.get<Sticker>('stickers');
    const stickers = await stickersCollection.query().fetch();

    return stickers.map(s => ({
      id: s.id,
      vehiclePlate: s.vehiclePlate,
      status: s.status,
      expiryDate: s.expiryDate,
    }));
  }

  /**
   * Update sticker
   */
  async updateSticker(stickerId: string, updates: any): Promise<void> {
    await database.write(async () => {
      const stickersCollection = database.get<Sticker>('stickers');
      const sticker = await stickersCollection.find(stickerId);
      await sticker.update(record => {
        Object.assign(record, updates);
      });
    });
  }

  /**
   * Cleanup old synced items
   */
  async cleanup() {
    this.stopPeriodicSync();

    // Clean up old synced items from queue
    const syncQueueCollection = database.get<SyncQueueItem>('sync_queue');
    const oldItems = await syncQueueCollection
      .query(
        Q.and(
          Q.where('entity_type', 'sticker'),
          Q.where('synced', true),
          Q.where('updated_at', Q.lt(Date.now() - 24 * 60 * 60 * 1000))
        )
      )
      .fetch();

    if (oldItems.length > 0) {
      await database.write(async () => {
        await database.batch(
          ...oldItems.map(item => item.prepareDestroyPermanently())
        );
      });

      console.log(`Cleaned up ${oldItems.length} old synced sticker items`);
    }
  }
}

// Export singleton instance
export const stickerSyncService = new StickerSyncService();
export default stickerSyncService;