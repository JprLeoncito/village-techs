import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal as RNModal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

export type ModalSize = 'sm' | 'md' | 'lg' | 'full';
export type ModalPosition = 'center' | 'bottom' | 'top';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: ModalSize;
  position?: ModalPosition;
  showCloseButton?: boolean;
  closeOnBackdropPress?: boolean;
  footer?: React.ReactNode;
  scrollable?: boolean;
  avoidKeyboard?: boolean;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
  size = 'md',
  position = 'center',
  showCloseButton = true,
  closeOnBackdropPress = true,
  footer,
  scrollable = false,
  avoidKeyboard = true,
}) => {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(
    position === 'bottom' ? SCREEN_HEIGHT : position === 'top' ? -SCREEN_HEIGHT : 0
  )).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: position === 'bottom' ? SCREEN_HEIGHT : position === 'top' ? -SCREEN_HEIGHT : 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const getModalWidth = () => {
    switch (size) {
      case 'sm':
        return SCREEN_WIDTH * 0.7;
      case 'md':
        return SCREEN_WIDTH * 0.85;
      case 'lg':
        return SCREEN_WIDTH * 0.95;
      case 'full':
        return SCREEN_WIDTH;
      default:
        return SCREEN_WIDTH * 0.85;
    }
  };

  const modalContainerStyles = [
    styles.modalContainer,
    styles[`position_${position}`],
    position === 'bottom' && styles.bottomModal,
    position === 'top' && styles.topModal,
  ];

  const modalContentStyles = [
    styles.modalContent,
    size === 'full' && styles.fullModal,
    position === 'bottom' && styles.bottomModalContent,
    position === 'top' && styles.topModalContent,
    { width: getModalWidth() },
  ];

  const ContentWrapper = scrollable ? ScrollView : View;
  const contentWrapperProps = scrollable
    ? { showsVerticalScrollIndicator: false, bounces: false }
    : {};

  const content = (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={closeOnBackdropPress ? onClose : undefined}
      >
        <View style={modalContainerStyles}>
          <TouchableOpacity activeOpacity={1}>
            <Animated.View
              style={[
                modalContentStyles,
                {
                  backgroundColor: theme.colors.card,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {/* Header */}
              {(title || showCloseButton) && (
                <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                  {title && <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>}
                  {showCloseButton && (
                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={onClose}
                    >
                      <Text style={[styles.closeIcon, { color: theme.colors.muted }]}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Body */}
              <ContentWrapper style={[styles.body, { backgroundColor: theme.colors.card }]} {...contentWrapperProps}>
                {children}
              </ContentWrapper>

              {/* Footer */}
              {footer && <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>{footer}</View>}
            </Animated.View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {avoidKeyboard && Platform.OS === 'ios' ? (
        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </RNModal>
  );
};

// Alert modal variant
interface AlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  onClose: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  visible,
  title,
  message,
  type = 'info',
  onClose,
  onConfirm,
  confirmText = 'OK',
  cancelText = 'Cancel',
}) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'warning':
        return <MaterialIcons name="warning" size={16} color="#f59e0b" />;
      case 'error':
        return '✕';
      case 'info':
      default:
        return <MaterialIcons name="info" size={16} color="#3b82f6" />;
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return '#10b981';
      case 'warning':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      case 'info':
      default:
        return '#3b82f6';
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      size="sm"
      position="center"
      showCloseButton={false}
    >
      <View style={styles.alertContent}>
        <View style={[styles.alertIcon, { backgroundColor: getIconColor() + '20' }]}>
          <Text style={[styles.alertIconText, { color: getIconColor() }]}>
            {getIcon()}
          </Text>
        </View>
        <Text style={styles.alertTitle}>{title}</Text>
        <Text style={styles.alertMessage}>{message}</Text>
        <View style={styles.alertButtons}>
          {onConfirm && (
            <TouchableOpacity
              style={[styles.alertButton, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>{cancelText}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.alertButton, styles.confirmButton]}
            onPress={onConfirm || onClose}
          >
            <Text style={styles.confirmButtonText}>{confirmText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    alignItems: 'center',
  },
  position_center: {
    justifyContent: 'center',
  },
  position_bottom: {
    justifyContent: 'flex-end',
  },
  position_top: {
    justifyContent: 'flex-start',
  },
  modalContent: {
    borderRadius: 12,
    maxHeight: SCREEN_HEIGHT * 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  fullModal: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    borderRadius: 0,
    maxHeight: SCREEN_HEIGHT,
  },
  bottomModal: {
    width: SCREEN_WIDTH,
  },
  bottomModalContent: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  topModal: {
    width: SCREEN_WIDTH,
  },
  topModalContent: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  closeButton: {
    padding: 4,
    marginLeft: 12,
  },
  closeIcon: {
    fontSize: 20,
    color: '#6b7280',
  },
  body: {
    padding: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  // Alert modal styles
  alertContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  alertIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  alertIconText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  alertButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  alertButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: '#10b981',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default Modal;