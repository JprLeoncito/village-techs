import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { SkeletonLoader } from '../ui/LoadingSpinner';
import stickerService from '../../services/stickerService';
import { formatDistanceToNow, differenceInDays, format } from 'date-fns';


import { MaterialIcons } from '@expo/vector-icons';interface Sticker {
  id: string;
  vehiclePlate: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string;
  vehicleType: string;
  status: 'active' | 'expired' | 'expiring' | 'pending' | 'rejected';
  assignedTo: {
    id: string;
    name: string;
    photoUrl?: string;
    relationship?: string;
  };
  expiryDate: Date;
  issueDate?: Date;
  stickerNumber?: string;
  rejectionReason?: string;
}

interface StickerListProps {
  filter?: 'all' | 'active' | 'expired' | 'expiring';
  onRenewal?: (stickerId: string) => void;
  onStickerPress?: (sticker: Sticker) => void;
  refreshTrigger?: number;
}

export const StickerList: React.FC<StickerListProps> = ({
  filter = 'all',
  onRenewal,
  onStickerPress,
  refreshTrigger,
}) => {
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadStickers();
  }, [filter, refreshTrigger]);

  const loadStickers = async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const data = await stickerService.getStickers();

      // Process stickers to determine expiry status
      const processedStickers = data.map(sticker => {
        const daysToExpiry = differenceInDays(new Date(sticker.expiryDate), new Date());

        let status = sticker.status;
        if (status === 'active') {
          if (daysToExpiry < 0) {
            status = 'expired';
          } else if (daysToExpiry <= 30) {
            status = 'expiring';
          }
        }

        return { ...sticker, status };
      });

      // Apply filter
      let filteredStickers = processedStickers;
      if (filter !== 'all') {
        filteredStickers = processedStickers.filter(s => s.status === filter);
      }

      // Sort by expiry date (soonest first for expiring, latest first for active)
      filteredStickers.sort((a, b) => {
        if (a.status === 'expiring' && b.status !== 'expiring') return -1;
        if (a.status !== 'expiring' && b.status === 'expiring') return 1;
        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      });

      setStickers(filteredStickers);
    } catch (error) {
      console.error('Failed to load stickers:', error);
      Alert.alert('Error', 'Failed to load vehicle stickers');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRenewal = (stickerId: string) => {
    Alert.alert(
      'Renew Sticker',
      'Do you want to renew this vehicle sticker?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Renew',
          onPress: () => onRenewal?.(stickerId),
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#10b981';
      case 'expired':
        return '#ef4444';
      case 'expiring':
        return '#f59e0b';
      case 'pending':
        return '#3b82f6';
      case 'rejected':
        return '#dc2626';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return '✓';
      case 'expired':
        return '✕';
      case 'expiring':
        return <MaterialIcons name="warning" size={16} color="#f59e0b" />;
      case 'pending':
        return <MaterialIcons name="hourglass-empty" size={16} color="#6b7280" />;
      case 'rejected':
        return '✕';
      default:
        return <MaterialIcons name="circle" size={8} color="#6b7280" />;
    }
  };

  const getVehicleIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'car':
        return <MaterialIcons name="directions-car" size={64} color="#3b82f6" />;
      case 'suv':
        return <MaterialIcons name="directions-car" size={16} color="#3b82f6" />;
      case 'motorcycle':
        return <MaterialIcons name="motorcycle" size={64} color="#3b82f6" />;
      case 'van':
        return <MaterialIcons name="airport-shuttle" size={16} color="#3b82f6" />;
      case 'truck':
        return <MaterialIcons name="local-shipping" size={16} color="#3b82f6" />;
      default:
        <MaterialIcons name="directions-car" size={64} color="#3b82f6" />;
    }
  };

  const renderSticker = ({ item }: { item: Sticker }) => {
    const daysToExpiry = differenceInDays(new Date(item.expiryDate), new Date());
    const isExpired = item.status === 'expired';
    const isExpiring = item.status === 'expiring';
    const showRenewalButton = isExpired || (isExpiring && daysToExpiry <= 30);

    return (
      <TouchableOpacity
        onPress={() => onStickerPress?.(item)}
        activeOpacity={0.7}
      >
        <Card style={[styles.stickerCard, isExpired && styles.expiredCard]}>
          {/* Header with Status Badge */}
          <View style={styles.cardHeader}>
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleIcon}>{getVehicleIcon(item.vehicleType)}</Text>
              <View>
                <Text style={styles.plateNumber}>{item.vehiclePlate}</Text>
                <Text style={styles.vehicleDetails}>
                  {item.vehicleMake} {item.vehicleModel} • {item.vehicleColor}
                </Text>
              </View>
            </View>
            <Badge
              variant={
                item.status === 'active' ? 'success' :
                item.status === 'expiring' ? 'warning' :
                item.status === 'expired' ? 'error' :
                item.status === 'pending' ? 'info' : 'error'
              }
            >
              {getStatusIcon(item.status)} {item.status.toUpperCase()}
            </Badge>
          </View>

          {/* Assigned Person */}
          <View style={styles.assignedSection}>
            <Avatar
              name={item.assignedTo.name}
              source={item.assignedTo.photoUrl}
              size="sm"
            />
            <View style={styles.assignedInfo}>
              <Text style={styles.assignedName}>{item.assignedTo.name}</Text>
              {item.assignedTo.relationship && (
                <Text style={styles.assignedRelation}>{item.assignedTo.relationship}</Text>
              )}
            </View>
            {item.stickerNumber && (
              <Badge size="sm" variant="neutral">#{item.stickerNumber}</Badge>
            )}
          </View>

          {/* Expiry Information */}
          <View style={styles.expirySection}>
            {item.issueDate && (
              <View style={styles.dateInfo}>
                <Text style={styles.dateLabel}>Issued</Text>
                <Text style={styles.dateValue}>
                  {format(new Date(item.issueDate), 'MMM dd, yyyy')}
                </Text>
              </View>
            )}
            <View style={styles.dateInfo}>
              <Text style={styles.dateLabel}>Expires</Text>
              <Text style={[styles.dateValue, isExpired && styles.expiredText]}>
                {format(new Date(item.expiryDate), 'MMM dd, yyyy')}
              </Text>
            </View>
          </View>

          {/* Expiry Warning */}
          {isExpiring && !isExpired && (
            <View style={styles.warningBox}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <Text style={styles.warningText}>
                Expires in {daysToExpiry} day{daysToExpiry !== 1 ? 's' : ''}. Renew now to avoid penalties.
              </Text>
            </View>
          )}

          {/* Expired Warning */}
          {isExpired && (
            <View style={styles.errorBox}>
              <Text style={styles.errorIcon}>🚫</Text>
              <Text style={styles.errorText}>
                Expired {formatDistanceToNow(new Date(item.expiryDate))} ago
              </Text>
            </View>
          )}

          {/* Rejection Reason */}
          {item.status === 'rejected' && item.rejectionReason && (
            <View style={styles.errorBox}>
              <Text style={styles.errorIcon}>❌</Text>
              <Text style={styles.errorText}>
                Rejected: {item.rejectionReason}
              </Text>
            </View>
          )}

          {/* Renewal Button */}
          {showRenewalButton && (
            <Button
              variant="primary"
              size="sm"
              onPress={() => handleRenewal(item.id)}
              fullWidth
              style={styles.renewalButton}
            >
              🔄 Renew Sticker
            </Button>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🚗</Text>
      <Text style={styles.emptyTitle}>No Vehicle Stickers</Text>
      <Text style={styles.emptyText}>
        {filter === 'all'
          ? "You don't have any vehicle stickers yet"
          : `No ${filter} stickers found`}
      </Text>
    </View>
  );

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3].map(i => (
        <Card key={i} style={styles.stickerCard}>
          <View style={styles.cardHeader}>
            <SkeletonLoader width={150} height={20} />
            <SkeletonLoader width={80} height={24} borderRadius={12} />
          </View>
          <View style={styles.assignedSection}>
            <SkeletonLoader width={32} height={32} borderRadius={16} />
            <SkeletonLoader width={120} height={16} style={{ marginLeft: 12 }} />
          </View>
          <View style={styles.expirySection}>
            <SkeletonLoader width={100} height={14} />
            <SkeletonLoader width={100} height={14} />
          </View>
        </Card>
      ))}
    </View>
  );

  if (isLoading && stickers.length === 0) {
    return renderSkeleton();
  }

  return (
    <FlatList
      data={stickers}
      renderItem={renderSticker}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.listContainer}
      ListEmptyComponent={renderEmpty}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => loadStickers(true)}
          colors={['#10b981']}
        />
      }
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  stickerCard: {
    marginBottom: 12,
  },
  expiredCard: {
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  vehicleIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  plateNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  vehicleDetails: {
    fontSize: 14,
    color: '#6b7280',
  },
  assignedSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  assignedInfo: {
    flex: 1,
    marginLeft: 12,
  },
  assignedName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  assignedRelation: {
    fontSize: 12,
    color: '#6b7280',
  },
  expirySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  dateInfo: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  expiredText: {
    color: '#ef4444',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  warningIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  errorIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#991b1b',
  },
  renewalButton: {
    marginTop: 16,
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
  },
  skeletonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});

export default StickerList;