import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
}: ButtonProps) => {
  const { theme } = useTheme();

  const getVariantColors = () => {
    switch (variant) {
      case 'primary':
        return { background: theme.colors.primary, text: '#ffffff', border: theme.colors.primary };
      case 'secondary':
        return { background: theme.colors.secondary, text: '#ffffff', border: theme.colors.secondary };
      case 'danger':
        return { background: theme.colors.error, text: '#ffffff', border: theme.colors.error };
      case 'success':
        return { background: '#22c55e', text: '#ffffff', border: '#22c55e' };
      case 'warning':
        return { background: theme.colors.warning, text: '#ffffff', border: theme.colors.warning };
      case 'outline':
        return { background: 'transparent', text: theme.colors.primary, border: theme.colors.primary };
      default:
        return { background: theme.colors.primary, text: '#ffffff', border: theme.colors.primary };
    }
  };

  const { background: backgroundColor, text: textColor, border: borderColor } = getVariantColors();

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 6,
        };
      case 'large':
        return {
          paddingHorizontal: 24,
          paddingVertical: 16,
          borderRadius: 12,
        };
      default: // medium
        return {
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 8,
        };
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'small':
        return 14;
      case 'large':
        return 18;
      default: // medium
        return 16;
    }
  };

  const buttonStyle = {
    ...styles.button,
    backgroundColor: variant === 'outline' ? 'transparent' : backgroundColor,
    borderColor,
    borderWidth: variant === 'outline' ? 1 : 0,
    ...getSizeStyles(),
    ...(disabled && styles.disabled),
    ...style,
  };

  const textStyleCombined = {
    ...styles.text,
    color: disabled ? '#9ca3af' : textColor,
    fontSize: getTextSize(),
    ...textStyle,
  };

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={textColor}
          style={styles.loader}
        />
      ) : (
        <>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={textStyleCombined}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  loader: {
    marginHorizontal: 8,
  },
  iconContainer: {
    marginRight: 8,
  },
});