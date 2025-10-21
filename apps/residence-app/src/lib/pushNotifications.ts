import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Import expo-notifications with error handling
let Notifications: any = null;
let isNotificationsAvailable = false;

try {
  // Try to import expo-notifications
  const expoNotifications = require('expo-notifications');
  Notifications = expoNotifications.default;

  // Check if we're in Expo Go with SDK 53+
  const Constants = require('expo-constants').default;
  const isExpoGo = Constants.appOwnership === 'expo';

  if (isExpoGo && Constants.expoVersion?.major >= 53) {
    console.warn('Push notifications are not available in Expo Go SDK 53+. Use development build for full notification functionality.');
    isNotificationsAvailable = false;
  } else {
    // Try to set notification handler
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
      isNotificationsAvailable = true;
    } catch (error) {
      console.warn('Failed to set notification handler:', error);
      isNotificationsAvailable = false;
    }
  }
} catch (error) {
  console.warn('expo-notifications not available:', error);
  isNotificationsAvailable = false;
}

export interface NotificationData {
  title: string;
  body: string;
  data?: any;
  badge?: number;
  sound?: boolean;
}

class PushNotificationService {
  private notificationListener: any = null;
  private responseListener: any = null;
  private pushToken: string | null = null;

  /**
   * Initialize push notifications
   */
  async initialize() {
    try {
      // Check if notifications are available
      if (!isNotificationsAvailable) {
        console.log('Push notifications not available in current environment');
        await this.initializeFallback();
        return false;
      }

      // Check if we're on a physical device
      if (!Device.isDevice) {
        console.log('Push notifications work only on physical devices');
        await this.initializeFallback();
        return false;
      }

      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('Push notification permissions not granted');
        await this.initializeFallback();
        return false;
      }

      // Get push token
      const token = await this.getExpoPushToken();
      if (token) {
        this.pushToken = token;
        await this.savePushToken(token);

        // Register token with backend
        await this.registerTokenWithBackend(token);
      }

      // Setup listeners
      this.setupNotificationListeners();

      console.log('Push notifications initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      await this.initializeFallback();
      return false;
    }
  }

