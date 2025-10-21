import React, { useState, useEffect, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  showOfflineBanner?: boolean;
  onRetry?: () => void;
}

interface NetworkState {
  isConnected: boolean;
  connectionType: string | null;
  isInternetReachable: boolean | null;
}

export const NetworkAware: React.FC<Props> = ({
  children,
  fallback,
  showOfflineBanner = true,
  onRetry,
}) => {
  const netInfo = useNetInfo();

  const networkState: NetworkState = {
    isConnected: netInfo.isConnected ?? false,
    connectionType: netInfo.type,
    isInternetReachable: netInfo.isInternetReachable,
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    }
  };

  const getConnectionIcon = () => {
    if (!networkState.isConnected) {
      return 'signal-wifi-off';
    }

    switch (networkState.connectionType) {
      case 'wifi':
        return 'wifi';
      case 'cellular':
        return 'signal-cellular-4-bar';
      case 'ethernet':
        return 'settings-ethernet';
      case 'bluetooth':
        return 'bluetooth';
      default:
        return 'signal-wifi-statusbar-connected';
    }
  };

  const getConnectionColor = () => {
    if (!networkState.isConnected) {
      return '#ef4444';
    }

    if (networkState.isInternetReachable === false) {
      return '#f59e0b';
    }

    return '#10b981';
  };

  if (!networkState.isConnected && fallback) {
    return <>{fallback}</>;
  }

  if (!networkState.isConnected) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <MaterialIcons
            name={getConnectionIcon() as any}
            size={64}
            color={getConnectionColor()}
          />
          <Text style={styles.title}>No Internet Connection</Text>
          <Text style={styles.message}>
            Please check your internet connection and try again.
          </Text>
          <Text style={styles.subMessage}>
            Connection type: {networkState.connectionType || 'Unknown'}
          </Text>

          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <MaterialIcons name="refresh" size={20} color="#ffffff" style={styles.retryIcon} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (networkState.isInternetReachable === false) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <MaterialIcons
            name="wifi-off"
            size={64}
            color="#f59e0b"
          />
          <Text style={styles.title}>Limited Connection</Text>
          <Text style={styles.message}>
            You're connected to a network but the internet appears to be unreachable.
          </Text>

          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <MaterialIcons name="refresh" size={20} color="#ffffff" style={styles.retryIcon} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <>
      {showOfflineBanner && !networkState.isConnected && (
        <View style={styles.offlineBanner}>
          <MaterialIcons name="signal-wifi-off" size={20} color="#ffffff" />
          <Text style={styles.offlineText}>You're offline. Some features may be limited.</Text>
        </View>
      )}
      {showOfflineBanner && networkState.isInternetReachable === false && (
        <View style={[styles.offlineBanner, styles.limitedBanner]}>
          <MaterialIcons name="wifi-off" size={20} color="#ffffff" />
          <Text style={styles.offlineText}>Limited internet connection.</Text>
        </View>
      )}
      {children}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  subMessage: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryIcon: {
    marginRight: 8,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    padding: 12,
    paddingHorizontal: 16,
  },
  limitedBanner: {
    backgroundColor: '#f59e0b',
  },
  offlineText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
});

export default NetworkAware;