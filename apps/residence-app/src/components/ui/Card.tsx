import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  onPress?: () => void;
  disabled?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  padding = 'md',
  shadow = 'md',
  borderRadius = 'md',
  onPress,
  disabled = false,
}) => {
  const { theme } = useTheme();

  const cardStyles = [
    styles.base,
    { backgroundColor: theme.colors.card },
    styles[`padding_${padding}`],
    styles[`shadow_${shadow}`],
    styles[`radius_${borderRadius}`],
    disabled && styles.disabled,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyles}
        onPress={onPress}
        activeOpacity={0.95}
        disabled={disabled}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyles}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    // backgroundColor is set dynamically via theme
  },
  // Padding variations
  padding_none: {
    padding: 0,
  },
  padding_sm: {
    padding: 12,
  },
  padding_md: {
    padding: 16,
  },
  padding_lg: {
    padding: 20,
  },
  padding_xl: {
    padding: 24,
  },
  // Shadow variations
  shadow_none: {
    elevation: 0,
    shadowOpacity: 0,
  },
  shadow_sm: {
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  shadow_md: {
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  shadow_lg: {
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  shadow_xl: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  // Border radius variations
  radius_none: {
    borderRadius: 0,
  },
  radius_sm: {
    borderRadius: 4,
  },
  radius_md: {
    borderRadius: 8,
  },
  radius_lg: {
    borderRadius: 12,
  },
  radius_xl: {
    borderRadius: 16,
  },
  // States
  disabled: {
    opacity: 0.6,
  },
});

export default Card;