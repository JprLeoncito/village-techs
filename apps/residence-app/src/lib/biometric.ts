import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export enum BiometricType {
  FACE_ID = 'Face ID',
  TOUCH_ID = 'Touch ID',
  FINGERPRINT = 'Fingerprint',
  IRIS = 'Iris',
  FACE_RECOGNITION = 'Face Recognition',
  NONE = 'None',
}

export interface BiometricStatus {
  isAvailable: boolean;
  hasEnrolled: boolean;
  supportedTypes: BiometricType[];
  isEnabled: boolean;
}

class BiometricService {
  private readonly BIOMETRIC_ENABLED_KEY = 'biometric_auth_enabled';
  private readonly BIOMETRIC_CREDENTIALS_KEY = 'biometric_credentials';

  /**
   * Check if device supports biometric authentication
   */
  async checkBiometricSupport(): Promise<BiometricStatus> {
    try {
      // Check hardware availability
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        return {
          isAvailable: false,
          hasEnrolled: false,
          supportedTypes: [BiometricType.NONE],
          isEnabled: false,
        };
      }

      // Check if biometrics are enrolled
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      // Get supported authentication types
      const supportedTypes = await this.getSupportedBiometricTypes();

      // Check if user has enabled biometric auth in app
      const isEnabled = await this.isBiometricEnabled();

      return {
        isAvailable: hasHardware,
        hasEnrolled: isEnrolled,
        supportedTypes,
        isEnabled,
      };
    } catch (error) {
      console.error('Error checking biometric support:', error);
      return {
        isAvailable: false,
        hasEnrolled: false,
        supportedTypes: [BiometricType.NONE],
        isEnabled: false,
      };
    }
  }

  /**
   * Get supported biometric types
   */
  private async getSupportedBiometricTypes(): Promise<BiometricType[]> {
    try {
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const types: BiometricType[] = [];

      supportedTypes.forEach((type) => {
        switch (type) {
          case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            types.push(
              Platform.OS === 'ios' ? BiometricType.FACE_ID : BiometricType.FACE_RECOGNITION
            );
            break;
          case LocalAuthentication.AuthenticationType.FINGERPRINT:
            types.push(
              Platform.OS === 'ios' ? BiometricType.TOUCH_ID : BiometricType.FINGERPRINT
            );
            break;
          case LocalAuthentication.AuthenticationType.IRIS:
            types.push(BiometricType.IRIS);
            break;
        }
      });

      return types.length > 0 ? types : [BiometricType.NONE];
    } catch (error) {
      console.error('Error getting supported biometric types:', error);
      return [BiometricType.NONE];
    }
  }

  /**
   * Authenticate using biometrics
   */
  async authenticate(
    promptMessage?: string,
    fallbackLabel?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || 'Authenticate to continue',
        fallbackLabel: fallbackLabel || 'Use Password',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        console.log('Biometric authentication successful');
        return { success: true };
      }

      // Handle different error cases
      let errorMessage = 'Authentication failed';

      switch (result.error) {
        case 'UserCancel':
          errorMessage = 'Authentication was cancelled';
          break;
        case 'UserFallback':
          errorMessage = 'User chose to use password';
          break;
        case 'SystemCancel':
          errorMessage = 'System cancelled authentication';
          break;
        case 'PasscodeNotSet':
          errorMessage = 'Device passcode not set';
          break;
        case 'FingerprintScannerNotAvailable':
        case 'FaceIDNotAvailable':
          errorMessage = 'Biometric scanner not available';
          break;
        case 'FingerprintScannerNotEnrolled':
        case 'FaceIDNotEnrolled':
          errorMessage = 'No biometrics enrolled on device';
          break;
        case 'BiometryLockout':
          errorMessage = 'Too many failed attempts. Please try again later';
          break;
        case 'BiometryNotEnrolled':
          errorMessage = 'No biometrics enrolled';
          break;
        case 'NotAuthenticated':
          errorMessage = 'Authentication failed';
          break;
        default:
          errorMessage = result.error || 'Unknown error occurred';
      }

      console.log('Biometric authentication failed:', errorMessage);
      return { success: false, error: errorMessage };
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication error',
      };
    }
  }

  /**
   * Enable biometric authentication for the app
   */
  async enableBiometric(
    email?: string,
    password?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if biometrics are available
      const status = await this.checkBiometricSupport();

      if (!status.isAvailable) {
        return { success: false, error: 'Biometric authentication not available' };
      }

      if (!status.hasEnrolled) {
        return { success: false, error: 'No biometrics enrolled on device' };
      }

      // Authenticate user first
      const authResult = await this.authenticate(
        'Authenticate to enable biometric login',
        'Cancel'
      );

      if (!authResult.success) {
        return authResult;
      }

      // Store encrypted credentials if provided
      if (email && password) {
        await this.storeCredentials(email, password);
      }

      // Enable biometric auth
      await AsyncStorage.setItem(this.BIOMETRIC_ENABLED_KEY, 'true');

      console.log('Biometric authentication enabled');
      return { success: true };
    } catch (error) {
      console.error('Error enabling biometric:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enable biometric',
      };
    }
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometric(): Promise<{ success: boolean; error?: string }> {
    try {
      // Authenticate user first
      const authResult = await this.authenticate(
        'Authenticate to disable biometric login',
        'Cancel'
      );

      if (!authResult.success) {
        return authResult;
      }

      // Disable biometric auth
      await AsyncStorage.setItem(this.BIOMETRIC_ENABLED_KEY, 'false');

      // Clear stored credentials
      await this.clearCredentials();

      console.log('Biometric authentication disabled');
      return { success: true };
    } catch (error) {
      console.error('Error disabling biometric:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disable biometric',
      };
    }
  }

  /**
   * Check if biometric authentication is enabled
   */
  async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(this.BIOMETRIC_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      console.error('Error checking biometric status:', error);
      return false;
    }
  }

  /**
   * Store encrypted credentials for biometric login
   */
  private async storeCredentials(email: string, password: string): Promise<void> {
    try {
      const credentials = JSON.stringify({ email, password });
      await SecureStore.setItemAsync(this.BIOMETRIC_CREDENTIALS_KEY, credentials, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch (error) {
      console.error('Error storing credentials:', error);
      throw error;
    }
  }

  /**
   * Retrieve stored credentials
   */
  async getStoredCredentials(): Promise<{ email: string; password: string } | null> {
    try {
      const stored = await SecureStore.getItemAsync(this.BIOMETRIC_CREDENTIALS_KEY);
      if (!stored) return null;

      return JSON.parse(stored);
    } catch (error) {
      console.error('Error getting stored credentials:', error);
      return null;
    }
  }

  /**
   * Clear stored credentials
   */
  private async clearCredentials(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(this.BIOMETRIC_CREDENTIALS_KEY);
    } catch (error) {
      console.error('Error clearing credentials:', error);
    }
  }

  /**
   * Authenticate and get credentials
   */
  async authenticateAndGetCredentials(): Promise<{
    success: boolean;
    credentials?: { email: string; password: string };
    error?: string;
  }> {
    try {
      // Check if biometric is enabled
      const isEnabled = await this.isBiometricEnabled();
      if (!isEnabled) {
        return { success: false, error: 'Biometric authentication not enabled' };
      }

      // Authenticate user
      const authResult = await this.authenticate(
        'Authenticate to log in',
        'Use Password'
      );

      if (!authResult.success) {
        return { success: false, error: authResult.error };
      }

      // Get stored credentials
      const credentials = await this.getStoredCredentials();
      if (!credentials) {
        return { success: false, error: 'No stored credentials found' };
      }

      return { success: true, credentials };
    } catch (error) {
      console.error('Error in biometric login:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  }

  /**
   * Get biometric type display name
   */
  getBiometricTypeDisplayName(types: BiometricType[]): string {
    if (types.length === 0 || types[0] === BiometricType.NONE) {
      return 'Biometric Authentication';
    }

    // Return the first available type
    return types[0];
  }

  /**
   * Prompt user to enable biometric in device settings
   */
  async promptEnrollBiometric(): Promise<void> {
    const message = Platform.select({
      ios: 'Please go to Settings > Face ID & Passcode (or Touch ID & Passcode) to set up biometric authentication.',
      android: 'Please go to Settings > Security > Fingerprint (or Face) to set up biometric authentication.',
      default: 'Please set up biometric authentication in your device settings.',
    });

    // You would typically show an alert here with the message
    console.log(message);
  }
}

// Export singleton instance
export const biometricService = new BiometricService();
export default biometricService;