import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Header } from '../../components/shared/Header';
import { PhotoCapture } from '../../components/camera/PhotoCapture';
import { Input } from '../../components/ui/Input';

type DeliveryStackParamList = {
  DeliveryList: undefined;
  DeliveryLog: undefined;
  DeliveryHandoff: {
    deliveryId: string;
  };
};

type DeliveryHandoffRouteProp = RouteProp<DeliveryStackParamList, 'DeliveryHandoff'>;
type DeliveryHandoffNavigationProp = StackNavigationProp<DeliveryStackParamList, 'DeliveryHandoff'>;

interface Delivery {
  id: string;
  tracking_number?: string;
  delivery_company: string;
  delivery_person_name: string;
  delivery_person_contact: string;
  recipient_name: string;
  household_id: string;
  household_name: string;
  unit_number?: string;
  delivery_type: 'package' | 'food' | 'document' | 'furniture' | 'other';
  status: 'pending' | 'at_gate' | 'handed_off' | 'picked_up' | 'returned';
  special_instructions?: string;
  photos?: string[];
  notes?: string;
  gate_entry_id?: string;
  security_officer_id?: string;
  security_officer_name?: string;
  handoff_timestamp?: string;
  pickup_timestamp?: string;
  created_at: string;
  updated_at: string;
}

interface Household {
  id: string;
  name: string;
  residence_number: string;
  member_names: string[];
  contact_number?: string;
}

interface Photo {
  uri: string;
  timestamp: number;
}

