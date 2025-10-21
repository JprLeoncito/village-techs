import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/contexts/ThemeContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Photo {
  uri: string;
  timestamp: number;
}

interface PhotoCaptureProps {
  onPhotoCapture: (photo: Photo) => void;
  maxPhotos?: number;
  title?: string;
  subtitle?: string;
}

const { width: screenWidth } = Dimensions.get('window');

export const PhotoCapture: React.FC<PhotoCaptureProps> = ({
  onPhotoCapture,
  maxPhotos = 2,
  title = 'Capture Photo',
  subtitle = 'Take photos for documentation',
}) => {
  const { theme } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [cameraType, setCameraType] = useState<'front' | 'back'>('back');
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
      });

      const newPhoto: Photo = {
        uri: photo.uri,
        timestamp: Date.now(),
      };

      const updatedPhotos = [...photos, newPhoto];
      setPhotos(updatedPhotos.slice(-maxPhotos)); // Keep only last maxPhotos
      onPhotoCapture(newPhoto);
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const toggleCameraType = () => {
    setCameraType(current => (current === 'back' ? 'front' : 'back'));
  };

  const removePhoto = (index: number) => {
    const updatedPhotos = photos.filter((_, i) => i !== index);
    setPhotos(updatedPhotos);
  };

  const handleCameraError = (error: any) => {
    console.error('Camera error:', error);
    Alert.alert('Camera Error', 'Unable to access camera. Please check permissions.');
  };

  const textStyles = {
    title: [styles.title, { color: theme.colors.text }],
    subtitle: [styles.subtitle, { color: theme.colors.muted }],
    photoText: [styles.photoText, { color: theme.colors.muted }],
    noPhotosText: [styles.noPhotosText, { color: theme.colors.muted }],
    errorText: [styles.errorText, { color: theme.colors.error }],
  };

  if (!permission) {
    return (
      <Card style={styles.container} padding={20}>
        <View style={styles.permissionContainer}>
          <Icon name="camera-off" size={48} color={theme.colors.muted} />
          <Text style={textStyles.title}>Camera Permission Required</Text>
          <Text style={textStyles.subtitle}>
            We need camera access to capture photos for documentation
          </Text>
          <Button
            title="Grant Permission"
            onPress={requestPermission}
            icon={<Icon name="camera" size={20} color="#ffffff" />}
          />
        </View>
      </Card>
    );
  }

  if (!permission.granted) {
    return (
      <Card style={styles.container} padding={20}>
        <View style={styles.permissionContainer}>
          <Icon name="lock" size={48} color={theme.colors.muted} />
          <Text style={textStyles.title}>Permission Denied</Text>
          <Text style={textStyles.subtitle}>
            Camera permission is required to capture photos
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.container} padding={20}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Icon name="camera" size={24} color={theme.colors.primary} />
          <Text style={textStyles.title}>{title}</Text>
          <Text style={textStyles.subtitle}>{subtitle}</Text>
        </View>

        <View style={styles.headerActions}>
          <Text style={textStyles.photoText}>
            {photos.length}/{maxPhotos} photos
          </Text>
          <TouchableOpacity
            style={[styles.toggleButton, { borderColor: theme.colors.border }]}
            onPress={toggleCameraType}
          >
            <Icon
              name={cameraType === 'back' ? 'camera-front' : 'camera-rear'}
              size={20}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        {isCameraActive ? (
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={cameraType}
            onCameraReady={() => setIsCameraActive(true)}
            onMountError={handleCameraError}
          />
        ) : (
          <View style={[styles.camera, styles.cameraPlaceholder]}>
            <Icon name="camera-off" size={48} color={theme.colors.muted} />
            <Text style={textStyles.errorText}>Camera unavailable</Text>
          </View>
        )}

        {/* Capture Button */}
        <TouchableOpacity
          style={[
            styles.captureButton,
            {
              backgroundColor: theme.colors.primary,
              opacity: isCapturing ? 0.5 : 1,
            },
          ]}
          onPress={takePicture}
          disabled={isCapturing || photos.length >= maxPhotos}
        >
          <Icon
            name={isCapturing ? 'loading' : 'camera'}
            size={32}
            color="#ffffff"
          />
        </TouchableOpacity>
      </View>

      {/* Photos Preview */}
      {photos.length > 0 && (
        <View style={styles.photosContainer}>
          <Text style={textStyles.subtitle}>Captured Photos:</Text>
          <View style={styles.photosList}>
            {photos.map((photo, index) => (
              <View key={photo.timestamp} style={styles.photoContainer}>
                <Image source={{ uri: photo.uri }} style={styles.photoThumbnail} />
                <TouchableOpacity
                  style={[styles.removeButton, { backgroundColor: theme.colors.error }]}
                  onPress={() => removePhoto(index)}
                >
                  <Icon name="close" size={12} color="#ffffff" />
                </TouchableOpacity>
                <Text style={textStyles.photoText}>
                  {new Date(photo.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            ))}
          </View>

          {photos.length >= maxPhotos && (
            <Text style={textStyles.noPhotosText}>
              Maximum photos captured. Remove photos to take more.
            </Text>
          )}
        </View>
      )}

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={textStyles.subtitle}>Instructions:</Text>
        <Text style={textStyles.photoText}>
          • Tap the camera button to capture photos
        </Text>
        <Text style={textStyles.photoText}>
          • Toggle between front/back cameras
        </Text>
        <Text style={textStyles.photoText}>
          • Remove photos by tapping the X button
        </Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  headerActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  photoText: {
    fontSize: 14,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 4,
  },
  cameraContainer: {
    height: 240,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  captureButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  photosContainer: {
    marginBottom: 16,
  },
  photosList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoContainer: {
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
  instructions: {
    gap: 4,
  },
  permissionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 20,
  },
  noPhotosText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});