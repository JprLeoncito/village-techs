import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

interface UploadOptions {
  bucket: string;
  path: string;
  file: string | Blob;
  contentType?: string;
}

interface DownloadOptions {
  bucket: string;
  path: string;
  localPath?: string;
}

type StorageBucket = 'member-photos' | 'vehicle-documents' | 'permit-plans' | 'delivery-photos';

class StorageService {
  private readonly buckets: Record<StorageBucket, string> = {
    'member-photos': 'household_member_photos',
    'vehicle-documents': 'vehicle_documents',
    'permit-plans': 'construction_permit_plans',
    'delivery-photos': 'delivery_photos',
  };

  private readonly maxFileSizes: Record<StorageBucket, number> = {
    'member-photos': 2 * 1024 * 1024, // 2MB
    'vehicle-documents': 5 * 1024 * 1024, // 5MB
    'permit-plans': 10 * 1024 * 1024, // 10MB
    'delivery-photos': 5 * 1024 * 1024, // 5MB
  };

  /**
   * Upload a file to Supabase Storage
   */
  async uploadFile({ bucket, path, file, contentType }: UploadOptions) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          contentType,
          upsert: false,
        });

      if (error) {
        throw error;
      }

      return {
        success: true,
        path: data.path,
        url: this.getPublicUrl(bucket, data.path),
      };
    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Upload member photo with compression
   */
  async uploadMemberPhoto(uri: string, memberId: string) {
    try {
      // Compress image to reduce size
      const compressed = await this.compressImage(uri, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.8,
      });

      // Check file size
      const fileInfo = await FileSystem.getInfoAsync(compressed.uri);
      if (fileInfo.exists && fileInfo.size && fileInfo.size > this.maxFileSizes['member-photos']) {
        throw new Error('Photo size exceeds 2MB limit');
      }

      // Convert to blob for upload
      const blob = await this.uriToBlob(compressed.uri);

      const bucket = this.buckets['member-photos'];
      const path = `${memberId}/${Date.now()}.jpg`;

      return await this.uploadFile({
        bucket,
        path,
        file: blob,
        contentType: 'image/jpeg',
      });
    } catch (error) {
      console.error('Upload member photo error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Photo upload failed',
      };
    }
  }

  /**
   * Upload vehicle OR/CR document
   */
  async uploadVehicleDocument(uri: string, stickerId: string, documentType: 'or' | 'cr') {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists && fileInfo.size && fileInfo.size > this.maxFileSizes['vehicle-documents']) {
        throw new Error('Document size exceeds 5MB limit');
      }

      const extension = uri.split('.').pop() || 'jpg';
      const blob = await this.uriToBlob(uri);

      const bucket = this.buckets['vehicle-documents'];
      const path = `${stickerId}/${documentType}_${Date.now()}.${extension}`;

      return await this.uploadFile({
        bucket,
        path,
        file: blob,
        contentType: this.getContentType(extension),
      });
    } catch (error) {
      console.error('Upload vehicle document error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Document upload failed',
      };
    }
  }

  /**
   * Upload construction permit plans
   */
  async uploadPermitPlans(uri: string, permitId: string) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists && fileInfo.size && fileInfo.size > this.maxFileSizes['permit-plans']) {
        throw new Error('Plans file size exceeds 10MB limit');
      }

      const extension = uri.split('.').pop() || 'pdf';
      const blob = await this.uriToBlob(uri);

      const bucket = this.buckets['permit-plans'];
      const path = `${permitId}/plans_${Date.now()}.${extension}`;

      return await this.uploadFile({
        bucket,
        path,
        file: blob,
        contentType: this.getContentType(extension),
      });
    } catch (error) {
      console.error('Upload permit plans error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Plans upload failed',
      };
    }
  }

  /**
   * Upload delivery receipt photo
   */
  async uploadDeliveryPhoto(uri: string, deliveryId: string) {
    try {
      // Compress image
      const compressed = await this.compressImage(uri, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.85,
      });

      const fileInfo = await FileSystem.getInfoAsync(compressed.uri);
      if (fileInfo.exists && fileInfo.size && fileInfo.size > this.maxFileSizes['delivery-photos']) {
        throw new Error('Photo size exceeds 5MB limit');
      }

      const blob = await this.uriToBlob(compressed.uri);

      const bucket = this.buckets['delivery-photos'];
      const path = `${deliveryId}/receipt_${Date.now()}.jpg`;

      return await this.uploadFile({
        bucket,
        path,
        file: blob,
        contentType: 'image/jpeg',
      });
    } catch (error) {
      console.error('Upload delivery photo error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Photo upload failed',
      };
    }
  }

  /**
   * Download file from Supabase Storage
   */
  async downloadFile({ bucket, path, localPath }: DownloadOptions) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(path);

      if (error) {
        throw error;
      }

      // If local path is provided, save to device
      if (localPath) {
        const reader = new FileReader();
        reader.readAsDataURL(data);
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          await FileSystem.writeAsStringAsync(localPath, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
        };
      }

      return {
        success: true,
        data,
        localPath,
      };
    } catch (error) {
      console.error('Download error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed',
      };
    }
  }

  /**
   * Delete file from Supabase Storage
   */
  async deleteFile(bucket: string, path: string) {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Delete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      };
    }
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  /**
   * Create signed URL for temporary access
   */
  async createSignedUrl(bucket: string, path: string, expiresIn = 3600) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) {
        throw error;
      }

      return {
        success: true,
        url: data.signedUrl,
      };
    } catch (error) {
      console.error('Create signed URL error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create signed URL',
      };
    }
  }

  /**
   * Compress image to reduce file size
   */
  private async compressImage(
    uri: string,
    options: { maxWidth: number; maxHeight: number; quality: number }
  ) {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: options.maxWidth, height: options.maxHeight } }],
        {
          compress: options.quality,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      return manipResult;
    } catch (error) {
      console.error('Image compression error:', error);
      throw error;
    }
  }

  /**
   * Convert URI to Blob for upload
   */
  private async uriToBlob(uri: string): Promise<Blob> {
    const response = await fetch(uri);
    return await response.blob();
  }

  /**
   * Get content type based on file extension
   */
  private getContentType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };

    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Check if file size is within limit
   */
  isFileSizeValid(size: number, bucket: StorageBucket): boolean {
    return size <= this.maxFileSizes[bucket];
  }
}

// Export singleton instance
export const storageService = new StorageService();
export default storageService;