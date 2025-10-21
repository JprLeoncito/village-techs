import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../contexts/ThemeContext';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { StatusIndicator } from '../ui/StatusIndicator';

interface GateEntry {
  id: string;
  entry_timestamp: string;
  exit_timestamp?: string;
  direction: 'in' | 'out';
  entry_type: 'resident' | 'guest' | 'delivery' | 'construction' | 'visitor';
  vehicle_plate?: string;
  rfid_code?: string;
  household_name?: string;
  photos?: string[];
  notes?: string;
  security_officer_name?: string;
  gate_name?: string;
  linked_entry_id?: string;
}

interface EntryCardProps {
  entry: GateEntry;
  onPress?: () => void;
  showDetails?: boolean;
}

export const EntryCard: React.FC<EntryCardProps> = ({
  entry,
  onPress,
  showDetails = true,
}) => {
  const { theme } = useTheme();

  const getEntryTypeIcon = (type: string) => {
    switch (type) {
      case 'resident':
        return 'home';
      case 'guest':
        return 'account-group';
      case 'delivery':
        return 'package';
      case 'construction':
        return 'hard-hat';
      case 'visitor':
        return 'account';
      default:
        return 'help-circle';
    }
  };

  const getEntryTypeColor = (type: string) => {
    switch (type) {
      case 'resident':
        return 'success';
      case 'guest':
        return 'warning';
      case 'delivery':
        return 'primary';
      case 'construction':
        return 'secondary';
      case 'visitor':
        return 'info';
      default:
        return 'primary';
    }
  };

  const getDirectionIcon = (direction: string) => {
    return direction === 'in' ? 'login' : 'logout';
  };

  const getDirectionColor = (direction: string) => {
    return direction === 'in' ? 'success' : 'warning';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const textStyles = {
    vehiclePlate: [styles.vehiclePlate, { color: theme.colors.text }],
    householdName: [styles.householdName, { color: theme.colors.muted }],
    officerName: [styles.officerName, { color: theme.colors.muted }],
    timestamp: [styles.timestamp, { color: theme.colors.muted }],
    notes: [styles.notes, { color: theme.colors.muted }],
    detailsText: [styles.detailsText, { color: theme.colors.primary }],
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.colors.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.typeContainer}>
          <Icon
            name={getEntryTypeIcon(entry.entry_type)}
            size={20}
            color={theme.colors.primary}
          />
          <Badge
            title={entry.entry_type}
            variant={getEntryTypeColor(entry.entry_type) as any}
            size="small"
          />
          <Icon
            name={getDirectionIcon(entry.direction)}
            size={16}
            color={theme.colors[getDirectionColor(entry.direction) as keyof typeof theme.colors]}
          />
        </View>

        <View style={styles.timeContainer}>
          <Text style={textStyles.timestamp}>
            {formatTimestamp(entry.entry_timestamp)}
          </Text>
          <Text style={textStyles.timestamp}>
            {formatDate(entry.entry_timestamp)}
          </Text>
        </View>
      </View>

      {/* Vehicle Info */}
      {entry.vehicle_plate && (
        <View style={styles.vehicleInfo}>
          <Icon name="car" size={16} color={theme.colors.muted} />
          <Text style={textStyles.vehiclePlate}>{entry.vehicle_plate}</Text>
          {entry.rfid_code && (
            <Text style={textStyles.householdName}>
              RFID: {entry.rfid_code.slice(0, 8)}...
            </Text>
          )}
        </View>
      )}

      {/* Household Info */}
      {entry.household_name && (
        <View style={styles.householdInfo}>
          <Icon name="home" size={16} color={theme.colors.muted} />
          <Text style={textStyles.householdName}>{entry.household_name}</Text>
        </View>
      )}

      {/* Notes */}
      {entry.notes && (
        <View style={styles.notesContainer}>
          <Icon name="text" size={16} color={theme.colors.muted} />
          <Text style={textStyles.notes} numberOfLines={2}>
            {entry.notes}
          </Text>
        </View>
      )}

      {/* Status Indicators */}
      <View style={styles.statusRow}>
        {/* Photos Indicator */}
        {entry.photos && entry.photos.length > 0 && (
          <View style={styles.statusItem}>
            <Icon name="camera" size={16} color={theme.colors.muted} />
            <Text style={textStyles.detailsText}>
              {entry.photos.length} photo{entry.photos.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Officer */}
        {entry.security_officer_name && (
          <View style={styles.statusItem}>
            <Icon name="account" size={16} color={theme.colors.muted} />
            <Text style={textStyles.officerName}>{entry.security_officer_name}</Text>
          </View>
        )}

        {/* Gate */}
        {entry.gate_name && (
          <View style={styles.statusItem}>
            <Icon name="map-marker" size={16} color={theme.colors.muted} />
            <Text style={textStyles.officerName}>{entry.gate_name}</Text>
          </View>
        )}

        {/* Linked Entry */}
        {entry.linked_entry_id && (
          <View style={styles.statusItem}>
            <Icon name="link" size={16} color={theme.colors.muted} />
            <Text style={textStyles.detailsText}>Linked</Text>
          </View>
        )}
      </View>

      {/* Expand Indicator */}
      {showDetails && (
        <View style={styles.expandIndicator}>
          <Icon name="chevron-right" size={20} color={theme.colors.muted} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeContainer: {
    alignItems: 'flex-end',
    gap: 2,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  vehiclePlate: {
    fontSize: 16,
    fontWeight: '600',
  },
  householdInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  householdName: {
    fontSize: 14,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  notes: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'center',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  officerName: {
    fontSize: 12,
  },
  timestamp: {
    fontSize: 12,
    textAlign: 'right',
  },
  detailsText: {
    fontSize: 12,
    fontWeight: '500',
  },
  expandIndicator: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
});