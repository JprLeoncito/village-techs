import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Animated,
  ViewStyle,
} from 'react-native';

export type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  color?: string;
  text?: string;
  fullScreen?: boolean;
  overlay?: boolean;
  style?: ViewStyle;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = '#10b981',
  text,
  fullScreen = false,
  overlay = false,
  style,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getActivitySize = (): 'small' | 'large' => {
    switch (size) {
      case 'sm':
      case 'md':
        return 'small';
      case 'lg':
      case 'xl':
        return 'large';
      default:
        return 'small';
    }
  };

  const spinnerContainerStyles = [
    styles.container,
    fullScreen && styles.fullScreen,
    overlay && styles.overlay,
    style,
  ];

  const content = (
    <Animated.View
      style={[
        styles.content,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={[styles.spinnerContainer, styles[`${size}Container`]]}>
        <ActivityIndicator size={getActivitySize()} color={color} />
      </View>
      {text && (
        <Text style={[styles.text, styles[`${size}Text`], { color }]}>
          {text}
        </Text>
      )}
    </Animated.View>
  );

  if (fullScreen || overlay) {
    return <View style={spinnerContainerStyles}>{content}</View>;
  }

  return content;
};

// Skeleton loader component for content placeholders
export const SkeletonLoader: React.FC<{
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}> = ({ width = '100%', height = 20, borderRadius = 4, style }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    zIndex: 9999,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 9999,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Size variations
  smContainer: {
    width: 24,
    height: 24,
  },
  mdContainer: {
    width: 32,
    height: 32,
  },
  lgContainer: {
    width: 48,
    height: 48,
  },
  xlContainer: {
    width: 64,
    height: 64,
  },
  // Text styles
  text: {
    marginTop: 12,
    fontWeight: '500',
    textAlign: 'center',
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
    fontSize: 18,
  },
  // Skeleton
  skeleton: {
    backgroundColor: '#e5e7eb',
  },
});

export default LoadingSpinner;