import { supabase } from '../lib/supabase';
import networkStatus from '../lib/networkStatus';
import { CacheService } from '../lib/cache';
import { OfflineQueue } from '../lib/offlineQueue';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Database interface matching the Supabase schema
export interface Announcement {
  id: string;
  tenant_id: string;
  created_by: string;
  announcement_type: 'general' | 'urgent' | 'event' | 'maintenance' | 'fee_reminder' | 'election';
  title: string;
  content: string;
  target_audience: 'all' | 'households' | 'security' | 'admins';
  status: 'draft' | 'scheduled' | 'published' | 'expired' | 'archived';
  publication_date?: string;
  expiry_date?: string;
  view_count: number;
  click_count: number;
  attachment_urls: string[];
  published_at?: string;
  archived_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementFilter {
  type?: Announcement['announcement_type'];
  status?: Announcement['status'];
  targetAudience?: Announcement['target_audience'];
  dateRange?: {
    start: string;
    end: string;
  };
  search?: string;
  sortBy?: 'created_at' | 'publication_date' | 'title' | 'view_count';
  sortOrder?: 'asc' | 'desc';
  unreadOnly?: boolean;
}

export interface AnnouncementStatistics {
  total: number;
  published: number;
  urgent: number;
  unread: number;
  byType: {
    general: number;
    urgent: number;
    event: number;
    maintenance: number;
    fee_reminder: number;
    election: number;
  };
}

export interface AnnouncementServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface RealtimeSubscriptionCallbacks {
  onNewAnnouncement?: (announcement: Announcement) => void;
  onAnnouncementUpdated?: (announcement: Announcement) => void;
  onAnnouncementDeleted?: (announcementId: string) => void;
}

class AnnouncementService {
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly READ_ANNOUNCEMENTS_KEY = 'read_announcements';
  private realtimeSubscription: any = null;

  /**
   * Get announcements for the current user/household
   */
  async getAnnouncements(householdId: string, filter?: AnnouncementFilter): Promise<Announcement[]> {
    try {
      // Try cache first
      const cacheKey = `announcements_${householdId}_${JSON.stringify(filter)}`;
      const cachedAnnouncements = await CacheService.getCachedData<Announcement[]>(cacheKey, undefined);
      if (cachedAnnouncements && !filter?.unreadOnly) {
        return cachedAnnouncements;
      }

      // Build query
      let query = supabase
        .from('announcements')
        .select('*')
        .eq('target_audience', 'all'); // Residents can only see announcements targeted to all

      // Apply filters
      if (filter?.type) {
        query = query.eq('announcement_type', filter.type);
      }

      if (filter?.status) {
        query = query.eq('status', filter.status);
      }

      if (filter?.search) {
        query = query.or(`title.ilike.%${filter.search}%,content.ilike.%${filter.search}%`);
      }

      if (filter?.dateRange) {
        query = query
          .gte('created_at', filter.dateRange.start)
          .lte('created_at', filter.dateRange.end);
      }

      // Apply sorting
      const sortBy = filter?.sortBy || 'created_at';
      const sortOrder = filter?.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching announcements:', error);
        return [];
      }

      let announcements = (data || []) as Announcement[];

      // Filter out unpublished announcements unless they're specifically requested
      if (!filter?.status || filter.status === 'published') {
        const now = new Date();
        announcements = announcements.filter(announcement => {
          if (announcement.status !== 'published') return false;

          // Check if announcement is expired
          if (announcement.expiry_date) {
            const expiryDate = new Date(announcement.expiry_date);
            if (expiryDate < now) return false;
          }

          // Check if announcement is scheduled for future publication
          if (announcement.publication_date) {
            const publicationDate = new Date(announcement.publication_date);
            if (publicationDate > now) return false;
          }

          return true;
        });
      }

      // Filter for unread announcements if requested
      if (filter?.unreadOnly) {
        const readIds = await this.getReadAnnouncementIds();
        announcements = announcements.filter(a => !readIds.includes(a.id));
      }

      // Cache the data (only for non-unread filtered results)
      if (!filter?.unreadOnly) {
        await CacheService.setCachedData(cacheKey, undefined, announcements);
      }

      return announcements;
    } catch (error) {
      console.error('Failed to get announcements:', error);
      return [];
    }
  }

