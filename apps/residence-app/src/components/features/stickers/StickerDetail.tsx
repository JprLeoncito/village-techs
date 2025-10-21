import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Linking,
  Share,
} from 'react-native';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { Modal } from '../../ui/Modal';
import { VehicleSticker } from '../../../types/stickers';

interface StickerDetailProps {
  stickerId: string;
  onBack?: () => void;
  onEdit?: (sticker: VehicleSticker) => void;
  onRenew?: (sticker: VehicleSticker) => void;
  showActions?: boolean;
}

export const StickerDetail: React.FC<StickerDetailProps> = ({
  stickerId,
  onBack,
  onEdit,
  onRenew,
  showActions = true,
}) => {
  const [sticker, setSticker] = useState<VehicleSticker | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadStickerDetail();
  }, [stickerId]);

  const loadStickerDetail = async () => {
    try {
      setLoading(true);

      // Import stickerService dynamically to avoid circular dependencies
      const { stickerService } = await import('../../../services/stickerService');

      const result = await stickerService.getStickerById(stickerId);

      if (result.success && result.data) {
        setSticker(result.data);
      } else {
        console.error('Failed to load sticker:', result.error);
        Alert.alert('Error', 'Failed to load sticker details');
      }
    } catch (error) {
      console.error('Load sticker error:', error);
      Alert.alert('Error', 'Failed to load sticker details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!sticker) return;

    try {
      setCancelling(true);

      // Import stickerService dynamically
      const { stickerService } = await import('../../../services/stickerService');

      const result = await stickerService.cancelStickerRequest(
        sticker.id,
        'Cancelled by resident'
      );

      if (result.success) {
        Alert.alert(
          'Success',
          'Sticker request has been cancelled',
          [
            {
              text: 'OK',
              onPress: () => {
                loadStickerDetail(); // Reload the details
                setShowCancelModal(false);
              },
            },
          ]
        );
      } else {
        throw new Error(result.error || 'Failed to cancel request');
      }
    } catch (error) {
      console.error('Cancel request error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel request';
      Alert.alert('Error', errorMessage);
    } finally {
      setCancelling(false);
    }
  };

  const handleDownloadDocument = async (documentId: string) => {
    try {
      // Import stickerService dynamically
      const { stickerService } = await import('../../../services/stickerService');

      const result = await stickerService.downloadDocument(documentId);

      if (result.success && result.url) {
        // Open the document URL
        const supported = await Linking.canOpenURL(result.url);
        if (supported) {
          await Linking.openURL(result.url);
        } else {
          Alert.alert('Error', 'Cannot open document');
        }
      } else {
        throw new Error(result.error || 'Failed to download document');
      }
    } catch (error) {
      console.error('Download document error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to download document';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleShareSticker = async () => {
    if (!sticker) return;

    try {
      const message = `
Vehicle Sticker Information:
- Make: ${sticker.vehicle_make} ${sticker.vehicle_model}
- Plate: ${sticker.license_plate}
- Color: ${sticker.vehicle_color}
- Status: ${sticker.status}
${sticker.sticker_number ? `- Sticker #: ${sticker.sticker_number}` : ''}
${sticker.issued_date ? `- Issued: ${new Date(sticker.issued_date).toLocaleDateString()}` : ''}
${sticker.expiry_date ? `- Expires: ${new Date(sticker.expiry_date).toLocaleDateString()}` : ''}
      `.trim();

      await Share.share({
        message,
        title: 'Vehicle Sticker Information',
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share sticker information');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'approved':
        return '#10b981';
      case 'issued':
        return '#3b82f6';
      case 'rejected':
        return '#ef4444';
      case 'expired':
        return '#6b7280';
      case 'revoked':
        return '#991b1b';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '�';
      case 'approved':
        return '';
      case 'issued':
        return '=�';
      case 'rejected':
        return 'L';
      case 'expired':
        return '�';
      case 'revoked':
        return '=�';
      default:
        return 'S';
    }
  };

  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType) {
      case 'car':
        return '=�';
      case 'motorcycle':
        return '<�';
      case 'bicycle':
        return '=�';
      case 'electric_bike':
        return '=�';
      case 'other':
        return '=�';
      default:
        return '=�';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isExpired = () => {
    if (!sticker?.expiry_date) return false;
    return new Date(sticker.expiry_date) < new Date();
  };

  const canCancel = () => {
    return sticker?.status === 'pending';
  };

  const canRenew = () => {
    return sticker?.status === 'issued' && isExpired();
  };

  const getDocumentTypeName = (type: string) => {
    const typeNames: Record<string, string> = {
      or: 'Official Receipt (OR)',
      cr: 'Certificate of Registration (CR)',
      deed_of_sale: 'Deed of Sale',
      authorization: 'Authorization Letter',
      government_id: 'Government ID',
      other: 'Other Document',
    };
    return typeNames[type] || type;
  };

  if (loading) {
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
        <Text style={styles.errorText}>Sticker not found</Text>
        <Button title="Go Back" onPress={onBack} style={styles.errorButton} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <Card style={styles.headerCard}>
        <View style={styles.header}>
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleIcon}>{getVehicleIcon(sticker.vehicle_type)}</Text>
            <View style={styles.vehicleDetails}>
              <Text style={styles.vehicleName}>
                {sticker.vehicle_make} {sticker.vehicle_model}
              </Text>
              <Text style={styles.vehicleMeta}>
                {sticker.vehicle_color} " {sticker.license_plate}
              </Text>
            </View>
          </View>
          <Badge
            text={`${getStatusIcon(sticker.status)} ${sticker.status}`}
            backgroundColor={getStatusColor(sticker.status)}
          />
        </View>

        {sticker.sticker_number && (
          <View style={styles.stickerNumberContainer}>
            <Text style={styles.stickerNumberLabel}>Sticker Number:</Text>
            <Text style={styles.stickerNumber}>{sticker.sticker_number}</Text>
          </View>
        )}
      </Card>

      {/* Status Information */}
      <Card style={styles.statusCard}>
        <Text style={styles.sectionTitle}>Status Information</Text>

        <View style={styles.statusGrid}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Current Status:</Text>
            <Badge
              text={sticker.status}
              backgroundColor={getStatusColor(sticker.status)}
            />
          </View>

          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Date Requested:</Text>
            <Text style={styles.statusValue}>{formatDate(sticker.created_at)}</Text>
          </View>

          {sticker.approved_at && (
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Date Approved:</Text>
              <Text style={styles.statusValue}>{formatDate(sticker.approved_at)}</Text>
            </View>
          )}

          {sticker.issued_date && (
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Date Issued:</Text>
              <Text style={styles.statusValue}>{formatDate(sticker.issued_date)}</Text>
            </View>
          )}

          {sticker.expiry_date && (
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>
                Expiry Date {isExpired() && '(Expired)'}:
              </Text>
              <Text style={[styles.statusValue, isExpired() && styles.expiredText]}>
                {formatDate(sticker.expiry_date)}
              </Text>
            </View>
          )}
        </View>

        {sticker.status === 'rejected' && sticker.rejection_reason && (
          <View style={styles.rejectionContainer}>
            <Text style={styles.rejectionTitle}>Rejection Reason:</Text>
            <Text style={styles.rejectionText}>{sticker.rejection_reason}</Text>
          </View>
        )}
      </Card>

      {/* Vehicle Information */}
      <Card style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Vehicle Information</Text>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Vehicle Type:</Text>
            <Text style={styles.infoValue}>
              {sticker.vehicle_type.charAt(0).toUpperCase() + sticker.vehicle_type.slice(1)}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Make:</Text>
            <Text style={styles.infoValue}>{sticker.vehicle_make}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Model:</Text>
            <Text style={styles.infoValue}>{sticker.vehicle_model}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Color:</Text>
            <Text style={styles.infoValue}>{sticker.vehicle_color}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>License Plate:</Text>
            <Text style={styles.infoValue}>{sticker.license_plate}</Text>
          </View>

          {sticker.or_number && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>OR Number:</Text>
              <Text style={styles.infoValue}>{sticker.or_number}</Text>
            </View>
          )}

          {sticker.cr_number && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>CR Number:</Text>
              <Text style={styles.infoValue}>{sticker.cr_number}</Text>
            </View>
          )}
        </View>
      </Card>

  
      {/* Documents */}
      {sticker.documents && sticker.documents.length > 0 && (
        <Card style={styles.documentsCard}>
          <Text style={styles.sectionTitle}>Submitted Documents</Text>

          {sticker.documents.map((document) => (
            <View key={document.id} style={styles.documentItem}>
              <View style={styles.documentInfo}>
                <Text style={styles.documentName}>{document.file_name}</Text>
                <Text style={styles.documentType}>{getDocumentTypeName(document.document_type)}</Text>
                <Text style={styles.documentSize}>
                  {(document.file_size / 1024).toFixed(1)} KB
                </Text>
              </View>
              <Button
                title="View"
                onPress={() => handleDownloadDocument(document.id)}
                variant="outline"
                size="sm"
              />
            </View>
          ))}
        </Card>
      )}

      {/* Actions */}
      {showActions && (
        <Card style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Actions</Text>

          <View style={styles.actionsGrid}>
            <Button
              title="Share"
              onPress={handleShareSticker}
              variant="outline"
              style={styles.actionButton}
            />

            {canCancel() && (
              <Button
                title="Cancel Request"
                onPress={() => setShowCancelModal(true)}
                variant="outline"
                style={[styles.actionButton, styles.cancelButton]}
              />
            )}

            {canRenew() && onRenew && (
              <Button
                title="Renew Sticker"
                onPress={() => onRenew(sticker)}
                style={styles.actionButton}
              />
            )}

            {onEdit && sticker.status === 'pending' && (
              <Button
                title="Edit Request"
                onPress={() => onEdit(sticker)}
                variant="outline"
                style={styles.actionButton}
              />
            )}
          </View>
        </Card>
      )}

      {/* Cancel Confirmation Modal */}
      <Modal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Request"
      >
        <View style={styles.cancelModalContent}>
          <Text style={styles.cancelMessage}>
            Are you sure you want to cancel this vehicle sticker request? This action cannot be undone.
          </Text>

          <View style={styles.cancelActions}>
            <Button
              title="No, Keep Request"
              onPress={() => setShowCancelModal(false)}
              variant="outline"
              style={styles.cancelActionButton}
            />
            <Button
              title="Yes, Cancel Request"
              onPress={handleCancelRequest}
              loading={cancelling}
              style={[styles.cancelActionButton, styles.confirmCancelButton]}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
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
    backgroundColor: '#f9fafb',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    marginBottom: 24,
    textAlign: 'center',
  },
  errorButton: {
    alignSelf: 'center',
  },
  headerCard: {
    margin: 16,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  vehicleIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  vehicleDetails: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  vehicleMeta: {
    fontSize: 16,
    color: '#6b7280',
  },
  stickerNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  stickerNumberLabel: {
    fontSize: 14,
    color: '#0369a1',
    marginRight: 8,
  },
  stickerNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369a1',
  },
  statusCard: {
    margin: 16,
    marginTop: 8,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  statusGrid: {
    gap: 12,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  statusValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  expiredText: {
    color: '#ef4444',
    fontWeight: '600',
  },
  rejectionContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  rejectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: 8,
  },
  rejectionText: {
    fontSize: 14,
    color: '#7f1d1d',
    lineHeight: 20,
  },
  infoCard: {
    margin: 16,
    marginTop: 8,
    padding: 20,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  documentsCard: {
    margin: 16,
    marginTop: 8,
    padding: 20,
  },
  documentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  documentType: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  documentSize: {
    fontSize: 12,
    color: '#9ca3af',
  },
  actionsCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 32,
    padding: 20,
  },
  actionsGrid: {
    gap: 12,
  },
  actionButton: {
    marginBottom: 8,
  },
  cancelButton: {
    borderColor: '#ef4444',
  },
  cancelModalContent: {
    padding: 20,
  },
  cancelMessage: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  cancelActions: {
    gap: 12,
  },
  cancelActionButton: {
    flex: 1,
  },
  confirmCancelButton: {
    backgroundColor: '#ef4444',
  },
});

export default StickerDetail;