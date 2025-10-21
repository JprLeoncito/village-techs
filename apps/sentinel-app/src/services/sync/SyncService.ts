import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useState, useEffect } from 'react';

// Sync queue item with priority
export interface SyncQueueItem {
  id: string;
  entityType: 'gate_entry' | 'delivery' | 'incident' | 'guest_arrival';
  entityId?: string;
  payload: Record<string, any>;
  priority: 1 | 2 | 3; // 1=critical, 2=high, 3=normal
  retryCount: number;
  lastError?: string;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  createdAt: number;
  updatedAt: number;
}

// Sync Service with priority-based queue for offline operations
export class SyncService {
  private isOnline = true;
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private maxRetries = 3;
  private syncQueue: SyncQueueItem[] = [];

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Load existing sync queue
    await this.loadSyncQueue();

    // Monitor network status
    this.monitorNetworkStatus();

    // Start sync interval (every 30 seconds when online)
    this.startSyncInterval();

    console.log('Sync Service initialized');
  }

  private async loadSyncQueue() {
    try {
      const queueData = await AsyncStorage.getItem('sync_queue');
      if (queueData) {
        this.syncQueue = JSON.parse(queueData);
        console.log(`Loaded ${this.syncQueue.length} items from sync queue`);
      }
    } catch (error) {
      console.error('Error loading sync queue:', error);
    }
  }

  private async saveSyncQueue() {
    try {
      await AsyncStorage.setItem('sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Error saving sync queue:', error);
    }
  }

  private monitorNetworkStatus() {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (!wasOnline && this.isOnline) {
        console.log('Network restored, starting sync...');
        this.syncQueuedEntries();
      }
    });

    return unsubscribe;
  }

  private startSyncInterval() {
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing && this.syncQueue.length > 0) {
        this.syncQueuedEntries();
      }
    }, 30000); // 30 seconds
  }

  // Add item to sync queue with priority
  async queueEntry(item: Omit<SyncQueueItem, 'id' | 'retryCount' | 'status' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const queueItem: SyncQueueItem = {
      ...item,
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      retryCount: 0,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.syncQueue.push(queueItem);

    // Sort by priority (1=highest) and created time
    this.syncQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.createdAt - b.createdAt;
    });

    await this.saveSyncQueue();

    console.log(`Queued ${item.entityType} item with priority ${item.priority}`);

    // Try to sync immediately if online
    if (this.isOnline) {
      this.syncQueuedEntries();
    }

    return queueItem.id;
  }

  // Sync queued entries with priority ordering
  async syncQueuedEntries(): Promise<void> {
    if (this.isSyncing || this.syncQueue.length === 0 || !this.isOnline) {
      return;
    }

    this.isSyncing = true;
    console.log(`Syncing ${this.syncQueue.length} queued items...`);

    try {
      // Process items in priority order
      for (let i = 0; i < this.syncQueue.length; i++) {
        const item = this.syncQueue[i];

        if (item.status === 'pending' || (item.status === 'failed' && item.retryCount < this.maxRetries)) {
          try {
            await this.syncItem(item);
          } catch (error) {
            console.error(`Failed to sync item ${item.id}:`, error);
            // Continue with next item even if this one fails
          }
        }
      }

      // Clean up completed items
      this.syncQueue = this.syncQueue.filter(item => item.status !== 'completed');
      await this.saveSyncQueue();

    } catch (error) {
      console.error('Error during sync process:', error);
    } finally {
      this.isSyncing = false;
      console.log('Sync process completed');
    }
  }

  // Sync individual item based on entity type
  private async syncItem(item: SyncQueueItem): Promise<void> {
    item.status = 'syncing';
    item.updatedAt = Date.now();
    await this.saveSyncQueue();

    try {
      let result;

      switch (item.entityType) {
        case 'gate_entry':
          result = await this.syncGateEntry(item.payload);
          break;
        case 'delivery':
          result = await this.syncDelivery(item.payload);
          break;
        case 'incident':
          result = await this.syncIncident(item.payload);
          break;
        case 'guest_arrival':
          result = await this.syncGuestArrival(item.payload);
          break;
        default:
          throw new Error(`Unknown entity type: ${item.entityType}`);
      }

      if (result) {
        item.status = 'completed';
        item.updatedAt = Date.now();
        console.log(`Successfully synced ${item.entityType} item: ${item.id}`);
      }

    } catch (error) {
      item.status = 'failed';
      item.retryCount++;
      item.lastError = error instanceof Error ? error.message : 'Unknown error';
      item.updatedAt = Date.now();

      console.error(`Failed to sync ${item.entityType} item ${item.id}:`, error);

      if (item.retryCount >= this.maxRetries) {
        console.warn(`Max retries reached for item ${item.id}, will retry later`);
      }
    }

    await this.saveSyncQueue();
  }

  // Sync gate entry
  private async syncGateEntry(payload: any): Promise<any> {
    const { data, error } = await supabase
      .from('gate_entries')
      .insert([{
        gate_id: payload.gateId,
        entry_timestamp: new Date(payload.entryTimestamp).toISOString(),
        exit_timestamp: payload.exitTimestamp ? new Date(payload.exitTimestamp).toISOString() : null,
        direction: payload.direction,
        entry_type: payload.entryType,
        vehicle_plate: payload.vehiclePlate,
        rfid_code: payload.rfidCode,
        household_id: payload.householdId,
        photos: payload.photos,
        notes: payload.notes,
        security_officer_id: payload.securityOfficerId,
        linked_entry_id: payload.linkedEntryId,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Sync delivery
  private async syncDelivery(payload: any): Promise<any> {
    const { data, error } = await supabase
      .from('deliveries')
      .insert([{
        id: payload.id,
        service_name: payload.serviceName,
        tracking_number: payload.trackingNumber,
        arrival_timestamp: new Date(payload.arrivalTimestamp).toISOString(),
        photos: payload.photos,
        perishable: payload.perishable,
        pickup_status: payload.pickupStatus,
        picked_up_at: payload.pickedUpAt ? new Date(payload.pickedUpAt).toISOString() : null,
        pickup_method: payload.pickupMethod,
        pickup_notes: payload.pickupNotes,
        household_id: payload.householdId,
        security_officer_id: payload.securityOfficerId,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Sync incident
  private async syncIncident(payload: any): Promise<any> {
    const { data, error } = await supabase
      .from('incidents')
      .insert([{
        id: payload.id,
        type: payload.type,
        severity: payload.severity,
        location: payload.location,
        location_gps: payload.locationGps,
        description: payload.description,
        photos: payload.photos,
        videos: payload.videos,
        status: payload.status,
        assigned_to: payload.assignedTo,
        reporting_officer_id: payload.reportingOfficerId,
        resolution_notes: payload.resolutionNotes,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Sync guest arrival
  private async syncGuestArrival(payload: any): Promise<any> {
    const { data, error } = await supabase
      .from('scheduled_guests')
      .update({
        arrival_status: 'arrived',
        arrived_at: new Date(payload.arrivedAt).toISOString(),
      })
      .eq('id', payload.guestId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Check online status
  async isOnlineStatus(): Promise<boolean> {
    try {
      // Lightweight ping to Supabase
      const { error } = await supabase
        .from('communities')
        .select('id')
        .limit(1);

      this.isOnline = !error;
      return this.isOnline;
    } catch (error) {
      this.isOnline = false;
      return false;
    }
  }

  // Get sync queue status
  getSyncStatus() {
    const pendingCount = this.syncQueue.filter(item => item.status === 'pending').length;
    const failedCount = this.syncQueue.filter(item => item.status === 'failed').length;
    const criticalCount = this.syncQueue.filter(item => item.priority === 1 && item.status !== 'completed').length;

    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      totalCount: this.syncQueue.length,
      pendingCount,
      failedCount,
      criticalCount,
      lastSyncTime: this.syncQueue.length > 0 ?
        Math.max(...this.syncQueue.map(item => item.updatedAt)) : null,
    };
  }

  // Clear sync queue
  async clearSyncQueue(): Promise<void> {
    this.syncQueue = [];
    await this.saveSyncQueue();
    console.log('Sync queue cleared');
  }

  // Manual sync trigger
  async forceSync(): Promise<void> {
    if (this.isOnline) {
      await this.syncQueuedEntries();
    } else {
      throw new Error('Device is offline, cannot sync');
    }
  }

  // Cleanup
  cleanup() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}

// Create singleton instance
export const syncService = new SyncService();

// React hook for sync status
export const useSyncStatus = () => {
  const [syncStatus, setSyncStatus] = useState(syncService.getSyncStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setSyncStatus(syncService.getSyncStatus());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const queueItem = async (item: Omit<SyncQueueItem, 'id' | 'retryCount' | 'status' | 'createdAt' | 'updatedAt'>) => {
    await syncService.queueEntry(item);
    setSyncStatus(syncService.getSyncStatus());
  };

  const forceSync = async () => {
    await syncService.forceSync();
    setSyncStatus(syncService.getSyncStatus());
  };

  return {
    syncStatus,
    queueItem,
    forceSync,
  };
};