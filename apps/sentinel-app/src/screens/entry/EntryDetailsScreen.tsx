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
  Image,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/contexts/ThemeContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Header } from '@/components/shared/Header';

type EntryStackParamList = {
  EntryList: undefined;
  VehicleEntry: undefined;
  EntryLog: undefined;
  ExitLog: undefined;
  EntryDetails: {
    entryId: string;
  };
};

type EntryDetailsRouteProp = RouteProp<EntryStackParamList, 'EntryDetails'>;
type EntryDetailsNavigationProp = StackNavigationProp<EntryStackParamList, 'EntryDetails'>;

interface GateEntry {
  id: string;
  entry_timestamp: string;
  exit_timestamp?: string;
  direction: 'in' | 'out';
  entry_type: 'resident' | 'guest' | 'delivery' | 'construction' | 'visitor';
  vehicle_plate?: string;
  rfid_code?: string;
  household_name?: string;
  visitor_name?: string;
  contact_number?: string;
  purpose?: string;
  photos?: string[];
  notes?: string;
  security_officer_id: string;
  security_officer_name?: string;
  gate_name?: string;
  linked_entry_id?: string;
  created_at: string;
}

interface LinkedEntry {
  id: string;
  entry_timestamp: string;
  direction: 'in' | 'out';
  security_officer_name?: string;
}

