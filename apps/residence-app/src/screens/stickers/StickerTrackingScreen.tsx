import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import StickerStatusTracker from '../../components/stickers/StickerStatusTracker';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import stickerService from '../../services/stickerService';
import stickerRealtimeService from '../../services/stickerRealtimeService';
import { format } from 'date-fns';
import { RealtimeChannel } from '@supabase/supabase-js';


import { MaterialIcons } from '@expo/vector-icons';type RootStackParamList = {
  StickerTracking: { stickerId: string };
  StickerList: undefined;
  StickerDetails: { stickerId: string };
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'StickerTracking'>;
type RouteProps = RouteProp<RootStackParamList, 'StickerTracking'>;

interface StickerData {
  id: string;
  vehiclePlate: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string;
  vehicleType: string;
  status: 'pending' | 'processing' | 'approved' | 'rejected';
  submittedAt: Date;
  processedAt?: Date;
  rejectionReason?: string;
  approvalNote?: string;
  assignedTo: {
    id: string;
    name: string;
    photoUrl?: string;
    relationship?: string;
  };
  documentUrl?: string;
  isRenewal?: boolean;
}

export const StickerTrackingScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { stickerId } = route.params;

  const [sticker, setSticker] = useState<StickerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    loadStickerData();
    subscribeToUpdates();

    return () => {
      if (realtimeChannel) {
        realtimeChannel.unsubscribe();
      }
    };
  }, [stickerId]);

  const loadStickerData = async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const data = await stickerService.getSticker(stickerId);
      if (data) {
        const transformedData: StickerData = {
          id: data.id,
          vehiclePlate: data.vehicle_plate || data.vehiclePlate,
          vehicleMake: data.vehicle_make || data.vehicleMake,
          vehicleModel: data.vehicle_model || data.vehicleModel,
          vehicleColor: data.vehicle_color || data.vehicleColor,
          vehicleType: data.vehicle_type || data.vehicleType,
          status: data.status || 'pending',
          submittedAt: new Date(data.created_at || data.createdAt),
          processedAt: data.processed_at ? new Date(data.processed_at) : undefined,
          rejectionReason: data.rejection_reason,
          approvalNote: data.approval_note,
          assignedTo: data.household_members || {
            id: data.household_member_id || data.householdMemberId,
            name: 'Household Member',
          },
          documentUrl: data.document_url || data.documentUrl,
          isRenewal: data.is_renewal || data.isRenewal,
        };
        setSticker(transformedData);
      }
    } catch (error) {
      console.error('Failed to load sticker data:', error);
      Alert.alert('Error', 'Failed to load sticker information');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const subscribeToUpdates = async () => {
    const channel = await stickerRealtimeService.subscribeToSticker(
      stickerId,
      (updatedSticker) => {
        console.log('Sticker updated:', updatedSticker);
        loadStickerData();
      }
    );
    setRealtimeChannel(channel);
  };

  const handleRefresh = () => {
    loadStickerData(true);
  };

  const handleViewDetails = () => {
    if (sticker?.status === 'approved') {
      navigation.navigate('StickerDetails', { stickerId });
    }
  };

  const handleBackToList = () => {
    navigation.navigate('StickerList');
  };

  const getTimelineEvents = () => {
    if (!sticker) return [];

    const events = [
      {
        title: 'Request Submitted',
        description: 'Your sticker request has been received',
        time: sticker.submittedAt,
        icon: <MaterialIcons name="edit" size={16} color="#6b7280" />,
        completed: true,
      },
      {
        title: 'Under Review',
        description: 'Admin is reviewing your request',
        time: sticker.status !== 'pending' ? sticker.submittedAt : undefined,
        icon: '👀',
        completed: sticker.status !== 'pending',
      },
      {
        title: 'Processing',
        description: 'Your sticker is being prepared',
        time: sticker.status === 'processing' ? new Date() : undefined,
        icon: <MaterialIcons name="settings" size={16} color="#6b7280" />,
        completed: sticker.status === 'processing' || sticker.status === 'approved' || sticker.status === 'rejected',
      },
    ];

    if (sticker.status === 'approved') {
      events.push({
        title: 'Approved',
        description: sticker.approvalNote || 'Your sticker has been approved',
        time: sticker.processedAt || new Date(),
        icon: <MaterialIcons name="check-circle" size={16} color="#10b981" />,
        completed: true,
      });
    } else if (sticker.status === 'rejected') {
      events.push({
        title: 'Rejected',
        description: sticker.rejectionReason || 'Your request was rejected',
        time: sticker.processedAt || new Date(),
        icon: <MaterialIcons name="cancel" size={16} color="#ef4444" />,
        completed: true,
      });
    }

    return events;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size="large" />
        <Text style={styles.loadingText}>Loading sticker status...</Text>
      </View>
    );
  }

  if (!sticker) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>❌</Text>
        <Text style={styles.errorTitle}>Sticker Not Found</Text>
        <Text style={styles.errorText}>
          Unable to find the requested sticker information
        </Text>
        <Button variant="primary" onPress={handleBackToList}>
          Back to List
        </Button>
      </View>
    );
  }

  const vehicleDetails = `${sticker.vehicleMake} ${sticker.vehicleModel} • ${sticker.vehicleColor} • ${sticker.vehicleType}`;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Status Tracker Component */}
      <StickerStatusTracker
        request={{
          id: sticker.id,
          vehiclePlate: sticker.vehiclePlate,
          vehicleDetails,
          status: sticker.status as any,
          submittedAt: sticker.submittedAt,
          processedAt: sticker.processedAt,
          rejectionReason: sticker.rejectionReason,
          approvalNote: sticker.approvalNote,
          assignedTo: sticker.assignedTo.name,
        }}
      />

      {/* Timeline */}
      <Card style={styles.timelineCard}>
        <Text style={styles.sectionTitle}>📅 Timeline</Text>
        <View style={styles.timeline}>
          {getTimelineEvents().map((event, index) => (
            <View key={index} style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View
                  style={[
                    styles.timelineDot,
                    event.completed && styles.timelineDotCompleted,
                  ]}
                >
                  <Text style={styles.timelineIcon}>{event.icon}</Text>
                </View>
                {index < getTimelineEvents().length - 1 && (
                  <View
                    style={[
                      styles.timelineLine,
                      event.completed && styles.timelineLineCompleted,
                    ]}
                  />
                )}
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>{event.title}</Text>
                <Text style={styles.timelineDescription}>{event.description}</Text>
                {event.time && (
                  <Text style={styles.timelineTime}>
                    {format(event.time, 'MMM dd, yyyy • HH:mm')}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </Card>

      {/* Vehicle Information */}
      <Card style={styles.vehicleCard}>
        <Text style={styles.sectionTitle}>🚗 Vehicle Information</Text>
        <View style={styles.infoGrid}>
          <InfoItem label="Plate Number" value={sticker.vehiclePlate} />
          <InfoItem label="Make" value={sticker.vehicleMake} />
          <InfoItem label="Model" value={sticker.vehicleModel} />
          <InfoItem label="Color" value={sticker.vehicleColor} />
          <InfoItem label="Type" value={sticker.vehicleType} />
          <InfoItem label="Assigned To" value={sticker.assignedTo.name} />
        </View>
        {sticker.isRenewal && (
          <Badge variant="info" style={styles.renewalBadge}>
            🔄 Renewal Request
          </Badge>
        )}
      </Card>

      {/* Next Steps */}
      {sticker.status === 'approved' && (
        <Card style={styles.nextStepsCard}>
          <Text style={styles.sectionTitle}>✅ Next Steps</Text>
          <View style={styles.stepsList}>
            <StepItem
              number="1"
              text="Visit the admin office during business hours"
            />
            <StepItem
              number="2"
              text="Bring a valid ID for verification"
            />
            <StepItem
              number="3"
              text="Pay the processing fee (₱150.00)"
            />
            <StepItem
              number="4"
              text="Receive your vehicle sticker"
            />
          </View>
          <Button
            variant="primary"
            onPress={handleViewDetails}
            fullWidth
            style={styles.detailsButton}
          >
            View Sticker Details
          </Button>
        </Card>
      )}

      {/* Rejection Actions */}
      {sticker.status === 'rejected' && (
        <Card style={styles.rejectionCard}>
          <Text style={styles.rejectionTitle}>❌ Request Rejected</Text>
          <Text style={styles.rejectionReason}>
            {sticker.rejectionReason || 'No specific reason provided'}
          </Text>
          <Text style={styles.rejectionHelp}>
            Please review the rejection reason and submit a new request with the required corrections.
          </Text>
          <Button
            variant="primary"
            onPress={() => navigation.navigate('StickerRequest' as any)}
            fullWidth
            style={styles.resubmitButton}
          >
            Submit New Request
          </Button>
        </Card>
      )}

      {/* Contact Support */}
      <Card style={styles.supportCard}>
        <Text style={styles.supportTitle}>Need Help?</Text>
        <Text style={styles.supportText}>
          If you have questions about your sticker request, please contact the admin office.
        </Text>
        <View style={styles.contactInfo}>
          <ContactItem icon={<MaterialIcons name="phone" size={64} color="#6b7280" />} text="(02) 8123-4567" />
          <ContactItem icon={<MaterialIcons name="email" size={64} color="#6b7280" />} text="admin@village.com" />
          <ContactItem icon=<MaterialIcons name="access-time" size={16} color="#6b7280" /> text="Mon-Fri, 8AM-5PM" />
        </View>
      </Card>
    </ScrollView>
  );
};

// Helper Components
const InfoItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.infoItem}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const StepItem: React.FC<{ number: string; text: string }> = ({ number, text }) => (
  <View style={styles.stepItem}>
    <View style={styles.stepNumber}>
      <Text style={styles.stepNumberText}>{number}</Text>
    </View>
    <Text style={styles.stepText}>{text}</Text>
  </View>
);

const ContactItem: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <View style={styles.contactItem}>
    <Text style={styles.contactIcon}>{icon}</Text>
    <Text style={styles.contactText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: 32,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  timelineCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  timeline: {
    marginLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotCompleted: {
    backgroundColor: '#10b981',
  },
  timelineIcon: {
    fontSize: 16,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e5e7eb',
    marginTop: 4,
  },
  timelineLineCompleted: {
    backgroundColor: '#10b981',
  },
  timelineContent: {
    flex: 1,
    paddingTop: 6,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  timelineDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  timelineTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  vehicleCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  infoItem: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  renewalBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  nextStepsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  stepsList: {
    marginBottom: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
  },
  detailsButton: {
    marginTop: 8,
  },
  rejectionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fee2e2',
  },
  rejectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: 8,
  },
  rejectionReason: {
    fontSize: 14,
    fontWeight: '500',
    color: '#dc2626',
    marginBottom: 8,
  },
  rejectionHelp: {
    fontSize: 13,
    color: '#7f1d1d',
    marginBottom: 16,
  },
  resubmitButton: {
    backgroundColor: '#dc2626',
  },
  supportCard: {
    marginHorizontal: 16,
    marginBottom: 32,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  supportText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  contactInfo: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  contactText: {
    fontSize: 14,
    color: '#374151',
  },
});

export default StickerTrackingScreen;