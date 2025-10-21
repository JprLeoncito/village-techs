import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import storageService from '../../lib/storage';


import { MaterialIcons } from '@expo/vector-icons';interface DocumentUploadProps {
  onUpload: (documentUrl: string, documentData: DocumentData) => void;
  onError?: (error: string) => void;
  maxSizeMB?: number;
  acceptedFormats?: string[];
  bucketName?: string;
  folderPath?: string;
  label?: string;
  required?: boolean;
  initialDocument?: DocumentData | null;
  disabled?: boolean;
  showPreview?: boolean;
}

export interface DocumentData {
  uri: string;
  name: string;
  size?: number;
  type?: string;
  url?: string; // Supabase storage URL after upload
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onUpload,
  onError,
  maxSizeMB = 5,
  acceptedFormats = ['image/jpeg', 'image/png', 'application/pdf'],
  bucketName = 'documents',
  folderPath = '',
  label = 'Upload Document',
  required = false,
  initialDocument = null,
  disabled = false,
  showPreview = true,
}) => {
  const [document, setDocument] = useState<DocumentData | null>(initialDocument);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';

    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
      const kb = bytes / 1024;
      return `${kb.toFixed(1)} KB`;
    }
    return `${mb.toFixed(2)} MB`;
  };

  const validateFile = (file: DocumentPicker.DocumentResult | ImagePicker.ImagePickerResult): boolean => {
    if ('cancelled' in file && file.cancelled) return false;

    // Check file size
    if ('size' in file && file.size) {
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        Alert.alert(
          'File Too Large',
          `Please select a file smaller than ${maxSizeMB}MB. Your file is ${formatFileSize(file.size)}.`
        );
        return false;
      }
    }

    // Check file format
    if ('mimeType' in file && file.mimeType) {
      if (!acceptedFormats.includes(file.mimeType)) {
        Alert.alert(
          'Invalid Format',
          `Please select a file in one of these formats: ${getAcceptedFormatsDisplay()}`
        );
        return false;
      }
    }

    return true;
  };

  const getAcceptedFormatsDisplay = (): string => {
    const formatMap: Record<string, string> = {
      'image/jpeg': 'JPG',
      'image/png': 'PNG',
      'application/pdf': 'PDF',
      'image/*': 'Images',
      'application/*': 'Documents',
    };

    return acceptedFormats
      .map(format => formatMap[format] || format)
      .join(', ');
  };

  const handleDocumentPicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: acceptedFormats,
        copyToCacheDirectory: true,
      });

      if (result.type === 'success') {
        if (!validateFile(result)) return;

        const docData: DocumentData = {
          uri: result.uri,
          name: result.name,
          size: result.size,
          type: result.mimeType,
        };

        setDocument(docData);

        // Auto-upload if enabled
        if (bucketName && folderPath) {
          await uploadDocument(docData);
        } else {
          onUpload('', docData);
        }
      }
    } catch (error) {
      console.error('Document picker error:', error);
      onError?.('Failed to select document');
    }
  };

  const handleImagePicker = async (useCamera: boolean) => {
    try {
      // Request permissions
      const permissionResult = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          `Please grant ${useCamera ? 'camera' : 'photo library'} access in settings`
        );
        return;
      }

      // Launch picker
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: true,
          });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        const docData: DocumentData = {
          uri: asset.uri,
          name: `image_${Date.now()}.jpg`,
          type: 'image/jpeg',
        };

        setDocument(docData);

        // Auto-upload if enabled
        if (bucketName && folderPath) {
          await uploadDocument(docData);
        } else {
          onUpload('', docData);
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      onError?.('Failed to select image');
    }
  };

  const uploadDocument = async (docData: DocumentData) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const fileName = `${folderPath}/${Date.now()}_${docData.name}`;

      // Upload to Supabase storage
      const result = await storageService.uploadFile(
        docData.uri,
        bucketName,
        fileName
      );

      if (result.success && result.url) {
        const updatedDoc = { ...docData, url: result.url };
        setDocument(updatedDoc);
        onUpload(result.url, updatedDoc);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', error instanceof Error ? error.message : 'Failed to upload document');
      onError?.(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const showUploadOptions = () => {
    const isImageOnly = acceptedFormats.every(f => f.startsWith('image/'));

    Alert.alert(
      'Select Document',
      'Choose how you want to add the document',
      [
        ...(isImageOnly ? [
          { text: 'Take Photo', onPress: () => handleImagePicker(true) },
          { text: 'Choose from Library', onPress: () => handleImagePicker(false) },
        ] : []),
        { text: 'Browse Files', onPress: handleDocumentPicker },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const removeDocument = () => {
    Alert.alert(
      'Remove Document',
      'Are you sure you want to remove this document?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setDocument(null);
            onUpload('', null as any);
          },
        },
      ]
    );
  };

  const renderPreview = () => {
    if (!document || !showPreview) return null;

    const isImage = document.type?.startsWith('image/');

    return (
      <View style={styles.previewContainer}>
        {isImage && document.uri ? (
          <Image source={{ uri: document.uri }} style={styles.imagePreview} />
        ) : (
          <View style={styles.documentPreview}>
            <Text style={styles.documentIcon}>📄</Text>
            <Text style={styles.documentType}>
              {document.type === 'application/pdf' ? 'PDF' : 'Document'}
            </Text>
          </View>
        )}
        <View style={styles.documentInfo}>
          <Text style={styles.documentName} numberOfLines={1}>
            {document.name}
          </Text>
          {document.size && (
            <Text style={styles.documentSize}>
              {formatFileSize(document.size)}
            </Text>
          )}
        </View>
      </View>
    );
  };

  if (document) {
    return (
      <Card style={styles.uploadedCard}>
        <View style={styles.header}>
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
          {!disabled && (
            <TouchableOpacity onPress={removeDocument}>
              <Text style={styles.removeButton}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>

        {renderPreview()}

        {document.url && (
          <View style={styles.successBadge}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successText}>Uploaded Successfully</Text>
          </View>
        )}
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      <TouchableOpacity
        style={[styles.uploadButton, disabled && styles.disabledButton]}
        onPress={showUploadOptions}
        disabled={disabled || isUploading}
      >
        {isUploading ? (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="small" color="#10b981" />
            <Text style={styles.uploadingText}>Uploading... {uploadProgress}%</Text>
          </View>
        ) : (
          <>
            <Text style={styles.uploadIcon}>📁</Text>
            <Text style={styles.uploadText}>Choose File</Text>
            <Text style={styles.uploadHint}>
              {getAcceptedFormatsDisplay()} • Max {maxSizeMB}MB
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  disabledButton: {
    opacity: 0.5,
  },
  uploadIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  uploadHint: {
    fontSize: 12,
    color: '#6b7280',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploadingText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  uploadedCard: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  removeButton: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
  },
  previewContainer: {
    marginBottom: 12,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  documentPreview: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  documentIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  documentType: {
    fontSize: 14,
    color: '#6b7280',
  },
  documentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  documentName: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  documentSize: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 12,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  successIcon: {
    color: '#10b981',
    fontWeight: 'bold',
    marginRight: 6,
  },
  successText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
});

export default DocumentUpload;