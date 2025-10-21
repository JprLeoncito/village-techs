import database from '../database';
import { SyncQueueItem } from '../database/models/SyncQueueItem';
import networkStatus from '../lib/networkStatus';
import { supabase } from '../lib/supabase';

export enum SyncPriority {
  HIGH = 1,    // Payments, critical operations
  NORMAL = 2,  // Regular data sync
  LOW = 3,     // Background updates
}

export enum SyncAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

export type EntityType =
  | 'sticker'
  | 'guest'
  | 'fee'
  | 'permit'
  | 'delivery'
  | 'member'
  | 'payment';

interface QueueItemData {
  entityType: EntityType;
  entityId: string;
  action: SyncAction;
  payload: any;
  priority?: SyncPriority;
}

class SyncQueueService {
  private isProcessing = false;
  private processInterval: NodeJS.Timer | null = null;

  /**
   * Initialize sync queue processing
   */
  async initialize() {
    // Skip if database is not available (Expo Go mode)
    if (!database) {
      console.log('Sync queue disabled - database not available');
      return;
    }

    // Listen for network status changes
    networkStatus.addListener((isConnected) => {
      if (isConnected && !this.isProcessing) {
        this.startProcessing();
      } else if (!isConnected) {
        this.stopProcessing();
      }
    });

    // Start processing if online
    if (networkStatus.isConnected()) {
      this.startProcessing();
    }
  }

  /**
   * Add an item to the sync queue
   */
  async addToQueue(data: QueueItemData): Promise<SyncQueueItem> {
    // Skip if database is not available
    if (!database) {
      throw new Error('Sync queue not available - database not initialized');
    }

    try {
      return await database.write(async () => {
        const syncQueueCollection = database.get<SyncQueueItem>('sync_queue');

        const queueItem = await syncQueueCollection.create(item => {
          item.entityType = data.entityType;
          item.entityId = data.entityId;
          item.action = data.action;
          item.payload = data.payload;
          item.priority = data.priority || SyncPriority.NORMAL;
          item.retryCount = 0;
          item.synced = false;
        });

        console.log(`Added to sync queue: ${data.entityType} ${data.action}`, queueItem);

        // If high priority and online, process immediately
        if (data.priority === SyncPriority.HIGH && networkStatus.isConnected()) {
          this.processQueue();
        }

        return queueItem;
      });
    } catch (error) {
      console.error('Error adding to sync queue:', error);
      throw error;
    }
  }

  /**
   * Start processing the sync queue
   */
  private startProcessing() {
    if (this.isProcessing) return;

    this.isProcessing = true;
    console.log('Starting sync queue processing');

    // Process immediately
    this.processQueue();

    // Then process every 30 seconds
    this.processInterval = setInterval(() => {
      this.processQueue();
    }, 30000);
  }

  /**
   * Stop processing the sync queue
   */
  private stopProcessing() {
    this.isProcessing = false;
    console.log('Stopping sync queue processing');

    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
  }

  /**
   * Process pending items in the queue
   */
  async processQueue() {
    // Skip if database is not available
    if (!database) {
      return;
    }

    if (!networkStatus.isConnected()) {
      console.log('Cannot process sync queue - offline');
      return;
    }

    try {
      const syncQueueCollection = database.get<SyncQueueItem>('sync_queue');

      // Get pending items, sorted by priority and creation date
      const pendingItems = await syncQueueCollection
        .query()
        .where('synced', false)
        .sortBy('priority', 'asc')
        .fetch();

      console.log(`Processing ${pendingItems.length} queued items`);

      for (const item of pendingItems) {
        if (!item.canRetry) {
          console.log(`Skipping item - max retries reached: ${item.entityType} ${item.entityId}`);
          continue;
        }

        try {
          await this.processSyncItem(item);

          // Mark as synced
          await database.write(async () => {
            await item.update(record => {
              record.synced = true;
            });
          });

          console.log(`Successfully synced: ${item.entityType} ${item.entityId}`);
        } catch (error) {
          // Update retry count and error
          await database.write(async () => {
            await item.update(record => {
              record.retryCount += 1;
              record.lastError = error instanceof Error ? error.message : 'Unknown error';
            });
          });

          console.error(`Failed to sync: ${item.entityType} ${item.entityId}`, error);

          // If high priority, throw to stop processing
          if (item.priority === SyncPriority.HIGH) {
            throw error;
          }
        }
      }

      // Clean up old synced items
      await this.cleanupSyncedItems();
    } catch (error) {
      console.error('Error processing sync queue:', error);
    }
  }

