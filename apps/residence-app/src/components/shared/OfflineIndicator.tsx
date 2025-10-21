import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import networkStatus from '../../lib/networkStatus';
import syncQueueService from '../../services/syncQueue';


import { MaterialIcons } from '@expo/vector-icons';interface SyncStatus {
  status: 'offline' | 'syncing' | 'synced' | 'error';
  pendingItems: number;
  lastSync?: Date;
  error?: string;
}

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    status: 'synced',
    pendingItems: 0,
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const slideAnim = useState(new Animated.Value(-100))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    // Check initial network status
    setIsOnline(networkStatus.isConnected());

    // Subscribe to network changes
    const unsubscribe = networkStatus.addListener((connected) => {
      setIsOnline(connected);

      if (connected) {
        setSyncStatus(prev => ({ ...prev, status: 'syncing' }));
        checkSyncStatus();
      } else {
        setSyncStatus(prev => ({ ...prev, status: 'offline' }));
      }
    });

    // Check sync status periodically
    const interval = setInterval(() => {
      checkSyncStatus();
    }, 10000); // Every 10 seconds

    // Initial check
    checkSyncStatus();

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    // Animate indicator in/out based on online status
    if (!isOnline || syncStatus.pendingItems > 0) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Start pulse animation for syncing
      if (syncStatus.status === 'syncing') {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.2,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        ).start();
      } else {
        pulseAnim.setValue(1);
      }
    } else {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isOnline, syncStatus, slideAnim, pulseAnim]);

  const checkSyncStatus = async () => {
    try {
      const queueStatus = await syncQueueService.getQueueStatus();

      setSyncStatus({
        status: !queueStatus.isOnline
          ? 'offline'
          : queueStatus.isProcessing
          ? 'syncing'
          : queueStatus.total > 0
          ? 'error'
          : 'synced',
        pendingItems: queueStatus.total,
        lastSync: new Date(),
        error: queueStatus.failed > 0 ? `${queueStatus.failed} items failed to sync` : undefined,
      });
    } catch (error) {
      console.error('Error checking sync status:', error);
    }
  };

  const handleRetrySync = async () => {
    setSyncStatus(prev => ({ ...prev, status: 'syncing' }));
    await syncQueueService.retryFailed();
    await checkSyncStatus();
  };

  const getStatusColor = () => {
    switch (syncStatus.status) {
      case 'offline':
        return '#ef4444'; // red
      case 'syncing':
        return '#f59e0b'; // amber
      case 'error':
        return '#dc2626'; // dark red
      case 'synced':
        return '#10b981'; // green
      default:
        return '#6b7280'; // gray
    }
  };

  const getStatusText = () => {
    switch (syncStatus.status) {
      case 'offline':
        return 'Offline';
      case 'syncing':
        return `Syncing ${syncStatus.pendingItems} items...`;
      case 'error':
        return 'Sync Error';
      case 'synced':
        return 'All changes saved';
      default:
        return '';
    }
  };

  const getStatusIcon = () => {
    switch (syncStatus.status) {
      case 'offline':
        return <MaterialIcons name="signal-cellular-off" size={16} color="#ef4444" />;
      case 'syncing':
        return <MaterialIcons name="refresh" size={16} color="#3b82f6" />;
      case 'error':
        return <MaterialIcons name="warning" size={16} color="#f59e0b" />;
      case 'synced':
        return <MaterialIcons name="check-circle" size={16} color="#10b981" />;
      default:
        return '';
    }
  };

  if (isOnline && syncStatus.status === 'synced' && syncStatus.pendingItems === 0) {
    return null; // Don't show when everything is synced
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          backgroundColor: getStatusColor(),
        },
      ]}
    >
      <TouchableOpacity
        style={styles.mainContent}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.8}
      >
        <View style={styles.statusRow}>
          <Animated.View
            style={{
              transform: [{ scale: pulseAnim }],
            }}
          >
            <Text style={styles.icon}>{getStatusIcon()}</Text>
          </Animated.View>

          <Text style={styles.statusText}>{getStatusText()}</Text>

          {syncStatus.status === 'syncing' && (
            <ActivityIndicator size="small" color="#ffffff" style={styles.spinner} />
          )}

          {syncStatus.status === 'error' && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetrySync}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.expandedContent}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Network:</Text>
            <Text style={styles.detailValue}>
              {isOnline ? `Online (${networkStatus.getNetworkType()})` : 'No connection'}
            </Text>
          </View>

          {syncStatus.pendingItems > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Pending:</Text>
              <Text style={styles.detailValue}>{syncStatus.pendingItems} items</Text>
            </View>
          )}

          {syncStatus.lastSync && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Last sync:</Text>
              <Text style={styles.detailValue}>
                {syncStatus.lastSync.toLocaleTimeString()}
              </Text>
            </View>
          )}

          {syncStatus.error && (
            <View style={styles.errorRow}>
              <Text style={styles.errorText}>{syncStatus.error}</Text>
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: 50, // Account for status bar
  },
  mainContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  spinner: {
    marginLeft: 8,
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  detailLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  detailValue: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  errorRow: {
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 4,
  },
  errorText: {
    color: '#ffffff',
    fontSize: 12,
  },
});

export default OfflineIndicator;