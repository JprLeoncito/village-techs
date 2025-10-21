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

interface Guest {
  id: string;
  name: string;
  contact_number: string;
  email?: string;
  purpose: string;
  expected_arrival?: string;
  expected_departure?: string;
  household_id: string;
  household_name: string;
  status: 'pending' | 'approved' | 'checked_in' | 'checked_out' | 'expired';
  qr_code?: string;
  notes?: string;
  host_name?: string;
  created_at: string;
  updated_at: string;
}

interface GuestCardProps {
  guest: Guest;
  onPress?: () => void;
  showActions?: boolean;
}

export const GuestCard: React.FC<GuestCardProps> = ({
  guest,
  onPress,
  showActions = false,
}) => {
  const { theme } = useTheme();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'checked_in': return 'primary';
      case 'checked_out': return 'muted';
      case 'expired': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'clock-outline';
      case 'approved': return 'check-circle-outline';
      case 'checked_in': return 'login';
      case 'checked_out': return 'logout';
      case 'expired': return 'alert-circle';
      default: return 'help-circle';
    }
  };

  const getActionText = () => {
    switch (guest.status) {
      case 'pending': return 'Verify';
      case 'approved': return 'Check In';
      case 'checked_in': return 'Check Out';
      case 'checked_out': return 'View Details';
      case 'expired': return 'View Details';
      default: return 'View';
    }
  };

  const getActionIcon = () => {
    switch (guest.status) {
      case 'pending': return 'account-check';
      case 'approved': return 'login';
      case 'checked_in': return 'logout';
      case 'checked_out': return 'eye';
      case 'expired': return 'eye';
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

  const isOverdue = () => {
    if (!guest.expected_departure || guest.status === 'checked_out') return false;
    return new Date() > new Date(guest.expected_departure);
  };

  const textStyles = {
    guestName: [styles.guestName, { color: theme.colors.text }],
    householdName: [styles.householdName, { color: theme.colors.muted }],
    contactInfo: [styles.contactInfo, { color: theme.colors.muted }],
    purposeText: [styles.purposeText, { color: theme.colors.text }],
    timestamp: [styles.timestamp, { color: theme.colors.muted }],
    actionText: [styles.actionText, { color: theme.colors.primary }],
    overdueText: [styles.overdueText, { color: theme.colors.error }],
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.colors.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.guestInfo}>
          <Text style={textStyles.guestName}>{guest.name}</Text>
          <View style={styles.statusRow}>
            <Icon
              name={getStatusIcon(guest.status)}
              size={16}
              color={theme.colors[getStatusColor(guest.status) as keyof typeof theme.colors]}
            />
            <Badge
              title={guest.status.replace('_', ' ')}
              variant={getStatusColor(guest.status) as any}
              size="small"
            />
            {isOverdue() && (
              <Badge title="Overdue" variant="error" size="small" />
            )}
          </View>
        </View>

        <View style={styles.timeInfo}>
          <Text style={textStyles.timestamp}>
            {formatTime(guest.created_at)}
          </Text>
          <Text style={textStyles.timestamp}>
            {formatDate(guest.created_at)}
          </Text>
        </View>
      </View>

      {/* Household Information */}
      <View style={styles.householdInfo}>
        <Icon name="home" size={16} color={theme.colors.muted} />
        <Text style={textStyles.householdName}>{guest.household_name}</Text>
        {guest.host_name && (
          <Text style={textStyles.contactInfo}>• Host: {guest.host_name}</Text>
        )}
      </View>

      {/* Contact Information */}
      <View style={styles.contactInfoRow}>
        <Icon name="phone" size={16} color={theme.colors.muted} />
        <Text style={textStyles.contactInfo}>{guest.contact_number}</Text>
        {guest.email && (
          <>
            <Icon name="email" size={16} color={theme.colors.muted} style={styles.contactIcon} />
            <Text style={textStyles.contactInfo}>{guest.email}</Text>
          </>
        )}
      </View>

      {/* Purpose */}
      <View style={styles.purposeRow}>
        <Icon name="text" size={16} color={theme.colors.muted} />
        <Text style={textStyles.purposeText} numberOfLines={2}>
          {guest.purpose}
        </Text>
      </View>

      {/* Expected Times */}
      {(guest.expected_arrival || guest.expected_departure) && (
        <View style={styles.timeRow}>
          {guest.expected_arrival && (
            <View style={styles.timeItem}>
              <Icon name="calendar-clock" size={16} color={theme.colors.muted} />
              <Text style={textStyles.contactInfo}>
                Expected: {new Date(guest.expected_arrival).toLocaleString()}
              </Text>
            </View>
          )}
          {guest.expected_departure && (
            <View style={styles.timeItem}>
              <Icon name="calendar-clock" size={16} color={theme.colors.muted} />
              <Text style={[
                textStyles.contactInfo,
                isOverdue() && textStyles.overdueText
              ]}>
                Departure: {new Date(guest.expected_departure).toLocaleString()}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Notes */}
      {guest.notes && (
        <View style={styles.notesRow}>
          <Icon name="note-text" size={16} color={theme.colors.muted} />
          <Text style={textStyles.contactInfo} numberOfLines={2}>
            {guest.notes}
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

      {/* QR Code Indicator */}
      {guest.qr_code && (
        <View style={styles.qrIndicator}>
          <Icon name="qrcode" size={16} color={theme.colors.success} />
          <Text style={textStyles.contactInfo}>QR Code Available</Text>
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
  guestInfo: {
    flex: 1,
    gap: 4,
  },
  guestName: {
    fontSize: 18,
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
  householdInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  householdName: {
    fontSize: 16,
    fontWeight: '500',
  },
  contactInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  contactIcon: {
    marginLeft: 8,
  },
  contactInfo: {
    fontSize: 14,
  },
  purposeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  purposeText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
  },
  timeRow: {
    gap: 4,
    marginBottom: 8,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  qrIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  overdueText: {
    fontWeight: '600',
  },
});