  /**
   * Initialize fallback notification system
   */
  private async initializeFallback() {
    console.log('Initializing fallback notification system');
    // Save a mock token for development
    const mockToken = `mock-token-${Date.now()}`;
    await this.savePushToken(mockToken);
    this.pushToken = mockToken;
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (!isNotificationsAvailable) {
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          'Push Notifications',
          'Enable push notifications in settings to receive important updates about your stickers, guests, and deliveries.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => this.openSettings() },
          ]
        );
        return false;
      }

      // Configure notification channels for Android
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Setup Android notification channels
   */
  async setupAndroidChannels() {
    if (!isNotificationsAvailable || Platform.OS !== 'android') {
      return;
    }

    try {
      // Stickers channel
      await Notifications.setNotificationChannelAsync('stickers', {
        name: 'Vehicle Stickers',
        description: 'Updates about your vehicle sticker requests and renewals',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10b981',
      });

      // Guests channel
      await Notifications.setNotificationChannelAsync('guests', {
        name: 'Guest Arrivals',
        description: 'Notifications when your scheduled guests arrive',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3b82f6',
      });

      // Fees channel
      await Notifications.setNotificationChannelAsync('fees', {
        name: 'Association Fees',
        description: 'Reminders about fee payments and due dates',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lightColor: '#f59e0b',
      });

      // Deliveries channel
      await Notifications.setNotificationChannelAsync('deliveries', {
        name: 'Deliveries',
        description: 'Notifications about package deliveries',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#8b5cf6',
      });

      // Urgent channel
      await Notifications.setNotificationChannelAsync('urgent', {
        name: 'Urgent Announcements',
        description: 'Critical community announcements and emergencies',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 500, 500],
        lightColor: '#ef4444',
        sound: 'default',
      });

      // Permits channel
      await Notifications.setNotificationChannelAsync('permits', {
        name: 'Construction Permits',
        description: 'Updates about construction permit approvals',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lightColor: '#f59e0b',
      });
    } catch (error) {
      console.error('Failed to setup Android channels:', error);
    }
  }

  /**
   * Get Expo push token
   */
  async getExpoPushToken(): Promise<string | null> {
    try {
      if (!isNotificationsAvailable) {
        return null;
      }

      const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;

      if (!projectId) {
        console.error('EXPO_PUBLIC_PROJECT_ID not configured');
        return null;
      }

      const tokenResponse = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      return tokenResponse.data;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }

  /**
   * Save push token locally
   */
  async savePushToken(token: string) {
    try {
      await AsyncStorage.setItem('push_token', token);
    } catch (error) {
      console.error('Failed to save push token:', error);
    }
  }

  /**
   * Get saved push token
   */
  async getSavedPushToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('push_token');
    } catch (error) {
      console.error('Failed to get saved push token:', error);
      return null;
    }
  }

  /**
   * Register token with backend
   */
  async registerTokenWithBackend(token: string) {
    try {
      const { data: user } = await supabase.auth.getUser();

      if (!user?.user) {
        console.log('No authenticated user for token registration');
        return;
      }

      // Store token in user profile or dedicated table
      const { error } = await supabase
        .from('push_tokens')
        .upsert({
          user_id: user.user.id,
          token,
          platform: Platform.OS,
          device_name: Device.deviceName || 'Unknown Device',
          is_mock: !isNotificationsAvailable,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,token',
        });

      if (error) {
        console.error('Failed to register push token:', error);
      } else {
        console.log('Push token registered successfully');
      }
    } catch (error) {
      console.error('Error registering push token:', error);
    }
  }

  /**
   * Setup notification listeners
   */
  setupNotificationListeners() {
    if (!isNotificationsAvailable) {
      return;
    }

    try {
      // Handle notifications received while app is foregrounded
      this.notificationListener = Notifications.addNotificationReceivedListener(
        notification => {
          console.log('Notification received:', notification);
          this.handleNotificationReceived(notification);
        }
      );

      // Handle user interaction with notification
      this.responseListener = Notifications.addNotificationResponseReceivedListener(
        response => {
          console.log('Notification response:', response);
          this.handleNotificationResponse(response);
        }
      );
    } catch (error) {
      console.error('Failed to setup notification listeners:', error);
    }
  }

  /**
   * Handle notification received
   */
  handleNotificationReceived(notification: any) {
    const { title, body, data } = notification.request.content;

    // You can customize behavior based on notification type
    if (data?.type === 'urgent') {
      // Show an in-app alert for urgent notifications
      Alert.alert(title || 'Urgent', body || 'You have an urgent notification');
    }

    // Update badge count if provided
    if (data?.badge !== undefined) {
      try {
        Notifications.setBadgeCountAsync(data.badge);
      } catch (error) {
        console.error('Failed to set badge count:', error);
      }
    }
  }

  /**
   * Handle notification response (tap)
   */
  handleNotificationResponse(response: any) {
    const { data } = response.notification.request.content;

    // Navigate based on notification type
    if (data?.navigateTo) {
      this.navigateToScreen(data.navigateTo, data.params);
    }
  }

  /**
   * Navigate to specific screen
   */
  navigateToScreen(screen: string, params?: any) {
    // This should be connected to your navigation ref
    // Example: navigationRef.current?.navigate(screen, params);
    console.log(`Navigate to: ${screen}`, params);
  }

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(
    notification: NotificationData,
    trigger?: any
  ): Promise<string | undefined> {
    try {
      if (!isNotificationsAvailable) {
        console.log('Notifications not available, using fallback:', notification.title);
        // Store notification in local storage for demo purposes
        const notificationId = `fallback-${Date.now()}`;
        await this.storeFallbackNotification(notificationId, notification);
        return notificationId;
      }

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data,
          badge: notification.badge,
          sound: notification.sound !== false,
        },
        trigger: trigger || null, // null = immediate
      });

      return id;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      // Store as fallback
      const notificationId = `fallback-${Date.now()}`;
      await this.storeFallbackNotification(notificationId, notification);
      return notificationId;
    }
  }

  /**
   * Store fallback notification for demo purposes
   */
  private async storeFallbackNotification(id: string, notification: NotificationData) {
    try {
      const fallbackNotifications = await this.getFallbackNotifications();
      fallbackNotifications.push({
        id,
        ...notification,
        timestamp: new Date().toISOString(),
      });
      await AsyncStorage.setItem('fallback_notifications', JSON.stringify(fallbackNotifications));
      console.log('Stored fallback notification:', notification.title);
    } catch (error) {
      console.error('Failed to store fallback notification:', error);
    }
  }

  /**
   * Get fallback notifications
   */
  async getFallbackNotifications(): Promise<any[]> {
    try {
      const stored = await AsyncStorage.getItem('fallback_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get fallback notifications:', error);
      return [];
    }
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelScheduledNotification(notificationId: string) {
    try {
      if (isNotificationsAvailable && notificationId && !notificationId.startsWith('fallback-')) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
      }
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllScheduledNotifications() {
    try {
      if (isNotificationsAvailable) {
        await Notifications.cancelAllScheduledNotificationsAsync();
      }
      // Clear fallback notifications
      await AsyncStorage.removeItem('fallback_notifications');
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  /**
   * Get all scheduled notifications
   */
  async getScheduledNotifications(): Promise<any[]> {
    try {
      if (isNotificationsAvailable) {
        return await Notifications.getAllScheduledNotificationsAsync();
      }
      // Return fallback notifications
      return await this.getFallbackNotifications();
    } catch (error) {
      console.error('Failed to get scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number) {
    try {
      if (isNotificationsAvailable) {
        await Notifications.setBadgeCountAsync(count);
      }
    } catch (error) {
      console.error('Failed to set badge count:', error);
    }
  }

  /**
   * Clear badge count
   */
  async clearBadgeCount() {
    await this.setBadgeCount(0);
  }

  /**
   * Open device settings
   */
  openSettings() {
    try {
      if (isNotificationsAvailable) {
        if (Platform.OS === 'ios') {
          // iOS specific
          Notifications.openSettingsForIOSAsync?.();
        } else {
          // Android specific
          Notifications.openSettingsAsync?.();
        }
      } else {
        Alert.alert(
          'Settings',
          'Push notifications are not available in Expo Go. Please use a development build for full functionality.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Failed to open settings:', error);
    }
  }

  /**
   * Clean up listeners
   */
  cleanup() {
    try {
      if (this.notificationListener && isNotificationsAvailable) {
        Notifications.removeNotificationSubscription(this.notificationListener);
        this.notificationListener = null;
      }

      if (this.responseListener && isNotificationsAvailable) {
        Notifications.removeNotificationSubscription(this.responseListener);
        this.responseListener = null;
      }
    } catch (error) {
      console.error('Failed to cleanup notification listeners:', error);
    }
  }

  /**
   * Get current push token
   */
  getPushToken(): string | null {
    return this.pushToken;
  }

  /**
   * Check if notifications are available
   */
  isAvailable(): boolean {
    return isNotificationsAvailable;
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;