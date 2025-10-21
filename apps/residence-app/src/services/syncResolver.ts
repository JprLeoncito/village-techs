import database from '../database';
import { Model } from '@nozbe/watermelondb';

export enum ConflictResolutionStrategy {
  SERVER_WINS = 'server_wins',  // Default - server data takes precedence
  CLIENT_WINS = 'client_wins',  // Client data takes precedence
  MERGE = 'merge',              // Attempt to merge changes
  MANUAL = 'manual',            // Require user intervention
}

interface ConflictData {
  localRecord: any;
  remoteRecord: any;
  tableName: string;
  conflictType: 'update' | 'delete';
}

interface ResolutionResult {
  resolved: boolean;
  data?: any;
  strategy: ConflictResolutionStrategy;
  requiresUserAction?: boolean;
}

class SyncConflictResolver {
  private strategy: ConflictResolutionStrategy = ConflictResolutionStrategy.SERVER_WINS;
  private conflictLog: ConflictData[] = [];

  /**
   * Set the default conflict resolution strategy
   */
  setStrategy(strategy: ConflictResolutionStrategy) {
    this.strategy = strategy;
    console.log(`Conflict resolution strategy set to: ${strategy}`);
  }

  /**
   * Resolve a sync conflict
   */
  async resolveConflict(conflict: ConflictData): Promise<ResolutionResult> {
    console.log(`Resolving conflict for ${conflict.tableName}:`, conflict);

    // Log the conflict
    this.conflictLog.push(conflict);

    switch (this.strategy) {
      case ConflictResolutionStrategy.SERVER_WINS:
        return this.resolveServerWins(conflict);

      case ConflictResolutionStrategy.CLIENT_WINS:
        return this.resolveClientWins(conflict);

      case ConflictResolutionStrategy.MERGE:
        return this.resolveMerge(conflict);

      case ConflictResolutionStrategy.MANUAL:
        return this.resolveManual(conflict);

      default:
        return this.resolveServerWins(conflict);
    }
  }

  /**
   * Server wins resolution - use server data
   */
  private async resolveServerWins(conflict: ConflictData): Promise<ResolutionResult> {
    try {
      if (conflict.conflictType === 'delete') {
        // Server deleted, so delete locally
        await this.deleteLocalRecord(conflict.tableName, conflict.localRecord.id);
        return {
          resolved: true,
          strategy: ConflictResolutionStrategy.SERVER_WINS,
        };
      }

      // Update local with server data
      await this.updateLocalRecord(conflict.tableName, conflict.remoteRecord);

      return {
        resolved: true,
        data: conflict.remoteRecord,
        strategy: ConflictResolutionStrategy.SERVER_WINS,
      };
    } catch (error) {
      console.error('Error in server wins resolution:', error);
      return {
        resolved: false,
        strategy: ConflictResolutionStrategy.SERVER_WINS,
      };
    }
  }

  /**
   * Client wins resolution - keep local data
   */
  private async resolveClientWins(conflict: ConflictData): Promise<ResolutionResult> {
    try {
      // Keep local data, queue for upload to server
      return {
        resolved: true,
        data: conflict.localRecord,
        strategy: ConflictResolutionStrategy.CLIENT_WINS,
      };
    } catch (error) {
      console.error('Error in client wins resolution:', error);
      return {
        resolved: false,
        strategy: ConflictResolutionStrategy.CLIENT_WINS,
      };
    }
  }

  /**
   * Merge resolution - attempt to merge changes
   */
  private async resolveMerge(conflict: ConflictData): Promise<ResolutionResult> {
    try {
      const mergedData = this.mergeRecords(
        conflict.localRecord,
        conflict.remoteRecord,
        conflict.tableName
      );

      await this.updateLocalRecord(conflict.tableName, mergedData);

      return {
        resolved: true,
        data: mergedData,
        strategy: ConflictResolutionStrategy.MERGE,
      };
    } catch (error) {
      console.error('Error in merge resolution:', error);
      // Fall back to server wins
      return this.resolveServerWins(conflict);
    }
  }

  /**
   * Manual resolution - flag for user intervention
   */
  private async resolveManual(conflict: ConflictData): Promise<ResolutionResult> {
    // Store conflict for user resolution
    await this.storeConflictForUserResolution(conflict);

    return {
      resolved: false,
      strategy: ConflictResolutionStrategy.MANUAL,
      requiresUserAction: true,
    };
  }

