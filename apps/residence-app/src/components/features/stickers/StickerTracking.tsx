import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { VehicleSticker } from '../../../types/stickers';

interface StickerTrackingProps {
  stickerId: string;
  onRefresh?: () => void;
}

interface TimelineEvent {
  id: string;
  status: string;
  title: string;
  description: string;
  timestamp: string;
  isCompleted: boolean;
  isCurrent: boolean;
}

export const StickerTracking: React.FC<StickerTrackingProps> = ({
  stickerId,
  onRefresh,
}) => {
  const [sticker, setSticker] = useState<VehicleSticker | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    loadStickerData();
  }, [stickerId]);

  const loadStickerData = async () => {
    try {
      setLoading(true);

      // Import stickerService dynamically to avoid circular dependencies
      const { stickerService } = await import('../../../services/stickerService');

      const result = await stickerService.getStickerById(stickerId);

      if (result.success && result.data) {
        setSticker(result.data);
        generateTimeline(result.data);
      } else {
        console.error('Failed to load sticker:', result.error);
      }
    } catch (error) {
      console.error('Load sticker error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefreshData = async () => {
    setRefreshing(true);
    await loadStickerData();
    setRefreshing(false);
    onRefresh?.();
  };

  const generateTimeline = (stickerData: VehicleSticker) => {
    const events: TimelineEvent[] = [
      {
        id: '1',
        status: 'submitted',
        title: 'Request Submitted',
        description: 'Your vehicle sticker request has been received',
        timestamp: stickerData.created_at,
        isCompleted: true,
        isCurrent: stickerData.status === 'pending',
      },
    ];

    if (stickerData.approved_at) {
      events.push({
        id: '2',
        status: 'approved',
        title: 'Request Approved',
        description: 'Your request has been approved by the admin',
        timestamp: stickerData.approved_at,
        isCompleted: true,
        isCurrent: stickerData.status === 'approved',
      });
    }

    if (stickerData.issued_date) {
      events.push({
        id: '3',
        status: 'issued',
        title: 'Sticker Issued',
        description: `Sticker #${stickerData.sticker_number} has been issued`,
        timestamp: stickerData.issued_date,
        isCompleted: true,
        isCurrent: stickerData.status === 'issued',
      });
    }

    if (stickerData.status === 'rejected') {
      events.push({
        id: '4',
        status: 'rejected',
        title: 'Request Rejected',
        description: stickerData.rejection_reason || 'Your request has been rejected',
        timestamp: stickerData.updated_at,
        isCompleted: true,
        isCurrent: true,
      });
    }

    if (stickerData.status === 'expired') {
      events.push({
        id: '5',
        status: 'expired',
        title: 'Sticker Expired',
        description: `Your sticker expired on ${new Date(stickerData.expiry_date!).toLocaleDateString()}`,
        timestamp: stickerData.expiry_date!,
        isCompleted: true,
        isCurrent: true,
      });
    }

    // Add upcoming events for pending requests
    if (stickerData.status === 'pending') {
      events.push(
        {
          id: '6',
          status: 'review',
          title: 'Under Review',
          description: 'Admin is reviewing your request',
          timestamp: '',
          isCompleted: false,
          isCurrent: false,
        },
        {
          id: '7',
          status: 'approval',
          title: 'Approval Decision',
          description: 'You will receive a notification once a decision is made',
          timestamp: '',
          isCompleted: false,
          isCurrent: false,
        },
        {
          id: '8',
          status: 'issuance',
          title: 'Sticker Issuance',
          description: 'Collect your sticker from the admin office',
          timestamp: '',
          isCompleted: false,
          isCurrent: false,
        }
      );
    }

    setTimeline(events);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'submitted':
        return '#f59e0b';
      case 'approved':
      case 'review':
        return '#3b82f6';
      case 'issued':
      case 'issuance':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      case 'expired':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: string, isCompleted: boolean) => {
    if (!isCompleted) return 'ó';

    switch (status) {
      case 'submitted':
        return '';
      case 'approved':
        return '';
      case 'issued':
        return '=—';
      case 'rejected':
        return 'L';
      case 'expired':
        return 'ð';
      default:
        return '';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEstimatedTime = (status: string) => {
    switch (status) {
      case 'review':
        return '1-2 business days';
      case 'approval':
        return 'Within 24 hours of review';
      case 'issuance':
        return 'Within 48 hours of approval';
      default:
        return '';
    }
  };

  const isExpired = () => {
    if (!sticker?.expiry_date) return false;
    return new Date(sticker.expiry_date) < new Date();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size="large" />
        <Text style={styles.loadingText}>Loading tracking information...</Text>
      </View>
    );
  }

  if (!sticker) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Tracking information not available</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefreshData} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Current Status Card */}
      <Card style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Text style={styles.statusTitle}>Current Status</Text>
          <Badge
            text={sticker.status}
            backgroundColor={getStatusColor(sticker.status)}
          />
        </View>

        <Text style={styles.statusDescription}>
          {sticker.status === 'pending' && 'Your request is being reviewed'}
          {sticker.status === 'approved' && 'Your request has been approved and is being processed'}
          {sticker.status === 'issued' && 'Your sticker has been issued and is active'}
          {sticker.status === 'rejected' && `Rejected: ${sticker.rejection_reason}`}
          {sticker.status === 'expired' && 'Your sticker has expired'}
        </Text>

        {sticker.sticker_number && (
          <View style={styles.stickerNumberContainer}>
            <Text style={styles.stickerNumberLabel}>Sticker Number:</Text>
            <Text style={styles.stickerNumber}>{sticker.sticker_number}</Text>
          </View>
        )}

        {sticker.expiry_date && (
          <View style={styles.expiryContainer}>
            <Text style={styles.expiryLabel}>
              {isExpired() ? 'Expired on:' : 'Expires on:'}
            </Text>
            <Text style={[styles.expiryDate, isExpired() && styles.expiredText]}>
              {new Date(sticker.expiry_date).toLocaleDateString()}
            </Text>
          </View>
        )}
      </Card>

      {/* Timeline */}
      <Card style={styles.timelineCard}>
        <Text style={styles.timelineTitle}>Request Timeline</Text>

        <View style={styles.timeline}>
          {timeline.map((event, index) => (
            <View key={event.id} style={styles.timelineItem}>
              {/* Timeline Line */}
              {index < timeline.length - 1 && (
                <View
                  style={[
                    styles.timelineLine,
                    event.isCompleted && styles.completedTimelineLine,
                  ]}
                />
              )}

              {/* Timeline Dot */}
              <View
                style={[
                  styles.timelineDot,
                  event.isCurrent && styles.currentTimelineDot,
                  event.isCompleted && styles.completedTimelineDot,
                  !event.isCompleted && !event.isCurrent && styles.upcomingTimelineDot,
                ]}
              >
                <Text style={styles.timelineDotIcon}>
                  {getStatusIcon(event.status, event.isCompleted)}
                </Text>
              </View>

              {/* Timeline Content */}
              <View style={styles.timelineContent}>
                <View style={styles.timelineHeader}>
                  <Text
                    style={[
                      styles.timelineEventTitle,
                      event.isCurrent && styles.currentEventTitle,
                      !event.isCompleted && !event.isCurrent && styles.upcomingEventTitle,
                    ]}
                  >
                    {event.title}
                  </Text>
                  {event.timestamp && (
                    <Text style={styles.timelineTimestamp}>
                      {formatDate(event.timestamp)}
                    </Text>
                  )}
                </View>

                <Text
                  style={[
                    styles.timelineDescription,
                    !event.isCompleted && !event.isCurrent && styles.upcomingDescription,
                  ]}
                >
                  {event.description}
                </Text>

                {!event.isCompleted && !event.isCurrent && getEstimatedTime(event.status) && (
                  <Text style={styles.estimatedTime}>
                    Estimated: {getEstimatedTime(event.status)}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </Card>

      {/* Actions */}
      <Card style={styles.actionsCard}>
        <Text style={styles.actionsTitle}>Actions</Text>

        <View style={styles.actionsGrid}>
          <Button
            title="Share Status"
            onPress={() => {
              // TODO: Implement share functionality
            }}
            variant="outline"
            style={styles.actionButton}
          />

          <Button
            title="View Details"
            onPress={() => {
              // TODO: Navigate to detail screen
            }}
            style={styles.actionButton}
          />
        </View>
      </Card>

      {/* Contact Info */}
      <Card style={styles.contactCard}>
        <Text style={styles.contactTitle}>Need Help?</Text>
        <Text style={styles.contactDescription}>
          If you have questions about your sticker request, please contact the admin office.
        </Text>
        <Button
          title="Contact Admin"
          onPress={() => {
            // TODO: Implement contact functionality
          }}
          variant="outline"
          style={styles.contactButton}
        />
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
  statusCard: {
    margin: 16,
    padding: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  statusDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  stickerNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
    marginBottom: 12,
  },
  stickerNumberLabel: {
    fontSize: 14,
    color: '#0369a1',
    marginRight: 8,
  },
  stickerNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369a1',
  },
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expiryLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
  },
  expiryDate: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  expiredText: {
    color: '#ef4444',
  },
  timelineCard: {
    margin: 16,
    marginTop: 8,
    padding: 20,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 20,
  },
  timeline: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 14,
    top: 32,
    bottom: -24,
    width: 2,
    backgroundColor: '#e5e7eb',
  },
  completedTimelineLine: {
    backgroundColor: '#10b981',
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    zIndex: 1,
  },
  currentTimelineDot: {
    borderColor: '#3b82f6',
    backgroundColor: '#dbeafe',
  },
  completedTimelineDot: {
    borderColor: '#10b981',
    backgroundColor: '#d1fae5',
  },
  upcomingTimelineDot: {
    borderColor: '#9ca3af',
    backgroundColor: '#f3f4f6',
  },
  timelineDotIcon: {
    fontSize: 14,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 2,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timelineEventTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  currentEventTitle: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  upcomingEventTitle: {
    color: '#9ca3af',
  },
  timelineTimestamp: {
    fontSize: 12,
    color: '#9ca3af',
  },
  timelineDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 4,
  },
  upcomingDescription: {
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  estimatedTime: {
    fontSize: 12,
    color: '#3b82f6',
    fontStyle: 'italic',
  },
  actionsCard: {
    margin: 16,
    marginTop: 8,
    padding: 20,
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  actionsGrid: {
    gap: 12,
  },
  actionButton: {
    marginBottom: 8,
  },
  contactCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 32,
    padding: 20,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  contactDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  contactButton: {
    alignSelf: 'flex-start',
  },
});

export default StickerTracking;