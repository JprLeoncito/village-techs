import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../../components/ui/Button';
import { FAB } from '../../components/ui/FAB';
import { Card } from '../../components/ui/Card';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import QRCode from 'react-native-qrcode-svg';
import { GuestScheduleForm } from '../../components/guests/GuestScheduleForm';
import guestService, { GuestFormData, UIGuestStatusInfo } from '../../services/guestService';
import { Guest } from '../../services/guestService';

interface ExtendedGuest extends Guest {
  isActive?: boolean;
  uiStatus?: UIGuestStatusInfo;
}

export const GuestListScreen: React.FC = () => {
  const [guests, setGuests] = useState<ExtendedGuest[]>([]);
  const navigation = useNavigation();
  const { householdId } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<ExtendedGuest | null>(null);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [isSubmittingGuest, setIsSubmittingGuest] = useState(false);
  const [activeTab, setActiveTab] = useState<'scheduled' | 'history'>('scheduled');
  const [isOffline, setIsOffline] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [guestsPerPage] = useState(5);
  const [screenWidth, setScreenWidth] = useState(() => Dimensions.get('window').width || 400);

  // Animation values
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.8)).current;
  const modalTranslateY = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // GuestListScreen useEffect triggered
    if (householdId) {
      loadGuests();
      checkNetworkStatus();
    } else {
      setError('No household information available');
      setLoading(false);
    }
  }, [householdId, activeTab]);

  useEffect(() => {
    const handleDimensionsChange = ({ window }) => {
      setScreenWidth(window.width);
    };

    const subscription = Dimensions.addEventListener('change', handleDimensionsChange);
    return () => subscription?.remove();
  }, []);

  const checkNetworkStatus = () => {
    // You can add network status checking here
    setIsOffline(false);
  };

  const loadGuests = async (isRefresh = false, page = 1, loadMore = false) => {
    if (!householdId) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
        setCurrentPage(1);
      } else if (!loadMore) {
        setLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      // Loading guests for household

      // First, check if user is authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      // User session checked

      if (!session) {
        setError('User not authenticated');
        return;
      }

      // Get guests based on active tab
      const filter = activeTab === 'scheduled' ? 'scheduled' : 'expired';
      const data = await guestService.getGuests(householdId, filter);

      console.log('DEBUG: GuestListScreen loaded', data?.length || 0, 'guests for filter:', filter);
      if (data && data.length > 0) {
        console.log('DEBUG: Sample guest in GuestListScreen:', data[0]);
        console.log('DEBUG: Sample guest status:', guestService.getUIGuestStatus(data[0]));
      }

      // Guests loaded and processed

      // Process guests using unified status mapping
      const processedGuests = data.map(guest => {
        const uiStatus = guestService.getUIGuestStatus(guest);
        return {
          ...guest,
          uiStatus: uiStatus,
          isActive: uiStatus.status === 'ACTIVE'
        };
      });
      console.log('DEBUG: Processed guests in GuestListScreen:', processedGuests.length);
      console.log('DEBUG: Active guests count:', processedGuests.filter(g => g.isActive).length);

      // Sort by UI status priority and arrival date
      processedGuests.sort((a, b) => {
        // First sort by priority (ACTIVE = 1, SCHEDULED = 2, EXPIRED/CANCELLED = 4)
        if (a.uiStatus.priority !== b.uiStatus.priority) {
          return a.uiStatus.priority - b.uiStatus.priority;
        }

        // Within same priority, sort by arrival date
        const aArrival = new Date(a.arrival_date);
        const bArrival = new Date(b.arrival_date);
        return aArrival.getTime() - bArrival.getTime();
      });

      // Apply pagination
      const startIndex = (page - 1) * guestsPerPage;
      const endIndex = startIndex + guestsPerPage;
      const paginatedGuests = processedGuests.slice(0, endIndex);
      const hasMoreData = processedGuests.length > endIndex;

      if (isRefresh || page === 1) {
        setGuests(paginatedGuests);
      } else {
        setGuests(prevGuests => [...prevGuests, ...paginatedGuests]);
      }

      setHasMore(hasMoreData);

    } catch (error) {
      console.error('Error loading guests:', error);
      if (!loadMore) {
        setGuests([]);
      }
      setError(`Failed to load guests: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsLoadingMore(false);
    }
  };

  const onRefresh = () => {
    loadGuests(true);
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      loadGuests(false, nextPage, true);
    }
  };

  const handleTabChange = (tab: 'scheduled' | 'history') => {
    if (activeTab !== tab) {
      setActiveTab(tab);
      setCurrentPage(1);
      setGuests([]);
      setHasMore(false);
    }
  };

  const handleAddGuest = () => {
    setShowGuestForm(true);
  };

  const handleGuestFormSubmit = async (guestData: GuestFormData) => {
    if (!householdId) return;

    try {
      setIsSubmittingGuest(true);
      // Submitting guest data

      // Use the guest service to create the guest
      const result = await guestService.scheduleGuest(householdId, {
        guestName: guestData.guestName,
        guestPhone: guestData.guestPhone,
        vehiclePlate: guestData.vehiclePlate,
        purpose: guestData.purpose,
        visitType: guestData.visitType,
        arrivalDate: guestData.arrivalDate,
        departureDate: guestData.departureDate,
      });

      if (result.success) {
        // Guest created successfully

        // Show success message and auto-close
        setTimeout(() => {
          setShowGuestForm(false);
          loadGuests(); // Refresh the guest list
        }, 1500); // Close form after 1.5 seconds

        // Show brief success message using Alert (could be replaced with toast)
        Alert.alert(
          'Success!',
          `Guest scheduled successfully\nPass ID: ${result.passId}`,
          [
            {
              text: 'OK',
              style: 'default'
            }
          ]
        );
      } else {
        console.error('Failed to create guest:', result.error);
        Alert.alert(
          'Failed to Schedule Guest',
          result.error || 'An error occurred while scheduling the guest. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error in handleGuestFormSubmit:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmittingGuest(false);
    }
  };

  const animateModalIn = () => {
    Animated.parallel([
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(modalScale, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(modalTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateModalOut = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalScale, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalTranslateY, {
        toValue: 50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback?.();
    });
  };

  const handleShowQRCode = (guest: Guest) => {
    try {
      if (!guest || !guest.pass_id) {
        Alert.alert('Error', 'Guest information is missing or incomplete');
        return;
      }
      setSelectedGuest(guest);
      setShowQRModal(true);
      // Start animation after state update
      setTimeout(() => animateModalIn(), 10);
    } catch (error) {
      console.error('Error showing QR code modal:', error);
      Alert.alert('Error', 'Failed to open QR code. Please try again.');
    }
  };

  const handleCloseQRModal = () => {
    animateModalOut(() => {
      setShowQRModal(false);
      setSelectedGuest(null);
    });
  };

  const generateQRCodeData = (guest: Guest) => {
    try {
      const qrData = {
        type: 'guest_access',
        pass_id: guest.pass_id || '',
        guest_name: guest.guest_name || '',
        guest_phone: guest.guest_phone || '',
        purpose: guest.purpose || 'Guest',
        arrival_date: guest.arrival_date || '',
        household_id: guest.household_id || '',
        timestamp: Date.now()
      };
      return JSON.stringify(qrData);
    } catch (error) {
      console.error('Error generating QR code data:', error);
      // Fallback to basic data
      return JSON.stringify({
        type: 'guest_access',
        pass_id: guest.pass_id || 'ERROR',
        timestamp: Date.now()
      });
    }
  };

  const getGuestStats = () => {
    const activeGuests = guests.filter(guest =>
      guest.uiStatus?.status === 'ACTIVE'
    );

    const scheduledGuests = guests.filter(guest =>
      guest.uiStatus?.status === 'SCHEDULED'
    );

    const expiredGuests = guests.filter(guest =>
      guest.uiStatus?.status === 'EXPIRED'
    );

    return {
      active: activeGuests.length,
      scheduled: scheduledGuests.length,
      expired: expiredGuests.length,
      total: guests.length,
    };
  };

  const getStatusColor = (guest: ExtendedGuest) => {
    if (!guest.uiStatus) return '#6b7280';
    return guest.uiStatus.color;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    // Always show the actual date instead of "Today"/"Tomorrow"
    // Format as "MMM dd, yyyy" for consistency
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderGuestItem = (guest: ExtendedGuest, index: number) => (
    <View
      key={guest.id}
      style={[
        styles.guestItem,
        { backgroundColor: theme.colors.card },
        guest.isActive && styles.activeGuestItem
      ]}
    >
      <View style={styles.guestHeader}>
        <View style={styles.guestInfo}>
          <View style={styles.guestNameRow}>
            <Text style={[styles.guestName, { color: theme.colors.text }]}>
              {guest.guest_name}
            </Text>
            {guest.isActive && (
              <View style={styles.activeIndicator}>
                <Text style={styles.activeText}>Active</Text>
              </View>
            )}
          </View>
          <Text style={[styles.guestRelationship, { color: theme.colors.muted }]}>
            {guest.purpose || 'Guest'}
          </Text>
        </View>
        {/* Only show status badge if not active (to avoid duplicate "Active" text) */}
        {!guest.isActive && (
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(guest) }
            ]}
          >
            <Text style={styles.statusText}>
              {guest.uiStatus?.status || 'SCHEDULED'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.guestDetails}>
        <View style={styles.detailRow}>
          <MaterialIcons name="event" size={16} color={theme.colors.muted} />
          <Text style={[styles.detailValue, { color: theme.colors.text }]}>
            {formatDate(guest.arrival_date)}
          </Text>
        </View>

        {guest.departure_date && (
          <View style={styles.detailRow}>
            <MaterialIcons name="event" size={16} color={theme.colors.muted} />
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              To: {formatDate(guest.departure_date)}
            </Text>
          </View>
        )}

        {guest.guest_phone && (
          <View style={styles.detailRow}>
            <MaterialIcons name="phone" size={16} color={theme.colors.muted} />
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {guest.guest_phone}
            </Text>
          </View>
        )}

        {guest.vehicle_plate && (
          <View style={styles.detailRow}>
            <MaterialIcons name="directions-car" size={16} color={theme.colors.muted} />
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              Vehicle: {guest.vehicle_plate}
            </Text>
          </View>
        )}

        {guest.pass_id && (
          <View style={[styles.accessCodeContainer]}>
            <Text style={[styles.accessCodeLabel, { color: theme.colors.primary }]}>
              Access Code: {guest.pass_id}
            </Text>
          </View>
        )}

        {guest.pass_id && (
          <View style={[styles.qrCodeContainer]}>
            <Text style={[styles.qrCodeLabel, { color: theme.colors.muted }]}>
              QR Code
            </Text>
            <TouchableOpacity
              style={[styles.qrCodeButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => handleShowQRCode(guest)}
            >
              <MaterialIcons name="qr-code" size={16} color="#ffffff" />
              <Text style={styles.qrCodeButtonText}>Show QR</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  const stats = getGuestStats();

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="people" size={48} color={theme.colors.muted} />
          <Text style={[styles.loadingText, { color: theme.colors.muted }]}>
            Loading guests...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Network Status Banner */}
        {isOffline && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineIcon}>📡</Text>
            <Text style={styles.offlineText}>
              You're offline - Changes will sync when online
            </Text>
          </View>
        )}

        {/* Stats Overview */}
        <Card style={[styles.statsCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.statsTitle, { color: theme.colors.text }]}>Guest Overview</Text>
          <View style={styles.statsGrid}>
            <StatItem
              label="Visitors Today"
              value={stats.active}
              color="#10b981"
              icon={<MaterialIcons name="waving-hand" size={16} color="#10b981" />}
              theme={theme}
            />
            <StatItem
              label="Scheduled"
              value={stats.scheduled}
              color="#3b82f6"
              icon={<MaterialIcons name="calendar-today" size={16} color="#3b82f6" />}
              theme={theme}
            />
            <StatItem
              label="Total"
              value={stats.total}
              color="#6b7280"
              icon={<MaterialIcons name="people" size={16} color="#6b7280" />}
              theme={theme}
            />
          </View>
        </Card>

        {/* Tab Navigation */}
        <View style={[styles.tabContainer, { backgroundColor: theme.colors.card }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'scheduled' && styles.activeTab,
              { backgroundColor: activeTab === 'scheduled' ? theme.colors.primary + '20' : 'transparent' }
            ]}
            onPress={() => handleTabChange('scheduled')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'scheduled' ? theme.colors.primary : theme.colors.muted }
              ]}
            >
              Scheduled Guests
            </Text>
            <Text style={[styles.tabCount, { color: theme.colors.muted }]}>
              {stats.active + stats.scheduled}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'history' && styles.activeTab,
              { backgroundColor: activeTab === 'history' ? theme.colors.primary + '20' : 'transparent' }
            ]}
            onPress={() => handleTabChange('history')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'history' ? theme.colors.primary : theme.colors.muted }
              ]}
            >
              History
            </Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={[styles.errorContainer]}>
            <MaterialIcons name="error" size={48} color="#ef4444" />
            <Text style={[styles.errorText, { color: theme.colors.text }]}>
              {error}
            </Text>
            <Button onPress={() => loadGuests()}>Retry</Button>
          </View>
        ) : guests.length === 0 ? (
          <View style={[styles.emptyState]}>
            <MaterialIcons name="people" size={64} color={theme.colors.muted} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              {activeTab === 'scheduled' ? 'No Scheduled Guests' : 'No Guest History'}
            </Text>
            <Text style={[styles.emptyText, { color: theme.colors.muted }]}>
              {activeTab === 'scheduled'
                ? 'Schedule your first guest to generate a QR code for gate access'
                : 'Your guest visit history will appear here'}
            </Text>
            {activeTab === 'scheduled' && (
              <Button onPress={handleAddGuest}>Add First Guest</Button>
            )}
          </View>
        ) : (
          <>
            <View style={styles.guestList}>
              {guests.map((guest, index) => renderGuestItem(guest, index))}
            </View>

            {/* Load More Button */}
            {hasMore && (
              <View style={styles.loadMoreContainer}>
                <Button
                  variant="outline"
                  onPress={handleLoadMore}
                  loading={isLoadingMore}
                  disabled={isLoadingMore}
                  style={styles.loadMoreButton}
                >
                  Load More Guests
                </Button>
              </View>
            )}

            {/* End of List Indicator */}
            {!hasMore && guests.length > 0 && (
              <View style={styles.endListContainer}>
                <View style={styles.endListLine} />
                <Text style={[styles.endListText, { color: theme.colors.muted }]}>
                  End of list • {guests.length} guests
                </Text>
                <View style={styles.endListLine} />
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      {activeTab === 'scheduled' && (
        <FAB icon="add" onPress={handleAddGuest} style={styles.fab} />
      )}

      {/* Guest Creation Modal */}
      <Modal
        visible={showGuestForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowGuestForm(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.colors.card }]}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowGuestForm(false)}
            >
              <MaterialIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Schedule Guest Visit
            </Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView
            style={styles.formContainer}
            showsVerticalScrollIndicator={false}
          >
            <GuestScheduleForm
              onSubmit={handleGuestFormSubmit}
              isSubmitting={isSubmittingGuest}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* QR Code Modal */}
      {showQRModal && selectedGuest && (
        <Modal
          visible={showQRModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={handleCloseQRModal}
        >
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Guest Access Pass
            </Text>
          </View>

          <ScrollView
            style={styles.formContainer}
            showsVerticalScrollIndicator={false}
          >

            {/* Guest Info Card */}
            <View style={[styles.guestCard, { backgroundColor: theme.colors.card }]}>
              <View style={styles.guestHeader}>
                <View style={[styles.guestAvatar, { backgroundColor: theme.colors.primary + '15' }]}>
                  <MaterialIcons name="person" size={32} color={theme.colors.primary} />
                </View>
                <View style={styles.guestInfoSection}>
                  <Text style={[styles.guestName, { color: theme.colors.text }]}>
                    {selectedGuest.guest_name || 'Unknown Guest'}
                  </Text>
                  <Text style={[styles.guestPurpose, { color: theme.colors.muted }]}>
                    {selectedGuest.purpose || 'Guest Visit'}
                  </Text>
                </View>
              </View>
              <View style={styles.passIdContainer}>
                <MaterialIcons name="qr-code-2" size={16} color={theme.colors.primary} />
                <Text style={[styles.accessCode, { color: theme.colors.primary }]}>
                  {selectedGuest.pass_id || 'ERROR'}
                </Text>
              </View>
            </View>

            {/* QR Code Display */}
            <View style={[styles.qrCodeDisplay, { backgroundColor: '#ffffff' }]}>
              <QRCode
                value={generateQRCodeData(selectedGuest)}
                size={Math.min(220, Math.max(160, (screenWidth || 400) * 0.45))} // Responsive: 45% of screen width, between 160-220px
                color="#000000"
                backgroundColor="#FFFFFF"
              />
            </View>


            {/* Visit Details */}
            <View style={styles.visitDetails}>
              <View style={styles.detailItem}>
                <MaterialIcons name="event" size={18} color={theme.colors.primary} />
                <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                  {formatDate(selectedGuest.arrival_date || new Date().toISOString())}
                </Text>
              </View>

              {selectedGuest.vehicle_plate && (
                <View style={styles.detailItem}>
                  <MaterialIcons name="directions-car" size={18} color={theme.colors.primary} />
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                    {selectedGuest.vehicle_plate}
                  </Text>
                </View>
              )}

              {selectedGuest.guest_phone && (
                <View style={styles.detailItem}>
                  <MaterialIcons name="phone" size={18} color={theme.colors.primary} />
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                    {selectedGuest.guest_phone}
                  </Text>
                </View>
              )}
            </View>

            {/* Status Badge */}
            <View style={styles.statusContainer}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(selectedGuest) }
                ]}
              >
                <Text style={styles.statusText}>
                  {selectedGuest.uiStatus?.status || 'SCHEDULED'}
                </Text>
              </View>
            </View>

            {/* Close Button */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleCloseQRModal}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
      )}
    </View>
  );
};

// Helper Components
const StatItem: React.FC<{
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
  theme: any;
}> = ({ label, value, color, icon, theme }) => (
  <View style={styles.statItem}>
    <View style={[styles.statIconContainer, { backgroundColor: `${color}20` }]}>
      {icon}
    </View>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={[styles.statLabel, { color: theme.colors.muted }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  scrollView: {
    flex: 1,
  },
  offlineBanner: {
    backgroundColor: '#fef3c7',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  offlineIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  offlineText: {
    fontSize: 14,
    color: '#92400e',
    flex: 1,
  },
  statsCard: {
    margin: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
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
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  activeTab: {
    // backgroundColor will be set dynamically
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  tabCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  guestList: {
    padding: 16,
    gap: 12,
  },
  guestItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activeGuestItem: {
    borderWidth: 2,
    borderColor: '#10b981',
    shadowColor: '#10b981',
    shadowOpacity: 0.1,
    elevation: 4,
  },
  guestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  guestInfo: {
    flex: 1,
    marginRight: 12,
  },
  guestNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  guestName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b98120',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  activeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
  },
  guestRelationship: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  guestDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  accessCodeContainer: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f9ff',
  },
  accessCodeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0369a1',
  },
  qrCodeContainer: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCodeLabel: {
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  qrCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
    marginTop: 8,
  },
  qrCodeButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalContent: {
    borderRadius: 20,
    padding: 0,
    width: '100%',
    maxWidth: 380,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: 0,
  },
  modalHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  modalContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  placeholder: {
    width: 40,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  guestCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  guestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  guestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  guestInfoSection: {
    flex: 1,
  },
  guestPurpose: {
    fontSize: 13,
    opacity: 0.7,
    marginBottom: 2,
  },
  accessCode: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  visitDetails: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  statusContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadMoreContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadMoreButton: {
    width: '100%',
  },
  endListContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  endListLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  endListText: {
    fontSize: 12,
    paddingHorizontal: 16,
    fontWeight: '500',
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  modalTitleSection: {
    flex: 1,
    alignItems: 'center',
  },
  modalTitleText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
    textAlign: 'center',
    opacity: 0.7,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  qrCodeDisplay: {
    marginHorizontal: 8,
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 16,
  },
  qrCodeWrapper: {
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  qrCodeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCodeLogo: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    marginHorizontal: 0,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
});

export default GuestListScreen;