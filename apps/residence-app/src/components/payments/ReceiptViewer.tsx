import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Share,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { format } from 'date-fns';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';


import { MaterialIcons } from '@expo/vector-icons';interface ReceiptData {
  id: string;
  transactionId: string;
  feeId: string;
  feeTitle: string;
  feeType: string;
  amount: number;
  lateFee?: number;
  totalAmount: number;
  paidAmount: number;
  paymentMethod: 'stripe' | 'paymongo' | 'gcash';
  paymentStatus: 'completed' | 'pending' | 'failed' | 'refunded';
  paidAt: Date;
  dueDate: Date;
  receiptUrl?: string;
  paymentGatewayId?: string;
  cardLast4?: string;
  cardBrand?: string;
  billingAddress?: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
}

interface ReceiptViewerProps {
  visible: boolean;
  receipt: ReceiptData | null;
  isLoading?: boolean;
  onClose?: () => void;
  onDownloadPDF?: (receiptId: string) => Promise<string>;
  onShare?: (receiptData: ReceiptData) => void;
  onPrint?: (receiptData: ReceiptData) => void;
}

export const ReceiptViewer: React.FC<ReceiptViewerProps> = ({
  visible,
  receipt,
  isLoading = false,
  onClose,
  onDownloadPDF,
  onShare,
  onPrint,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleDownloadPDF = async () => {
    if (!receipt || !onDownloadPDF) return;

    setIsDownloading(true);
    try {
      const pdfUrl = await onDownloadPDF(receipt.id);

      // Download the PDF
      const downloadResult = await FileSystem.downloadAsync(
        pdfUrl,
        FileSystem.documentDirectory + `receipt_${receipt.transactionId}.pdf`
      );

      if (downloadResult.status === 200) {
        // Share the downloaded file
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Share Receipt PDF',
          });
        } else {
          Alert.alert(
            'Download Complete',
            `Receipt saved to: ${downloadResult.uri}`,
            [{ text: 'OK' }]
          );
        }
      } else {
        throw new Error('Failed to download PDF');
      }
    } catch (error) {
      console.error('Failed to download receipt:', error);
      Alert.alert(
        'Download Failed',
        'Unable to download receipt. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!receipt) return;

    setIsSharing(true);
    try {
      if (onShare) {
        onShare(receipt);
      } else {
        // Default share functionality
        const shareContent = `
Payment Receipt - Village Tech
===============================
Transaction ID: ${receipt.transactionId}
Fee: ${receipt.feeTitle}
Amount: ₱${receipt.totalAmount.toFixed(2)}
Payment Method: ${receipt.paymentMethod.toUpperCase()}
Date: ${format(receipt.paidAt, 'MMM dd, yyyy HH:mm')}
Status: ${receipt.paymentStatus.toUpperCase()}
        `.trim();

        await Share.share({
          message: shareContent,
          title: 'Payment Receipt',
        });
      }
    } catch (error) {
      console.error('Failed to share receipt:', error);
      // User cancelled sharing is not an error
    } finally {
      setIsSharing(false);
    }
  };

  const handlePrint = () => {
    if (!receipt || !onPrint) return;
    onPrint(receipt);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'failed':
        return '#ef4444';
      case 'refunded':
        return '#6366f1';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <MaterialIcons name="check-circle" size={16} color="#10b981" />;
      case 'pending':
        <MaterialIcons name="hourglass-empty" size={16} color="#6b7280" />;
      case 'failed':
        return <MaterialIcons name="cancel" size={16} color="#ef4444" />;
      case 'refunded':
        return <MaterialIcons name="refresh" size={16} color="#6b7280" />;
      default:
        return <MaterialIcons name="circle" size={8} color="#6b7280" />;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'stripe':
        return <MaterialIcons name="credit-card" size={16} color="#6b7280" />;
      case 'paymongo':
        <MaterialIcons name="smartphone" size={16} color="#6b7280" />;
      case 'gcash':
        return '🇵🇭';
      default:
        <MaterialIcons name="credit-card" size={16} color="#6b7280" />;
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Button
            variant="ghost"
            onPress={onClose}
            style={styles.closeButton}
          >
            Close
          </Button>
          <Text style={styles.title}>Payment Receipt</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {isLoading || !receipt ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Loading receipt...</Text>
            </View>
          ) : (
            <>
              {/* Receipt Header */}
              <Card style={styles.receiptHeader}>
                <View style={styles.receiptHeaderRow}>
                  <Text style={styles.receiptTitle}>Payment Receipt</Text>
                  <Badge
                    variant={receipt.paymentStatus === 'completed' ? 'success' : 'warning'}
                  >
                    {getStatusIcon(receipt.paymentStatus)} {receipt.paymentStatus.toUpperCase()}
                  </Badge>
                </View>
                <Text style={styles.receiptSubtitle}>
                  Village Tech Association Management
                </Text>
              </Card>

              {/* Transaction Details */}
              <Card style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Transaction Details</Text>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Transaction ID:</Text>
                  <Text style={styles.detailValue}>{receipt.transactionId}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date & Time:</Text>
                  <Text style={styles.detailValue}>
                    {format(receipt.paidAt, 'MMM dd, yyyy HH:mm')}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Payment Method:</Text>
                  <View style={styles.paymentMethodInfo}>
                    <Text style={styles.detailValue}>
                      {getPaymentMethodIcon(receipt.paymentMethod)} {receipt.paymentMethod.toUpperCase()}
                    </Text>
                    {receipt.cardLast4 && (
                      <Text style={styles.cardInfo}>
                        •••• {receipt.cardLast4}
                      </Text>
                    )}
                  </View>
                </View>

                {receipt.paymentGatewayId && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Gateway Ref:</Text>
                    <Text style={styles.detailValue}>{receipt.paymentGatewayId}</Text>
                  </View>
                )}
              </Card>

              {/* Fee Details */}
              <Card style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Fee Details</Text>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Fee Type:</Text>
                  <Text style={styles.detailValue}>{receipt.feeType}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Description:</Text>
                  <Text style={styles.detailValue}>{receipt.feeTitle}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Due Date:</Text>
                  <Text style={styles.detailValue}>
                    {format(receipt.dueDate, 'MMM dd, yyyy')}
                  </Text>
                </View>
              </Card>

              {/* Payment Breakdown */}
              <Card style={styles.amountCard}>
                <Text style={styles.sectionTitle}>Payment Breakdown</Text>

                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Fee Amount:</Text>
                  <Text style={styles.amountValue}>₱{receipt.amount.toFixed(2)}</Text>
                </View>

                {receipt.lateFee && receipt.lateFee > 0 && (
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Late Fee:</Text>
                    <Text style={styles.amountValue}>₱{receipt.lateFee.toFixed(2)}</Text>
                  </View>
                )}

                <View style={[styles.amountRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total Paid:</Text>
                  <Text style={styles.totalValue}>₱{receipt.totalAmount.toFixed(2)}</Text>
                </View>

                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Status:</Text>
                  <Text style={[styles.amountValue, { color: getStatusColor(receipt.paymentStatus) }]}>
                    {receipt.paymentStatus.toUpperCase()}
                  </Text>
                </View>
              </Card>

              {/* Billing Information */}
              {receipt.billingAddress && (
                <Card style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Billing Information</Text>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Name:</Text>
                    <Text style={styles.detailValue}>{receipt.billingAddress.name}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Email:</Text>
                    <Text style={styles.detailValue}>{receipt.billingAddress.email}</Text>
                  </View>

                  {receipt.billingAddress.phone && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Phone:</Text>
                      <Text style={styles.detailValue}>{receipt.billingAddress.phone}</Text>
                    </View>
                  )}

                  {receipt.billingAddress.address && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Address:</Text>
                      <Text style={styles.detailValue}>{receipt.billingAddress.address}</Text>
                    </View>
                  )}
                </Card>
              )}

              {/* Footer */}
              <Card style={styles.footerCard}>
                <Text style={styles.footerText}>
                  Thank you for your payment! This receipt serves as proof of payment.
                </Text>
                <Text style={styles.footerSubtext}>
                  For any questions or concerns, please contact the association office.
                </Text>
              </Card>
            </>
          )}
        </ScrollView>

        {/* Action Buttons */}
        {!isLoading && receipt && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleShare}
              disabled={isSharing}
            >
              <Text style={styles.actionButtonText}>📤 Share</Text>
            </TouchableOpacity>

            {onDownloadPDF && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleDownloadPDF}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.actionButtonText}>📄 Download</Text>
                )}
              </TouchableOpacity>
            )}

            {onPrint && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handlePrint}
              >
                <Text style={styles.actionButtonText}>🖨️ Print</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  receiptHeader: {
    marginBottom: 16,
    alignItems: 'center',
  },
  receiptHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  receiptTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  receiptSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  paymentMethodInfo: {
    flex: 2,
    alignItems: 'flex-end',
  },
  cardInfo: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  amountCard: {
    marginBottom: 16,
    backgroundColor: '#f8fafc',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  amountLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 18,
    color: '#1f2937',
    fontWeight: 'bold',
  },
  footerCard: {
    marginBottom: 100,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  actionButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ReceiptViewer;