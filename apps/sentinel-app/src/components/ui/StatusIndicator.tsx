import React from 'react';
import { View, StyleSheet } from 'react-native';

export interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'syncing' | 'error' | 'success' | 'warning';
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  label?: string;
}

export const StatusIndicator = ({
  status,
  size = 'medium',
  showLabel = false,
  label,
}: StatusIndicatorProps) => {
  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return '#22c55e';
      case 'offline':
        return '#6b7280';
      case 'syncing':
        return '#3b82f6';
      case 'error':
        return '#ef4444';
      case 'success':
        return '#22c55e';
      case 'warning':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          width: 8,
          height: 8,
          borderRadius: 4,
        };
      case 'large':
        return {
          width: 16,
          height: 16,
          borderRadius: 8,
        };
      default: // medium
        return {
          width: 12,
          height: 12,
          borderRadius: 6,
        };
    }
  };

  const indicatorStyle = {
    ...styles.indicator,
    backgroundColor: getStatusColor(),
    ...getSizeStyles(),
    ...(status === 'syncing' && styles.pulsing),
  };

  const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <View style={styles.container}>
      <View style={indicatorStyle} />
      {showLabel && (
        <View style={styles.labelContainer}>
          {/* You can add a Text component here if you want to show the label */}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    // Size will be set dynamically
  },
  pulsing: {
    // Add pulsing animation for syncing status
    opacity: 0.7,
  },
  labelContainer: {
    marginLeft: 6,
  },
});