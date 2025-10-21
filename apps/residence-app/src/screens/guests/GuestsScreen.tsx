import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { FAB } from '../../components/ui/FAB';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import GuestList from '../../components/guests/GuestList';
import GuestScheduleForm from '../../components/guests/GuestScheduleForm';
import GuestQRCodeDisplay from '../../components/guests/GuestQRCodeDisplay';
import guestService, { GuestFormData } from '../../services/guestService';
import networkStatus from '../../lib/networkStatus';
import { useAuth } from '../../contexts/AuthContext';
import realtimeService from '../../lib/realtime';

import { MaterialIcons } from '@expo/vector-icons';interface Guest {
  id: string;
  guestName: string;
  guestPhone: string;
  vehiclePlate?: string;
  purpose: string;
  visitType: 'day-trip' | 'multi-day';
  arrivalDate: Date;
  departureDate?: Date;
  status: 'scheduled' | 'active' | 'expired' | 'cancelled' | 'checked_in' | 'checked_out';
  passId?: string;
  qrCode?: string;
}

type ScreenMode = 'list' | 'schedule' | 'edit' | 'qr';

export const GuestsScreen: React.FC = () => {
  const { householdId } = useAuth();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [screenMode, setScreenMode] = useState<ScreenMode>('list');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'scheduled' | 'history'>('scheduled');
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    checkNetworkStatus();
    const unsubscribe = networkStatus.addListener((connected) => {
      setIsOffline(!connected);
      if (connected) {
        loadGuests(); // Refresh when coming online
      }
    });

    return () => {
      networkStatus.removeListener(unsubscribe);
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadGuests();
    }, [])
  );

  // Set up real-time guest status updates
  useEffect(() => {
    if (!householdId) return;

    // Subscribe to real-time guest updates
    const unsubscribeRealtime = realtimeService.subscribeGuestUpdates(
      householdId,
      (update) => {
        if (update.type === 'subscription_info') {
          // Handle subscription status silently - no need to log
          return; // Don't reload data for subscription info
        }

        // Only log actual guest updates, not subscription status
        // console.log('Real-time guest update:', update);
        // Reload guests when any change occurs
        loadGuests();
      }
    );

    // Set up periodic status updates (backup and more reliable than WebSocket)
    const interval = setInterval(() => {
      guestService.updateExpiredGuests().catch(error => {
        console.error('Periodic guest status update failed:', error);
      });
    }, 60000); // 1 minute - more frequent for better real-time experience

    return () => {
      unsubscribeRealtime();
      clearInterval(interval);
    };
  }, [householdId]);

  const checkNetworkStatus = () => {
    setIsOffline(!networkStatus.isConnected());
  };

  const loadGuests = async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      if (!householdId) {
        throw new Error('No household ID found');
      }

      // Update expired guest statuses first
      await guestService.updateExpiredGuests();

      const filter = activeTab === 'scheduled' ? 'scheduled' : undefined;
      const data = await guestService.getGuests(householdId, filter);

      // Process guests - database status is already correct
      const processedGuests = data.map(guest => ({
        ...guest,
        arrivalDate: new Date(guest.arrival_date),
        departureDate: guest.departure_date ? new Date(guest.departure_date) : undefined,
      }));

      // Sort by arrival date
      processedGuests.sort((a, b) =>
        new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime()
      );

      setGuests(processedGuests);
    } catch (error) {
      console.error('Failed to load guests:', error);
      Alert.alert('Error', 'Failed to load guests');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleScheduleNewGuest = () => {
    setSelectedGuest(null);
    setScreenMode('schedule');
  };

  const handleEditGuest = (guest: Guest) => {
    if (guest.status === 'arrived' || guest.status === 'departed') {
      Alert.alert('Cannot Edit', 'This guest visit cannot be edited');
      return;
    }

    setSelectedGuest(guest);
    setScreenMode('edit');
  };

  const handleCancelGuest = async (guest: Guest) => {
    try {
      setIsSubmitting(true);
      const result = await guestService.cancelGuest(guest.id);

      if (result.success) {
        Alert.alert('Success', 'Guest visit has been cancelled');
        loadGuests();
      } else {
        Alert.alert('Error', result.error || 'Failed to cancel guest');
      }
    } catch (error) {
      console.error('Failed to cancel guest:', error);
      Alert.alert('Error', 'Failed to cancel guest');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShowQRCode = async (guest: Guest) => {
    setSelectedGuest(guest);
    setShowQRModal(true);
  };

  const handleGuestSubmit = async (formData: GuestFormData) => {
    setIsSubmitting(true);

    try {
      let result;
      if (screenMode === 'edit' && selectedGuest) {
        result = await guestService.editGuest(selectedGuest.id, formData);
      } else {
        result = await guestService.scheduleGuest(formData);
      }

      if (result.success) {
        const successMessage = screenMode === 'edit'
          ? 'Guest visit has been updated'
          : 'Guest has been scheduled successfully';

        Alert.alert(
          'Success',
          successMessage,
          [
            {
              text: 'OK',
              onPress: () => {
                setScreenMode('list');
                loadGuests();

                // Show QR code for new guest
                if (screenMode === 'schedule' && result.qrCode) {
                  setTimeout(() => {
                    setSelectedGuest({
                      id: result.guestId!,
                      ...formData,
                      status: 'scheduled',
                      passId: result.passId,
                      qrCode: result.qrCode,
                    });
                    setShowQRModal(true);
                  }, 500);
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to save guest');
      }
    } catch (error) {
      console.error('Failed to save guest:', error);
      Alert.alert('Error', 'Failed to save guest');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegenerateQRCode = async () => {
    if (!selectedGuest) return;

    try {
      const result = await guestService.getGuestQRCode(selectedGuest.id);

      if (result.success) {
        Alert.alert('Success', 'QR code has been regenerated');
        loadGuests();
      } else {
        Alert.alert('Error', result.error || 'Failed to regenerate QR code');
      }
    } catch (error) {
      console.error('Failed to regenerate QR code:', error);
      Alert.alert('Error', 'Failed to regenerate QR code');
    }
  };

  const getGuestStats = () => {
    const activeGuests = guests.filter(guest => {
      const uiStatus = guestService.getUIGuestStatus(guest);
      return uiStatus.status === 'ACTIVE';
    });

    const upcomingGuests = guests.filter(guest => {
      const uiStatus = guestService.getUIGuestStatus(guest);
      return uiStatus.status === 'SCHEDULED';
    });

    return {
      active: activeGuests.length,
      upcoming: upcomingGuests.length,
      total: guests.length,
    };
  };

  const stats = getGuestStats();

  const renderContent = () => {
    switch (screenMode) {
      case 'schedule':
      case 'edit':
        return (
          <View style={styles.formContainer}>
            <View style={styles.formHeader}>
              <Button
                variant="ghost"
                onPress={() => setScreenMode('list')}
                style={styles.backButton}
              >
                ← Back
              </Button>
              <Text style={styles.formTitle}>
                {screenMode === 'edit' ? 'Edit Guest' : 'Schedule New Guest'}
              </Text>
            </View>

            <GuestScheduleForm
              onSubmit={handleGuestSubmit}
              isSubmitting={isSubmitting}
              defaultValues={selectedGuest ? {
                guestName: selectedGuest.guestName,
                guestPhone: selectedGuest.guestPhone,
                vehiclePlate: selectedGuest.vehiclePlate,
                purpose: selectedGuest.purpose,
                visitType: selectedGuest.visitType,
                arrivalDate: selectedGuest.arrivalDate,
                departureDate: selectedGuest.departureDate,
              } : undefined}
            />
          </View>
        );

      default:
        return (
          <ScrollView
            style={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => loadGuests(true)}
                colors={['#10b981']}
              />
            }
            showsVerticalScrollIndicator={false}
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
            <Card style={styles.statsCard}>
              <Text style={styles.statsTitle}>Guest Overview</Text>
              <View style={styles.statsGrid}>
                <StatItem
                  label="Visitors Today"
                  value={stats.active}
                  color="#10b981"
                  icon=<MaterialIcons name="waving-hand" size={16} color="#10b981" />
                />
                <StatItem
                  label="Upcoming"
                  value={stats.upcoming}
                  color="#3b82f6"
                  icon=<MaterialIcons name="calendar-today" size={16} color="#3b82f6" />
                />
                <StatItem
                  label="Total"
                  value={stats.total}
                  color="#6b7280"
                  icon=<MaterialIcons name="people" size={16} color="#6b7280" />
                />
              </View>
            </Card>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'scheduled' && styles.activeTab,
                ]}
                onPress={() => setActiveTab('scheduled')}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'scheduled' && styles.activeTabText,
                  ]}
                >
                  Scheduled Guests
                </Text>
                <Badge
                  size="sm"
                  variant={activeTab === 'scheduled' ? 'primary' : 'neutral'}
                >
                  {stats.active + stats.upcoming}
                </Badge>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'history' && styles.activeTab,
                ]}
                onPress={() => setActiveTab('history')}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'history' && styles.activeTabText,
                  ]}
                >
                  History
                </Text>
              </TouchableOpacity>
            </View>

            {/* Guest List */}
            <GuestList
              guests={guests}
              onGuestPress={(guest) => {
                setSelectedGuest(guest);
                handleShowQRCode(guest);
              }}
              onEditPress={handleEditGuest}
              onCancelPress={handleCancelGuest}
              onQRPress={handleShowQRCode}
              isRefreshing={isRefreshing}
              onRefresh={() => loadGuests(true)}
            />

            {/* Empty State */}
            {guests.length === 0 && !isLoading && (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>👥</Text>
                <Text style={styles.emptyTitle}>
                  {activeTab === 'scheduled' ? 'No Scheduled Guests' : 'No Guest History'}
                </Text>
                <Text style={styles.emptyText}>
                  {activeTab === 'scheduled'
                    ? 'Schedule your first guest to generate a QR code for gate access'
                    : 'Your guest visit history will appear here'}
                </Text>
                {activeTab === 'scheduled' && (
                  <Button
                    variant="primary"
                    onPress={handleScheduleNewGuest}
                    style={styles.emptyButton}
                  >
                    Schedule First Guest
                  </Button>
                )}
              </Card>
            )}
          </ScrollView>
        );
    }
  };

  return (
    <View style={styles.container}>
      {renderContent()}

      {/* Floating Action Button */}
      {screenMode === 'list' && activeTab === 'scheduled' && (
        <FAB
          icon="+"
          onPress={handleScheduleNewGuest}
          style={styles.fab}
        />
      )}

      {/* QR Code Modal */}
      {selectedGuest && (
        <GuestQRCodeDisplay
          visible={showQRModal}
          guestId={selectedGuest.id}
          guestName={selectedGuest.guestName}
          vehiclePlate={selectedGuest.vehiclePlate}
          arrivalDate={selectedGuest.arrivalDate}
          departureDate={selectedGuest.departureDate}
          passId={selectedGuest.passId}
          onClose={() => {
            setShowQRModal(false);
            setSelectedGuest(null);
          }}
          onRegenerate={handleRegenerateQRCode}
        />
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
}> = ({ label, value, color, icon }) => (
  <View style={styles.statItem}>
    <View style={[styles.statIconContainer, { backgroundColor: `${color}20` }]}>
      {icon}
    </View>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  listContainer: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
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
    color: '#1f2937',
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
    color: '#6b7280',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#ffffff',
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
    backgroundColor: '#eff6ff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginRight: 8,
  },
  activeTabText: {
    color: '#3b82f6',
  },
  emptyCard: {
    margin: 16,
    alignItems: 'center',
    paddingVertical: 40,
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
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  emptyButton: {
    paddingHorizontal: 24,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
});

export default GuestsScreen;