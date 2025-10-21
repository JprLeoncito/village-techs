import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface FABProps {
  onPress: () => void;
  icon?: keyof typeof MaterialIcons.glyphMap;
  label?: string;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  iconSize?: number;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export const FAB: React.FC<FABProps> = ({
  onPress,
  icon = 'add',
  label,
  disabled = false,
  loading = false,
  style,
  iconSize = 24,
  position = 'bottom-right',
}) => {
  const getPositionStyle = (): ViewStyle => {
    switch (position) {
      case 'bottom-right':
        return styles.bottomRight;
      case 'bottom-left':
        return styles.bottomLeft;
      case 'top-right':
        return styles.topRight;
      case 'top-left':
        return styles.topLeft;
      default:
        return styles.bottomRight;
    }
  };

  const containerStyles = [
    styles.container,
    getPositionStyle(),
    disabled && styles.disabled,
    style,
  ];

  return (
    <TouchableOpacity
      style={containerStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#ffffff" />
      ) : (
        <>
          <MaterialIcons name={icon} size={iconSize} color="#ffffff" />
          {label && <Text style={styles.label}>{label}</Text>}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    backgroundColor: '#10b981',
    borderRadius: 28,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  bottomRight: {
    bottom: 24,
    right: 24,
  },
  bottomLeft: {
    bottom: 24,
    left: 24,
  },
  topRight: {
    top: 24,
    right: 24,
  },
  topLeft: {
    top: 24,
    left: 24,
  },
  disabled: {
    backgroundColor: '#d1d5db',
    elevation: 0,
    shadowOpacity: 0,
  },
  label: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default FAB;