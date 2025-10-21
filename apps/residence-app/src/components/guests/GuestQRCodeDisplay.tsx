import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useTheme } from '../../contexts/ThemeContext';
import guestService, { UIGuestStatusInfo } from '../../services/guestService';
import { format, formatDistanceToNow } from 'date-fns';


import { MaterialIcons } from '@expo/vector-icons';interface GuestQRCodeDisplayProps {
  visible: boolean;
  guestId: string;
  guestName: string;
  vehiclePlate?: string;
  arrivalDate: Date;
  departureDate?: Date;
  passId?: string;
  onClose: () => void;
  onRegenerate?: () => void;
}

export const GuestQRCodeDisplay: React.FC<GuestQRCodeDisplayProps> = ({
  visible,
  guestId,
  guestName,
  vehiclePlate,
  arrivalDate,
  departureDate,
  passId,
  onClose,
  onRegenerate,
}) => {
  const { theme } = useTheme();
  const [qrCode, setQrCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [guest, setGuest] = useState<any>(null);

  useEffect(() => {
    if (visible && guestId) {
      loadQRCode();
    }
  }, [visible, guestId]);

  const loadQRCode = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Fetch guest data and QR code in parallel
      const [guestResult, qrResult] = await Promise.all([
        guestService.getGuest(guestId),
        guestService.getGuestQRCode(guestId)
      ]);

      if (guestResult) {
        setGuest(guestResult);
      }

      if (qrResult.success && qrResult.qrCode) {
        setQrCode(qrResult.qrCode);
      } else {
        setError(qrResult.error || 'Failed to generate QR code');
      }
    } catch (error) {
      console.error('Failed to load QR code:', error);
      setError('Failed to load QR code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      // Share guest pass details
      const message = `Guest Pass for ${guestName}\n` +
        `Pass ID: ${passId || 'N/A'}\n` +
        `Arrival: ${format(arrivalDate, 'MMM dd, yyyy HH:mm')}\n` +
        `${vehiclePlate ? `Vehicle: ${vehiclePlate}\n` : ''}` +
        `${departureDate ? `Departure: ${format(departureDate, 'MMM dd, yyyy HH:mm')}\n` : ''}` +
        `Purpose: ${'Visit'}\n\n` +
        `Please show this QR code at the gate for access.`;

      await Share.share({
        message,
        title: `Guest Pass for ${guestName}`,
      });
    } catch (error) {
      console.error('Failed to share:', error);
      Alert.alert('Error', 'Failed to share guest pass');
    }
  };

  const handleRegenerate = () => {
    Alert.alert(
      'Regenerate QR Code',
      'This will invalidate the current QR code and generate a new one. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: () => {
            onRegenerate?.();
            loadQRCode(); // Reload after regeneration
          },
        },
      ]
    );
  };

  const isVisitActive = () => {
    const now = new Date();
    return now >= arrivalDate && (!departureDate || now <= departureDate);
  };

  const getVisitStatus = (): UIGuestStatusInfo & { icon: React.ReactNode } => {
    if (!guest) {
      return {
        status: 'SCHEDULED',
        color: '#3b82f6',
        priority: 2,
        icon: <MaterialIcons name="event" size={16} color="#6b7280" />
      };
    }

    const uiStatus = guestService.getUIGuestStatus(guest);

    // Add appropriate icon based on status
    let icon;
    switch (uiStatus.status) {
      case 'ACTIVE':
        icon = <MaterialIcons name="check-circle" size={16} color="#10b981" />;
        break;
      case 'SCHEDULED':
        icon = <MaterialIcons name="event" size={16} color="#6b7280" />;
        break;
      case 'EXPIRED':
        icon = <MaterialIcons name="cancel" size={16} color="#ef4444" />;
        break;
      case 'CANCELLED':
        icon = <MaterialIcons name="cancel" size={16} color="#ef4444" />;
        break;
      default:
        icon = <MaterialIcons name="event" size={16} color="#6b7280" />;
    }

    return {
      ...uiStatus,
      icon
    };
  };

  const visitStatus = getVisitStatus();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, {
          backgroundColor: theme.colors.card,
          borderBottomColor: theme.colors.border
        }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Guest Pass QR Code</Text>
          <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: theme.colors.muted + '20' }]}>
            <Text style={[styles.closeButtonText, { color: theme.colors.muted }]}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Guest Info Card */}
          <Card style={styles.guestInfoCard}>
            <View style={styles.guestHeader}>
              <View style={styles.guestDetails}>
                <Text style={[styles.guestName, { color: theme.colors.text }]}>{guestName}</Text>
                <Text style={[styles.passId, { color: theme.colors.muted }]}>Pass #{passId || 'Loading...'}</Text>
              </View>
              <Badge
                variant={visitStatus.status === 'ACTIVE' ? 'success' :
                       visitStatus.status === 'EXPIRED' || visitStatus.status === 'CANCELLED' ? 'error' : 'info'}
              >
                {visitStatus.icon} {visitStatus.status}
              </Badge>
            </View>

            <View style={styles.visitDetails}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.colors.muted }]}>Arrival:</Text>
                <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                  {format(arrivalDate, 'MMM dd, yyyy HH:mm')}
                </Text>
              </View>

              {departureDate && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.colors.muted }]}>Departure:</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                    {format(departureDate, 'MMM dd, yyyy HH:mm')}
                  </Text>
                </View>
              )}

              {vehiclePlate && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.colors.muted }]}>Vehicle:</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>{vehiclePlate}</Text>
                </View>
              )}

              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.colors.muted }]}>Valid:</Text>
                <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                  {formatDistanceToNow(arrivalDate, { addSuffix: true })}
                  {' - '}
                  {departureDate
                    ? formatDistanceToNow(departureDate, { addSuffix: true })
                    : 'End of day'
                  }
                </Text>
              </View>
            </View>
          </Card>

          {/* QR Code Display */}
          <Card style={styles.qrCodeCard}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.loadingText, { color: theme.colors.muted }]}>Generating QR Code...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>❌</Text>
                <Text style={styles.errorText}>{error}</Text>
                <Button variant="primary" onPress={loadQRCode} style={styles.retryButton}>
                  🔄 Retry
                </Button>
              </View>
            ) : (
              <View style={styles.qrCodeContainer}>
                <Text style={[styles.qrCodeLabel, { color: theme.colors.text }]}>Show this QR code at the gate</Text>

                <View style={[styles.qrCodeWrapper, {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                }]}>
                  <View style={{
                    backgroundColor: theme.dark ? theme.colors.card : '#ffffff',
                    borderRadius: 8,
                    overflow: 'hidden',
                  }}>
                    <QRCode
                      value={qrCode}
                      size={200}
                      color={theme.dark ? '#ffffff' : '#000000'}
                      backgroundColor="transparent"
                    />
                  </View>
                </View>

                <View style={styles.qrCodeInfo}>
                  <Text style={[styles.qrCodeInstructions, { color: theme.colors.muted }]}>
                    1. Screenshot this QR code for easy access
                  </Text>
                  <Text style={[styles.qrCodeInstructions, { color: theme.colors.muted }]}>
                    2. Share with your guest before arrival
                  </Text>
                  <Text style={[styles.qrCodeInstructions, { color: theme.colors.muted }]}>
                    3. Guest must show this at the security gate
                  </Text>
                </View>
              </View>
            )}
          </Card>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button
              variant="outline"
              onPress={handleShare}
              disabled={!qrCode || isLoading}
              style={styles.actionButton}
            >
              📤 Share Pass
            </Button>

            <Button
              variant="outline"
              onPress={handleRegenerate}
              disabled={!qrCode || isLoading}
              style={styles.actionButton}
            >
              🔄 Regenerate
            </Button>
          </View>

          {/* Instructions */}
          <View style={[styles.instructionsCard, {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderWidth: 1,
          }]}>
            <Text style={[styles.instructionsTitle, { color: theme.colors.text }]}>Important Instructions</Text>
            <Text style={[styles.instructionsText, { color: theme.colors.muted }]}>
              • This QR code is valid only for the specified visit dates
            </Text>
            <Text style={[styles.instructionsText, { color: theme.colors.muted }]}>
              • Share this pass with your guest before their arrival
            </Text>
            <Text style={[styles.instructionsText, { color: theme.colors.muted }]}>
              • The security guard will scan this code for gate access
            </Text>
            <Text style={[styles.instructionsText, { color: theme.colors.muted }]}>
              • Regenerate if QR code is compromised or not working
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 40,
  },
  guestInfoCard: {
    marginBottom: 20,
  },
  guestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  guestDetails: {
    flex: 1,
  },
  guestName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  passId: {
    fontSize: 14,
    fontWeight: '500',
  },
  visitDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  qrCodeCard: {
    marginBottom: 20,
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
  },
  qrCodeContainer: {
    alignItems: 'center',
  },
  qrCodeLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  qrCodeWrapper: {
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  qrCodeInfo: {
    gap: 4,
  },
  qrCodeInstructions: {
    fontSize: 13,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
  },
  instructionsCard: {
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
});

export default GuestQRCodeDisplay;