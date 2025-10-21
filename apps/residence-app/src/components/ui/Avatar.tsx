import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface AvatarProps {
  source?: string | null;
  name?: string;
  size?: AvatarSize;
  style?: ViewStyle;
  onPress?: () => void;
  showBadge?: boolean;
  badgeColor?: string;
  badgePosition?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
}

export const Avatar: React.FC<AvatarProps> = ({
  source,
  name = '',
  size = 'md',
  style,
  onPress,
  showBadge = false,
  badgeColor = '#10b981',
  badgePosition = 'bottom-right',
}) => {
  const [imageError, setImageError] = useState(false);

  const avatarStyles = [styles.base, styles[size], style];
  const textStyles = [styles.text, styles[`${size}Text`]];
  const badgeStyles = [
    styles.badge,
    styles[`${size}Badge`],
    styles[`badge_${badgePosition}`],
    { backgroundColor: badgeColor },
  ];

  const getInitials = (fullName: string): string => {
    const names = fullName.trim().split(' ');
    if (names.length === 0) return '?';
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  const getBackgroundColor = (fullName: string): string => {
    const colors = [
      '#ef4444', // red
      '#f59e0b', // amber
      '#10b981', // emerald
      '#3b82f6', // blue
      '#8b5cf6', // violet
      '#ec4899', // pink
      '#14b8a6', // teal
      '#6366f1', // indigo
    ];

    const charCode = fullName.charCodeAt(0) || 0;
    return colors[charCode % colors.length];
  };

  const renderAvatar = () => {
    if (source && !imageError) {
      return (
        <Image
          source={{ uri: source }}
          style={[styles.image, styles[size]]}
          onError={() => setImageError(true)}
        />
      );
    }

    // Fallback to initials
    const initials = getInitials(name);
    const backgroundColor = getBackgroundColor(name);

    return (
      <View style={[avatarStyles, { backgroundColor }]}>
        <Text style={textStyles}>{initials}</Text>
      </View>
    );
  };

  const content = (
    <View style={styles.container}>
      {renderAvatar()}
      {showBadge && <View style={badgeStyles} />}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  // Sizes
  xs: {
    width: 24,
    height: 24,
  },
  sm: {
    width: 32,
    height: 32,
  },
  md: {
    width: 40,
    height: 40,
  },
  lg: {
    width: 48,
    height: 48,
  },
  xl: {
    width: 64,
    height: 64,
  },
  '2xl': {
    width: 80,
    height: 80,
  },
  // Text styles
  text: {
    color: '#ffffff',
    fontWeight: '600',
  },
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
  xlText: {
    fontSize: 20,
  },
  '2xlText': {
    fontSize: 24,
  },
  // Badge
  badge: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  xsBadge: {
    width: 6,
    height: 6,
    borderWidth: 1,
  },
  smBadge: {
    width: 8,
    height: 8,
    borderWidth: 1.5,
  },
  mdBadge: {
    width: 10,
    height: 10,
  },
  lgBadge: {
    width: 12,
    height: 12,
  },
  xlBadge: {
    width: 14,
    height: 14,
  },
  '2xlBadge': {
    width: 16,
    height: 16,
  },
  // Badge positions
  'badge_top-right': {
    top: 0,
    right: 0,
  },
  'badge_bottom-right': {
    bottom: 0,
    right: 0,
  },
  'badge_top-left': {
    top: 0,
    left: 0,
  },
  'badge_bottom-left': {
    bottom: 0,
    left: 0,
  },
});

export default Avatar;