export const EntryDetailsScreen: React.FC = () => {
  const { theme } = useTheme();
  const route = useRoute<EntryDetailsRouteProp>();
  const navigation = useNavigation<EntryDetailsNavigationProp>();
  const { entryId } = route.params;

  const [entry, setEntry] = useState<GateEntry | null>(null);
  const [linkedEntry, setLinkedEntry] = useState<LinkedEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  useEffect(() => {
    loadEntryDetails();
  }, [entryId]);

  const loadEntryDetails = async () => {
    try {
      // Load entry details
      const { data, error } = await supabase
        .from('gate_entries')
        .select('*')
        .eq('id', entryId)
        .single();

      if (error) {
        console.error('Error loading entry details:', error);
        Alert.alert('Error', 'Failed to load entry details');
        return;
      }

      setEntry(data);

      // Load linked entry if exists
      if (data.linked_entry_id) {
        const { data: linkedData, error: linkedError } = await supabase
          .from('gate_entries')
          .select('id, entry_timestamp, direction, security_officer_name')
          .eq('id', data.linked_entry_id)
          .single();

        if (!linkedError && linkedData) {
          setLinkedEntry(linkedData);
        }
      }
    } catch (error) {
      console.error('Error loading entry details:', error);
      Alert.alert('Error', 'Failed to load entry details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCallContact = () => {
    if (entry?.contact_number) {
      Linking.openURL(`tel:${entry.contact_number}`);
    }
  };

  const handleShareEntry = async () => {
    if (!entry) return;

    const entryText = `
Vehicle Entry Details
=====================
Plate: ${entry.vehicle_plate || 'N/A'}
Type: ${entry.entry_type}
Direction: ${entry.direction}
${entry.household_name ? `Household: ${entry.household_name}` : ''}
${entry.visitor_name ? `Visitor: ${entry.visitor_name}` : ''}
Entry Time: ${new Date(entry.entry_timestamp).toLocaleString()}
${entry.exit_timestamp ? `Exit Time: ${new Date(entry.exit_timestamp).toLocaleString()}` : 'Still Active'}
${entry.notes ? `Notes: ${entry.notes}` : ''}
    `.trim();

    try {
      await Share.share({
        message: entryText,
      });
    } catch (error) {
      console.error('Error sharing entry:', error);
    }
  };

  const formatDuration = () => {
    if (!entry) return '';
    if (!entry.exit_timestamp) return 'Still Active';

    const entryTime = new Date(entry.entry_timestamp);
    const exitTime = new Date(entry.exit_timestamp);
    const diffMs = exitTime.getTime() - entryTime.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h ${diffMins}m`;
    }
    return `${diffMins}m`;
  };

  const getEntryTypeIcon = (type: string) => {
    switch (type) {
      case 'resident': return 'home';
      case 'guest': return 'account-group';
      case 'delivery': return 'package';
      case 'construction': return 'hard-hat';
      case 'visitor': return 'account';
      default: return 'help-circle';
    }
  };

  const getEntryTypeColor = (type: string) => {
    switch (type) {
      case 'resident': return 'success';
      case 'guest': return 'warning';
      case 'delivery': return 'primary';
      case 'construction': return 'secondary';
      case 'visitor': return 'info';
      default: return 'primary';
    }
  };

  const textStyles = {
    title: [styles.title, { color: theme.colors.text }],
    subtitle: [styles.subtitle, { color: theme.colors.muted }],
    sectionTitle: [styles.sectionTitle, { color: theme.colors.text }],
    labelText: [styles.labelText, { color: theme.colors.muted }],
    valueText: [styles.valueText, { color: theme.colors.text }],
    plateNumber: [styles.plateNumber, { color: theme.colors.text }],
    photoCount: [styles.photoCount, { color: theme.colors.muted }],
    notesText: [styles.notesText, { color: theme.colors.text }],
    loadingText: [styles.loadingText, { color: theme.colors.muted }],
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header title="Entry Details" showBackButton />
        <View style={styles.loadingContainer}>
          <Icon name="loading" size={32} color={theme.colors.primary} />
          <Text style={textStyles.loadingText}>Loading entry details...</Text>
        </View>
      </View>
    );
  }

  if (!entry) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header title="Entry Details" showBackButton />
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={textStyles.title}>Entry Not Found</Text>
          <Text style={textStyles.subtitle}>The requested entry could not be found.</Text>
          <Button
            title="Go Back"
            onPress={() => navigation.goBack()}
            variant="outline"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Entry Details" showBackButton />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Vehicle Information */}
        <Card style={styles.card} padding={16}>
          <View style={styles.cardHeader}>
            <Icon name={getEntryTypeIcon(entry.entry_type)} size={24} color={theme.colors.primary} />
            <View style={styles.cardHeaderInfo}>
              <Text style={textStyles.plateNumber}>{entry.vehicle_plate || 'N/A'}</Text>
              <View style={styles.typeRow}>
                <Badge
                  title={entry.entry_type}
                  variant={getEntryTypeColor(entry.entry_type) as any}
                  size="small"
                />
                <Badge
                  title={entry.direction === 'in' ? 'Entry' : 'Exit'}
                  variant={entry.direction === 'in' ? 'success' : 'warning'}
                  size="small"
                />
              </View>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={textStyles.labelText}>Entry Time</Text>
              <Text style={textStyles.valueText}>
                {new Date(entry.entry_timestamp).toLocaleString()}
              </Text>
            </View>

            {entry.exit_timestamp && (
              <View style={styles.infoItem}>
                <Text style={textStyles.labelText}>Exit Time</Text>
                <Text style={textStyles.valueText}>
                  {new Date(entry.exit_timestamp).toLocaleString()}
                </Text>
              </View>
            )}

            <View style={styles.infoItem}>
              <Text style={textStyles.labelText}>Duration</Text>
              <Text style={textStyles.valueText}>{formatDuration()}</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={textStyles.labelText}>Gate</Text>
              <Text style={textStyles.valueText}>{entry.gate_name || 'Unknown'}</Text>
            </View>
          </View>
        </Card>

        {/* People Information */}
        <Card style={styles.card} padding={16}>
          <Text style={textStyles.sectionTitle}>People Information</Text>

          {entry.household_name && (
            <View style={styles.infoRow}>
              <Icon name="home" size={20} color={theme.colors.muted} />
              <View style={styles.infoContent}>
                <Text style={textStyles.labelText}>Household</Text>
                <Text style={textStyles.valueText}>{entry.household_name}</Text>
              </View>
            </View>
          )}

          {entry.visitor_name && (
            <View style={styles.infoRow}>
              <Icon name="account" size={20} color={theme.colors.muted} />
              <View style={styles.infoContent}>
                <Text style={textStyles.labelText}>Visitor</Text>
                <Text style={textStyles.valueText}>{entry.visitor_name}</Text>
              </View>
            </View>
          )}

          {entry.contact_number && (
            <View style={styles.infoRow}>
              <Icon name="phone" size={20} color={theme.colors.muted} />
              <View style={styles.infoContent}>
                <Text style={textStyles.labelText}>Contact</Text>
                <Text style={textStyles.valueText}>{entry.contact_number}</Text>
              </View>
              <TouchableOpacity
                style={[styles.callButton, { backgroundColor: theme.colors.success }]}
                onPress={handleCallContact}
              >
                <Icon name="phone" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          )}

          {entry.purpose && (
            <View style={styles.infoRow}>
              <Icon name="text" size={20} color={theme.colors.muted} />
              <View style={styles.infoContent}>
                <Text style={textStyles.labelText}>Purpose</Text>
                <Text style={textStyles.valueText}>{entry.purpose}</Text>
              </View>
            </View>
          )}

          {entry.rfid_code && (
            <View style={styles.infoRow}>
              <Icon name="chip" size={20} color={theme.colors.muted} />
              <View style={styles.infoContent}>
                <Text style={textStyles.labelText}>RFID Code</Text>
                <Text style={textStyles.valueText}>{entry.rfid_code}</Text>
              </View>
            </View>
          )}
        </Card>

        {/* Photos */}
        {entry.photos && entry.photos.length > 0 && (
          <Card style={styles.card} padding={16}>
            <View style={styles.sectionHeaderRow}>
              <Text style={textStyles.sectionTitle}>Photos</Text>
              <Text style={textStyles.photoCount}>
                {entry.photos.length} photo{entry.photos.length !== 1 ? 's' : ''}
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.photosList}>
                {entry.photos.map((photo, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.photoContainer,
                      selectedPhotoIndex === index && {
                        borderColor: theme.colors.primary,
                        borderWidth: 2,
                      },
                    ]}
                    onPress={() => setSelectedPhotoIndex(index)}
                  >
                    <Image source={{ uri: photo }} style={styles.photoThumbnail} />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Card>
        )}

        {/* Notes */}
        {entry.notes && (
          <Card style={styles.card} padding={16}>
            <Text style={textStyles.sectionTitle}>Notes</Text>
            <Text style={textStyles.notesText}>{entry.notes}</Text>
          </Card>
        )}

        {/* Security Information */}
        <Card style={styles.card} padding={16}>
          <Text style={textStyles.sectionTitle}>Security Information</Text>

          <View style={styles.infoRow}>
            <Icon name="account" size={20} color={theme.colors.muted} />
            <View style={styles.infoContent}>
              <Text style={textStyles.labelText}>Officer</Text>
              <Text style={textStyles.valueText}>{entry.security_officer_name || 'Unknown'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Icon name="calendar" size={20} color={theme.colors.muted} />
            <View style={styles.infoContent}>
              <Text style={textStyles.labelText}>Recorded</Text>
              <Text style={textStyles.valueText}>
                {new Date(entry.created_at).toLocaleString()}
              </Text>
            </View>
          </View>

          {linkedEntry && (
            <View style={styles.infoRow}>
              <Icon name="link" size={20} color={theme.colors.muted} />
              <View style={styles.infoContent}>
                <Text style={textStyles.labelText}>
                  Linked {linkedEntry.direction === 'in' ? 'Entry' : 'Exit'}
                </Text>
                <Text style={textStyles.valueText}>
                  {new Date(linkedEntry.entry_timestamp).toLocaleString()}
                </Text>
              </View>
            </View>
          )}
        </Card>

        {/* Actions */}
        <Card style={styles.card} padding={16}>
          <View style={styles.actions}>
            <Button
              title="Share Details"
              onPress={handleShareEntry}
              variant="outline"
              icon={<Icon name="share" size={20} color={theme.colors.primary} />}
            />

            {entry.direction === 'in' && !entry.exit_timestamp && (
              <Button
                title="Record Exit"
                onPress={() => navigation.navigate('ExitLog')}
                icon={<Icon name="logout" size={20} color="#ffffff" />}
              />
            )}
          </View>
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  plateNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  infoContent: {
    flex: 1,
    gap: 2,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '500',
  },
  valueText: {
    fontSize: 16,
  },
  photoCount: {
    fontSize: 14,
  },
  photosList: {
    flexDirection: 'row',
    gap: 8,
  },
  photoContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoThumbnail: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  notesText: {
    fontSize: 16,
    lineHeight: 24,
  },
  callButton: {
    padding: 8,
    borderRadius: 20,
  },
  actions: {
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
  },
});