  /**
   * Get a specific announcement by ID
   */
  async getAnnouncementById(announcementId: string): Promise<AnnouncementServiceResult<Announcement>> {
    try {
      // Try cache first
      const cacheKey = `announcement_${announcementId}`;
      const cachedAnnouncement = await CacheService.getCachedData<Announcement>(cacheKey);
      if (cachedAnnouncement) {
        return { success: true, data: cachedAnnouncement };
      }

      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('id', announcementId)
        .single();

      if (error) {
        console.error('Error fetching announcement:', error);
        return { success: false, error: 'Announcement not found' };
      }

      const announcement = data as Announcement;

      // Cache the data
      await CacheService.setCachedData(cacheKey, announcement, this.CACHE_DURATION);

      return { success: true, data: announcement };
    } catch (error) {
      console.error('Failed to get announcement:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get announcement',
      };
    }
  }

  /**
   * Mark announcement as read
   */
  async markAsRead(announcementId: string): Promise<AnnouncementServiceResult> {
    try {
      const readIds = await this.getReadAnnouncementIds();

      if (!readIds.includes(announcementId)) {
        readIds.push(announcementId);
        await this.setReadAnnouncementIds(readIds);

        // Update view count on server if online
        if (networkStatus.isConnected()) {
          await supabase.rpc('increment_announcement_view_count', {
            announcement_id: announcementId
          });
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to mark announcement as read:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark as read',
      };
    }
  }

  /**
   * Subscribe to real-time announcement updates
   */
  async subscribeToAnnouncements(callbacks: RealtimeSubscriptionCallbacks & { householdId: string }): Promise<void> {
    try {
      // Unsubscribe from existing subscription
      this.unsubscribeFromAnnouncements();

      const { householdId, ...realtimeCallbacks } = callbacks;

      this.realtimeSubscription = supabase
        .channel('announcements')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'announcements',
            filter: 'target_audience=eq.all',
          },
          async (payload) => {
            const announcement = payload.new as Announcement;

            switch (payload.eventType) {
              case 'INSERT':
                if (realtimeCallbacks.onNewAnnouncement && announcement.status === 'published') {
                  realtimeCallbacks.onNewAnnouncement(announcement);
                }
                break;
              case 'UPDATE':
                if (realtimeCallbacks.onAnnouncementUpdated) {
                  realtimeCallbacks.onAnnouncementUpdated(announcement);
                }
                break;
              case 'DELETE':
                if (realtimeCallbacks.onAnnouncementDeleted) {
                  realtimeCallbacks.onAnnouncementDeleted(announcement.id);
                }
                break;
            }
          }
        )
        .subscribe();

      // Subscribed to announcements real-time updates
    } catch (error) {
      console.error('Failed to subscribe to announcements:', error);
    }
  }

  /**
   * Unsubscribe from real-time announcement updates
   */
  unsubscribeFromAnnouncements(): void {
    if (this.realtimeSubscription) {
      supabase.removeChannel(this.realtimeSubscription);
      this.realtimeSubscription = null;
      // Unsubscribed from announcements real-time updates
    }
  }

  /**
   * Mark announcement as clicked (for tracking engagement)
   */
  async markAsClicked(announcementId: string): Promise<AnnouncementServiceResult> {
    try {
      // Update click count on server if online
      if (networkStatus.isConnected()) {
        await supabase.rpc('increment_announcement_click_count', {
          announcement_id: announcementId
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to mark announcement as clicked:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark as clicked',
      };
    }
  }

  /**
   * Get urgent announcements
   */
  async getUrgentAnnouncements(householdId: string): Promise<Announcement[]> {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('target_audience', 'all')
        .eq('announcement_type', 'urgent')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching urgent announcements:', error);
        return [];
      }

      const now = new Date();
      let announcements = (data || []) as Announcement[];

      // Filter out expired announcements
      announcements = announcements.filter(announcement => {
        if (announcement.expiry_date) {
          const expiryDate = new Date(announcement.expiry_date);
          return expiryDate >= now;
        }
        return true;
      });

      return announcements;
    } catch (error) {
      console.error('Failed to get urgent announcements:', error);
      return [];
    }
  }

  /**
   * Get unread announcements count
   */
  async getUnreadCount(householdId: string): Promise<number> {
    try {
      const announcements = await this.getAnnouncements(householdId, {
        status: 'published',
        unreadOnly: true
      });

      return announcements.length;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * Get announcement statistics
   */
  async getAnnouncementStatistics(householdId: string): Promise<AnnouncementStatistics> {
    try {
      const announcements = await this.getAnnouncements(householdId, {
        status: 'published'
      });

      const readIds = await this.getReadAnnouncementIds();

      const stats: AnnouncementStatistics = {
        total: announcements.length,
        published: announcements.filter(a => a.status === 'published').length,
        urgent: announcements.filter(a => a.announcement_type === 'urgent').length,
        unread: announcements.filter(a => !readIds.includes(a.id)).length,
        byType: {
          general: 0,
          urgent: 0,
          event: 0,
          maintenance: 0,
          fee_reminder: 0,
          election: 0,
        },
      };

      announcements.forEach(announcement => {
        stats.byType[announcement.announcement_type]++;
      });

      return stats;
    } catch (error) {
      console.error('Failed to get announcement statistics:', error);
      return {
        total: 0,
        published: 0,
        urgent: 0,
        unread: 0,
        byType: {
          general: 0,
          urgent: 0,
          event: 0,
          maintenance: 0,
          fee_reminder: 0,
          election: 0,
        },
      };
    }
  }

  /**
   * Get attachment download URL
   */
  async getAttachmentUrl(attachmentUrl: string): Promise<AnnouncementServiceResult & { url?: string }> {
    try {
      // Parse the storage path from the URL
      const urlParts = attachmentUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = urlParts.slice(urlParts.indexOf('announcements') + 1).join('/');

      const { data, error } = await supabase.storage
        .from('announcements')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) {
        console.error('Error generating signed URL:', error);
        return { success: false, error: 'Failed to generate download URL' };
      }

      return {
        success: true,
        url: data.signedUrl,
      };
    } catch (error) {
      console.error('Failed to get attachment URL:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get attachment URL',
      };
    }
  }

  /**
   * Clear read announcements (reset)
   */
  async clearReadAnnouncements(): Promise<void> {
    try {
      await this.setReadAnnouncementIds([]);
    } catch (error) {
      console.error('Failed to clear read announcements:', error);
    }
  }

  /**
   * Get read announcement IDs from local storage
   */
  private async getReadAnnouncementIds(): Promise<string[]> {
    try {
      const stored = await AsyncStorage.getItem(this.READ_ANNOUNCEMENTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get read announcement IDs:', error);
      return [];
    }
  }

  /**
   * Set read announcement IDs in local storage
   */
  private async setReadAnnouncementIds(ids: string[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.READ_ANNOUNCEMENTS_KEY, JSON.stringify(ids));
    } catch (error) {
      console.error('Failed to set read announcement IDs:', error);
    }
  }

  /**
   * Clear cache for announcements
   */
  private async clearCache(householdId: string): Promise<void> {
    try {
      await CacheService.clearCache(householdId, `announcements_${householdId}`);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Clear cache for a specific announcement
   */
  private async clearCacheForAnnouncement(announcementId: string): Promise<void> {
    try {
      await CacheService.clearCache(`announcement_${announcementId}`);
    } catch (error) {
      console.error('Failed to clear announcement cache:', error);
    }
  }
}

// Export singleton instance
export const announcementService = new AnnouncementService();
export default announcementService;