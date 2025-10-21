import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Guest } from './guestService';

export interface RealtimeEvent {
  type: 'guest' | 'permit' | 'delivery' | 'announcement' | 'household';
  action: 'created' | 'updated' | 'deleted' | 'approved' | 'rejected';
  data: any;
  householdId: string;
  timestamp: string;
}

export interface RealtimeSubscription {
  channel: RealtimeChannel;
  unsubscribe: () => void;
}

class RealtimeService {
  private subscriptions: Map<string, RealtimeSubscription> = new Map();
  private eventListeners: Map<string, ((event: RealtimeEvent) => void)[]> = new Map();

  /**
   * Subscribe to real-time updates for guests in a household
   */
  subscribeToGuests(householdId: string, onEvent: (event: RealtimeEvent) => void): RealtimeSubscription {
    const subscriptionId = `guests-${householdId}`;

    // Store event listener
    if (!this.eventListeners.has(subscriptionId)) {
      this.eventListeners.set(subscriptionId, []);
    }
    this.eventListeners.get(subscriptionId)!.push(onEvent);

    // Create Supabase subscription
    const channel = supabase
      .channel(`household-${householdId}-guests`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduled_guests',
          filter: `household_id=eq.${householdId}`,
        },
        (payload) => {
          const event: RealtimeEvent = {
            type: 'guest',
            action: this.mapPostgresEvent(payload.eventType),
            data: payload.new || payload.old,
            householdId,
            timestamp: new Date().toISOString(),
          };

          this.notifyListeners(subscriptionId, event);
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error(`Realtime: Failed to subscribe to guests for household ${householdId}`);
        }
      });

    const subscription: RealtimeSubscription = {
      channel,
      unsubscribe: () => {
        supabase.removeChannel(channel);
        this.subscriptions.delete(subscriptionId);
        this.eventListeners.delete(subscriptionId);
      },
    };

    this.subscriptions.set(subscriptionId, subscription);
    return subscription;
  }

  /**
   * Subscribe to real-time updates for construction permits
   */
  subscribeToPermits(householdId: string, onEvent: (event: RealtimeEvent) => void): RealtimeSubscription {
    const subscriptionId = `permits-${householdId}`;

    // Store event listener
    if (!this.eventListeners.has(subscriptionId)) {
      this.eventListeners.set(subscriptionId, []);
    }
    this.eventListeners.get(subscriptionId)!.push(onEvent);

    // Create Supabase subscription
    const channel = supabase
      .channel(`household-${householdId}-permits`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'construction_permits',
          filter: `household_id=eq.${householdId}`,
        },
        (payload) => {
          const event: RealtimeEvent = {
            type: 'permit',
            action: this.mapPostgresEvent(payload.eventType),
            data: payload.new || payload.old,
            householdId,
            timestamp: new Date().toISOString(),
          };

          this.notifyListeners(subscriptionId, event);
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error(`Realtime: Failed to subscribe to permits for household ${householdId}`);
        }
      });

    const subscription: RealtimeSubscription = {
      channel,
      unsubscribe: () => {
        supabase.removeChannel(channel);
        this.subscriptions.delete(subscriptionId);
        this.eventListeners.delete(subscriptionId);
      },
    };

    this.subscriptions.set(subscriptionId, subscription);
    return subscription;
  }

  /**
   * Subscribe to real-time updates for announcements
   */
  subscribeToAnnouncements(householdId: string, onEvent: (event: RealtimeEvent) => void): RealtimeSubscription {
    const subscriptionId = `announcements-${householdId}`;

    // Store event listener
    if (!this.eventListeners.has(subscriptionId)) {
      this.eventListeners.set(subscriptionId, []);
    }
    this.eventListeners.get(subscriptionId)!.push(onEvent);

    // Create Supabase subscription for announcements (all announcements since they're community-wide)
    const channel = supabase
      .channel(`community-announcements`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements',
          // No filter needed since announcements are community-wide
        },
        (payload) => {
          const event: RealtimeEvent = {
            type: 'announcement',
            action: this.mapPostgresEvent(payload.eventType),
            data: payload.new || payload.old,
            householdId, // Include household ID for context
            timestamp: new Date().toISOString(),
          };

          this.notifyListeners(subscriptionId, event);
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error(`Realtime: Failed to subscribe to announcements for household ${householdId}`);
        }
      });

    const subscription: RealtimeSubscription = {
      channel,
      unsubscribe: () => {
        supabase.removeChannel(channel);
        this.subscriptions.delete(subscriptionId);
        this.eventListeners.delete(subscriptionId);
      },
    };

    this.subscriptions.set(subscriptionId, subscription);
    return subscription;
  }

  /**
   * Subscribe to all real-time updates for a household
   */
  subscribeToAllUpdates(householdId: string, onEvent: (event: RealtimeEvent) => void): RealtimeSubscription {
    const subscriptionId = `all-${householdId}`;

    // Store event listener
    if (!this.eventListeners.has(subscriptionId)) {
      this.eventListeners.set(subscriptionId, []);
    }
    this.eventListeners.get(subscriptionId)!.push(onEvent);

    // Create combined channel
    const channel = supabase
      .channel(`household-${householdId}-all`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduled_guests',
          filter: `household_id=eq.${householdId}`,
        },
        (payload) => {
          const event: RealtimeEvent = {
            type: 'guest',
            action: this.mapPostgresEvent(payload.eventType),
            data: payload.new || payload.old,
            householdId,
            timestamp: new Date().toISOString(),
          };

          this.notifyListeners(subscriptionId, event);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'construction_permits',
          filter: `household_id=eq.${householdId}`,
        },
        (payload) => {
          const event: RealtimeEvent = {
            type: 'permit',
            action: this.mapPostgresEvent(payload.eventType),
            data: payload.new || payload.old,
            householdId,
            timestamp: new Date().toISOString(),
          };

          this.notifyListeners(subscriptionId, event);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements',
        },
        (payload) => {
          const event: RealtimeEvent = {
            type: 'announcement',
            action: this.mapPostgresEvent(payload.eventType),
            data: payload.new || payload.old,
            householdId,
            timestamp: new Date().toISOString(),
          };

          this.notifyListeners(subscriptionId, event);
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error(`Realtime: Failed to subscribe to all updates for household ${householdId}`);
        }
      });

    const subscription: RealtimeSubscription = {
      channel,
      unsubscribe: () => {
        supabase.removeChannel(channel);
        this.subscriptions.delete(subscriptionId);
        this.eventListeners.delete(subscriptionId);
      },
    };

    this.subscriptions.set(subscriptionId, subscription);
    return subscription;
  }

  /**
   * Unsubscribe from all subscriptions
   */
  unsubscribeAll(): void {
    this.subscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
    this.subscriptions.clear();
    this.eventListeners.clear();
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.subscriptions.size > 0;
  }

  /**
   * Get active subscriptions count
   */
  getActiveSubscriptionsCount(): number {
    return this.subscriptions.size;
  }

  private mapPostgresEvent(eventType: string): RealtimeEvent['action'] {
    switch (eventType) {
      case 'INSERT':
        return 'created';
      case 'UPDATE':
        return 'updated';
      case 'DELETE':
        return 'deleted';
      default:
        return 'updated';
    }
  }

  private notifyListeners(subscriptionId: string, event: RealtimeEvent): void {
    const listeners = this.eventListeners.get(subscriptionId);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in realtime event listener:', error);
        }
      });
    }
  }
}

// Export singleton instance
export const realtimeService = new RealtimeService();
export default realtimeService;