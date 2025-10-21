import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { format, formatDistanceToNow } from 'date-fns';


import { MaterialIcons } from '@expo/vector-icons';interface StickerRequest {
  id: string;
  vehiclePlate: string;
  vehicleDetails: string;
  status: 'requested' | 'processing' | 'approved' | 'rejected';
  submittedAt: Date;
  processedAt?: Date;
  rejectionReason?: string;
  approvalNote?: string;
  assignedTo: string;
}

interface StickerStatusTrackerProps {
  request: StickerRequest;
  onPress?: () => void;
}

export const StickerStatusTracker: React.FC<StickerStatusTrackerProps> = ({
  request,
  onPress,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'requested':
        return '#f59e0b';
      case 'processing':
        return '#3b82f6';
      case 'approved':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'requested':
        return <MaterialIcons name="description" size={16} color="#6b7280" />;
      case 'processing':
        return <MaterialIcons name="hourglass-empty" size={16} color="#6b7280" />;
      case 'approved':
        return <MaterialIcons name="check-circle" size={16} color="#10b981" />;
      case 'rejected':
        return <MaterialIcons name="cancel" size={16} color="#ef4444" />;
      default:
        return <MaterialIcons name="circle" size={8} color="#6b7280" />;
    }
  };

  const getProgressSteps = () => {
    const steps = [
      { key: 'submitted', label: 'Submitted', completed: true },
      { key: 'reviewing', label: 'Under Review', completed: request.status !== 'requested' },
      { key: 'processing', label: 'Processing', completed: request.status === 'approved' || request.status === 'rejected' },
      {
        key: 'completed',
        label: request.status === 'approved' ? 'Approved' : request.status === 'rejected' ? 'Rejected' : 'Completed',
        completed: request.status === 'approved' || request.status === 'rejected'
      },
    ];

    return steps;
  };

  const steps = getProgressSteps();

  return (
    <Card onPress={onPress} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.vehicleInfo}>
          <Text style={styles.plateNumber}>{request.vehiclePlate}</Text>
          <Text style={styles.vehicleDetails}>{request.vehicleDetails}</Text>
          <Text style={styles.assignedTo}>For: {request.assignedTo}</Text>
        </View>
        <Badge
          variant={
            request.status === 'approved' ? 'success' :
            request.status === 'rejected' ? 'error' :
            request.status === 'processing' ? 'info' : 'warning'
          }
        >
          {getStatusIcon(request.status)} {request.status.toUpperCase()}
        </Badge>
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          {steps.map((step, index) => (
            <React.Fragment key={step.key}>
              {/* Step Circle */}
              <View style={styles.stepWrapper}>
                <View
                  style={[
                    styles.stepCircle,
                    step.completed && styles.stepCompleted,
                    request.status === 'rejected' && step.key === 'completed' && styles.stepRejected,
                  ]}
                >
                  {step.completed ? (
                    <Text style={styles.stepIcon}>
                      {request.status === 'rejected' && step.key === 'completed' ? '✕' : '✓'}
                    </Text>
                  ) : (
                    <View style={styles.stepDot} />
                  )}
                </View>
                <Text style={[styles.stepLabel, step.completed && styles.stepLabelCompleted]}>
                  {step.label}
                </Text>
              </View>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <View
                  style={[
                    styles.connector,
                    step.completed && styles.connectorCompleted,
                    request.status === 'rejected' && index === steps.length - 2 && styles.connectorRejected,
                  ]}
                />
              )}
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* Timeline */}
      <View style={styles.timeline}>
        <View style={styles.timelineItem}>
          <Text style={styles.timelineLabel}>Submitted</Text>
          <Text style={styles.timelineValue}>
            {format(new Date(request.submittedAt), 'MMM dd, yyyy HH:mm')}
          </Text>
          <Text style={styles.timelineAgo}>
            {formatDistanceToNow(new Date(request.submittedAt))} ago
          </Text>
        </View>

        {request.processedAt && (
          <View style={styles.timelineItem}>
            <Text style={styles.timelineLabel}>
              {request.status === 'approved' ? 'Approved' : 'Processed'}
            </Text>
            <Text style={styles.timelineValue}>
              {format(new Date(request.processedAt), 'MMM dd, yyyy HH:mm')}
            </Text>
            <Text style={styles.timelineAgo}>
              {formatDistanceToNow(new Date(request.processedAt))} ago
            </Text>
          </View>
        )}
      </View>

      {/* Status Messages */}
      {request.status === 'requested' && (
        <View style={styles.messageBox}>
          <Text style={styles.messageIcon}>ℹ️</Text>
          <Text style={styles.messageText}>
            Your request is pending review. You will be notified once it's processed.
          </Text>
        </View>
      )}

      {request.status === 'processing' && (
        <View style={[styles.messageBox, styles.processingBox]}>
          <Text style={styles.messageIcon}>⏳</Text>
          <Text style={styles.messageText}>
            Your request is being processed. This usually takes 1-2 business days.
          </Text>
        </View>
      )}

      {request.status === 'approved' && request.approvalNote && (
        <View style={[styles.messageBox, styles.successBox]}>
          <Text style={styles.messageIcon}>✅</Text>
          <View style={styles.messageContent}>
            <Text style={styles.messageTitle}>Approved!</Text>
            <Text style={styles.messageText}>{request.approvalNote}</Text>
            <Text style={styles.messageSubtext}>
              Your sticker is ready for pickup at the admin office.
            </Text>
          </View>
        </View>
      )}

      {request.status === 'rejected' && request.rejectionReason && (
        <View style={[styles.messageBox, styles.errorBox]}>
          <Text style={styles.messageIcon}>❌</Text>
          <View style={styles.messageContent}>
            <Text style={styles.messageTitle}>Request Rejected</Text>
            <Text style={styles.messageText}>{request.rejectionReason}</Text>
            <Text style={styles.messageSubtext}>
              Please address the issue and submit a new request.
            </Text>
          </View>
        </View>
      )}

      {/* Estimated Processing Time */}
      {(request.status === 'requested' || request.status === 'processing') && (
        <View style={styles.estimatedTime}>
          <Text style={styles.estimatedTimeLabel}>Estimated Processing Time</Text>
          <Text style={styles.estimatedTimeValue}>1-2 Business Days</Text>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  vehicleInfo: {
    flex: 1,
  },
  plateNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  vehicleDetails: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  assignedTo: {
    fontSize: 13,
    color: '#6b7280',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  stepWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepCompleted: {
    backgroundColor: '#10b981',
  },
  stepRejected: {
    backgroundColor: '#ef4444',
  },
  stepIcon: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9ca3af',
  },
  stepLabel: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
  },
  stepLabelCompleted: {
    color: '#1f2937',
    fontWeight: '500',
  },
  connector: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#e5e7eb',
    top: 16,
    left: '25%',
    right: '25%',
  },
  connectorCompleted: {
    backgroundColor: '#10b981',
  },
  connectorRejected: {
    backgroundColor: '#ef4444',
  },
  timeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f3f4f6',
    marginBottom: 16,
  },
  timelineItem: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  timelineValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  timelineAgo: {
    fontSize: 11,
    color: '#9ca3af',
  },
  messageBox: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 12,
  },
  processingBox: {
    backgroundColor: '#eff6ff',
  },
  successBox: {
    backgroundColor: '#f0fdf4',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
  },
  messageIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  messageContent: {
    flex: 1,
  },
  messageTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  messageSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  estimatedTime: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  estimatedTimeLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  estimatedTimeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
});

export default StickerStatusTracker;