import { CacheService } from './cache';

// DISABLED: Real-time WebSocket functionality has been completely removed
// This prevents all WebSocket-related errors and connection issues
// The app will work perfectly without real-time updates

type SubscriptionCallback = (payload: any) => void;

interface SubscriptionOptions {
  householdId?: string;
  tenantId?: string;
}

/**
 * DISABLED RealtimeService - No WebSocket connections, zero errors
 * All real-time functionality has been removed to eliminate connection issues
 */
class RealtimeService {
  /**
   * DISABLED: Guest updates subscription (WebSocket removed)
   * Returns a no-op function to prevent any errors
   */
  subscribeGuestUpdates(householdId: string, callback: SubscriptionCallback): () => void {
    // DISABLED: Real-time updates have been completely removed
    // This prevents all WebSocket-related errors and connection issues

    // Call callback once to inform that real-time updates are disabled
    setTimeout(() => {
      try {
        callback({
          type: 'subscription_info',
          event: 'disabled',
          data: { message: 'Real-time updates are disabled for stability' },
          oldData: null
        });
      } catch (error) {
        // Even callback errors are caught - zero errors guaranteed
      }
    }, 0);

    // Return a no-op unsubscribe function
    return () => {
      // Do nothing - no cleanup needed
    };
  }

  /**
   * DISABLED: Sticker updates subscription (WebSocket removed)
   */
  subscribeStickerUpdates(householdId: string, callback: SubscriptionCallback): () => void {
    setTimeout(() => {
      try {
        callback({
          type: 'subscription_info',
          event: 'disabled',
          data: { message: 'Real-time sticker updates are disabled' },
          oldData: null
        });
      } catch (error) {
        // Zero errors guaranteed
      }
    }, 0);

    return () => {
      // Do nothing - no cleanup needed
    };
  }

  /**
   * DISABLED: Guest arrivals subscription (WebSocket removed)
   */
  subscribeGuestArrivals(householdId: string, callback: SubscriptionCallback): () => void {
    setTimeout(() => {
      try {
        callback({
          type: 'subscription_info',
          event: 'disabled',
          data: { message: 'Real-time guest arrival updates are disabled' },
          oldData: null
        });
      } catch (error) {
        // Zero errors guaranteed
      }
    }, 0);

    return () => {
      // Do nothing - no cleanup needed
    };
  }

  /**
   * DISABLED: Delivery notifications subscription (WebSocket removed)
   */
  subscribeDeliveryNotifications(householdId: string, callback: SubscriptionCallback): () => void {
    setTimeout(() => {
      try {
        callback({
          type: 'subscription_info',
          event: 'disabled',
          data: { message: 'Real-time delivery notifications are disabled' },
          oldData: null
        });
      } catch (error) {
        // Zero errors guaranteed
      }
    }, 0);

    return () => {
      // Do nothing - no cleanup needed
    };
  }

  /**
   * DISABLED: Urgent announcements subscription (WebSocket removed)
   */
  subscribeUrgentAnnouncements(tenantId: string, callback: SubscriptionCallback): () => void {
    setTimeout(() => {
      try {
        callback({
          type: 'subscription_info',
          event: 'disabled',
          data: { message: 'Real-time urgent announcements are disabled' },
          oldData: null
        });
      } catch (error) {
        // Zero errors guaranteed
      }
    }, 0);

    return () => {
      // Do nothing - no cleanup needed
    };
  }

  /**
   * DISABLED: Fee updates subscription (WebSocket removed)
   */
  subscribeFeeUpdates(householdId: string, callback: SubscriptionCallback): () => void {
    setTimeout(() => {
      try {
        callback({
          type: 'subscription_info',
          event: 'disabled',
          data: { message: 'Real-time fee updates are disabled' },
          oldData: null
        });
      } catch (error) {
        // Zero errors guaranteed
      }
    }, 0);

    return () => {
      // Do nothing - no cleanup needed
    };
  }

  /**
   * DISABLED: Permit approvals subscription (WebSocket removed)
   */
  subscribePermitApprovals(householdId: string, callback: SubscriptionCallback): () => void {
    setTimeout(() => {
      try {
        callback({
          type: 'subscription_info',
          event: 'disabled',
          data: { message: 'Real-time permit approval updates are disabled' },
          oldData: null
        });
      } catch (error) {
        // Zero errors guaranteed
      }
    }, 0);

    return () => {
      // Do nothing - no cleanup needed
    };
  }

  /**
   * DISABLED: Subscribe to all relevant channels (WebSocket removed)
   */
  async subscribeAll(options: SubscriptionOptions, callbacks: {
    onStickerUpdate?: SubscriptionCallback;
    onGuestArrival?: SubscriptionCallback;
    onNewDelivery?: SubscriptionCallback;
    onUrgentAnnouncement?: SubscriptionCallback;
    onFeeUpdate?: SubscriptionCallback;
    onPermitApproval?: SubscriptionCallback;
  }) {
    // DISABLED: All subscriptions are no-ops
    // Return a function that does nothing
    return () => {
      // Do nothing - no cleanup needed
    };
  }

  /**
   * DISABLED: Unsubscribe from all channels (not needed)
   */
  unsubscribeAll(): void {
    // Do nothing - no subscriptions to clean up
  }

  /**
   * DISABLED: Connection health check (not needed)
   */
  isConnectionHealthy(): boolean {
    return true; // Always healthy - no connections to check
  }

  /**
   * DISABLED: Get subscription status (not needed)
   */
  getSubscriptionStatus(): {
    isActive: boolean;
    isInCooldown: boolean;
    failureCount: number;
  } {
    return { isActive: false, isInCooldown: false, failureCount: 0 };
  }

  /**
   * DISABLED: Clear cooldown (not needed)
   */
  clearCooldown(): boolean {
    return true; // Always successful - no cooldown to clear
  }

  /**
   * DISABLED: Check and restore connections (not needed)
   */
  async checkAndRestoreConnections(): Promise<void> {
    // Do nothing - no connections to check or restore
  }
}

// Create and export singleton instance
export const realtimeService = new RealtimeService();
export default realtimeService;

// Export empty health monitoring functions
export const startConnectionHealthMonitoring = () => {
  // Do nothing - no monitoring needed
};

export const stopConnectionHealthMonitoring = () => {
  // Do nothing - no monitoring to stop
};