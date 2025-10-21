import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import stickerCacheService from './stickerCacheService';
import notificationService from './notificationService';


import { MaterialIcons } from '@expo/vector-icons';

interface RealtimeConfig {
  onStatusChange?: (sticker: any) => void;
  onNewSticker?: (sticker: any) => void;
  onStickerDeleted?: (stickerId: string) => void;
}

class StickerRealtimeService {
  private channel: RealtimeChannel | null = null;
  private householdId: string | null = null;
  private isSubscribed = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  /**
   * Initialize realtime subscriptions for stickers
   */
  async initialize(config?: RealtimeConfig): Promise<void> {
    try {
      // Get current user's household ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user for realtime');
        return;
      }

      this.householdId = user.user_metadata?.household_id;
      if (!this.householdId) {
        console.log('No household ID for realtime');
        return;
      }

      await this.subscribe(config);
    } catch (error) {
      console.error('Failed to initialize realtime:', error);
    }
  }

  /**
   * Subscribe to sticker changes
   */
  private async subscribe(config?: RealtimeConfig): Promise<void> {
    if (this.isSubscribed) {
      console.log('Already subscribed to realtime');
      return;
    }

    try {
      // Create channel for household stickers
      this.channel = supabase
        .channel(`stickers:${this.householdId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'vehicle_stickers',
            filter: `household_id=eq.${this.householdId}`,
          },
          async (payload: RealtimePostgresChangesPayload<any>) => {
            await this.handleRealtimeChange(payload, config);
          }
        )
        .subscribe((status) => {
          console.log('Realtime subscription status:', status);
          if (status === 'SUBSCRIBED') {
            this.isSubscribed = true;
            this.reconnectAttempts = 0;
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            this.handleConnectionError();
          }
        });
    } catch (error) {
      console.error('Failed to subscribe to realtime:', error);
      this.handleConnectionError();
    }
  }

  /**
   * Handle realtime change events
   */
  private async handleRealtimeChange(
    payload: RealtimePostgresChangesPayload<any>,
    config?: RealtimeConfig
  ): Promise<void> {
    console.log('Realtime sticker change:', payload.eventType, payload.new?.id || payload.old?.id);

    try {
      switch (payload.eventType) {
        case 'INSERT':
          await this.handleNewSticker(payload.new, config);
          break;

        case 'UPDATE':
          await this.handleStickerUpdate(payload.new, payload.old, config);
          break;

        case 'DELETE':
          await this.handleStickerDelete(payload.old, config);
          break;
      }
    } catch (error) {
      console.error('Failed to handle realtime change:', error);
    }
  }

  /**
   * Handle new sticker creation
   */
  private async handleNewSticker(stickerData: any, config?: RealtimeConfig): Promise<void> {
    if (!stickerData) return;

    // Cache the new sticker
    await stickerCacheService.cacheServerSticker(stickerData);

    // Trigger callback
    config?.onNewSticker?.(stickerData);

    // Show notification
    if (stickerData.status === 'approved') {
      await notificationService.showLocalNotification({
        title: 'Sticker Approved! 🎉',
        body: `Your sticker for ${stickerData.vehicle_plate} has been approved`,
        data: { type: 'sticker_approved', stickerId: stickerData.id },
      });
    }
  }

  /**
   * Handle sticker updates
   */
  private async handleStickerUpdate(
    newData: any,
    oldData: any,
    config?: RealtimeConfig
  ): Promise<void> {
    if (!newData) return;

    // Update cached sticker
    await stickerCacheService.cacheServerSticker(newData);

    // Check for status changes
    if (oldData?.status !== newData.status) {
      config?.onStatusChange?.(newData);

      // Send notifications for status changes
      await this.sendStatusNotification(newData, oldData);
    }

    // Invalidate cache to trigger UI updates
    await stickerCacheService.invalidateSticker(newData.id);
  }

  /**
   * Handle sticker deletion
   */
  private async handleStickerDelete(stickerData: any, config?: RealtimeConfig): Promise<void> {
    if (!stickerData) return;

    try {
      // Remove from cache
      await stickerCacheService.invalidateSticker(stickerData.id);

      // Trigger callback
      config?.onStickerDeleted?.(stickerData.id);
    } catch (error) {
      console.error('Failed to handle sticker deletion:', error);
    }
  }

  /**
   * Send notification for status changes
   */
  private async sendStatusNotification(newData: any, oldData: any): Promise<void> {
    let title = '';
    let body = '';
    let notificationType = '';

    switch (newData.status) {
      case 'approved':
        title = 'Sticker Approved! ✅';
        body = `Your vehicle sticker for ${newData.vehicle_plate} has been approved. You can now pick it up at the admin office.`;
        notificationType = 'sticker_approved';
        break;

      case 'rejected':
        title = 'Sticker Request Rejected ❌';
        body = `Your sticker request for ${newData.vehicle_plate} was rejected. Reason: ${newData.rejection_reason || 'Please contact admin for details'}`;
        notificationType = 'sticker_rejected';
        break;

      case 'processing':
        title = 'Sticker Being Processed ⏳';
        body = `Your sticker request for ${newData.vehicle_plate} is now being processed.`;
        notificationType = 'sticker_processing';
        break;

      case 'expired':
        if (oldData?.status === 'active') {
          title = 'Sticker Expired ⚠️';
          body = `Your vehicle sticker for ${newData.vehicle_plate} has expired. Please renew it as soon as possible.`;
          notificationType = 'sticker_expired';
        }
        break;
    }

    if (title && body) {
      await notificationService.showLocalNotification({
        title,
        body,
        data: {
          type: notificationType,
          stickerId: newData.id,
          plateNumber: newData.vehicle_plate,
        },
      });
    }
  }

  /**
   * Subscribe to specific sticker updates
   */
  async subscribeToSticker(stickerId: string, onChange: (sticker: any) => void): RealtimeChannel {
    const channel = supabase
      .channel(`sticker:${stickerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'vehicle_stickers',
          filter: `id=eq.${stickerId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          onChange(payload.new);
        }
      )
      .subscribe();

    return channel;
  }

  /**
   * Subscribe to expiring stickers alerts
   */
  async subscribeToExpiringAlerts(): Promise<void> {
    // Check for expiring stickers periodically
    setInterval(async () => {
      try {
        if (!this.householdId) return;

        // Get active stickers from cache
        const cachedStickers = await stickerCacheService.getCachedStickers(this.householdId);
        const activeStickers = cachedStickers.filter(sticker => sticker.status === 'active');

        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        for (const sticker of activeStickers) {
          const expiryTime = new Date(sticker.expiry_date).getTime();

          // Check if expiring within 30 days
          if (expiryTime > now.getTime() && expiryTime <= thirtyDaysFromNow.getTime()) {
            const daysToExpiry = Math.ceil((expiryTime - now.getTime()) / (24 * 60 * 60 * 1000));

            // Send notification at specific intervals
            if ([30, 15, 7, 3, 1].includes(daysToExpiry)) {
              await notificationService.showLocalNotification({
                title: 'Sticker Expiring Soon ⚠️',
                body: `Your sticker for ${sticker.vehicle_make} ${sticker.vehicle_model} expires in ${daysToExpiry} day${daysToExpiry !== 1 ? 's' : ''}. Renew now to avoid penalties.`,
                data: {
                  type: 'sticker_expiring',
                  stickerId: sticker.id,
                  daysToExpiry,
                },
              });
            }
          }
        }
      } catch (error) {
        console.error('Failed to check expiring stickers:', error);
      }
    }, 24 * 60 * 60 * 1000); // Check daily
  }

  /**
   * Handle connection errors with exponential backoff
   */
  private handleConnectionError(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.isSubscribed = false;
    this.reconnectAttempts++;

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      this.subscribe();
    }, delay);
  }

  /**
   * Unsubscribe from all realtime channels
   */
  async unsubscribe(): Promise<void> {
    if (this.channel) {
      await supabase.removeChannel(this.channel);
      this.channel = null;
      this.isSubscribed = false;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Sync sticker status with server
   */
  async syncStickerStatus(stickerId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('vehicle_stickers')
        .select('*')
        .eq('id', stickerId)
        .single();

      if (!error && data) {
        await stickerCacheService.cacheServerSticker(data);
      }
    } catch (error) {
      console.error('Failed to sync sticker status:', error);
    }
  }

  /**
   * Batch sync multiple stickers
   */
  async batchSyncStickers(stickerIds: string[]): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('vehicle_stickers')
        .select('*')
        .in('id', stickerIds);

      if (!error && data) {
        await stickerCacheService.bulkCacheStickers(data);
      }
    } catch (error) {
      console.error('Failed to batch sync stickers:', error);
    }
  }

  /**
   * Check if realtime is connected
   */
  isConnected(): boolean {
    return this.isSubscribed;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    connected: boolean;
    reconnectAttempts: number;
    channelId: string | null;
  } {
    return {
      connected: this.isSubscribed,
      reconnectAttempts: this.reconnectAttempts,
      channelId: this.channel?.topic || null,
    };
  }
}

// Export singleton instance
export const stickerRealtimeService = new StickerRealtimeService();
export default stickerRealtimeService;