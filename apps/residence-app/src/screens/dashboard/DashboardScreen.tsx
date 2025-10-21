import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Icons, IconSizes, IconColors } from '../../constants/icons';
import networkStatus from '../../lib/networkStatus';
import { stickerService } from '../../services/stickerService';
import { guestService } from '../../services/guestService';
import { useHousehold } from '../../hooks/useHousehold';
import realtimeService from '../../lib/realtime';

interface QuickAction {
  id: string;
  title: string;
  icon: string;
  color: string;
  route: string;
  badge?: number;
}

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, householdId } = useAuth();
  const { household, members } = useHousehold();
  const { theme } = useTheme();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [stats, setStats] = useState({
    activeStickers: 0,
    expiringStickers: 0,
    scheduledGuests: 0,
    pendingFees: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
    checkNetworkStatus();

    const unsubscribe = networkStatus.addListener((connected) => {
      setIsOnline(connected);
    });

    return () => {
      networkStatus.removeListener(unsubscribe);
    };
  }, [householdId, household?.id]);

  // Set up real-time guest status updates
  useEffect(() => {
    const targetHouseholdId = household?.id || householdId;
    if (!targetHouseholdId) return;

    // Subscribe to real-time guest updates
    const unsubscribeRealtime = realtimeService.subscribeGuestUpdates(
      targetHouseholdId,
      (update) => {
        if (update.type === 'subscription_info') {
          // Handle subscription status silently - no need to log
          return; // Don't reload data for subscription info
        }

        // Only log actual guest updates, not subscription status
        // console.log('Real-time dashboard guest update:', update);
        // Reload dashboard data when guest status changes
        loadDashboardData();
      }
    );

    // Set up periodic status updates (backup and more reliable than WebSocket)
    const interval = setInterval(() => {
      guestService.updateExpiredGuests()
        .then(() => {
          loadDashboardData(); // Reload data after updating statuses
        })
        .catch(error => {
          console.error('Periodic guest status update failed:', error);
        });
    }, 60000); // 1 minute - more frequent for better real-time experience

    return () => {
      unsubscribeRealtime();
      clearInterval(interval);
    };
  }, [householdId, household?.id]);

  const checkNetworkStatus = () => {
    setIsOnline(networkStatus.isConnected());
  };

  const loadDashboardData = async () => {
    try {
      if (!householdId) {
        // No household ID found, skipping data load
        // Try to get household ID from household hook
        if (household?.id) {
          // Using household ID from household hook
        } else {
          return;
        }
      }

      const targetHouseholdId = household?.id || householdId;
      // Loading dashboard data

      // Update expired guest statuses first
      await guestService.updateExpiredGuests();

      // Load real sticker data
      const stickers = await stickerService.getStickers(targetHouseholdId);
      // Stickers loaded

      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const activeStickers = stickers.filter(s => s.status === 'active').length;
      // Active stickers counted

      const expiringStickers = stickers.filter(s => {
        if (s.status !== 'active' || !s.expiry_date) return false;
        const expiryDate = new Date(s.expiry_date);
        return expiryDate <= thirtyDaysFromNow && expiryDate > now;
      }).length;
      // Expiring stickers counted

      // Load real guest data using guest service
      const guests = await guestService.getGuests(targetHouseholdId);
      console.log('DEBUG: Guests loaded from service:', guests.length, 'guests');
      if (guests.length > 0) {
        console.log('DEBUG: Sample guest:', guests[0]);
        console.log('DEBUG: Sample guest status:', guestService.getUIGuestStatus(guests[0]));
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      // Date range calculated

      // Count active and scheduled guests using unified status mapping
      const activeGuests = guests.filter(guest => {
        const uiStatus = guestService.getUIGuestStatus(guest);
        return uiStatus.status === 'ACTIVE';
      }).length;

      const scheduledGuests = guests.filter(guest => {
        const uiStatus = guestService.getUIGuestStatus(guest);
        return uiStatus.status === 'SCHEDULED';
      }).length;

      const totalGuests = activeGuests + scheduledGuests;
      console.log('DEBUG: Guest counts:', { activeGuests, scheduledGuests, totalGuests });
      // Guest counts calculated

      // TODO: Load real fee data when fee service is available

      setStats({
        activeStickers,
        expiringStickers,
        scheduledGuests: totalGuests,
        pendingFees: 0, // Will be implemented when fee service is ready
      });

      // Dashboard stats set
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Set default values on error
      setStats({
        activeStickers: 0,
        expiringStickers: 0,
        scheduledGuests: 0,
        pendingFees: 0,
      });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    setIsRefreshing(false);
  };

  const quickActions: QuickAction[] = [
    {
      id: 'vehicles',
      title: 'Vehicles',
      icon: 'directions-car',
      color: '#3b82f6',
      route: 'Vehicles',
    },
    {
      id: 'guests',
      title: 'Guest Management',
      icon: 'people',
      color: '#10b981',
      route: 'GuestList',
    },
    {
      id: 'household',
      title: 'Household',
      icon: 'home',
      color: '#8b5cf6',
      route: 'Household',
    },
  ];

  const renderQuickAction = (action: QuickAction) => {
    const getSubtitle = (id: string) => {
      switch (id) {
        case 'vehicles': return 'Manage & track';
        case 'guests': return 'Register visitors';
        case 'household': return 'Family members';
        default: return '';
      }
    };

    return (
      <TouchableOpacity
        key={action.id}
        style={[styles.actionCard, { backgroundColor: theme.colors.card }]}
        onPress={() => navigation.navigate(action.route as any)}
        activeOpacity={0.7}
      >
        <View style={[styles.actionIcon, { backgroundColor: `${action.color}20` }]}>
          <MaterialIcons
            name={action.icon as any}
            size={32}
            color={action.color}
          />
        </View>
        <Text style={[styles.actionTitle, { color: theme.colors.text }]}>{action.title}</Text>
        <Text style={[styles.actionSubtitle, { color: theme.colors.muted }]}>{getSubtitle(action.id)}</Text>
        {action.badge && action.badge > 0 && (
          <Badge variant="error" size="sm" style={styles.actionBadge}>
            {action.badge}
          </Badge>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Offline Banner */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <MaterialIcons name="signal-wifi-off" size={20} color={IconColors.warning} />
          <Text style={styles.offlineText}>You're offline. Some features may be limited.</Text>
        </View>
      )}

      {/* Welcome Card */}
      <Card style={[styles.welcomeCard, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.welcomeText, { color: theme.colors.muted }]}>Welcome back,</Text>
        <Text style={[styles.userName, { color: theme.colors.text }]}>
          {(() => {
            // Try to get name from household member data first
            const currentUserMember = members?.find(m => m.user_id === user?.id);
            if (currentUserMember?.first_name) {
              return `${currentUserMember.first_name} ${currentUserMember.last_name}`.trim();
            }
            // Fallback to user metadata name or email
            return user?.user_metadata?.name || user?.email || 'Resident';
          })()}
        </Text>
        <Text style={[styles.dateText, { color: theme.colors.muted }]}>{new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}</Text>
      </Card>

      {/* Stats Overview */}
      <View style={styles.statsContainer}>
        <Card style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.statNumber, { color: theme.colors.text }]}>{stats.activeStickers}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.muted }]}>Active Vehicles</Text>
        </Card>
        <Card style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.statNumber, { color: theme.colors.text }]}>{stats.scheduledGuests}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.muted }]}>Scheduled Guests</Text>
        </Card>
      </View>

      {/* Alerts */}
      {stats.expiringStickers > 0 && (
        <Card style={styles.alertCard}>
          <MaterialIcons name="warning" size={24} color={IconColors.warning} />
          <View style={styles.alertContent}>
            <Text style={[styles.alertTitle, { color: theme.colors.text }]}>Vehicle Stickers Expiring Soon</Text>
            <Text style={[styles.alertText, { color: theme.colors.muted }]}>
              You have {stats.expiringStickers} vehicle sticker(s) expiring within 30 days
            </Text>
          </View>
        </Card>
      )}

      {stats.pendingFees > 0 && (
        <Card style={[styles.alertCard, { backgroundColor: '#fef2f2' }]}>
          <MaterialIcons name="account-balance-wallet" size={24} color={IconColors.error} />
          <View style={styles.alertContent}>
            <Text style={[styles.alertTitle, { color: theme.colors.text }]}>Pending Fees</Text>
            <Text style={[styles.alertText, { color: theme.colors.muted }]}>
              You have {stats.pendingFees} unpaid fee(s)
            </Text>
          </View>
        </Card>
      )}

      {/* Quick Actions */}
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {quickActions.map(renderQuickAction)}
      </View>

          {/* Recent Activity - Will be implemented when activity tracking is ready */}
      {false && (
        <Card style={[styles.activityCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.activityHeader}>
            <Text style={[styles.activityTitle, { color: theme.colors.text }]}>Recent Activity</Text>
            <TouchableOpacity onPress={() => {}}>
              <Text style={styles.viewAllButton}>View All</Text>
            </TouchableOpacity>
          </View>
          <Text style={[{ textAlign: 'center', color: theme.colors.muted, padding: 20 }]}>
            Activity tracking will be available soon
          </Text>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  offlineBanner: {
    backgroundColor: '#fef3c7',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  offlineIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  offlineText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    fontWeight: '500',
  },
  welcomeCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
  },
  welcomeText: {
    fontSize: 16,
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  alertCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  alertIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginBottom: 24,
    gap: 8,
  },
  actionCard: {
    width: '48%',
    borderRadius: 16,
    padding: 20,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
  },
  actionIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  actionIconText: {
    fontSize: 32,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  actionBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  activityCard: {
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  viewAllButton: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  activityIcon: {
    fontSize: 24,
    marginRight: 16,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 13,
  },
  activityTime: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default DashboardScreen;