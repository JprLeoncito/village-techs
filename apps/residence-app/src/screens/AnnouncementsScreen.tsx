import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import announcementService from '../services/announcementService';
import { MaterialIcons } from '@expo/vector-icons';
import { formatDistanceToNow, formatDate } from '../lib/dateUtils';

interface Announcement {
  id: string;
  title: string;
  content: string;
  announcement_type: string;
  publication_date: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  target_audience: string;
  created_by: string;
  attachments?: string[];
  read_at?: string;
  is_read?: boolean;
}

export const AnnouncementsScreen: React.FC = () => {
  const { householdId } = useAuth();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (householdId) {
      loadAnnouncements();
      setupRealtimeSubscription();
    }
  }, [householdId, selectedType]);

  const setupRealtimeSubscription = async () => {
    try {
      await announcementService.subscribeToAnnouncements({
        householdId,
        onNewAnnouncement: (announcement) => {
          setAnnouncements(prev => [announcement, ...prev]);
        },
        onAnnouncementUpdated: (announcement) => {
          setAnnouncements(prev =>
            prev.map(a => a.id === announcement.id ? announcement : a)
          );
        },
        onAnnouncementDeleted: (announcementId) => {
          setAnnouncements(prev => prev.filter(a => a.id !== announcementId));
        },
      });
    } catch (error) {
      console.error('Failed to setup realtime subscription:', error);
    }
  };

  const loadAnnouncements = async () => {
    if (!householdId) return;

    try {
      setLoading(true);
      setError(null);

      const announcementData = await announcementService.getAnnouncements(householdId, {
        type: selectedType === 'all' ? undefined : selectedType,
        status: 'published',
      });

      setAnnouncements(announcementData);
    } catch (error) {
      console.error('Error loading announcements:', error);
      setError('Failed to load announcements');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAnnouncements();
  };

  const markAsRead = async (announcementId: string) => {
    try {
      await announcementService.markAsRead(announcementId);
      setAnnouncements(prev =>
        prev.map(a => a.id === announcementId ? { ...a, is_read: true } : a)
      );
    } catch (error) {
      console.error('Failed to mark announcement as read:', error);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'urgent':
        return '#ef4444';
      case 'event':
        return '#8b5cf6';
      case 'maintenance':
        return '#f59e0b';
      case 'fee_reminder':
        return '#3b82f6';
      case 'election':
        return '#10b981';
      case 'general':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const getTypeIcon = (type: string): keyof typeof MaterialIcons.glyphMap => {
    switch (type) {
      case 'urgent':
        return 'warning';
      case 'event':
        return 'celebration';
      case 'maintenance':
        return 'build';
      case 'fee_reminder':
        return 'attach-money';
      case 'election':
        return 'how-to-vote';
      case 'general':
        return 'campaign';
      default:
        return 'campaign';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return { color: '#ef4444', label: 'URGENT' };
      case 'high':
        return { color: '#f59e0b', label: 'HIGH' };
      case 'medium':
        return { color: '#3b82f6', label: 'MEDIUM' };
      case 'low':
        return { color: '#10b981', label: 'LOW' };
      default:
        return { color: '#6b7280', label: 'NORMAL' };
    }
  };

  const filterTypes = [
    { value: 'all', label: 'All', icon: 'campaign' },
    { value: 'urgent', label: 'Urgent', icon: 'warning' },
    { value: 'general', label: 'General', icon: 'campaign' },
    { value: 'event', label: 'Events', icon: 'celebration' },
    { value: 'maintenance', label: 'Maintenance', icon: 'build' },
    { value: 'fee_reminder', label: 'Fee Reminders', icon: 'attach-money' },
    { value: 'election', label: 'Elections', icon: 'how-to-vote' },
  ];

  const handleAnnouncementPress = (announcement: Announcement) => {
    if (!announcement.is_read) {
      markAsRead(announcement.id);
    }
    // Navigate to announcement details (placeholder)
    Alert.alert(
      announcement.title,
      announcement.content,
      [{ text: 'OK', style: 'default' }]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialIcons name="campaign" size={48} color={theme.colors?.muted || '#6b7280'} />
        <Text style={styles.loadingText}>Loading announcements...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors?.background || '#f9fafb' }]}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {filterTypes.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[
                styles.filterTab,
                selectedType === filter.value && styles.filterTabActive,
              ]}
              onPress={() => setSelectedType(filter.value)}
            >
              <MaterialIcons
                name={filter.icon as keyof typeof MaterialIcons.glyphMap}
                size={14}
                color={selectedType === filter.value ? '#ffffff' : (theme.colors?.muted || '#6b7280')}
                style={styles.filterIcon}
              />
              <Text
                style={[
                  styles.filterText,
                  selectedType === filter.value && styles.filterTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {error ? (
          <View style={[styles.errorContainer, { backgroundColor: theme.colors.background }]}>
            <MaterialIcons name="error" size={48} color="#ef4444" />
            <Text style={[styles.errorText, { color: theme.colors.text }]}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadAnnouncements}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : announcements.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.colors.background }]}>
            <MaterialIcons name="campaign" size={64} color={theme.colors?.muted || '#6b7280'} />
            <Text style={styles.emptyTitle}>No Announcements</Text>
            <Text style={styles.emptyText}>
              {selectedType === 'all'
                ? 'There are no announcements at this time.'
                : `No ${selectedType.replace('_', ' ')} announcements.`}
            </Text>
          </View>
        ) : (
          <View style={styles.announcementsList}>
            {announcements.map((announcement) => {
              const priorityBadge = getPriorityBadge(announcement.priority);
              const typeColor = getTypeColor(announcement.announcement_type);

              return (
                <TouchableOpacity
                  key={announcement.id}
                  style={[
                    styles.announcementCard,
                    !announcement.is_read && styles.unreadCard
                  ]}
                  onPress={() => handleAnnouncementPress(announcement)}
                >
                  <View style={styles.announcementHeader}>
                    <View style={styles.announcementTypeContainer}>
                      <MaterialIcons
                        name={getTypeIcon(announcement.announcement_type)}
                        size={20}
                        color={typeColor}
                        style={styles.typeIcon}
                      />
                      <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
                        <Text style={styles.typeText}>
                          {announcement.announcement_type.replace('_', ' ').toUpperCase()}
                        </Text>
                      </View>
                      <Badge
                        variant="outline"
                        size="sm"
                        style={[styles.priorityBadge, { borderColor: priorityBadge.color }]}
                      >
                        <Text style={[styles.priorityText, { color: priorityBadge.color }]}>
                          {priorityBadge.label}
                        </Text>
                      </Badge>
                    </View>
                    <View style={styles.dateContainer}>
                      <Text style={styles.date}>
                        {formatDistanceToNow(new Date(announcement.publication_date), { addSuffix: true })}
                      </Text>
                      <Text style={styles.fullDate}>
                        {formatDate(new Date(announcement.publication_date))}
                      </Text>
                    </View>
                  </View>

                  {!announcement.is_read && (
                    <View style={styles.unreadIndicator}>
                      <Text style={styles.unreadText}>NEW</Text>
                    </View>
                  )}

                  <Text style={styles.announcementTitle}>{announcement.title}</Text>
                  <Text style={styles.announcementContent} numberOfLines={3}>
                    {announcement.content}
                  </Text>

                  {announcement.attachments && announcement.attachments.length > 0 && (
                    <View style={styles.attachmentsContainer}>
                      <MaterialIcons name="attach-file" size={16} color="#6b7280" />
                      <Text style={styles.attachmentsText}>
                        {announcement.attachments.length} attachment{announcement.attachments.length > 1 ? 's' : ''}
                      </Text>
                    </View>
                  )}

                  <Text style={styles.readMore}>Read more →</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const createStyles = (theme: any) => {
  // Provide fallback values if theme or theme.colors is undefined
  const colors = theme?.colors || {};

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: (theme.colors?.background || '#f9fafb'),
    },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginTop: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: theme.colors.primary || '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  filterContainer: {
    backgroundColor: theme.colors.card || '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border || '#e5e7eb',
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    marginRight: 6,
    minHeight: 32,
    justifyContent: 'center',
  },
  filterTabActive: {
    backgroundColor: theme.colors.primary || '#10b981',
  },
  filterIcon: {
    marginRight: 4,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: (theme.colors?.muted || '#6b7280'),
  },
  filterTextActive: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  announcementsList: {
    padding: 16,
  },
  announcementCard: {
    backgroundColor: theme.colors.card || '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary || '#10b981',
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  announcementTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIcon: {
    marginRight: 8,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  typeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  priorityBadge: {
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '700',
  },
  dateContainer: {
    alignItems: 'flex-end',
  },
  date: {
    fontSize: 12,
    color: (theme.colors?.muted || '#6b7280'),
    marginBottom: 2,
  },
  fullDate: {
    fontSize: 11,
    color: (theme.colors?.muted || '#6b7280'),
  },
  unreadIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  unreadText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  announcementTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: (theme.colors?.text || '#1f2937'),
    marginBottom: 8,
  },
  announcementContent: {
    fontSize: 14,
    color: (theme.colors?.text || '#1f2937'),
    lineHeight: 20,
    marginBottom: 8,
  },
  attachmentsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  attachmentsText: {
    fontSize: 12,
    color: (theme.colors?.muted || '#6b7280'),
    marginLeft: 4,
  },
  readMore: {
    fontSize: 14,
    color: theme.colors.primary || '#10b981',
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: (theme.colors?.text || '#1f2937'),
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: (theme.colors?.muted || '#6b7280'),
    textAlign: 'center',
  },
});
};

export default AnnouncementsScreen;