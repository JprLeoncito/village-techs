import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  count?: number;
  maxCount?: number;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  dot = false,
  count,
  maxCount = 99,
  style,
}) => {
  const badgeStyles = [
    styles.base,
    styles[variant],
    styles[size],
    dot && styles.dot,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
  ];

  if (dot) {
    return <View style={[styles.dotBase, styles[`${variant}Dot`], style]} />;
  }

  const displayContent = count !== undefined
    ? count > maxCount ? `${maxCount}+` : count.toString()
    : children;

  return (
    <View style={badgeStyles}>
      <Text style={textStyles}>{displayContent}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  // Variants
  primary: {
    backgroundColor: '#dcfce7',
  },
  secondary: {
    backgroundColor: '#dbeafe',
  },
  success: {
    backgroundColor: '#dcfce7',
  },
  warning: {
    backgroundColor: '#fed7aa',
  },
  error: {
    backgroundColor: '#fee2e2',
  },
  info: {
    backgroundColor: '#dbeafe',
  },
  neutral: {
    backgroundColor: '#f3f4f6',
  },
  // Sizes
  xs: {
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  sm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  md: {
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  lg: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  // Text styles
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryText: {
    color: '#166534',
  },
  secondaryText: {
    color: '#1e40af',
  },
  successText: {
    color: '#166534',
  },
  warningText: {
    color: '#92400e',
  },
  errorText: {
    color: '#991b1b',
  },
  infoText: {
    color: '#1e40af',
  },
  neutralText: {
    color: '#4b5563',
  },
  // Text sizes
  xsText: {
    fontSize: 10,
  },
  smText: {
    fontSize: 12,
  },
  mdText: {
    fontSize: 14,
  },
  lgText: {
    fontSize: 16,
  },
  // Dot styles
  dotBase: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dot: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  primaryDot: {
    backgroundColor: '#22c55e',
  },
  secondaryDot: {
    backgroundColor: '#3b82f6',
  },
  successDot: {
    backgroundColor: '#22c55e',
  },
  warningDot: {
    backgroundColor: '#f59e0b',
  },
  errorDot: {
    backgroundColor: '#ef4444',
  },
  infoDot: {
    backgroundColor: '#3b82f6',
  },
  neutralDot: {
    backgroundColor: '#6b7280',
  },
});

export default Badge;