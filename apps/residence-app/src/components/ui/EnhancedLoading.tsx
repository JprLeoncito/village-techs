import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface Props {
  visible?: boolean;
  message?: string;
  type?: 'default' | 'skeleton' | 'progress';
  progress?: number;
  showRetry?: boolean;
  onRetry?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

export const EnhancedLoading: React.FC<Props> = ({
  visible = true,
  message = 'Loading...',
  type = 'default',
  progress,
  showRetry = false,
  onRetry,
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Start pulse animation
      const pulse = Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]);

      const pulseLoop = Animated.loop(pulse);
      pulseLoop.start();

      return () => {
        pulseLoop.stop();
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      };
    }
  }, [visible, fadeAnim, pulseAnim]);

  if (!visible) return null;

  if (type === 'skeleton') {
    return <SkeletonLoader />;
  }

  if (type === 'progress' && progress !== undefined) {
    return <ProgressLoading progress={progress} message={message} />;
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.content}>
        <Animated.View style={[styles.loadingIcon, { transform: [{ scale: pulseAnim }] }]}>
          <MaterialIcons name="refresh" size={48} color="#3b82f6" />
        </Animated.View>

        <Text style={styles.message}>{message}</Text>

        {showRetry && onRetry && (
          <RetryButton onRetry={onRetry} />
        )}
      </View>
    </Animated.View>
  );
};

const SkeletonLoader: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.skeletonContent}>
        {[1, 2, 3].map((item) => (
          <View key={item} style={styles.skeletonItem}>
            <View style={[styles.skeletonLine, styles.skeletonTitle]} />
            <View style={[styles.skeletonLine, styles.skeletonSubtitle]} />
            <View style={[styles.skeletonLine, styles.skeletonText]} />
          </View>
        ))}
      </View>
    </View>
  );
};

const ProgressLoading: React.FC<{ progress: number; message: string }> = ({ progress, message }) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(progress, 100)}%` }
              ]}
            />
          </View>
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        </View>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
};

const RetryButton: React.FC<{ onRetry: () => void }> = ({ onRetry }) => {
  return (
    <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
      <MaterialIcons name="refresh" size={20} color="#ffffff" style={styles.retryIcon} />
      <Text style={styles.retryText}>Retry</Text>
    </TouchableOpacity>
  );
};

const LoadingSkeleton: React.FC<{ width?: number; height?: number; style?: any }> = ({
  width = '100%',
  height = 20,
  style,
}) => {
  return (
    <View
      style={[
        {
          width,
          height,
          backgroundColor: '#e5e7eb',
          borderRadius: 4,
        },
        style,
      ]}
    />
  );
};

// Export skeleton component for use in other places
export { LoadingSkeleton };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  content: {
    alignItems: 'center',
    padding: 20,
  },
  loadingIcon: {
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  retryIcon: {
    marginRight: 8,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  skeletonContent: {
    width: screenWidth * 0.9,
  },
  skeletonItem: {
    marginBottom: 20,
  },
  skeletonLine: {
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonTitle: {
    width: '60%',
    height: 20,
  },
  skeletonSubtitle: {
    width: '80%',
    height: 16,
  },
  skeletonText: {
    width: '100%',
    height: 14,
  },
  progressContainer: {
    width: 200,
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
});

export default EnhancedLoading;