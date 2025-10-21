import React from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { format, isAfter, isBefore } from 'date-fns';


import { MaterialIcons } from '@expo/vector-icons';
import guestService, { Guest } from '../../services/guestService';

interface GuestListProps {
  guests: Guest[];
  onGuestPress?: (guest: Guest) => void;
  onEditPress?: (guest: Guest) => void;
  onCancelPress?: (guest: Guest) => void;
  onQRPress?: (guest: Guest) => void;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

export const GuestList: React.FC<GuestListProps> = ({
  guests,
  onGuestPress,
  onEditPress,
  onCancelPress,
  onQRPress,
  isRefreshing,
  onRefresh,
}) => {
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'scheduled':
        return '#3b82f6';
      case 'arrived':
        return '#10b981';
      case 'departed':
        return '#6b7280';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: string): React.ReactNode => {
    switch (status) {
      case 'SCHEDULED':
        return <MaterialIcons name="event" size={16} color="#6b7280" />;
      case 'ACTIVE':
        return <MaterialIcons name="check-circle" size={16} color="#10b981" />;
      case 'EXPIRED':
        return <MaterialIcons name="history" size={16} color="#6b7280" />;
      case 'CANCELLED':
        return <MaterialIcons name="cancel" size={16} color="#ef4444" />;
      default:
        return <MaterialIcons name="circle" size={8} color="#6b7280" />;
    }
  };

  const getGuestUIStatus = (guest: Guest) => {
    return guestService.getUIGuestStatus(guest);
  };

  const handleEdit = (guest: Guest) => {
    if (guest.status === 'cancelled' || guest.status === 'checked_out') {
      Alert.alert('Cannot Edit', 'This guest visit cannot be edited');
      return;
    }
    onEditPress?.(guest);
  };

  const handleCancel = (guest: Guest) => {
    if (guest.status === 'cancelled' || guest.status === 'checked_out') {
      Alert.alert('Cannot Cancel', 'This guest visit is already completed');
      return;
    }

    Alert.alert(
      'Cancel Guest',
      'Are you sure you want to cancel this guest visit?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: () => onCancelPress?.(guest) },
      ]
    );
  };

  const renderGuest = ({ item }: { item: Guest }) => {
    const uiStatus = getGuestUIStatus(item);
    const isActive = uiStatus.status === 'ACTIVE';

    return (
      <TouchableOpacity
        testID={`guest-item-${guests.indexOf(item)}`}
        onPress={() => onGuestPress?.(item)}
        activeOpacity={0.7}
      >
        <Card style={[styles.guestCard, (item.status === 'cancelled' || uiStatus.status === 'CANCELLED') && styles.cancelledCard]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.guestInfo}>
              <Text style={styles.guestName}>{item.guest_name}</Text>
              <Text style={styles.guestPhone}>{item.guest_phone}</Text>
              {item.vehicle_plate && (
                <View style={styles.plateContainer}>
                  <Text style={styles.plateIcon}>🚗</Text>
                  <Text style={styles.plateNumber}>{item.vehicle_plate}</Text>
                </View>
              )}
            </View>
            <Badge
              testID={uiStatus.status === 'CANCELLED' ? 'cancelled-badge' : undefined}
              variant={
                uiStatus.status === 'SCHEDULED' ? 'info' :
                uiStatus.status === 'ACTIVE' ? 'success' :
                uiStatus.status === 'CANCELLED' || uiStatus.status === 'EXPIRED' ? 'error' : 'neutral'
              }
            >
              {getStatusIcon(uiStatus.status)} {uiStatus.status}
            </Badge>
          </View>

          {/* Purpose */}
          <View style={styles.purposeContainer}>
            <Text style={styles.purposeLabel}>Purpose:</Text>
            <Text style={styles.purposeText}>{item.purpose}</Text>
          </View>

          {/* Visit Details */}
          <View style={styles.visitDetails}>
            <View style={styles.dateInfo}>
              <Text style={styles.dateLabel}>Arrival:</Text>
              <Text style={styles.dateValue}>
                {format(new Date(item.arrival_date), 'MMM dd, yyyy HH:mm')}
              </Text>
            </View>
            {item.visit_type === 'multi_day' && item.departure_date && (
              <View style={styles.dateInfo}>
                <Text style={styles.dateLabel}>Departure:</Text>
                <Text style={styles.dateValue}>
                  {format(new Date(item.departure_date), 'MMM dd, yyyy HH:mm')}
                </Text>
              </View>
            )}
          </View>

          {/* Visit Type Badge */}
          <View style={styles.visitTypeContainer}>
            <Badge
              testID={item.visit_type === 'multi_day' ? 'multi-day-badge' : undefined}
              size="sm"
              variant={item.visit_type === 'multi_day' ? 'warning' : 'info'}
            >
              {item.visit_type === 'multi_day' ? '📆 Multi-Day' : '☀️ Day Trip'}
            </Badge>
            <Text style={styles.passId}>Pass #{item.pass_id}</Text>
          </View>

          {/* Actions */}
          {isActive && (
            <View style={styles.actions}>
              <Button
                testID="share-qr-button"
                variant="primary"
                size="sm"
                onPress={() => onQRPress?.(item)}
                style={styles.actionButton}
              >
                📱 Show QR
              </Button>
              <Button
                testID="edit-guest-button"
                variant="outline"
                size="sm"
                onPress={() => handleEdit(item)}
                style={styles.actionButton}
              >
                ✏️ Edit
              </Button>
              <Button
                testID="cancel-guest-button"
                variant="ghost"
                size="sm"
                onPress={() => handleCancel(item)}
                style={styles.actionButton}
              >
                ❌ Cancel
              </Button>
            </View>
          )}

          {/* Arrival Notification */}
          {item.status === 'checked_in' && (
            <View style={styles.arrivalNotification}>
              <Text style={styles.arrivalIcon}>🎉</Text>
              <Text style={styles.arrivalText}>Guest has arrived at the gate</Text>
            </View>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>👥</Text>
      <Text style={styles.emptyTitle}>No Scheduled Guests</Text>
      <Text style={styles.emptyText}>
        Schedule your first guest to generate a QR code for gate access
      </Text>
    </View>
  );

  return (
    <FlatList
      testID="guest-list"
      data={guests}
      renderItem={renderGuest}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.listContainer}
      ListEmptyComponent={renderEmpty}
      refreshing={isRefreshing}
      onRefresh={onRefresh}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  guestCard: {
    marginBottom: 12,
  },
  cancelledCard: {
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  guestInfo: {
    flex: 1,
  },
  guestName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  guestPhone: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  plateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  plateIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  plateNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  purposeContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  purposeLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginRight: 8,
  },
  purposeText: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
  },
  visitDetails: {
    backgroundColor: '#f9fafb',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  dateInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dateLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  dateValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1f2937',
  },
  visitTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  passId: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  arrivalNotification: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 6,
    marginTop: 12,
  },
  arrivalIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  arrivalText: {
    fontSize: 13,
    color: '#166534',
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default GuestList;