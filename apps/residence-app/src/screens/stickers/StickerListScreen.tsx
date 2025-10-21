import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Dimensions,
  PanResponder,
  Animated,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { FAB } from '../../components/ui/FAB';
import vehicleStickerService from '../../services/vehicleStickerService';
import networkStatus from '../../lib/networkStatus';
import { MaterialIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';

type RootStackParamList = {
  StickerList: undefined;
  StickerRequest: { renewalStickerId?: string };
  StickerTracking: { stickerId: string };
  StickerDetails: { stickerId: string };
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'StickerList'>;

interface FilterTab {
  key: 'all' | 'active' | 'expired' | 'expiring' | 'pending';
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
}

export const StickerListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { householdId } = useAuth();
  const { theme } = useTheme();

  // Responsive dimensions
  const screenWidth = Dimensions.get('window').width;
  const isSmallScreen = screenWidth < 375;
  const isMediumScreen = screenWidth >= 375 && screenWidth < 414;
  const isLargeScreen = screenWidth >= 414;

  // No need to calculate width - use flex to fill screen
  const getResponsiveTabWidth = () => {
    return undefined; // Let flex handle the width
  };

  const styles = createStyles(theme);

    const [stickers, setStickers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSticker, setSelectedSticker] = useState<any | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);

  
  useEffect(() => {
    if (householdId) {
      loadStickers();
    }
    checkNetworkStatus();
  }, [householdId]);

  useFocusEffect(
    React.useCallback(() => {
      if (householdId) {
        loadStickers();
      }
    }, [householdId])
  );

  const checkNetworkStatus = () => {
    // Implementation for network status check
  };

  const loadStickers = async () => {
    if (!householdId) return;

    try {
      setIsLoading(true);
      setError(null);
      const vehicleStickers = await vehicleStickerService.getStickers(householdId);
      setStickers(vehicleStickers);
    } catch (error) {
      console.error('Failed to load vehicle stickers:', error);
      setError('Failed to load vehicle stickers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadStickers();
    setIsRefreshing(false);
  };

  const getStats = () => {
    const active = stickers.filter(s => s.status === 'active').length;
    const expiring = stickers.filter(s => {
      if (!s.expiry_date) return false;
      const expiryDate = new Date(s.expiry_date);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      return s.status === 'active' && expiryDate <= thirtyDaysFromNow;
    }).length;
    const expired = stickers.filter(s => {
      if (!s.expiry_date) return false;
      const expiryDate = new Date(s.expiry_date);
      const now = new Date();
      return (s.status === 'active' || s.status === 'expired') && expiryDate < now;
    }).length;
    const pending = stickers.filter(s => s.status === 'requested' || s.status === 'approved').length;

    return { active, expiring, expired, pending, total: stickers.length };
  };

  const handleNewSticker = () => {
    navigation.navigate('StickerRequest' as never);
  };

  const handleStickerPress = (sticker: any) => {
    setSelectedSticker(sticker);
    setShowQRModal(true);
  };

  const handleDeleteSticker = async (sticker: any) => {
    Alert.alert(
      'Delete Sticker Request',
      `Are you sure you want to delete the sticker request for ${sticker.vehicle_make} ${sticker.vehicle_model} (${sticker.vehicle_plate})?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Use the new deleteSticker method for proper deletion
              const result = await vehicleStickerService.deleteSticker(sticker.id);
              if (result.success) {
                // Refresh the stickers list
                await loadStickers();
              } else {
                Alert.alert('Error', result.error || 'Failed to delete sticker request');
              }
            } catch (error) {
              console.error('Failed to delete sticker:', error);
              Alert.alert('Error', 'Failed to delete sticker request');
            }
          },
        },
      ]
    );
  };

  const handleCloseQRModal = () => {
    setShowQRModal(false);
    setSelectedSticker(null);
  };

  const getStatCount = (key: FilterTab['key']): number => {
    const stats = getStats();
    switch (key) {
      case 'all':
        return stats.total;
      case 'active':
        return stats.active;
      case 'expiring':
        return stats.expiring;
      case 'expired':
        return stats.expired;
      case 'pending':
        return stats.pending;
      default:
        return 0;
    }
  };

  const stats = getStats();

  // Swipeable Sticker Item Component
  const SwipeableStickerItem: React.FC<{ sticker: any }> = ({ sticker }) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const [isSwiping, setIsSwiping] = useState(false);
    const [hasSwiped, setHasSwiped] = useState(false);
    const swipeThreshold = 60; // Reduced threshold - easier to trigger delete
    const deleteWidth = 80;
    const swipeTimeoutRef = useRef<NodeJS.Timeout>();

    const panResponder = useRef(
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Only allow horizontal swipe and only for requested stickers
          return sticker.status === 'requested' &&
                 Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
                 Math.abs(gestureState.dx) > 8; // Reduced threshold - easier to start swipe
        },
        onPanResponderGrant: () => {
          setIsSwiping(true);
          setHasSwiped(true);
          // Clear any existing timeout
          if (swipeTimeoutRef.current) {
            clearTimeout(swipeTimeoutRef.current);
          }
          translateX.setOffset(translateX._value);
        },
        onPanResponderMove: (_, gestureState) => {
          // Only allow left swipe (negative dx) and limit to deleteWidth
          if (gestureState.dx < 0) {
            const maxSwipe = Math.max(gestureState.dx, -deleteWidth);
            translateX.setValue(maxSwipe);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          console.log('Swipe released:', { dx: gestureState.dx, threshold: swipeThreshold, stickerId: sticker.id, status: sticker.status });
          setIsSwiping(false);
          translateX.flattenOffset();

          if (Math.abs(gestureState.dx) > swipeThreshold && gestureState.dx < 0) {
            // User swiped left enough to delete
            console.log('Deleting sticker:', sticker.id);
            handleDeleteSticker(sticker);
            // Reset position
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          } else {
            console.log('Not enough swipe, snapping back');
            // Not swiped enough, snap back
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }

          // Allow taps again after a short delay to prevent accidental taps after swipe
          swipeTimeoutRef.current = setTimeout(() => {
            setHasSwiped(false);
          }, 300);
        },
        onPanResponderTerminate: () => {
          setIsSwiping(false);
          // Allow taps again after a short delay
          swipeTimeoutRef.current = setTimeout(() => {
            setHasSwiped(false);
          }, 300);
          // Snap back when gesture is terminated
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      })
    ).current;

    // Cleanup timeout on unmount
    useEffect(() => {
      return () => {
        if (swipeTimeoutRef.current) {
          clearTimeout(swipeTimeoutRef.current);
        }
      };
    }, []);

    const handlePress = () => {
      // Only allow press if not currently swiping AND hasn't recently swiped
      if (!isSwiping && !hasSwiped) {
        handleStickerPress(sticker);
      }
    };

    return (
      <View style={styles.stickerContainer}>
        {/* Delete area that's only visible when swiping */}
        {sticker.status === 'requested' && (
          <Animated.View
            style={[
              styles.deleteHint,
              {
                backgroundColor: theme.dark ? '#dc2626' : '#ef4444',
                opacity: translateX.interpolate({
                  inputRange: [-deleteWidth, -10, 0],
                  outputRange: [1, 0, 0],
                  extrapolate: 'clamp',
                }),
                transform: [{
                  translateX: translateX.interpolate({
                    inputRange: [-deleteWidth, 0],
                    outputRange: [0, deleteWidth],
                    extrapolate: 'clamp',
                  })
                }]
              }
            ]}
          >
            <MaterialIcons name="delete" size={24} color="#ffffff" />
            <Text style={styles.deleteHintText}>Delete</Text>
          </Animated.View>
        )}

        <Animated.View
          style={[
            styles.stickerAnimatedContainer,
            {
              transform: [{ translateX }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.7}
            style={styles.stickerTouchable}
            disabled={isSwiping}
          >
            <Card style={styles.stickerCard}>
              <View style={styles.stickerHeader}>
                <View>
                  <Text style={styles.stickerMake}>{sticker.vehicle_make} {sticker.vehicle_model}</Text>
                  <Text style={styles.stickerPlate}>{sticker.vehicle_plate}</Text>
                </View>
                <Badge
                  variant={
                    sticker.status === 'active' ? 'success' :
                    sticker.status === 'requested' || sticker.status === 'approved' ? 'warning' :
                    sticker.status === 'expired' || sticker.status === 'rejected' ? 'error' :
                    'neutral'
                  }
                  size="sm"
                >
                  {sticker.status.replace('-', ' ').toUpperCase()}
                </Badge>
              </View>
              <View style={styles.stickerDetails}>
                <Text style={styles.stickerDetail}>
                  {sticker.expiry_date
                    ? `Expires: ${new Date(sticker.expiry_date).toLocaleDateString()}`
                    : sticker.status === 'requested'
                      ? 'Status: Pending Approval'
                      : sticker.status === 'approved'
                        ? 'Status: Approved - Awaiting Activation'
                        : `Status: ${sticker.status.replace('-', ' ').toUpperCase()}`
                  }
                </Text>
              </View>
              {sticker.status === 'active' && (
                <View style={styles.qrHint}>
                  <MaterialIcons name="qr-code" size={16} color="#3b82f6" />
                  <Text style={styles.qrHintText}>Tap to show QR code</Text>
                </View>
              )}
              {sticker.status === 'requested' && (
                <View style={styles.swipeHint}>
                  <MaterialIcons name="swipe-left" size={16} color="#ef4444" />
                  <Text style={styles.swipeHintText}>Swipe left to delete</Text>
                </View>
              )}
            </Card>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  // Helper Component defined inside main component
  const StatItem: React.FC<{
    label: string;
    value: number;
    color: string;
    icon: keyof typeof MaterialIcons.glyphMap;
  }> = ({ label, value, color, icon }) => (
    <View style={styles.statItem}>
      <View style={[styles.statIconContainer, { backgroundColor: theme.dark ? `${color}33` : `${color}20` }]}>
        <MaterialIcons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color, textShadow: theme.dark ? '0 1px 2px rgba(0,0,0,0.5)' : 'none' }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.colors.muted }]}>{label}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Overview */}
        <Card style={[styles.statsCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.statsTitle, { color: theme.colors.text }]}>Vehicle Stickers Overview</Text>
          <View style={styles.statsGrid}>
            <StatItem
              label="Active"
              value={stats.active}
              color="#10b981"
              icon="check-circle"
            />
            <StatItem
              label="Expiring"
              value={stats.expiring}
              color="#f59e0b"
              icon="warning"
            />
            <StatItem
              label="Expired"
              value={stats.expired}
              color="#ef4444"
              icon="cancel"
            />
            <StatItem
              label="Pending"
              value={stats.pending}
              color="#3b82f6"
              icon="hourglass-empty"
            />
          </View>
        </Card>

        {/* Alert Messages */}
        {stats.expiring > 0 && (
          <Card style={[styles.alertCard, { backgroundColor: theme.dark ? '#92400e' : '#fef3c7' }]}>
            <MaterialIcons name="warning" size={24} color="#f59e0b" />
            <View style={styles.alertContent}>
              <Text style={[styles.alertTitle, { color: theme.colors.text }]}>Stickers Expiring Soon</Text>
              <Text style={[styles.alertText, { color: theme.dark ? '#d97706' : '#92400e' }]}>
                You have {stats.expiring} sticker{stats.expiring !== 1 ? 's' : ''} expiring within 30 days.
                Renew now to avoid penalties.
              </Text>
            </View>
          </Card>
        )}

        {stats.expired > 0 && (
          <Card style={[styles.alertCard, { backgroundColor: theme.dark ? '#991b1b' : '#fee2e2' }]}>
            <MaterialIcons name="cancel" size={24} color="#ef4444" />
            <View style={styles.alertContent}>
              <Text style={[styles.alertTitle, { color: theme.colors.text }]}>Expired Stickers</Text>
              <Text style={[styles.alertText, { color: theme.dark ? '#dc2626' : '#991b1b' }]}>
                You have {stats.expired} expired sticker{stats.expired !== 1 ? 's' : ''}.
                Please renew immediately to avoid fines.
              </Text>
            </View>
          </Card>
        )}

  
        {/* Sticker List */}
        <View style={styles.listContainer}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <MaterialIcons name="directions-car" size={48} color="#6b7280" />
              <Text style={styles.loadingText}>Loading vehicle stickers...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error" size={48} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
              <Button variant="primary" onPress={loadStickers}>
                Retry
              </Button>
            </View>
          ) : stickers.length === 0 ? (
            <View style={[styles.emptyCard, {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              borderWidth: 1,
            }]}>
              <MaterialIcons name="directions-car" size={64} color="#3b82f6" />
              <Text style={styles.emptyTitle}>No Vehicle Stickers Yet</Text>
              <Text style={styles.emptyText}>
                Request your first vehicle sticker to enable gate access for your car
              </Text>
              <Button
                variant="primary"
                onPress={handleNewSticker}
                style={styles.emptyButton}
              >
                Request First Sticker
              </Button>
            </View>
          ) : (
            stickers.map((sticker) => (
              <SwipeableStickerItem key={sticker.id} sticker={sticker} />
            ))
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      {stats.total > 0 && (
        <FAB
          icon="add"
          onPress={handleNewSticker}
        />
      )}

      {/* QR Code Modal */}
      <Modal
        visible={showQRModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseQRModal}
      >
        {selectedSticker && (
          <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <TouchableOpacity onPress={handleCloseQRModal} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Vehicle QR Code</Text>
              <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.qrSection}>
                <Text style={[styles.qrTitle, { color: theme.colors.text }]}>Show this QR code at the gate</Text>
                <View style={[styles.qrCodeContainer, {
                  backgroundColor: theme.colors.card,
                  shadowColor: theme.dark ? 'rgba(255,255,255,0.1)' : '#000'
                }]}>
                  {selectedSticker.rfid_code ? (
                    <QRCode
                      value={selectedSticker.rfid_code}
                      size={200}
                      color={theme.dark ? '#ffffff' : '#1f2937'}
                      backgroundColor="transparent"
                    />
                  ) : (
                    <View style={styles.noQRContainer}>
                      <MaterialIcons name="qr-code-2" size={80} color={theme.colors.muted} />
                      <Text style={[styles.noQRText, { color: theme.colors.muted }]}>QR code not available</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.qrInstruction, { color: theme.colors.muted }]}>
                  Security personnel will scan this code for quick verification
                </Text>
              </View>

              <View style={[styles.vehicleDetails, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.detailsTitle, { color: theme.colors.text }]}>Vehicle Details</Text>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.colors.muted }]}>Vehicle:</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                    {selectedSticker.vehicle_make} {selectedSticker.vehicle_model}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.colors.muted }]}>Plate Number:</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>{selectedSticker.vehicle_plate}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.colors.muted }]}>Color:</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>{selectedSticker.vehicle_color}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.colors.muted }]}>Status:</Text>
                  <Badge
                    variant={
                      selectedSticker.status === 'active' ? 'success' :
                      selectedSticker.status === 'requested' || selectedSticker.status === 'approved' ? 'warning' :
                      selectedSticker.status === 'expired' || selectedSticker.status === 'rejected' ? 'error' :
                      'neutral'
                    }
                    size="sm"
                  >
                    {selectedSticker.status.replace('-', ' ').toUpperCase()}
                  </Badge>
                </View>

                {selectedSticker.expiry_date && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.colors.muted }]}>Expires:</Text>
                    <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                      {new Date(selectedSticker.expiry_date).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  statsCard: {
    margin: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  alertCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  alertText: {
    fontSize: 13,
    color: theme.colors.muted,
    lineHeight: 18,
  },
  filterContainer: {
    marginBottom: 8, // Reduced bottom margin
    backgroundColor: theme.colors.background,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 4, // Minimal horizontal padding
    gap: 1, // Minimal gap between tabs - almost none
    alignItems: 'stretch', // Make all tabs same height
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56, // Increased height for much larger tabs
    paddingHorizontal: 12,
    borderRadius: 28, // Half of height for pill shape
    borderWidth: 1,
    shadowColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activeFilterTab: {
    borderColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.3,
    elevation: 4,
  },
  filterTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flex: 1,
  },
  filterLabel: {
    fontSize: 17, // Increased now that badges are removed
    color: '#1f2937', // Much darker color for better visibility
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'center',
    lineHeight: 18,
  },
  activeFilterLabel: {
    color: '#ffffff',
    fontWeight: '700',
  },
  listContainer: {
    flex: 1,
    minHeight: 400,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.muted,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginTop: 16,
    marginBottom: 16,
  },
  emptyCard: {
    margin: 16,
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  emptyButton: {
    paddingHorizontal: 24,
  },
  stickerCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    backgroundColor: theme.colors.card,
    shadowColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  stickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  stickerMake: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  stickerPlate: {
    fontSize: 14,
    color: theme.colors.muted,
    marginTop: 2,
  },
  stickerDetails: {
    marginTop: 8,
  },
  stickerDetail: {
    fontSize: 13,
    color: theme.colors.text,
  },
  qrHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  qrHintText: {
    fontSize: 12,
    color: theme.colors.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
  // Sticker container styles
  stickerContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    position: 'relative',
  },
  stickerTouchable: {
    flex: 1,
  },
  stickerAnimatedContainer: {
    position: 'relative',
    zIndex: 1,
  },
  deleteHint: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    zIndex: 0,
  },
  deleteHintText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  swipeHintText: {
    fontSize: 12,
    color: '#ef4444',
    marginLeft: 4,
    fontWeight: '500',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  placeholder: {
    width: 32,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  qrCodeContainer: {
    backgroundColor: theme.colors.card,
    padding: 20,
    borderRadius: 16,
    shadowColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  noQRContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noQRText: {
    fontSize: 16,
    color: theme.colors.muted,
    marginTop: 12,
    textAlign: 'center',
  },
  qrInstruction: {
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  vehicleDetails: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 20,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: theme.colors.muted,
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
});

export default StickerListScreen;