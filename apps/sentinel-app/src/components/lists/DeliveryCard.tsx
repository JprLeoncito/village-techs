import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../contexts/ThemeContext';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface Delivery {
  id: string;
  tracking_number?: string;
  delivery_company: string;
  delivery_person_name: string;
  delivery_person_contact: string;
  recipient_name: string;
  household_id: string;
  household_name: string;
  unit_number?: string;
  delivery_type: 'package' | 'food' | 'document' | 'furniture' | 'other';
  status: 'pending' | 'at_gate' | 'handed_off' | 'picked_up' | 'returned';
  special_instructions?: string;
  photos?: string[];
  notes?: string;
  gate_entry_id?: string;
  security_officer_id?: string;
  security_officer_name?: string;
  handoff_timestamp?: string;
  pickup_timestamp?: string;
  created_at: string;
  updated_at: string;
}

interface DeliveryCardProps {
  delivery: Delivery;
  onPress?: () => void;
  showActions?: boolean;
}

export const DeliveryCard: React.FC<DeliveryCardProps> = ({
  delivery,
  onPress,
  showActions = false,
}) => {
  const { theme } = useTheme();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'at_gate': return 'primary';
      case 'handed_off': return 'success';
      case 'picked_up': return 'success';
      case 'returned': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'clock-outline';
      case 'at_gate': return 'map-marker';
      case 'handed_off': return 'package-check';
      case 'picked_up': return 'check-circle';
      case 'returned': return 'undo';
      default: return 'help-circle';
    }
  };

  const getDeliveryTypeIcon = (type: string) => {
    switch (type) {
      case 'package': return 'package';
      case 'food': return 'food';
      case 'document': return 'file-document';
      case 'furniture': return 'sofa';
      case 'other': return 'help-circle';
      default: return 'package';
    }
  };

  const getDeliveryTypeColor = (type: string) => {
    switch (type) {
      case 'package': return 'primary';
      case 'food': return 'warning';
      case 'document': return 'info';
      case 'furniture': return 'secondary';
      case 'other': return 'muted';
      default: return 'primary';
    }
  };

  const getActionText = () => {
    switch (delivery.status) {
      case 'pending': return 'Mark at Gate';
      case 'at_gate': return 'Hand Off';
      case 'handed_off': return 'View Details';
      case 'picked_up': return 'View Details';
      case 'returned': return 'View Details';
      default: return 'View';
    }
  };

  const getActionIcon = () => {
    switch (delivery.status) {
      case 'pending': return 'map-marker';
      case 'at_gate': return 'package-check';
      case 'handed_off': return 'eye';
      case 'picked_up': return 'eye';
      case 'returned': return 'eye';
      default: return 'eye';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getUrgencyLevel = () => {
    const hoursSinceCreation = (Date.now() - new Date(delivery.created_at).getTime()) / (1000 * 60 * 60);

    if (hoursSinceCreation > 24) return 'high';
    if (hoursSinceCreation > 4) return 'medium';
    return 'low';
  };

  const getUrgencyColor = () => {
    const urgency = getUrgencyLevel();
    switch (urgency) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'muted';
    }
  };

  const textStyles = {
    companyName: [styles.companyName, { color: theme.colors.text }],
    recipientName: [styles.recipientName, { color: theme.colors.muted }],
    contactInfo: [styles.contactInfo, { color: theme.colors.muted }],
    trackingNumber: [styles.trackingNumber, { color: theme.colors.text }],
    timestamp: [styles.timestamp, { color: theme.colors.muted }],
    actionText: [styles.actionText, { color: theme.colors.primary }],
    instructionsText: [styles.instructionsText, { color: theme.colors.text }],
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.colors.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.deliveryInfo}>
          <View style={styles.companyRow}>
            <Icon name={getDeliveryTypeIcon(delivery.delivery_type)} size={20} color={theme.colors.primary} />
            <Text style={textStyles.companyName}>{delivery.delivery_company}</Text>
            <Badge
              title={delivery.delivery_type}
              variant={getDeliveryTypeColor(delivery.delivery_type) as any}
              size="small"
            />
            <Badge
              title={getUrgencyLevel()}
              variant={getUrgencyColor() as any}
              size="small"
            />
          </View>
          <View style={styles.statusRow}>
            <Icon
              name={getStatusIcon(delivery.status)}
              size={16}
              color={theme.colors[getStatusColor(delivery.status) as keyof typeof theme.colors]}
            />
            <Badge
              title={delivery.status.replace('_', ' ')}
              variant={getStatusColor(delivery.status) as any}
              size="small"
            />
          </View>
        </View>

        <View style={styles.timeInfo}>
          <Text style={textStyles.timestamp}>
            {formatTime(delivery.created_at)}
          </Text>
          <Text style={textStyles.timestamp}>
            {formatDate(delivery.created_at)}
          </Text>
        </View>
      </View>

      {/* Tracking Number */}
      {delivery.tracking_number && (
        <View style={styles.trackingRow}>
          <Icon name="barcode" size={16} color={theme.colors.muted} />
          <Text style={textStyles.trackingNumber}>{delivery.tracking_number}</Text>
        </View>
      )}

      {/* Recipient Information */}
      <View style={styles.recipientInfo}>
        <Icon name="account" size={16} color={theme.colors.muted} />
        <Text style={textStyles.recipientName}>
          {delivery.recipient_name}
          {delivery.unit_number && ` • Unit ${delivery.unit_number}`}
        </Text>
      </View>

      <View style={styles.householdInfo}>
        <Icon name="home" size={16} color={theme.colors.muted} />
        <Text style={textStyles.contactInfo}>{delivery.household_name}</Text>
      </View>

      {/* Delivery Person */}
      <View style={styles.deliveryPersonInfo}>
        <Icon name="truck" size={16} color={theme.colors.muted} />
        <Text style={textStyles.contactInfo}>
          {delivery.delivery_person_name} • {delivery.delivery_person_contact}
        </Text>
      </View>

      {/* Special Instructions */}
      {delivery.special_instructions && (
        <View style={styles.instructionsRow}>
          <Icon name="information" size={16} color={theme.colors.warning} />
          <Text style={textStyles.instructionsText} numberOfLines={2}>
            {delivery.special_instructions}
          </Text>
        </View>
      )}

      {/* Photos Indicator */}
      {delivery.photos && delivery.photos.length > 0 && (
        <View style={styles.photosIndicator}>
          <Icon name="camera" size={16} color={theme.colors.success} />
          <Text style={textStyles.contactInfo}>
            {delivery.photos.length} photo{delivery.photos.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Status Timeline */}
      <View style={styles.timeline}>
        <View style={[
          styles.timelineItem,
          delivery.status !== 'pending' && styles.timelineCompleted
        ]}>
          <Icon name="clock-outline" size={16} color={theme.colors[delivery.status !== 'pending' ? 'success' : 'muted']} />
          <Text style={textStyles.contactInfo}>Pending</Text>
        </View>

        <View style={[
          styles.timelineItem,
          ['at_gate', 'handed_off', 'picked_up', 'returned'].includes(delivery.status) && styles.timelineCompleted
        ]}>
          <Icon name="map-marker" size={16} color={theme.colors[delivery.status === 'pending' ? 'muted' : 'success']} />
          <Text style={textStyles.contactInfo}>At Gate</Text>
        </View>

        <View style={[
          styles.timelineItem,
          ['handed_off', 'picked_up', 'returned'].includes(delivery.status) && styles.timelineCompleted
        ]}>
          <Icon name="package-check" size={16} color={theme.colors[delivery.status === 'handed_off' || delivery.status === 'picked_up' ? 'success' : 'muted']} />
          <Text style={textStyles.contactInfo}>Handed Off</Text>
        </View>

        <View style={[
          styles.timelineItem,
          ['picked_up'].includes(delivery.status) && styles.timelineCompleted
        ]}>
          <Icon name="check-circle" size={16} color={theme.colors[delivery.status === 'picked_up' ? 'success' : 'muted']} />
          <Text style={textStyles.contactInfo}>Picked Up</Text>
        </View>
      </View>

      {/* Security Officer */}
      {delivery.security_officer_name && (
        <View style={styles.officerInfo}>
          <Icon name="shield-account" size={16} color={theme.colors.muted} />
          <Text style={textStyles.contactInfo}>
            Officer: {delivery.security_officer_name}
          </Text>
        </View>
      )}

      {/* Action Row */}
      {showActions && (
        <View style={styles.actionRow}>
          <View style={styles.actionContainer}>
            <Icon
              name={getActionIcon()}
              size={16}
              color={theme.colors.primary}
            />
            <Text style={textStyles.actionText}>{getActionText()}</Text>
          </View>
          <Icon name="chevron-right" size={20} color={theme.colors.muted} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  deliveryInfo: {
    flex: 1,
    gap: 4,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  companyName: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeInfo: {
    alignItems: 'flex-end',
    gap: 2,
  },
  timestamp: {
    fontSize: 12,
    textAlign: 'right',
  },
  trackingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  trackingNumber: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'monospace',
  },
  recipientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  recipientName: {
    fontSize: 15,
    fontWeight: '500',
  },
  householdInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  contactInfo: {
    fontSize: 14,
  },
  deliveryPersonInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  instructionsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
    backgroundColor: '#fffbeb',
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  instructionsText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  photosIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  timeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  timelineItem: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    opacity: 0.5,
  },
  timelineCompleted: {
    opacity: 1,
  },
  officerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});