  /**
   * Process a single sync item
   */
  private async processSyncItem(item: SyncQueueItem) {
    const tableName = this.getTableName(item.entityType);
    const payload = item.payload;

    switch (item.action) {
      case SyncAction.CREATE:
        return await this.syncCreate(tableName, payload);

      case SyncAction.UPDATE:
        return await this.syncUpdate(tableName, item.entityId, payload);

      case SyncAction.DELETE:
        return await this.syncDelete(tableName, item.entityId);

      default:
        throw new Error(`Unknown sync action: ${item.action}`);
    }
  }

  /**
   * Sync create operation
   */
  private async syncCreate(table: string, data: any) {
    const { error } = await supabase.from(table).insert(data);

    if (error) {
      throw error;
    }
  }

  /**
   * Sync update operation
   */
  private async syncUpdate(table: string, id: string, data: any) {
    const { error } = await supabase
      .from(table)
      .update(data)
      .eq('id', id);

    if (error) {
      throw error;
    }
  }

  /**
   * Sync delete operation
   */
  private async syncDelete(table: string, id: string) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  }

  /**
   * Get Supabase table name for entity type
   */
  private getTableName(entityType: EntityType): string {
    const tableMap: Record<EntityType, string> = {
      sticker: 'vehicle_stickers',
      guest: 'scheduled_guests',
      fee: 'association_fees',
      permit: 'construction_permits',
      delivery: 'deliveries',
      member: 'household_members',
      payment: 'fee_payments',
    };

    return tableMap[entityType];
  }

  /**
   * Clean up old synced items
   */
  private async cleanupSyncedItems() {
    try {
      const syncQueueCollection = database.get<SyncQueueItem>('sync_queue');

      // Delete synced items older than 24 hours
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

      const oldItems = await syncQueueCollection
        .query()
        .where('synced', true)
        .fetch();

      const itemsToDelete = oldItems.filter(item =>
        item.updatedAt.getTime() < oneDayAgo
      );

      if (itemsToDelete.length > 0) {
        await database.write(async () => {
          await database.batch(
            ...itemsToDelete.map(item => item.prepareDestroyPermanently())
          );
        });

        console.log(`Cleaned up ${itemsToDelete.length} old synced items`);
      }
    } catch (error) {
      console.error('Error cleaning up synced items:', error);
    }
  }

  /**
   * Get sync queue status
   */
  async getQueueStatus() {
    const syncQueueCollection = database.get<SyncQueueItem>('sync_queue');

    const pendingItems = await syncQueueCollection
      .query()
      .where('synced', false)
      .fetch();

    const highPriority = pendingItems.filter(item => item.priority === SyncPriority.HIGH);
    const normalPriority = pendingItems.filter(item => item.priority === SyncPriority.NORMAL);
    const lowPriority = pendingItems.filter(item => item.priority === SyncPriority.LOW);
    const failedItems = pendingItems.filter(item => item.hasError);

    return {
      total: pendingItems.length,
      high: highPriority.length,
      normal: normalPriority.length,
      low: lowPriority.length,
      failed: failedItems.length,
      isProcessing: this.isProcessing,
      isOnline: networkStatus.isConnected(),
    };
  }

  /**
   * Retry failed items
   */
  async retryFailed() {
    const syncQueueCollection = database.get<SyncQueueItem>('sync_queue');

    const failedItems = await syncQueueCollection
      .query()
      .where('synced', false)
      .fetch();

    const itemsToRetry = failedItems.filter(item => item.hasError);

    // Reset retry count for failed items
    await database.write(async () => {
      await database.batch(
        ...itemsToRetry.map(item =>
          item.prepareUpdate(record => {
            record.retryCount = 0;
            record.lastError = undefined;
          })
        )
      );
    });

    // Process queue
    if (networkStatus.isConnected()) {
      await this.processQueue();
    }
  }

  /**
   * Clear all pending items (use with caution)
   */
  async clearQueue() {
    const syncQueueCollection = database.get<SyncQueueItem>('sync_queue');

    const allItems = await syncQueueCollection
      .query()
      .where('synced', false)
      .fetch();

    await database.write(async () => {
      await database.batch(
        ...allItems.map(item => item.prepareDestroyPermanently())
      );
    });

    console.log(`Cleared ${allItems.length} pending items from sync queue`);
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.stopProcessing();
  }
}

// Export singleton instance
export const syncQueueService = new SyncQueueService();
export default syncQueueService;