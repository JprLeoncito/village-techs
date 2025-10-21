import pushNotificationService from '../lib/pushNotifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';


import { MaterialIcons } from '@expo/vector-icons';

export enum NotificationType {
  // Sticker notifications
  STICKER_APPROVED = 'sticker_approved',
  STICKER_REJECTED = 'sticker_rejected',
  STICKER_EXPIRING = 'sticker_expiring',
  STICKER_EXPIRED = 'sticker_expired',

  // Guest notifications
  GUEST_ARRIVED = 'guest_arrived',
  GUEST_SCHEDULED = 'guest_scheduled',
  GUEST_CANCELLED = 'guest_cancelled',

  // Fee notifications
  FEE_DUE = 'fee_due',
  FEE_OVERDUE = 'fee_overdue',
  FEE_PAYMENT_SUCCESS = 'fee_payment_success',
  FEE_PAYMENT_FAILED = 'fee_payment_failed',

  // Delivery notifications
  DELIVERY_ARRIVED = 'delivery_arrived',
  DELIVERY_PENDING = 'delivery_pending',
  DELIVERY_REMINDER = 'delivery_reminder',

  // Permit notifications
  PERMIT_APPROVED = 'permit_approved',
  PERMIT_REJECTED = 'permit_rejected',
  PERMIT_ROAD_FEE_DUE = 'permit_road_fee_due',

  // Announcement notifications
  ANNOUNCEMENT_URGENT = 'announcement_urgent',
  ANNOUNCEMENT_GENERAL = 'announcement_general',
  ANNOUNCEMENT_EVENT = 'announcement_event',
  ANNOUNCEMENT_MAINTENANCE = 'announcement_maintenance',
  ANNOUNCEMENT_ELECTION = 'announcement_election',
}

export interface NotificationPreferences {
  stickers: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };
  guests: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };
  fees: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };
  deliveries: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };
  permits: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };
  announcements: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };
}

interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data?: any;
  navigateTo?: string;
  params?: any;
  badge?: number;
  priority?: 'high' | 'normal' | 'low';
}

class NotificationService {
  private preferences: NotificationPreferences | null = null;
  private readonly PREFERENCES_KEY = 'notification_preferences';

  /**
   * Initialize notification service
   */
  async initialize() {
    // Initialize push notifications
    await pushNotificationService.initialize();

    // Load user preferences
    await this.loadPreferences();

    // Subscribe to notification topics
    await this.subscribeToTopics();

    console.log('Notification service initialized');
  }

  /**
   * Load notification preferences
   */
  async loadPreferences(): Promise<NotificationPreferences> {
    try {
      const stored = await AsyncStorage.getItem(this.PREFERENCES_KEY);

      if (stored) {
        this.preferences = JSON.parse(stored);
      } else {
        // Set default preferences
        this.preferences = this.getDefaultPreferences();
        await this.savePreferences(this.preferences);
      }

      return this.preferences;
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
      this.preferences = this.getDefaultPreferences();
      return this.preferences;
    }
  }

  /**
   * Get default notification preferences
   */
  private getDefaultPreferences(): NotificationPreferences {
    return {
      stickers: { push: true, email: true, sms: false },
      guests: { push: true, email: false, sms: false },
      fees: { push: true, email: true, sms: true },
      deliveries: { push: true, email: false, sms: false },
      permits: { push: true, email: true, sms: false },
      announcements: { push: true, email: false, sms: false },
    };
  }

  /**
   * Save notification preferences
   */
  async savePreferences(preferences: NotificationPreferences) {
    try {
      this.preferences = preferences;
      await AsyncStorage.setItem(
        this.PREFERENCES_KEY,
        JSON.stringify(preferences)
      );

      // Update backend preferences
      await this.updateBackendPreferences(preferences);
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    }
  }