export const DeliveryHandoffScreen: React.FC = () => {
  const { theme } = useTheme();
  const { officer } = useAuth();
  const route = useRoute<DeliveryHandoffRouteProp>();
  const navigation = useNavigation<DeliveryHandoffNavigationProp>();
  const { deliveryId } = route.params;

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [handoffNotes, setHandoffNotes] = useState('');
  const [handoffPhotos, setHandoffPhotos] = useState<Photo[]>([]);
  const [recipientName, setRecipientName] = useState('');
  const [recipientContact, setRecipientContact] = useState('');
  const [recipientRelationship, setRecipientRelationship] = useState('');
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMarkingAtGate, setIsMarkingAtGate] = useState(false);

  useEffect(() => {
    loadDeliveryDetails();
  }, [deliveryId]);

  const loadDeliveryDetails = async () => {
    try {
      if (!deliveryId || !officer?.tenantId) return;

      // Load delivery details
      const { data: deliveryData, error: deliveryError } = await supabase
        .from('deliveries')
        .select('*')
        .eq('id', deliveryId)
        .eq('tenant_id', officer.tenantId)
        .single();

      if (deliveryError || !deliveryData) {
        console.error('Error loading delivery:', deliveryError);
        Alert.alert('Error', 'Failed to load delivery details');
        return;
      }

      setDelivery(deliveryData);

      // Set default recipient info
      setRecipientName(deliveryData.recipient_name);

      // Load household details
      const { data: householdData, error: householdError } = await supabase
        .from('households')
        .select('*')
        .eq('id', deliveryData.household_id)
        .single();

      if (!householdError && householdData) {
        setHousehold(householdData);
      }

      // Check if we need to mark as at_gate first
      setIsMarkingAtGate(deliveryData.status === 'pending');
    } catch (error) {
      console.error('Error loading delivery details:', error);
      Alert.alert('Error', 'Failed to load delivery details');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoCapture = (photo: Photo) => {
    setHandoffPhotos(prev => [...prev, photo].slice(-5)); // Keep max 5 photos
    setShowPhotoCapture(false);
  };

  const removePhoto = (index: number) => {
    setHandoffPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleCallDeliveryPerson = () => {
    if (delivery?.delivery_person_contact) {
      Linking.openURL(`tel:${delivery.delivery_person_contact}`);
    }
  };

  const handleCallRecipient = () => {
    if (recipientContact) {
      Linking.openURL(`tel:${recipientContact}`);
    }
  };

  const handleCallHousehold = () => {
    if (household?.contact_number) {
      Linking.openURL(`tel:${household.contact_number}`);
    }
  };

  const handleMarkAtGate = async () => {
    if (!delivery) return;

    try {
      setIsProcessing(true);

      const { error } = await supabase
        .from('deliveries')
        .update({
          status: 'at_gate',
          security_officer_id: officer.id,
          security_officer_name: officer.name,
        })
        .eq('id', delivery.id);

      if (error) throw error;

      // Update local state
      setDelivery({ ...delivery, status: 'at_gate' });
      setIsMarkingAtGate(false);

      Alert.alert(
        'Delivery at Gate',
        `${delivery.delivery_company} delivery has been marked as at the gate.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error marking at gate:', error);
      Alert.alert('Error', 'Failed to mark delivery as at gate. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHandoff = async () => {
    if (!delivery || !recipientName.trim()) {
      Alert.alert('Validation Error', 'Recipient name is required');
      return;
    }

    try {
      setIsProcessing(true);

      // Update delivery with handoff information
      const { error } = await supabase
        .from('deliveries')
        .update({
          status: 'handed_off',
          recipient_name: recipientName.trim(),
          recipient_contact: recipientContact.trim() || null,
          recipient_relationship: recipientRelationship.trim() || null,
          handoff_timestamp: new Date().toISOString(),
          handoff_notes: handoffNotes.trim() || null,
          handoff_photos: handoffPhotos.map(photo => photo.uri),
          security_officer_id: officer.id,
          security_officer_name: officer.name,
        })
        .eq('id', delivery.id);

      if (error) throw error;

      Alert.alert(
        'Delivery Handed Off',
        `Delivery has been successfully handed off to ${recipientName}.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error handing off delivery:', error);
      Alert.alert('Error', 'Failed to hand off delivery. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReturnToSender = async () => {
    if (!delivery) return;

    Alert.alert(
      'Return to Sender',
      `Are you sure you want to return this delivery to ${delivery.delivery_company}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Return',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsProcessing(true);

              const { error } = await supabase
                .from('deliveries')
                .update({
                  status: 'returned',
                  return_reason: handoffNotes.trim() || 'Returned to sender',
                  return_timestamp: new Date().toISOString(),
                  security_officer_id: officer.id,
                  security_officer_name: officer.name,
                })
                .eq('id', delivery.id);

              if (error) throw error;

              Alert.alert(
                'Delivery Returned',
                'Delivery has been returned to sender.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (error) {
              console.error('Error returning delivery:', error);
              Alert.alert('Error', 'Failed to return delivery. Please try again.');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'at_gate': return 'primary';
      case 'handed_off': return 'success';
      case 'picked_up': return 'success';
      case 'returned': return 'error';
      default: return 'default';
    }
  };

  const getDeliveryTypeIcon = (type: string) => {
    switch (type) {
      case 'package': return 'package';
      case 'food': return 'food';
      case 'document': return 'file-document';
      case 'furniture': return 'sofa';
      case 'other': return 'help-circle';
      default: return 'package';
    }
  };

  const textStyles = {
    title: [styles.title, { color: theme.colors.text }],
    subtitle: [styles.subtitle, { color: theme.colors.muted }],
    sectionTitle: [styles.sectionTitle, { color: theme.colors.text }],
    labelText: [styles.labelText, { color: theme.colors.muted }],
    valueText: [styles.valueText, { color: theme.colors.text }],
    companyName: [styles.companyName, { color: theme.colors.text }],
    photosTitle: [styles.photosTitle, { color: theme.colors.text }],
    photoTime: [styles.photoTime, { color: theme.colors.muted }],
    loadingText: [styles.loadingText, { color: theme.colors.muted }],
    warningText: [styles.warningText, { color: theme.colors.warning }],
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header title="Delivery Handoff" showBackButton />
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="loading" size={32} color={theme.colors.primary} />
          <Text style={textStyles.loadingText}>Loading delivery details...</Text>
        </View>
      </View>
    );
  }

  if (!delivery) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header title="Delivery Handoff" showBackButton />
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={textStyles.title}>Delivery Not Found</Text>
          <Text style={textStyles.subtitle}>The requested delivery could not be found.</Text>
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
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Header title="Delivery Handoff" showBackButton />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Delivery Information */}
        <Card style={styles.card} padding={16}>
          <View style={styles.deliveryHeader}>
            <View style={styles.deliveryInfo}>
              <View style={styles.companyRow}>
                <MaterialCommunityIcons name={getDeliveryTypeIcon(delivery.delivery_type)} size={24} color={theme.colors.primary} />
                <Text style={textStyles.companyName}>{delivery.delivery_company}</Text>
                <Badge
                  title={delivery.delivery_type}
                  variant="primary"
                  size="small"
                />
              </View>
              <View style={styles.statusRow}>
                <Badge
                  title={delivery.status.replace('_', ' ')}
                  variant={getStatusColor(delivery.status) as any}
                  size="small"
                />
                {delivery.tracking_number && (
                  <Text style={textStyles.labelText}>#{delivery.tracking_number}</Text>
                )}
              </View>
            </View>

            <View style={styles.contactActions}>
              <TouchableOpacity
                style={[styles.contactButton, { backgroundColor: theme.colors.success }]}
                onPress={handleCallDeliveryPerson}
              >
                <MaterialCommunityIcons name="phone" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={textStyles.labelText}>Delivery Person</Text>
              <Text style={textStyles.valueText}>{delivery.delivery_person_name}</Text>
              <Text style={textStyles.labelText}>{delivery.delivery_person_contact}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={textStyles.labelText}>Recipient</Text>
              <Text style={textStyles.valueText}>{delivery.recipient_name}</Text>
              {delivery.unit_number && (
                <Text style={textStyles.labelText}>Unit {delivery.unit_number}</Text>
              )}
            </View>
            <View style={styles.infoItem}>
              <Text style={textStyles.labelText}>Household</Text>
              <Text style={textStyles.valueText}>{delivery.household_name}</Text>
            </View>
          </View>

          {delivery.special_instructions && (
            <View style={styles.instructionsSection}>
              <MaterialCommunityIcons name="information" size={20} color={theme.colors.warning} />
              <Text style={textStyles.warningText}>Special Instructions:</Text>
              <Text style={textStyles.valueText}>{delivery.special_instructions}</Text>
            </View>
          )}
        </Card>

        {/* Household Information */}
        {household && (
          <Card style={styles.card} padding={16}>
            <Text style={textStyles.sectionTitle}>Household Information</Text>
            <View style={styles.householdInfo}>
              <View style={styles.householdItem}>
                <MaterialCommunityIcons name="home" size={20} color={theme.colors.muted} />
                <Text style={textStyles.valueText}>
                  Residence {household.residence_number}
                </Text>
              </View>
              {household.contact_number && (
                <View style={styles.householdItem}>
                  <TouchableOpacity
                    style={[styles.contactButton, { backgroundColor: theme.colors.success }]}
                    onPress={handleCallHousehold}
                  >
                    <MaterialCommunityIcons name="phone" size={16} color="#ffffff" />
                  </TouchableOpacity>
                  <Text style={textStyles.valueText}>{household.contact_number}</Text>
                </View>
              )}
              {household.member_names.length > 0 && (
                <View style={styles.householdItem}>
                  <MaterialCommunityIcons name="account-group" size={20} color={theme.colors.muted} />
                  <Text style={textStyles.valueText}>
                    Members: {household.member_names.join(', ')}
                  </Text>
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Warning for pending deliveries */}
        {isMarkingAtGate && (
          <Card style={[styles.card, styles.warningCard]} padding={16}>
            <View style={styles.warningContent}>
              <MaterialCommunityIcons name="alert" size={24} color={theme.colors.warning} />
              <View style={styles.warningText}>
                <Text style={textStyles.sectionTitle}>Mark Delivery at Gate</Text>
                <Text style={textStyles.subtitle}>
                  This delivery is currently pending. You need to mark it as "at gate" before proceeding with handoff.
                </Text>
              </View>
            </View>
            <Button
              title="Mark at Gate"
              onPress={handleMarkAtGate}
              loading={isProcessing}
              disabled={isProcessing}
              icon={<MaterialCommunityIcons name="map-marker" size={20} color="#ffffff" />}
            />
          </Card>
        )}

        {/* Handoff Form */}
        {!isMarkingAtGate && (
          <Card style={styles.card} padding={16}>
            <Text style={textStyles.sectionTitle}>Handoff Information</Text>

            <TextInput
              label="Recipient Name"
              value={recipientName}
              onChangeText={setRecipientName}
              placeholder="Name of person receiving the delivery"
              style={styles.input}
              required
              leftIcon={<MaterialCommunityIcons name="account" size={20} color={theme.colors.muted} />}
            />

            <TextInput
              label="Recipient Contact (Optional)"
              value={recipientContact}
              onChangeText={setRecipientContact}
              placeholder="Contact number of recipient"
              keyboardType="phone-pad"
              style={styles.input}
              leftIcon={<MaterialCommunityIcons name="phone" size={20} color={theme.colors.muted} />}
              rightIcon={recipientContact ? (
                <TouchableOpacity onPress={handleCallRecipient}>
                  <MaterialCommunityIcons name="phone" size={20} color={theme.colors.success} />
                </TouchableOpacity>
              ) : undefined}
            />

            <TextInput
              label="Relationship to Household (Optional)"
              value={recipientRelationship}
              onChangeText={setRecipientRelationship}
              placeholder="e.g., Resident, Family Member, Friend"
              style={styles.input}
              leftIcon={<MaterialCommunityIcons name="account-group" size={20} color={theme.colors.muted} />}
            />

            <TextInput
              label="Handoff Notes (Optional)"
              value={handoffNotes}
              onChangeText={setHandoffNotes}
              placeholder="Add any notes about the handoff..."
              multiline
              numberOfLines={3}
              style={styles.notesInput}
              leftIcon={<MaterialCommunityIcons name="text" size={20} color={theme.colors.muted} />}
            />
          </Card>
        )}

        {/* Handoff Photos */}
        {!isMarkingAtGate && (
          <Card style={styles.card} padding={16}>
            <View style={styles.photoSection}>
              <View style={styles.photoHeader}>
                <Text style={textStyles.photosTitle}>Handoff Photos</Text>
                <Text style={textStyles.photoTime}>
                  {handoffPhotos.length}/5 photos
                </Text>
              </View>

              {handoffPhotos.length > 0 && (
                <View style={styles.photosList}>
                  {handoffPhotos.map((photo, index) => (
                    <View key={photo.timestamp} style={styles.photoContainer}>
                      <View style={styles.photoWrapper}>
                        <Image source={{ uri: photo.uri }} style={styles.photoThumbnail} />
                        <TouchableOpacity
                          style={[styles.removeButton, { backgroundColor: theme.colors.error }]}
                          onPress={() => removePhoto(index)}
                        >
                          <MaterialCommunityIcons name="close" size={12} color="#ffffff" />
                        </TouchableOpacity>
                      </View>
                      <Text style={textStyles.photoTime}>
                        {new Date(photo.timestamp).toLocaleTimeString()}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <Button
                title="Take Handoff Photo"
                onPress={() => setShowPhotoCapture(true)}
                disabled={handoffPhotos.length >= 5}
                variant={handoffPhotos.length > 0 ? 'outline' : 'default'}
                icon={<MaterialCommunityIcons name="camera" size={20} color={handoffPhotos.length > 0 ? theme.colors.primary : '#ffffff'} />}
              />
            </View>
          </Card>
        )}

        {/* Actions */}
        <Card style={styles.card} padding={16}>
          <Text style={textStyles.sectionTitle}>Actions</Text>
          <View style={styles.actions}>
            {!isMarkingAtGate && (
              <>
                <Button
                  title="Complete Handoff"
                  onPress={handleHandoff}
                  loading={isProcessing}
                  disabled={isProcessing}
                  icon={<MaterialCommunityIcons name="package-check" size={20} color="#ffffff" />}
                />
                <Button
                  title="Return to Sender"
                  onPress={handleReturnToSender}
                  variant="outline"
                  icon={<MaterialCommunityIcons name="undo" size={20} color={theme.colors.error} />}
                  textStyle={{ color: theme.colors.error }}
                />
              </>
            )}
          </View>
        </Card>
      </ScrollView>

      {/* Photo Capture Modal */}
      {showPhotoCapture && (
        <PhotoCapture
          onPhotoCapture={handlePhotoCapture}
          maxPhotos={5}
          title="Capture Handoff Photos"
          subtitle="Take photos for delivery handoff documentation"
        />
      )}
    </KeyboardAvoidingView>
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
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  deliveryInfo: {
    flex: 1,
    gap: 4,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 8,
  },
  contactButton: {
    padding: 8,
    borderRadius: 20,
  },
  infoGrid: {
    gap: 16,
  },
  infoItem: {
    gap: 4,
  },
  instructionsSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fef3c7',
    marginTop: 16,
  },
  householdInfo: {
    gap: 8,
  },
  householdItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningCard: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
  },
  input: {
    marginBottom: 16,
  },
  notesInput: {
    marginTop: 8,
  },
  photoSection: {
    gap: 16,
  },
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photosTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  photoTime: {
    fontSize: 14,
  },
  photosList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoContainer: {
    alignItems: 'center',
    gap: 4,
  },
  photoWrapper: {
    position: 'relative',
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    gap: 12,
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
  labelText: {
    fontSize: 12,
    fontWeight: '500',
  },
  valueText: {
    fontSize: 16,
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
  warningText: {
    fontSize: 14,
  },
});

export default DeliveryHandoffScreen;