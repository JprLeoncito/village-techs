import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSyncStatus } from '@/services/sync/SyncService';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { useThemeColor } from '@/hooks/useThemeColor';

export const SyncStatus = () => {
  const syncStatus = useSyncStatus();
  const textColor = useThemeColor('text');

  const formatLastSyncTime = (timestamp: number | null) => {
    if (!timestamp) return 'Never';

    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  if (syncStatus.totalCount === 0 && syncStatus.isOnline) {
    return (
      <View style={styles.container}>
        <Text style={[styles.statusText, { color: textColor }]}>
          All data synced
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <StatusIndicator
          status={syncStatus.isOnline ? 'success' : 'offline'}
          size="small"
        />
        <Text style={[styles.statusText, { color: textColor }]}>
          {syncStatus.isOnline ? 'Online' : 'Offline'}
        </Text>

        {syncStatus.isSyncing && (
          <StatusIndicator status="syncing" size="small" />
        )}
      </View>

      {syncStatus.totalCount > 0 && (
        <View style={styles.queueInfo}>
          <Text style={[styles.queueText, { color: textColor }]}>
            Queue: {syncStatus.pendingCount} pending, {syncStatus.failedCount} failed
          </Text>

          {syncStatus.criticalCount > 0 && (
            <Text style={styles.criticalText}>
              {syncStatus.criticalCount} critical items
            </Text>
          )}
        </View>
      )}

      <View style={styles.lastSync}>
        <Text style={[styles.lastSyncText, { color: textColor }]}>
          Last sync: {formatLastSyncTime(syncStatus.lastSyncTime)}
        </Text>

        {syncStatus.totalCount > 0 && (
          <TouchableOpacity
            style={styles.syncButton}
            onPress={() => {
              syncStatus.forceSync().catch(console.error);
            }}
          >
            <Icon name="refresh" size={16} color={useThemeColor('primary')} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    margin: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  queueInfo: {
    marginBottom: 8,
  },
  queueText: {
    fontSize: 12,
    marginBottom: 2,
  },
  criticalText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
  },
  lastSync: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastSyncText: {
    fontSize: 12,
    opacity: 0.7,
  },
  syncButton: {
    padding: 4,
  },
});