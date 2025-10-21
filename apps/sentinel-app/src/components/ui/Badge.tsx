import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

export interface BadgeProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export const Badge = ({
  title,
  variant = 'primary',
  size = 'medium',
  style,
}: BadgeProps) => {
  const backgroundColor = getBadgeColor(variant);
  const textColor = '#ffffff';

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 10,
          minWidth: 40,
        };
      case 'large':
        return {
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 12,
          minWidth: 60,
        };
      default: // medium
        return {
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 12,
          minWidth: 50,
        };
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'small':
        return 10;
      case 'large':
        return 14;
      default: // medium
        return 12;
    }
  };

  const badgeStyle = {
    ...styles.badge,
    backgroundColor,
    ...getSizeStyles(),
    ...style,
  };

  const textStyle = {
    ...styles.text,
    color: textColor,
    fontSize: getTextSize(),
  };

  return (
    <View style={badgeStyle}>
      <Text style={textStyle}>{title}</Text>
    </View>
  );
};

// Helper function to get badge colors
const getBadgeColor = (variant: string): string => {
  switch (variant) {
    case 'primary':
      return '#3b82f6';
    case 'secondary':
      return '#6b7280';
    case 'danger':
      return '#ef4444';
    case 'success':
      return '#22c55e';
    case 'warning':
      return '#f59e0b';
    case 'info':
      return '#06b6d4';
    default:
      return '#3b82f6';
  }
};

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});