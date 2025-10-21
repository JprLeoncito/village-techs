import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { StatusIndicator } from '../../components/ui/StatusIndicator';
import { Header } from '../../components/shared/Header';

export const GateMonitoringScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();

  // Helper function to check if user is security head
  const isSecurityHead = user?.role === 'security_head';

  const textStyles = {
    title: [styles.title, { color: theme.colors.text }],
    subtitle: [styles.subtitle, { color: theme.colors.muted }],
    sectionTitle: [styles.sectionTitle, { color: theme.colors.text }],
    cardTitle: [styles.cardTitle, { color: theme.colors.text }],
    cardSubtitle: [styles.cardSubtitle, { color: theme.colors.muted }],
    statsText: [styles.statsText, { color: theme.colors.text }],
    emptyText: [styles.emptyText, { color: theme.colors.muted }],
  };

  const handleProfilePress = () => {
    // Profile screen not implemented yet
    console.log('Profile screen not implemented');
  };

  // Real data will be fetched from API
  const recentEntries = [];

  const stats = {
    totalEntries: 0,
    residentEntries: 0,
    guestEntries: 0,
    deliveries: 0,
    incidents: 0,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title="Gate Monitoring"
        subtitle="Main Gate • Active"
        rightAction={{
          icon: 'account',
          onPress: handleProfilePress,
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard} padding={16}>
            <View style={styles.statItem}>
              <Icon name="door-open" size={24} color={theme.colors.primary} />
              <Text style={textStyles.statsText}>{stats.totalEntries}</Text>
              <Text style={textStyles.cardSubtitle}>Total Entries</Text>
            </View>
          </Card>

          <Card style={styles.statCard} padding={16}>
            <View style={styles.statItem}>
              <Icon name="account-group" size={24} color={theme.colors.success} />
              <Text style={textStyles.statsText}>{stats.residentEntries}</Text>
              <Text style={textStyles.cardSubtitle}>Residents</Text>
            </View>
          </Card>

          <Card style={styles.statCard} padding={16}>
            <View style={styles.statItem}>
              <Icon name="account-multiple" size={24} color={theme.colors.warning} />
              <Text style={textStyles.statsText}>{stats.guestEntries}</Text>
              <Text style={textStyles.cardSubtitle}>Guests</Text>
            </View>
          </Card>

          <Card style={styles.statCard} padding={16}>
            <View style={styles.statItem}>
              <Icon name="package" size={24} color={theme.colors.notification} />
              <Text style={textStyles.statsText}>{stats.deliveries}</Text>
              <Text style={textStyles.cardSubtitle}>Deliveries</Text>
            </View>
          </Card>
        </View>

        {/* Recent Activity */}
        <Card style={styles.recentActivityCard} padding={20}>
          <View style={styles.sectionHeader}>
            <Text style={textStyles.sectionTitle}>Recent Activity</Text>
            <StatusIndicator status="online" size="small" />
          </View>

          {recentEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="clipboard-text" size={48} color={theme.colors.muted} />
              <Text style={textStyles.emptyText}>No gate activity today</Text>
              <Text style={[textStyles.cardSubtitle, { textAlign: 'center', marginTop: 8 }]}>
                Real-time data will appear here once connected
              </Text>
            </View>
          ) : (
            <View style={styles.entriesList}>
              {recentEntries.map((entry) => (
                <View key={entry.id} style={styles.entryItem}>
                  <View style={styles.entryInfo}>
                    <View style={styles.entryHeader}>
                      <Badge
                        title={entry.type}
                        variant={entry.type === 'resident' ? 'success' : entry.type === 'guest' ? 'warning' : 'primary'}
                        size="small"
                      />
                      <Text style={textStyles.cardSubtitle}>{entry.timestamp}</Text>
                    </View>
                    <Text style={textStyles.cardTitle}>{entry.vehicle}</Text>
                    <Text style={textStyles.cardSubtitle}>Officer: {entry.officer}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <Button
            title="View Full Activity Log"
            variant="outline"
            icon={<Icon name="history" size={20} color={theme.colors.primary} />}
            style={styles.viewAllButton}
          />
        </Card>

        {/* Security Actions (Security Head Only) */}
        {isSecurityHead && (
          <Card style={styles.actionsCard} padding={20}>
            <Text style={textStyles.sectionTitle}>Security Actions</Text>

            <View style={styles.actionsGrid}>
              <Button
                title="Broadcast Alert"
                onPress={() => navigation.navigate('BroadcastAlert' as never)}
                variant="danger"
                icon={<Icon name="alert" size={20} color="#ffffff" />}
                style={styles.actionButton}
              />

              <Button
                title="Shift Report"
                onPress={() => navigation.navigate('ShiftReport' as never)}
                variant="secondary"
                icon={<Icon name="file-chart" size={20} color="#ffffff" />}
                style={styles.actionButton}
              />
            </View>
          </Card>
        )}

        {/* Connection Status */}
        <Card style={styles.statusCard} padding={16}>
          <View style={styles.statusRow}>
            <View style={styles.statusInfo}>
              <Text style={textStyles.cardTitle}>Connection Status</Text>
              <Text style={textStyles.cardSubtitle}>Real-time sync active</Text>
            </View>
            <StatusIndicator status="success" size="small" />
          </View>
        </Card>

        {/* Officer Info */}
        <Card style={styles.officerCard} padding={16}>
          <View style={styles.officerInfo}>
            <Icon name="account" size={20} color={theme.colors.muted} />
            <View style={styles.officerDetails}>
              <Text style={textStyles.cardTitle}>{user?.email}</Text>
              <Text style={textStyles.cardSubtitle}>
                {user?.role === 'security_head' ? 'Security Head' : 'Security Officer'}
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statsText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 14,
  },
  recentActivityCard: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  entriesList: {
    gap: 16,
  },
  entryItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  entryInfo: {
    gap: 4,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewAllButton: {
    marginTop: 16,
  },
  actionsCard: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  actionsGrid: {
    gap: 12,
  },
  actionButton: {
    marginBottom: 8,
  },
  statusCard: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusInfo: {
    flex: 1,
  },
  officerCard: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  officerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  officerDetails: {
    flex: 1,
  },
});

export default GateMonitoringScreen;