  /**
   * Merge two records based on table-specific rules
   */
  private mergeRecords(local: any, remote: any, tableName: string): any {
    const merged = { ...local };

    switch (tableName) {
      case 'stickers':
        // For stickers, server status takes precedence
        merged.status = remote.status;
        merged.expiryDate = remote.expiryDate;
        merged.rejectionReason = remote.rejectionReason;
        break;

      case 'fees':
        // For fees, payment status from server is authoritative
        merged.status = remote.status;
        merged.paymentDate = remote.paymentDate;
        merged.paymentAmount = remote.paymentAmount;
        merged.receiptUrl = remote.receiptUrl;
        break;

      case 'guests':
        // For guests, arrival status from server (security) is authoritative
        if (remote.status === 'arrived' && local.status !== 'arrived') {
          merged.status = remote.status;
          merged.arrivalTime = remote.arrivalTime;
        }
        break;

      case 'permits':
        // For permits, approval and payment from server are authoritative
        merged.status = remote.status;
        merged.roadFee = remote.roadFee;
        merged.roadFeePaid = remote.roadFeePaid;
        break;

      case 'deliveries':
        // For deliveries, merge both receipt confirmations
        if (remote.status === 'received' || local.status === 'received') {
          merged.status = 'received';
          merged.receivedAt = remote.receivedAt || local.receivedAt;
          merged.receivedPhotoUrl = remote.receivedPhotoUrl || local.receivedPhotoUrl;
        }
        break;

      default:
        // For other tables, use timestamp comparison
        if (remote.updatedAt > local.updatedAt) {
          return remote;
        }
    }

    // Preserve remote ID
    merged.remoteId = remote.id;
    merged.updatedAt = Math.max(local.updatedAt, remote.updatedAt);

    return merged;
  }

  /**
   * Update local record with resolved data
   */
  private async updateLocalRecord(tableName: string, data: any) {
    await database.write(async () => {
      const collection = database.get<Model>(tableName);
      const record = await collection.find(data.id).catch(() => null);

      if (record) {
        await record.update((r: any) => {
          Object.assign(r, data);
        });
      } else {
        // Create if doesn't exist
        await collection.create((r: any) => {
          Object.assign(r, data);
        });
      }
    });
  }

  /**
   * Delete local record
   */
  private async deleteLocalRecord(tableName: string, id: string) {
    await database.write(async () => {
      const collection = database.get<Model>(tableName);
      const record = await collection.find(id).catch(() => null);

      if (record) {
        await record.markAsDeleted();
      }
    });
  }

  /**
   * Store conflict for user resolution
   */
  private async storeConflictForUserResolution(conflict: ConflictData) {
    // Store in AsyncStorage for later resolution
    const conflicts = await this.getPendingConflicts();
    conflicts.push({
      ...conflict,
      timestamp: Date.now(),
    });

    // Limit to last 50 conflicts
    const recentConflicts = conflicts.slice(-50);

    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(
        'pending_sync_conflicts',
        JSON.stringify(recentConflicts)
      );
    } catch (error) {
      console.error('Error storing conflict for user resolution:', error);
    }
  }

  /**
   * Get pending conflicts requiring user resolution
   */
  async getPendingConflicts(): Promise<any[]> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const stored = await AsyncStorage.getItem('pending_sync_conflicts');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting pending conflicts:', error);
      return [];
    }
  }

  /**
   * Resolve a pending conflict with user choice
   */
  async resolveUserConflict(
    conflictId: string,
    choice: 'local' | 'remote'
  ): Promise<ResolutionResult> {
    const conflicts = await this.getPendingConflicts();
    const conflict = conflicts.find(c => `${c.tableName}-${c.localRecord.id}` === conflictId);

    if (!conflict) {
      return {
        resolved: false,
        strategy: ConflictResolutionStrategy.MANUAL,
      };
    }

    // Apply user choice
    const result = choice === 'local'
      ? await this.resolveClientWins(conflict)
      : await this.resolveServerWins(conflict);

    // Remove from pending conflicts
    const updatedConflicts = conflicts.filter(c =>
      `${c.tableName}-${c.localRecord.id}` !== conflictId
    );

    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(
        'pending_sync_conflicts',
        JSON.stringify(updatedConflicts)
      );
    } catch (error) {
      console.error('Error updating pending conflicts:', error);
    }

    return result;
  }

  /**
   * Get conflict history
   */
  getConflictHistory(): ConflictData[] {
    return this.conflictLog.slice(-100); // Last 100 conflicts
  }

  /**
   * Clear conflict history
   */
  clearConflictHistory() {
    this.conflictLog = [];
  }

  /**
   * Get conflict statistics
   */
  getConflictStats() {
    const stats = {
      total: this.conflictLog.length,
      byTable: {} as Record<string, number>,
      byType: {
        update: 0,
        delete: 0,
      },
    };

    this.conflictLog.forEach(conflict => {
      // Count by table
      if (!stats.byTable[conflict.tableName]) {
        stats.byTable[conflict.tableName] = 0;
      }
      stats.byTable[conflict.tableName]++;

      // Count by type
      stats.byType[conflict.conflictType]++;
    });

    return stats;
  }
}

// Export singleton instance
export const syncResolver = new SyncConflictResolver();
export default syncResolver;