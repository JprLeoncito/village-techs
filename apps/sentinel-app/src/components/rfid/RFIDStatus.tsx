import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/contexts/ThemeContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface VehicleSticker {
  rfidCode: string;
  vehiclePlate: string;
  householdName: string;
  residenceNumber: string;
  memberNames: string[];
  status: 'active' | 'expired';
  expiryDate: number;
}

interface RFIDStatusProps {
  vehicleInfo: VehicleSticker | null;
  isLoading?: boolean;
  error?: string;
  showDetails?: boolean;
}

export const RFIDStatus: React.FC<RFIDStatusProps> = ({
  vehicleInfo,
  isLoading = false,
  error,
  showDetails = true,
}) => {
  const { theme } = useTheme();

  const getExpiryStatus = () => {
    if (!vehicleInfo) return null;

    const now = Date.now();
    const daysUntilExpiry = Math.ceil((vehicleInfo.expiryDate - now) / (1000 * 60 * 60 * 24));

    if (vehicleInfo.status === 'expired' || daysUntilExpiry <= 0) {
      return { status: 'danger' as const, text: 'Expired', color: theme.colors.error };
    } else if (daysUntilExpiry <= 7) {
      return { status: 'warning' as const, text: `Expires in ${daysUntilExpiry} days`, color: theme.colors.warning };
    } else {
      return { status: 'success' as const, text: 'Active', color: theme.colors.success };
    }
  };

  const expiryStatus = getExpiryStatus();

  const textStyles = {
    title: [styles.title, { color: theme.colors.text }],
    subtitle: [styles.subtitle, { color: theme.colors.muted }],
    plateNumber: [styles.plateNumber, { color: theme.colors.text }],
    householdName: [styles.householdName, { color: theme.colors.text }],
    residenceNumber: [styles.residenceNumber, { color: theme.colors.muted }],
    rfidCode: [styles.rfidCode, { color: theme.colors.muted }],
    statusText: [styles.statusText, { color: theme.colors.text }],
    noDataText: [styles.noDataText, { color: theme.colors.muted }],
    errorText: [styles.errorText, { color: theme.colors.error }],
    loadingText: [styles.loadingText, { color: theme.colors.muted }],
  };

  if (isLoading) {
    return (
      <Card style={styles.container} padding={16}>
        <View style={styles.loadingContainer}>
          <Icon name="loading" size={24} color={theme.colors.primary} />
          <Text style={textStyles.loadingText}>Scanning RFID...</Text>
        </View>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={[styles.container, styles.errorContainer]} padding={16}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={24} color={theme.colors.error} />
          <Text style={textStyles.errorText}>Scan Error</Text>
          <Text style={textStyles.subtitle}>{error}</Text>
        </View>
      </Card>
    );
  }

  if (!vehicleInfo) {
    return (
      <Card style={styles.container} padding={16}>
        <View style={styles.noDataContainer}>
          <Icon name="help-circle" size={24} color={theme.colors.muted} />
          <Text style={textStyles.noDataText}>No Vehicle Information</Text>
          <Text style={textStyles.subtitle}>Scan an RFID sticker to view vehicle details</Text>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.container} padding={16}>
      {/* Status Header */}
      <View style={styles.statusHeader}>
        <Icon name="car" size={24} color={theme.colors.primary} />
        <View style={styles.statusInfo}>
          <Text style={textStyles.plateNumber}>{vehicleInfo.vehiclePlate}</Text>
          {expiryStatus && (
            <Badge
              title={expiryStatus.text}
              variant={expiryStatus.status}
              size="small"
            />
          )}
        </View>
      </View>

      {/* Vehicle Details */}
      {showDetails && (
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Icon name="home" size={16} color={theme.colors.muted} />
            <Text style={textStyles.householdName}>{vehicleInfo.householdName}</Text>
          </View>

          <View style={styles.detailRow}>
            <Icon name="map-marker" size={16} color={theme.colors.muted} />
            <Text style={textStyles.residenceNumber}>
              Residence {vehicleInfo.residenceNumber}
            </Text>
          </View>

          {vehicleInfo.memberNames.length > 0 && (
            <View style={styles.detailRow}>
              <Icon name="account-group" size={16} color={theme.colors.muted} />
              <Text style={textStyles.residenceNumber}>
                Members: {vehicleInfo.memberNames.join(', ')}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Icon name="chip" size={16} color={theme.colors.muted} />
            <Text style={textStyles.rfidCode}>
              RFID: {vehicleInfo.rfidCode.slice(0, 8)}...
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Icon name="calendar" size={16} color={theme.colors.muted} />
            <Text style={textStyles.residenceNumber}>
              Expires: {new Date(vehicleInfo.expiryDate).toLocaleDateString()}
            </Text>
          </View>
        </View>
      )}

      {/* Access Decision */}
      {expiryStatus && expiryStatus.status === 'success' ? (
        <View style={[styles.decisionContainer, styles.accessGranted]}>
          <Icon name="check-circle" size={20} color={theme.colors.success} />
          <Text style={[styles.decisionText, { color: theme.colors.success }]}>
            Access Granted
          </Text>
        </View>
      ) : (
        <View style={[styles.decisionContainer, styles.accessDenied]}>
          <Icon name="close-circle" size={20} color={theme.colors.error} />
          <Text style={[styles.decisionText, { color: theme.colors.error }]}>
            Access Denied
          </Text>
          {expiryStatus.status === 'warning' && (
            <Text style={textStyles.subtitle}>
              Sticker expires soon. Contact administrator for renewal.
            </Text>
          )}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  errorContainer: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  statusInfo: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
  },
  plateNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  householdName: {
    fontSize: 16,
    fontWeight: '500',
  },
  residenceNumber: {
    fontSize: 14,
  },
  rfidCode: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  statusText: {
    fontSize: 12,
    marginLeft: 8,
  },
  details: {
    gap: 8,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  decisionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  accessGranted: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  accessDenied: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  decisionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  noDataText: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
  },
});