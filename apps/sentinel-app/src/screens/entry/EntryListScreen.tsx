import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/lib/AuthContext';
import { useRFIDScanner } from '@/services/rfid/RFIDService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { Header } from '@/components/shared/Header';
import { RFIDScanner } from '@/components/rfid/RFIDScanner';
import { RFIDStatus } from '@/components/rfid/RFIDStatus';
import { PhotoCapture } from '@/components/camera/PhotoCapture';
import { EntryCard } from '@/components/lists/EntryCard';

type EntryStackParamList = {
  EntryList: undefined;
  VehicleEntry: undefined;
  EntryLog: undefined;
  ExitLog: undefined;
  EntryDetails: {
    entryId: string;
  };
};

type EntryListScreenNavigationProp = StackNavigationProp<EntryStackParamList, 'EntryList'>;

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

interface VehicleSticker {
  id: string;
  vehicle_plate: string;
  household_name: string;
  residence_number: string;
  member_names: string[];
  status: 'active' | 'expired';
  expiry_date: number;
}

export const EntryListScreen: React.FC = () => {
  const [gateEntries, setGateEntries] = useState<GateEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRFIDScanner, setShowRFIDScanner] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [currentSticker, setCurrentSticker] = useState<VehicleSticker | null>(null);
  const [entryPhotos, setEntryPhotos] = useState<{ uri: string; timestamp: number }[]>([]);
  const [entryNotes, setEntryNotes] = useState('');
  const [isProcessingEntry, setIsProcessingEntry] = useState(false);

  const { theme } = useTheme();
  const { officer } = useAuth();
  const navigation = useNavigation<EntryListScreenNavigationProp>();
  const {
    rfidCode,
    isConnected,
    error,
    clearRfidCode,
    scanForReaders,
    connectReader,
    disconnectReader,
  } = useRFIDScanner();

  useEffect(() => {
    loadGateEntries();
  }, []);

  useEffect(() => {
    if (rfidCode) {
      // Look up the sticker when RFID is scanned
      lookupSticker(rfidCode);
    }
  }, [rfidCode]);

  const loadGateEntries = async () => {
    try {
      if (!officer?.tenantId) return;

      const { data, error } = await supabase
        .from('gate_entries')
        .select('*')
        .eq('tenant_id', officer.tenantId)
        .order('entry_timestamp', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading gate entries:', error);
        return;
      }

      setGateEntries(data || []);
    } catch (error) {
      console.error('Error loading gate entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const lookupSticker = async (rfid: string) => {
    try {
      setIsProcessingEntry(true);

      if (!officer?.tenantId) return;

      const { data, error } = await supabase
        .from('stickers')
        .select('*')
        .eq('rfid_code', rfid)
        .eq('tenant_id', officer.tenantId)
        .eq('status', 'active')
        .single();

      if (error || !data) {
        console.error('Error looking up sticker:', error);
        setCurrentSticker(null);
        return;
      }

      setCurrentSticker(data);
    } catch (error) {
      console.error('Error looking up sticker:', error);
      setCurrentSticker(null);
    } finally {
      setIsProcessingEntry(false);
    }
  };

  const handleNewEntry = async () => {
    if (!currentSticker || !officer) return;

    try {
      setIsProcessingEntry(true);

      // Get current gate (you might want to implement gate selection/storage)
      const { data: gateData } = await supabase
        .from('security_shifts')
        .select('gate_id')
        .eq('officer_id', officer.id)
        .eq('status', 'active')
        .single();

      if (!gateData) {
        throw new Error('No active gate found');
      }

      // Create entry record
      const { data, error } = await supabase
        .from('gate_entries')
        .insert([{
          gate_id: gateData.gate_id,
          entry_timestamp: new Date().toISOString(),
          direction: 'in',
          entry_type: 'resident',
          vehicle_plate: currentSticker.vehicle_plate,
          rfid_code: currentSticker.rfid_code,
          household_name: currentSticker.household_name,
          photos: entryPhotos.map(photo => photo.uri),
          notes: entryNotes || null,
          security_officer_id: officer.id,
        }])
        .select()
        .single();

      if (error) throw error;

      // Clear form
      setCurrentSticker(null);
      setEntryPhotos([]);
      setEntryNotes('');
      clearRfidCode();

      // Refresh entries list
      await loadGateEntries();

      Alert.alert(
        'Entry Recorded',
        `Successfully recorded entry for ${currentSticker.vehicle_plate}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error creating entry:', error);
      Alert.alert(
        'Error',
        'Failed to record entry. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessingEntry(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGateEntries();
    setRefreshing(false);
  };

  const handleEntryPress = (entry: GateEntry) => {
    navigation.navigate('EntryDetails', { entryId: entry.id });
  };

  const handleScanSuccess = (rfid: string) => {
    setShowRFIDScanner(false);
    // The lookupSticker effect will handle the lookup
  };

  const handlePhotoCapture = (photo: { uri: string; timestamp: number }) => {
    setEntryPhotos(prev => [...prev, photo].slice(-3)); // Keep max 3 photos
    setShowPhotoCapture(false);
  };

  const textStyles = {
    title: [styles.title, { color: theme.colors.text }],
    subtitle: [styles.subtitle, { color: theme.colors.muted }],
    entryTime: [styles.entryTime, { color: theme.colors.muted }],
    noEntriesText: [styles.noEntriesText, { color: theme.colors.muted }],
    emptyText: [styles.emptyText, { color: theme.colors.muted }],
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header title="Vehicle Entry" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={textStyles.title}>Loading entries...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Vehicle Entry" />

      {/* Quick Actions */}
      <View style={styles.actions}>
        <Button
          title="Scan RFID"
          onPress={() => setShowRFIDScanner(true)}
          disabled={!isConnected || isProcessingEntry}
          icon={<Icon name="qrcode-scan" size={20} color="#ffffff" />}
        />

        <Button
          title="Take Photo"
          onPress={() => setShowPhotoCapture(true)}
          disabled={isProcessingEntry}
          variant="outline"
          icon={<Icon name="camera" size={20} color={theme.colors.primary} />}
        />

        <Button
          title="Manual Entry"
          onPress={() => setShowManualEntry(true)}
          disabled={isProcessingEntry}
          variant="outline"
          icon={<Icon name="keyboard" size={20} color={theme.colors.primary} />}
        />
      </View>

      {/* RFID Scanner Modal */}
      {showRFIDScanner && (
        <RFIDScanner
          onRFIDScanned={handleScanSuccess}
          onDeviceConnected={() => console.log('Device connected')}
          onDeviceDisconnected={() => console.log('Device disconnected')}
        />
      )}

      {/* Photo Capture Modal */}
      {showPhotoCapture && (
        <PhotoCapture
          onPhotoCapture={handlePhotoCapture}
          maxPhotos={3}
          title="Capture Entry Photos"
          subtitle="Take up to 3 photos for documentation"
        />
      )}

      {/* RFID Status */}
      {(currentSticker || rfidCode) && (
        <RFIDStatus
          vehicleInfo={currentSticker}
          isLoading={isProcessingEntry}
        />
      )}

      {/* Entry Creation Panel */}
      {currentSticker && (
        <Card style={styles.entryPanel} padding={16}>
          <View style={styles.entryHeader}>
            <View style={styles.entryInfo}>
              <Text style={textStyles.title}>New Vehicle Entry</Text>
              <Text style={textStyles.subtitle}>
                {currentSticker.vehicle_plate} • {currentSticker.household_name}
              </Text>
            </View>
            <StatusIndicator
              status={currentSticker.status === 'expired' ? 'error' : 'success'}
              size="small"
            />
          </View>

          {entryPhotos.length > 0 && (
            <View style={styles.photosPreview}>
              <Text style={textStyles.subtitle}>Photos:</Text>
              <View style={styles.photosList}>
                {entryPhotos.map((photo, index) => (
                  <View key={photo.timestamp} style={styles.photoItem}>
                    <Image source={{ uri: photo.uri }} style={styles.photoThumbnail} />
                    <Text style={textStyles.entryTime}>
                      {new Date(photo.timestamp).toLocaleTimeString()}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.notesSection}>
            <Text style={textStyles.subtitle}>Notes:</Text>
            <Text
              style={styles.notesInput}
              placeholder="Add optional notes about this entry..."
              value={entryNotes}
              onChangeText={setEntryNotes}
              multiline
            />
          </View>

          <Button
            title="Record Entry"
            onPress={handleNewEntry}
            loading={isProcessingEntry}
            disabled={currentSticker.status === 'expired' || isProcessingEntry}
            icon={<Icon name="check" size={20} color="#ffffff" />}
          />

          {currentSticker.status === 'expired' && (
            <Text style={textStyles.emptyText}>
              ⚠️ Sticker expired. Contact administrator for renewal.
            </Text>
          )}
        </Card>
      )}

      {/* Entries List */}
      <Card style={styles.listContainer} padding={16}>
        <View style={styles.listHeader}>
          <Text style={textStyles.title}>Recent Entries</Text>
          <Text style={textStyles.subtitle}>
            {gateEntries.length} recent entry{gateEntries.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {gateEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="door-open" size={48} color={theme.colors.muted} />
            <Text style={textStyles.noEntriesText}>No entries recorded today</Text>
            <Text style={textStyles.emptyText}>
              Start by scanning RFID or selecting manual entry
            </Text>
          </View>
        ) : (
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          >
            {gateEntries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onPress={() => handleEntryPress(entry)}
              />
            ))}
          </ScrollView>
        )}
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    margin: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 2,
  },
  entryPanel: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  entryInfo: {
    flex: 1,
  },
  photosPreview: {
    marginBottom: 16,
  },
  photosList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  photoThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 4,
  },
  entryTime: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  notesSection: {
    marginBottom: 16,
  },
  notesInput: {
    fontSize: 14,
    lineHeight: 20,
    minHeight: 60,
    padding: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  noEntriesText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  listContainer: {
    flex: 1,
    margin: 16,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
});