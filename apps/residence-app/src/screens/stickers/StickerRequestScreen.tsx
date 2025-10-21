import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { StickerRequestForm } from '../../components/features/stickers/StickerRequestForm';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { VehicleSticker } from '../../../types/stickers';
import networkStatus from '../../lib/networkStatus';

type StickerRequestRouteProp = RouteProp<
  { StickerRequest: { mode?: 'create' | 'edit' | 'renewal'; existingSticker?: VehicleSticker } },
  'StickerRequest'
>;

type StickerRequestNavigationProp = StackNavigationProp<
  { StickerList: undefined; StickerDetail: { stickerId: string } },
  'StickerRequest'
>;

export const StickerRequestScreen: React.FC = () => {
  const navigation = useNavigation<StickerRequestNavigationProp>();
  const route = useRoute<StickerRequestRouteProp>();
  const { mode = 'create', existingSticker } = route.params || {};

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    checkNetworkStatus();

    // Subscribe to network status changes
    const unsubscribe = networkStatus.addListener((connected) => {
      setIsOffline(!connected);
    });

    // Set header title based on mode
    navigation.setOptions({
      title: mode === 'renewal' ? 'Renew Sticker' :
             mode === 'edit' ? 'Edit Sticker Request' :
             'Request New Sticker',
      headerBackTitle: 'Back',
    });

    return () => {
      networkStatus.removeListener(unsubscribe);
    };
  }, [navigation, mode]);

  const checkNetworkStatus = () => {
    setIsOffline(!networkStatus.isConnected());
  };

  const handleSuccess = (sticker: VehicleSticker) => {
    setIsSubmitting(false);

    // Show simple toast message and automatically navigate back to StickerList
    const message = mode === 'renewal'
      ? 'Success in requesting sticker renewal'
      : 'Success in requesting sticker';

    // Simple toast - you can replace this with your preferred toast library
    console.log('TOAST:', message);

    // Navigate back to StickerList so user sees updated list immediately
    navigation.goBack();
  };

  const handleError = (error: string) => {
    setIsSubmitting(false);

    Alert.alert(
      'Submission Failed',
      error || 'Failed to submit sticker request. Please try again.',
      [{ text: 'OK' }]
    );
  };

  const handleCancel = () => {
    if (isSubmitting) {
      Alert.alert(
        'Request in Progress',
        'Your sticker request is currently being submitted. Please wait for it to complete.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel? Any information you\'ve entered will be lost.',
      [
        {
          text: 'No, Continue',
          style: 'cancel',
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const getInitialData = () => {
    if (mode === 'renewal' && existingSticker) {
      return {
        vehicle_type: existingSticker.vehicle_type,
        vehicle_make: existingSticker.vehicle_make,
        vehicle_model: existingSticker.vehicle_model,
        vehicle_color: existingSticker.vehicle_color,
        license_plate: existingSticker.license_plate,
        or_number: existingSticker.or_number,
        cr_number: existingSticker.cr_number,
      };
    }

    if (mode === 'edit' && existingSticker) {
      return {
        vehicle_type: existingSticker.vehicle_type,
        vehicle_make: existingSticker.vehicle_make,
        vehicle_model: existingSticker.vehicle_model,
        vehicle_color: existingSticker.vehicle_color,
        license_plate: existingSticker.license_plate,
        or_number: existingSticker.or_number,
        cr_number: existingSticker.cr_number,
      };
    }

    return undefined;
  };

  return (
    <View style={styles.container}>
      <StickerRequestForm
        mode={mode}
        existingSticker={existingSticker}
        initialData={getInitialData()}
        onSuccess={handleSuccess}
        onError={handleError}
        onCancel={handleCancel}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
});

export default StickerRequestScreen;