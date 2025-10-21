import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import QRCode from 'react-native-qrcode-svg';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import stickerService from '../../services/stickerService';
import stickerCacheService from '../../services/stickerCacheService';
import { format, differenceInDays } from 'date-fns';
import * as Clipboard from 'expo-clipboard';


import { MaterialIcons } from '@expo/vector-icons';type RootStackParamList = {
  StickerDetails: { stickerId: string };
  StickerList: undefined;
  StickerRequest: { renewalStickerId?: string };
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'StickerDetails'>;
type RouteProps = RouteProp<RootStackParamList, 'StickerDetails'>;

interface StickerDetails {
  id: string;
  stickerNumber: string;
  vehiclePlate: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string;
  vehicleType: string;
  status: 'active' | 'expired' | 'expiring';
  issueDate: Date;
  expiryDate: Date;
  assignedTo: {
    id: string;
    name: string;
    photoUrl?: string;
    relationship?: string;
  };
  qrCode: string;
  barcode?: string;
  householdAddress?: string;
  approvalNote?: string;
}

export const StickerDetailsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { stickerId } = route.params;

  const [sticker, setSticker] = useState<StickerDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [qrCodeRef, setQrCodeRef] = useState<any>(null);

  useEffect(() => {
    loadStickerDetails();
  }, [stickerId]);

  const loadStickerDetails = async () => {
    setIsLoading(true);
    try {
      console.log('=== Loading Sticker Details ===');
      console.log('Sticker ID:', stickerId);

      const result = await stickerService.getStickerById(stickerId);
      console.log('Sticker service result:', result);

      const data = result.data;
      if (result.success && data) {
        console.log('Sticker data found:', data);

        // Calculate status based on expiry
        const daysToExpiry = differenceInDays(
          new Date(data.expiry_date || data.expiryDate),
          new Date()
        );

        let status: StickerDetails['status'] = 'active';
        if (daysToExpiry < 0) {
          status = 'expired';
        } else if (daysToExpiry <= 30) {
          status = 'expiring';
        }

        // Handle household member assignment gracefully
        let assignedTo = {
          id: data.household_member_id || data.householdMemberId || 'unknown',
          name: 'Household Member',
          photoUrl: undefined,
          relationship: undefined,
        };

        // If household_members data exists, use it
        if (data.household_members) {
          console.log('Using household_members data:', data.household_members);
          assignedTo = {
            id: data.household_members.id || assignedTo.id,
            name: `${data.household_members.first_name || ''} ${data.household_members.last_name || ''}`.trim() || 'Household Member',
            photoUrl: data.household_members.photo_url,
            relationship: data.household_members.relationship,
          };
        } else {
          console.log('No household_members data found, using fallback');
        }

        const transformedData: StickerDetails = {
          id: data.id,
          stickerNumber: data.sticker_number || `VS-${data.id.slice(0, 8).toUpperCase()}`,
          vehiclePlate: data.vehicle_plate || data.vehiclePlate || 'Unknown',
          vehicleMake: data.vehicle_make || data.vehicleMake || 'Unknown',
          vehicleModel: data.vehicle_model || data.vehicleModel || 'Unknown',
          vehicleColor: data.vehicle_color || data.vehicleColor || 'Unknown',
          vehicleType: data.vehicle_make || data.vehicleMake || 'Unknown', // Use vehicle_make since vehicle_type doesn't exist
          status,
          issueDate: new Date(data.issue_date || data.created_at || data.createdAt || Date.now()),
          expiryDate: new Date(data.expiry_date || data.expiryDate || Date.now()),
          assignedTo,
          qrCode: generateQRCodeData(data),
          barcode: data.barcode,
          householdAddress: data.household_address,
          approvalNote: data.approval_note,
        };

        console.log('Transformed sticker data:', transformedData);
        setSticker(transformedData);
      } else {
        console.error('No sticker data found or result unsuccessful:', result);
        Alert.alert('Sticker Not Found', 'The requested sticker could not be found. Please try again.');
      }
    } catch (error) {
      console.error('Failed to load sticker details:', error);
      Alert.alert('Error', 'Failed to load sticker details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateQRCodeData = (stickerData: any): string => {
    // Generate a secure QR code data string
    const qrData = {
      id: stickerData.id,
      plate: stickerData.vehicle_plate || stickerData.vehiclePlate,
      expiry: stickerData.expiry_date || stickerData.expiryDate,
      household: stickerData.household_id,
      v: 1, // Version for future compatibility
    };
    return JSON.stringify(qrData);
  };

  const handleRenewal = () => {
    if (!sticker) return;

    const daysToExpiry = differenceInDays(sticker.expiryDate, new Date());

    if (daysToExpiry > 30) {
      Alert.alert(
        'Too Early to Renew',
        'You can only renew your sticker within 30 days of expiry.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Renew Sticker',
      'Do you want to renew this vehicle sticker?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Renew',
          onPress: () => {
            navigation.navigate('StickerRequest', { renewalStickerId: sticker.id });
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!sticker) return;

    try {
      const message = `Vehicle Sticker Details\n\n` +
        `Sticker #: ${sticker.stickerNumber}\n` +
        `Vehicle: ${sticker.vehiclePlate}\n` +
        `${sticker.vehicleMake} ${sticker.vehicleModel} - ${sticker.vehicleColor}\n` +
        `Valid Until: ${format(sticker.expiryDate, 'MMM dd, yyyy')}\n` +
        `Assigned To: ${sticker.assignedTo.name}`;

      await Share.share({
        message,
        title: 'Vehicle Sticker Details',
      });
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const handleCopyStickerNumber = async () => {
    if (!sticker) return;

    await Clipboard.setStringAsync(sticker.stickerNumber);
    Alert.alert('Copied!', 'Sticker number copied to clipboard', [{ text: 'OK' }]);
  };

  const handleDownloadQR = () => {
    // In a real app, this would save the QR code as an image
    Alert.alert(
      'Save QR Code',
      'QR code saving functionality will be available in the next update',
      [{ text: 'OK' }]
    );
  };

  const getStatusColor = (status: StickerDetails['status']) => {
    switch (status) {
      case 'active':
        return '#10b981';
      case 'expiring':
        return '#f59e0b';
      case 'expired':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: StickerDetails['status']) => {
    switch (status) {
      case 'active':
        return <MaterialIcons name="check-circle" size={16} color="#10b981" />;
      case 'expiring':
        return <MaterialIcons name="warning" size={16} color="#f59e0b" />;
      case 'expired':
        return <MaterialIcons name="cancel" size={16} color="#ef4444" />;
      default:
        return <MaterialIcons name="circle" size={8} color="#6b7280" />;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size="large" />
        <Text style={styles.loadingText}>Loading sticker details...</Text>
      </View>
    );
  }

  if (!sticker) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>❌</Text>
        <Text style={styles.errorTitle}>Sticker Not Found</Text>
        <Button variant="primary" onPress={() => navigation.navigate('StickerList')}>
          Back to List
        </Button>
      </View>
    );
  }

  const daysToExpiry = differenceInDays(sticker.expiryDate, new Date());
  const canRenew = stickerCacheService.canRenew({
    status: sticker.status === 'expired' ? 'expired' : 'active',
    expiryDate: sticker.expiryDate,
  } as any);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Card */}
      <Card style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.stickerNumber}>{sticker.stickerNumber}</Text>
            <TouchableOpacity onPress={handleCopyStickerNumber}>
              <Text style={styles.copyHint}>Tap to copy</Text>
            </TouchableOpacity>
          </View>
          <Badge
            variant={
              sticker.status === 'active' ? 'success' :
              sticker.status === 'expiring' ? 'warning' : 'error'
            }
            size="lg"
          >
            {getStatusIcon(sticker.status)} {sticker.status.toUpperCase()}
          </Badge>
        </View>

        <View style={styles.vehicleHeader}>
          <Text style={styles.plateNumber}>{sticker.vehiclePlate}</Text>
          <Text style={styles.vehicleDescription}>
            {sticker.vehicleMake} {sticker.vehicleModel} • {sticker.vehicleColor} • {sticker.vehicleType}
          </Text>
        </View>
      </Card>

      {/* QR Code Card */}
      <Card style={styles.qrCard}>
        <Text style={styles.sectionTitle}>QR Code for Gate Access</Text>
        <View style={styles.qrContainer}>
          <QRCode
            value={sticker.qrCode}
            size={200}
            color="#1f2937"
            backgroundColor="#ffffff"
            getRef={setQrCodeRef}
          />
        </View>
        <Text style={styles.qrInstruction}>
          Show this QR code at the gate for quick access
        </Text>
        <View style={styles.qrActions}>
          <Button variant="outline" size="sm" onPress={handleDownloadQR}>
            📥 Save QR Code
          </Button>
          <Button variant="outline" size="sm" onPress={handleShare}>
            📤 Share Details
          </Button>
        </View>
      </Card>

      {/* Validity Information */}
      <Card style={styles.validityCard}>
        <Text style={styles.sectionTitle}>📅 Validity Period</Text>
        <View style={styles.validityInfo}>
          <ValidityItem
            label="Issue Date"
            value={format(sticker.issueDate, 'MMMM dd, yyyy')}
          />
          <ValidityItem
            label="Expiry Date"
            value={format(sticker.expiryDate, 'MMMM dd, yyyy')}
            highlight={sticker.status !== 'active'}
          />
          {sticker.status === 'active' && (
            <ValidityItem
              label="Days Remaining"
              value={`${daysToExpiry} days`}
              highlight={daysToExpiry <= 30}
            />
          )}
          {sticker.status === 'expired' && (
            <ValidityItem
              label="Expired Since"
              value={`${Math.abs(daysToExpiry)} days ago`}
              highlight
            />
          )}
        </View>

        {/* Expiry Warning */}
        {sticker.status === 'expiring' && (
          <View style={styles.warningBox}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>
              Your sticker expires in {daysToExpiry} days. Renew now to avoid interruption.
            </Text>
          </View>
        )}

        {/* Expired Warning */}
        {sticker.status === 'expired' && (
          <View style={styles.errorBox}>
            <Text style={styles.errorIcon}>🚫</Text>
            <Text style={styles.errorText}>
              This sticker has expired. Please renew immediately to restore gate access.
            </Text>
          </View>
        )}
      </Card>

      {/* Assigned Person */}
      <Card style={styles.assignedCard}>
        <Text style={styles.sectionTitle}>👤 Assigned To</Text>
        <View style={styles.assignedInfo}>
          <Avatar
            name={sticker.assignedTo.name}
            source={sticker.assignedTo.photoUrl}
            size="md"
          />
          <View style={styles.assignedDetails}>
            <Text style={styles.assignedName}>{sticker.assignedTo.name}</Text>
            {sticker.assignedTo.relationship && (
              <Text style={styles.assignedRelation}>{sticker.assignedTo.relationship}</Text>
            )}
          </View>
        </View>
        {sticker.householdAddress && (
          <View style={styles.addressBox}>
            <Text style={styles.addressLabel}>Household Address</Text>
            <Text style={styles.addressText}>{sticker.householdAddress}</Text>
          </View>
        )}
      </Card>

      {/* Actions */}
      <View style={styles.actions}>
        {canRenew && (
          <Button
            variant="primary"
            fullWidth
            onPress={handleRenewal}
            style={styles.actionButton}
          >
            🔄 Renew This Sticker
          </Button>
        )}
        <Button
          variant="outline"
          fullWidth
          onPress={() => navigation.navigate('StickerList')}
          style={styles.actionButton}
        >
          View All Stickers
        </Button>
      </View>

      {/* Important Notes */}
      <Card style={styles.notesCard}>
        <Text style={styles.notesTitle}>ℹ️ Important Notes</Text>
        <View style={styles.notesList}>
          <NoteItem text="Display this sticker visibly on your vehicle's windshield" />
          <NoteItem text="QR code must be clearly visible for gate scanning" />
          <NoteItem text="Sticker is non-transferable between vehicles" />
          <NoteItem text="Report lost or damaged stickers to the admin office immediately" />
          <NoteItem text="Renewal can be done 30 days before expiry" />
        </View>
      </Card>
    </ScrollView>
  );
};

// Helper Components
const ValidityItem: React.FC<{ label: string; value: string; highlight?: boolean }> = ({
  label,
  value,
  highlight,
}) => (
  <View style={styles.validityItem}>
    <Text style={styles.validityLabel}>{label}</Text>
    <Text style={[styles.validityValue, highlight && styles.highlightText]}>{value}</Text>
  </View>
);

const NoteItem: React.FC<{ text: string }> = ({ text }) => (
  <View style={styles.noteItem}>
    <Text style={styles.noteBullet}>•</Text>
    <Text style={styles.noteText}>{text}</Text>
  </View>
);

const TouchableOpacity: React.FC<any> = ({ onPress, children, style }) => (
  <View style={style}>
    <Button variant="ghost" size="sm" onPress={onPress}>
      {children}
    </Button>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 24,
  },
  headerCard: {
    margin: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  stickerNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  copyHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  vehicleHeader: {
    alignItems: 'center',
  },
  plateNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  vehicleDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  qrCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
  },
  qrInstruction: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  qrActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  validityCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  validityInfo: {
    marginBottom: 12,
  },
  validityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  validityLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  validityValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  highlightText: {
    color: '#ef4444',
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  errorIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#991b1b',
    lineHeight: 18,
  },
  assignedCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  assignedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  assignedDetails: {
    marginLeft: 16,
    flex: 1,
  },
  assignedName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  assignedRelation: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  addressBox: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
  },
  addressLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: '#374151',
  },
  actions: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  actionButton: {
    marginBottom: 12,
  },
  notesCard: {
    marginHorizontal: 16,
    marginBottom: 32,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  notesList: {
    marginTop: 8,
  },
  noteItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  noteBullet: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
});

export default StickerDetailsScreen;