import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';

// Realtime event types
export interface GateEntryEvent {
  id: string;
  gate_id: string;
  entry_timestamp: string;
  exit_timestamp?: string;
  direction: 'in' | 'out';
  entry_type: string;
  vehicle_plate?: string;
  security_officer_id: string;
  security_officer_name?: string;
  created_at: string;
}

export interface BroadcastAlertEvent {
  id: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  sender_id: string;
  sender_name?: string;
  created_at: string;
  community_id: string;
}

export interface IncidentAssignmentEvent {
  id: string;
  incident_id: string;
  assigned_to: string;
  assigned_to_name?: string;
  status: string;
  created_at: string;
}

// Realtime subscription types
export type RealtimeEventType =
  | 'gate_entry'
  | 'broadcast_alert'
  | 'incident_assignment'
  | 'delivery_notification'
  | 'guest_arrival';

export interface RealtimeEvent {
  type: RealtimeEventType;
  data: any;
  timestamp: number;
}

// Realtime Service for Supabase subscriptions
export class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private eventListeners: Map<RealtimeEventType, ((event: any) => void)[]> = new Map();
  private isConnected = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Listen to connection state changes
    supabase.realtime.onConnect(() => {
      console.log('Realtime connected');
      this.isConnected = true;
    });

    supabase.realtime.onDisconnect(() => {
      console.log('Realtime disconnected');
      this.isConnected = false;
    });

    console.log('Realtime Service initialized');
  }

  // Subscribe to gate entries for specific gate
  subscribeToGateEntries(gateId: string, callback: (event: GateEntryEvent) => void): () => void {
    const channelName = `gate_entries_${gateId}`;

    if (this.channels.has(channelName)) {
      console.log(`Already subscribed to ${channelName}`);
    } else {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'gate_entries',
            filter: `gate_id=eq.${gateId}`,
          },
          (payload) => {
            console.log('New gate entry:', payload.new);
            this.emitEvent('gate_entry', payload.new as GateEntryEvent);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'gate_entries',
            filter: `gate_id=eq.${gateId}`,
          },
          (payload) => {
            console.log('Gate entry updated:', payload.new);
            this.emitEvent('gate_entry', payload.new as GateEntryEvent);
          }
        )
        .subscribe((status) => {
          console.log(`Gate entries subscription status: ${status}`);
        });

      this.channels.set(channelName, channel);
    }

    // Add listener
    this.addEventListener('gate_entry', callback);

    // Return unsubscribe function
    return () => {
      this.removeEventListener('gate_entry', callback);
    };
  }

  // Subscribe to broadcast alerts for community
  subscribeToBroadcastAlerts(communityId: string, callback: (event: BroadcastAlertEvent) => void): () => void {
    const channelName = `broadcast_alerts_${communityId}`;

    if (this.channels.has(channelName)) {
      console.log(`Already subscribed to ${channelName}`);
    } else {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'broadcast_alerts',
            filter: `community_id=eq.${communityId}`,
          },
          (payload) => {
            console.log('New broadcast alert:', payload.new);
            this.emitEvent('broadcast_alert', payload.new as BroadcastAlertEvent);
          }
        )
        .subscribe((status) => {
          console.log(`Broadcast alerts subscription status: ${status}`);
        });

      this.channels.set(channelName, channel);
    }

    // Add listener
    this.addEventListener('broadcast_alert', callback);

    // Return unsubscribe function
    return () => {
      this.removeEventListener('broadcast_alert', callback);
    };
  }

  // Subscribe to incident assignments for specific officer
  subscribeToIncidentAssignments(officerId: string, callback: (event: IncidentAssignmentEvent) => void): () => void {
    const channelName = `incident_assignments_${officerId}`;

    if (this.channels.has(channelName)) {
      console.log(`Already subscribed to ${channelName}`);
    } else {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'incident_assignments',
            filter: `assigned_to=eq.${officerId}`,
          },
          (payload) => {
            console.log('New incident assignment:', payload.new);
            this.emitEvent('incident_assignment', payload.new as IncidentAssignmentEvent);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'incidents',
            filter: `assigned_to=eq.${officerId}`,
          },
          (payload) => {
            console.log('Incident updated:', payload.new);
            this.emitEvent('incident_assignment', payload.new);
          }
        )
        .subscribe((status) => {
          console.log(`Incident assignments subscription status: ${status}`);
        });

      this.channels.set(channelName, channel);
    }

    // Add listener
    this.addEventListener('incident_assignment', callback);

    // Return unsubscribe function
    return () => {
      this.removeEventListener('incident_assignment', callback);
    };
  }

  // Subscribe to delivery notifications
  subscribeToDeliveryNotifications(householdId?: string, callback: (event: any) => void): () => void {
    const channelName = `delivery_notifications_${householdId || 'all'}`;

    if (this.channels.has(channelName)) {
      console.log(`Already subscribed to ${channelName}`);
    } else {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'deliveries',
            filter: householdId ? `household_id=eq.${householdId}` : undefined,
          },
          (payload) => {
            console.log('New delivery:', payload.new);
            this.emitEvent('delivery_notification', payload.new);
          }
        )
        .subscribe((status) => {
          console.log(`Delivery notifications subscription status: ${status}`);
        });

      this.channels.set(channelName, channel);
    }

    // Add listener
    this.addEventListener('delivery_notification', callback);

    // Return unsubscribe function
    return () => {
      this.removeEventListener('delivery_notification', callback);
    };
  }

  // Subscribe to guest arrivals
  subscribeToGuestArrivals(householdId?: string, callback: (event: any) => void): () => void {
    const channelName = `guest_arrivals_${householdId || 'all'}`;

    if (this.channels.has(channelName)) {
      console.log(`Already subscribed to ${channelName}`);
    } else {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'scheduled_guests',
            filter: `arrival_status=eq.arrived${householdId ? `&household_id=eq.${householdId}` : ''}`,
          },
          (payload) => {
            console.log('Guest arrived:', payload.new);
            this.emitEvent('guest_arrival', payload.new);
          }
        )
        .subscribe((status) => {
          console.log(`Guest arrivals subscription status: ${status}`);
        });

      this.channels.set(channelName, channel);
    }

    // Add listener
    this.addEventListener('guest_arrival', callback);

    // Return unsubscribe function
    return () => {
      this.removeEventListener('guest_arrival', callback);
    };
  }

  // Event listener management
  private addEventListener(eventType: RealtimeEventType, listener: (event: any) => void) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  private removeEventListener(eventType: RealtimeEventType, listener: (event: any) => void) {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emitEvent(eventType: RealtimeEventType, data: any) {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in realtime listener for ${eventType}:`, error);
        }
      });
    }
  }

  // Unsubscribe from all channels
  unsubscribeAll() {
    console.log('Unsubscribing from all realtime channels...');

    this.channels.forEach((channel, channelName) => {
      supabase.removeChannel(channel);
      console.log(`Unsubscribed from ${channelName}`);
    });

    this.channels.clear();
    this.eventListeners.clear();
  }

  // Unsubscribe from specific channel
  unsubscribe(channelName: string) {
    const channel = this.channels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
      console.log(`Unsubscribed from ${channelName}`);
    }
  }

  // Get connection status
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Get active subscriptions
  getActiveSubscriptions(): string[] {
    return Array.from(this.channels.keys());
  }

  // Cleanup
  cleanup() {
    this.unsubscribeAll();
  }
}

// Create singleton instance
export const realtimeService = new RealtimeService();

// React hook for realtime events
export const useRealtimeEvents = () => {
  const [connectionStatus, setConnectionStatus] = useState(realtimeService.getConnectionStatus());
  const [events, setEvents] = useState<RealtimeEvent[]>([]);

  useEffect(() => {
    // Monitor connection status
    const checkConnection = setInterval(() => {
      const status = realtimeService.getConnectionStatus();
      setConnectionStatus(status);
    }, 5000);

    return () => clearInterval(checkConnection);
  }, []);

  const addEvent = (event: RealtimeEvent) => {
    setEvents(prev => [event, ...prev].slice(0, 100)); // Keep last 100 events
  };

  const subscribeToGateEntries = (gateId: string, callback: (event: GateEntryEvent) => void) => {
    return realtimeService.subscribeToGateEntries(gateId, (event) => {
      addEvent({ type: 'gate_entry', data: event, timestamp: Date.now() });
      callback(event);
    });
  };

  const subscribeToBroadcastAlerts = (communityId: string, callback: (event: BroadcastAlertEvent) => void) => {
    return realtimeService.subscribeToBroadcastAlerts(communityId, (event) => {
      addEvent({ type: 'broadcast_alert', data: event, timestamp: Date.now() });
      callback(event);
    });
  };

  const subscribeToIncidentAssignments = (officerId: string, callback: (event: IncidentAssignmentEvent) => void) => {
    return realtimeService.subscribeToIncidentAssignments(officerId, (event) => {
      addEvent({ type: 'incident_assignment', data: event, timestamp: Date.now() });
      callback(event);
    });
  };

  return {
    connectionStatus,
    events,
    subscribeToGateEntries,
    subscribeToBroadcastAlerts,
    subscribeToIncidentAssignments,
    unsubscribeAll: () => realtimeService.unsubscribeAll(),
    getActiveSubscriptions: () => realtimeService.getActiveSubscriptions(),
  };
};