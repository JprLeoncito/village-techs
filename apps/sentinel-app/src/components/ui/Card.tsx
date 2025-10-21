import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: number;
  margin?: number;
  onPress?: () => void;
}

export const Card = ({
  children,
  style,
  variant = 'default',
  padding = 16,
  margin = 0,
  onPress,
}: CardProps) => {
  const { theme } = useTheme();
  const backgroundColor = theme.colors.background;
  const borderColor = theme.colors.border;

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'outlined':
        return {
          borderWidth: 1,
          borderColor,
        };
      case 'elevated':
        return {
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 3.84,
          elevation: 5,
        };
      default:
        return {};
    }
  };

  const cardStyle = {
    ...styles.card,
    backgroundColor,
    padding,
    margin,
    ...getVariantStyles(),
    ...style,
  };

  const CardComponent = onPress ? TouchableOpacity : View;

  return (
    <CardComponent style={cardStyle} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      {children}
    </CardComponent>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    overflow: 'hidden',
  },
});