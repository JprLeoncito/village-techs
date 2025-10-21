import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useState, useEffect } from 'react';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Notification types
export type NotificationType =
  | 'broadcast_alert'
  | 'incident_assignment'
  | 'guest_arrival'
  | 'delivery_notification'
  | 'sync_status'
  | 'shift_reminder';

export interface CustomNotification {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: 'default' | 'high' | 'max';
  sound?: 'default' | 'custom';
}

// Push Notification Service
export class NotificationService {
  private isInitialized = false;
  private pushToken: string | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      // Configure Android notification channel
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      // Register for push notifications
      await this.registerForPushNotifications();

      this.isInitialized = true;
      console.log('Notification Service initialized');
    } catch (error) {
      console.error('Failed to initialize Notification Service:', error);
    }
  }

  private async setupAndroidChannels() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('broadcast_alerts', {
        name: 'Broadcast Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        enableLights: true,
        lightColor: '#ff0000',
        enableVibrate: true,
        vibrationPattern: [0, 250, 250, 250],
      });

      await Notifications.setNotificationChannelAsync('incidents', {
        name: 'Incident Reports',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        enableLights: true,
        lightColor: '#ff6600',
        enableVibrate: true,
        vibrationPattern: [0, 500],
      });

      await Notifications.setNotificationChannelAsync('guests_deliveries', {
        name: 'Guests & Deliveries',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
        enableLights: true,
        lightColor: '#0066ff',
        enableVibrate: true,
      });

      await Notifications.setNotificationChannelAsync('system', {
        name: 'System Notifications',
        importance: Notifications.AndroidImportance.LOW,
        sound: 'default',
        enableLights: false,
        enableVibrate: false,
      });
    }
  }

  // Register for push notifications
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Request permissions
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Push notification permission not granted');
        return null;
      }

      // Get push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID, // You'll need to set this up
      });

      this.pushToken = token.data;
      console.log('Push token registered:', this.pushToken);

      // Store token in user profile for targeted notifications
      await this.storePushToken(token.data);

      return token.data;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  // Store push token in user profile
  private async storePushToken(token: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_profiles')
          .upsert({
            user_id: user.id,
            push_token: token,
            device_type: Platform.OS,
            updated_at: new Date().toISOString(),
          });
      }
    } catch (error) {
      console.error('Error storing push token:', error);
    }
  }

  // Send local notification
  async sendLocalNotification(notification: CustomNotification): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          sound: notification.sound || 'default',
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
        },
        trigger: null, // Show immediately
      });

      console.log('Local notification sent:', notification.title);
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  }

  // Send broadcast alert notification
  async sendBroadcastAlert(message: string, severity: 'low' | 'medium' | 'high' | 'critical') {
    const priority = severity === 'critical' ? 'max' : severity === 'high' ? 'high' : 'default';
    const sound = severity === 'critical' ? 'incident_alert.wav' : 'broadcast_alert.wav';

    await this.sendLocalNotification({
      type: 'broadcast_alert',
      title: '🚨 Broadcast Alert',
      body: message,
      data: { severity, type: 'broadcast_alert' },
      priority,
      sound,
    });
  }

  // Send incident assignment notification
  async sendIncidentAssignment(incidentId: string, incidentType: string, severity: string) {
    await this.sendLocalNotification({
      type: 'incident_assignment',
      title: '📋 Incident Assignment',
      body: `New ${incidentType} incident assigned - ${severity} priority`,
      data: { incidentId, type: 'incident_assignment' },
      priority: 'high',
      sound: 'default',
    });
  }

  // Send guest arrival notification
  async sendGuestArrivalNotification(guestName: string, householdName: string) {
    await this.sendLocalNotification({
      type: 'guest_arrival',
      title: '👋 Guest Arrived',
      body: `${guestName} has arrived at ${householdName}`,
      data: { type: 'guest_arrival' },
      priority: 'default',
      sound: 'default',
    });
  }

  // Send delivery notification
  async sendDeliveryNotification(serviceName: string, householdName: string, isPerishable: boolean) {
    const title = isPerishable ? '📦 Perishable Delivery' : '📦 Delivery Arrived';
    const body = `${serviceName} delivery for ${householdName}${isPerishable ? ' (PERISHABLE)' : ''}`;

    await this.sendLocalNotification({
      type: 'delivery_notification',
      title,
      body,
      data: { type: 'delivery_notification', perishable: isPerishable },
      priority: isPerishable ? 'high' : 'default',
      sound: 'default',
    });
  }

  // Send sync status notification
  async sendSyncStatusNotification(message: string) {
    await this.sendLocalNotification({
      type: 'sync_status',
      title: '🔄 Sync Status',
      body: message,
      data: { type: 'sync_status' },
      priority: 'default',
    });
  }

  // Send shift reminder notification
  async sendShiftReminder(message: string) {
    await this.sendLocalNotification({
      type: 'shift_reminder',
      title: '⏰ Shift Reminder',
      body: message,
      data: { type: 'shift_reminder' },
      priority: 'default',
    });
  }

  // Clear all notifications
  async clearAllNotifications() {
    try {
      await Notifications.dismissAllNotificationsAsync();
      console.log('All notifications cleared');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  // Get notification count
  async getNotificationCount(): Promise<number> {
    try {
      const count = await Notifications.getBadgeCountAsync();
      return count;
    } catch (error) {
      console.error('Error getting notification count:', error);
      return 0;
    }
  }

  // Set notification badge count
  async setNotificationBadge(count: number) {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting notification badge:', error);
    }
  }

  // Get current push token
  getPushToken(): string | null {
    return this.pushToken;
  }

  // Check if notifications are enabled
  async areNotificationsEnabled(): Promise<boolean> {
    try {
      const settings = await Notifications.getPermissionsAsync();
      return settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      return false;
    }
  }

  // Open notification settings
  async openNotificationSettings() {
    try {
      await Notifications.requestPermissionsAsync();
    } catch (error) {
      console.error('Error opening notification settings:', error);
    }
  }

  // Cleanup
  cleanup() {
    // No specific cleanup needed for expo-notifications
  }
}

// Create singleton instance
export const notificationService = new NotificationService();

// React hook for notifications
export const useNotifications = () => {
  const [notificationCount, setNotificationCount] = useState(0);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    // Check initial notification permissions
    const checkPermissions = async () => {
      const enabled = await notificationService.areNotificationsEnabled();
      setIsEnabled(enabled);
    };

    // Get initial notification count
    const getInitialCount = async () => {
      const count = await notificationService.getNotificationCount();
      setNotificationCount(count);
    };

    checkPermissions();
    getInitialCount();

    // Listen for notification events
    const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
      setNotificationCount(prev => prev + 1);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification response:', response);
      // Handle notification tap if needed
      setNotificationCount(prev => Math.max(0, prev - 1));
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  const sendNotification = async (notification: CustomNotification) => {
    await notificationService.sendLocalNotification(notification);
  };

  const clearNotifications = async () => {
    await notificationService.clearAllNotifications();
    setNotificationCount(0);
  };

  const setBadge = async (count: number) => {
    await notificationService.setNotificationBadge(count);
    setNotificationCount(count);
  };

  return {
    notificationCount,
    isEnabled,
    sendNotification,
    clearNotifications,
    setBadge,
    areNotificationsEnabled: notificationService.areNotificationsEnabled,
    openSettings: notificationService.openNotificationSettings,
  };
};