  /**
   * Update backend preferences
   */
  private async updateBackendPreferences(preferences: NotificationPreferences) {
    try {
      const { data: user } = await supabase.auth.getUser();

      if (user?.user) {
        await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.user.id,
            notification_preferences: preferences,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });
      }
    } catch (error) {
      console.error('Failed to update backend preferences:', error);
    }
  }

  /**
   * Subscribe to notification topics
   */
  private async subscribeToTopics() {
    // This would be implemented based on your backend notification system
    // For example, subscribing to FCM topics or OneSignal tags
    console.log('Subscribed to notification topics');
  }

  /**
   * Handle sticker approval notification
   */
  async notifyStickerApproval(stickerData: any) {
    if (!this.shouldSendNotification('stickers')) return;

    const payload: NotificationPayload = {
      type: NotificationType.STICKER_APPROVED,
      title: 'Sticker Approved! ✅',
      body: `Your vehicle sticker for ${stickerData.vehicle_plate} has been approved.`,
      data: { sticker_id: stickerData.id },
      navigateTo: 'Stickers',
      params: { stickerId: stickerData.id },
      priority: 'high',
    };

    await this.sendNotification(payload);
  }

  /**
   * Handle sticker rejection notification
   */
  async notifyStickerRejection(stickerData: any) {
    if (!this.shouldSendNotification('stickers')) return;

    const payload: NotificationPayload = {
      type: NotificationType.STICKER_REJECTED,
      title: 'Sticker Request Rejected',
      body: `Your sticker request for ${stickerData.vehicle_plate} was rejected. Reason: ${stickerData.rejection_reason}`,
      data: { sticker_id: stickerData.id },
      navigateTo: 'Stickers',
      params: { stickerId: stickerData.id },
      priority: 'high',
    };

    await this.sendNotification(payload);
  }

  /**
   * Handle sticker expiring notification
   */
  async notifyStickerExpiring(stickerData: any, daysRemaining: number) {
    if (!this.shouldSendNotification('stickers')) return;

    const payload: NotificationPayload = {
      type: NotificationType.STICKER_EXPIRING,
      title: 'Sticker Expiring Soon ⏰',
      body: `Your sticker for ${stickerData.vehicle_plate} expires in ${daysRemaining} days. Renew now to avoid penalties.`,
      data: { sticker_id: stickerData.id },
      navigateTo: 'Stickers',
      params: { stickerId: stickerData.id, action: 'renew' },
      priority: 'normal',
    };

    await this.sendNotification(payload);
  }

  /**
   * Handle guest arrival notification
   */
  async notifyGuestArrival(guestData: any) {
    if (!this.shouldSendNotification('guests')) return;

    const payload: NotificationPayload = {
      type: NotificationType.GUEST_ARRIVED,
      title: 'Guest Arrived 👥',
      body: `${guestData.guest_name} has arrived at the gate.`,
      data: { guest_id: guestData.id },
      navigateTo: 'Guests',
      params: { guestId: guestData.id },
      priority: 'high',
    };

    await this.sendNotification(payload);
  }

  /**
   * Handle fee due notification
   */
  async notifyFeeDue(feeData: any) {
    if (!this.shouldSendNotification('fees')) return;

    const payload: NotificationPayload = {
      type: NotificationType.FEE_DUE,
      title: 'Association Fee Due 💰',
      body: `Your ${feeData.fee_type} fee of ₱${feeData.amount} is due on ${new Date(feeData.due_date).toLocaleDateString()}.`,
      data: { fee_id: feeData.id },
      navigateTo: 'Fees',
      params: { feeId: feeData.id },
      priority: 'normal',
    };

    await this.sendNotification(payload);
  }

  /**
   * Handle fee overdue notification
   */
  async notifyFeeOverdue(feeData: any) {
    if (!this.shouldSendNotification('fees')) return;

    const payload: NotificationPayload = {
      type: NotificationType.FEE_OVERDUE,
      title: 'Fee Overdue! ⚠️',
      body: `Your ${feeData.fee_type} fee of ₱${feeData.amount} is overdue. Please pay immediately to avoid penalties.`,
      data: { fee_id: feeData.id },
      navigateTo: 'Fees',
      params: { feeId: feeData.id, action: 'pay' },
      priority: 'high',
    };

    await this.sendNotification(payload);
  }

  /**
   * Handle delivery arrival notification
   */
  async notifyDeliveryArrival(deliveryData: any) {
    if (!this.shouldSendNotification('deliveries')) return;

    const payload: NotificationPayload = {
      type: NotificationType.DELIVERY_ARRIVED,
      title: 'Package Delivered 📦',
      body: `A package from ${deliveryData.delivery_company} has arrived at the security gate.`,
      data: { delivery_id: deliveryData.id },
      navigateTo: 'Deliveries',
      params: { deliveryId: deliveryData.id },
      priority: 'high',
    };

    await this.sendNotification(payload);
  }

  /**
   * Handle urgent announcement notification
   */
  async notifyUrgentAnnouncement(announcement: any) {
    if (!this.shouldSendNotification('announcements')) return;

    const payload: NotificationPayload = {
      type: NotificationType.ANNOUNCEMENT_URGENT,
      title: '🚨 Urgent Announcement',
      body: announcement.title,
      data: { announcement_id: announcement.id },
      navigateTo: 'Announcements',
      params: { announcementId: announcement.id },
      priority: 'high',
    };

    await this.sendNotification(payload);
  }

  /**
   * Send notification based on payload
   */
  private async sendNotification(payload: NotificationPayload) {
    try {
      // Determine channel for Android
      const channel = this.getNotificationChannel(payload.type);

      // Schedule local notification
      await pushNotificationService.scheduleLocalNotification({
        title: payload.title,
        body: payload.body,
        data: {
          ...payload.data,
          type: payload.type,
          navigateTo: payload.navigateTo,
          params: payload.params,
          channel, // Android channel
        },
        badge: payload.badge,
      });

      // Log notification
      await this.logNotification(payload);
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  /**
   * Get notification channel for Android
   */
  private getNotificationChannel(type: NotificationType): string {
    if (type.startsWith('sticker_')) return 'stickers';
    if (type.startsWith('guest_')) return 'guests';
    if (type.startsWith('fee_')) return 'fees';
    if (type.startsWith('delivery_')) return 'deliveries';
    if (type.startsWith('permit_')) return 'permits';
    if (type.startsWith('announcement_')) {
      return type === NotificationType.ANNOUNCEMENT_URGENT ? 'urgent' : 'announcements';
    }
    return 'default';
  }

  /**
   * Check if notification should be sent based on preferences
   */
  private shouldSendNotification(category: keyof NotificationPreferences): boolean {
    if (!this.preferences) return true; // Default to true if preferences not loaded

    return this.preferences[category]?.push ?? true;
  }

  /**
   * Log notification to backend
   */
  private async logNotification(payload: NotificationPayload) {
    try {
      const { data: user } = await supabase.auth.getUser();

      if (user?.user) {
        await supabase.from('notification_logs').insert({
          user_id: user.user.id,
          type: payload.type,
          title: payload.title,
          body: payload.body,
          data: payload.data,
          created_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Failed to log notification:', error);
    }
  }

  /**
   * Get notification history
   */
  async getNotificationHistory(limit = 50): Promise<any[]> {
    try {
      const { data: user } = await supabase.auth.getUser();

      if (!user?.user) return [];

      const { data, error } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Failed to get notification history:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string) {
    try {
      await supabase
        .from('notification_logs')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications() {
    await pushNotificationService.clearBadgeCount();
  }

  /**
   * Update badge count
   */
  async updateBadgeCount(count: number) {
    await pushNotificationService.setBadgeCount(count);
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;