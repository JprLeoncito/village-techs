import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSyncStatus } from '../../services/sync/SyncService';
import { StatusIndicator } from '../ui/StatusIndicator';

export const OfflineIndicator = () => {
  const syncStatus = useSyncStatus();

  if (syncStatus.isOnline && syncStatus.totalCount === 0) {
    return null; // Don't show indicator when online and synced
  }

  const getStatusText = () => {
    if (!syncStatus.isOnline) {
      return 'Offline';
    }

    if (syncStatus.isSyncing) {
      return 'Syncing...';
    }

    if (syncStatus.pendingCount > 0) {
      return `${syncStatus.pendingCount} pending`;
    }

    if (syncStatus.failedCount > 0) {
      return `${syncStatus.failedCount} failed`;
    }

    return 'Synced';
  };

  const getStatusType = () => {
    if (!syncStatus.isOnline) {
      return 'offline';
    }

    if (syncStatus.isSyncing) {
      return 'syncing';
    }

    if (syncStatus.failedCount > 0) {
      return 'error';
    }

    if (syncStatus.pendingCount > 0) {
      return 'warning';
    }

    return 'success';
  };

  const showCriticalWarning = syncStatus.criticalCount > 0;

  return (
    <View style={styles.container}>
      <View style={[
        styles.indicator,
        !syncStatus.isOnline && styles.offlineIndicator,
        showCriticalWarning && styles.criticalIndicator
      ]}>
        <StatusIndicator
          status={getStatusType() as any}
          size="small"
        />
        <Text style={[
          styles.text,
          !syncStatus.isOnline && styles.offlineText,
          showCriticalWarning && styles.criticalText
        ]}>
          {getStatusText()}
        </Text>

        {showCriticalWarning && (
          <Icon name="alert" size={16} color="#ef4444" style={styles.alertIcon} />
        )}
      </View>

      {showCriticalWarning && (
        <Text style={styles.criticalMessage}>
          Critical items pending sync
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  offlineIndicator: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  criticalIndicator: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 6,
  },
  offlineText: {
    color: '#dc2626',
  },
  criticalText: {
    color: '#dc2626',
  },
  alertIcon: {
    marginLeft: 6,
  },
  criticalMessage: {
    fontSize: 10,
    color: '#dc2626',
    marginTop: 2,
    textAlign: 'center',
  },
});