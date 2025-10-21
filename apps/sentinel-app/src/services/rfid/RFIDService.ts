import { BleManager, Device, State } from 'react-native-ble-plx';
import { Platform, Alert } from 'react-native';
import { useState, useEffect } from 'react';

// RFID Reader Service for Bluetooth LE integration
export class RFIDService {
  private bleManager: BleManager;
  private isInitialized = false;
  private scanListeners: ((device: Device) => void)[] = [];
  private connectionListeners: ((connected: boolean, device?: Device) => void)[] = [];
  private rfidListeners: ((rfidCode: string) => void)[] = [];
  private connectedDevice: Device | null = null;

  constructor() {
    this.bleManager = new BleManager();
    this.initialize();
  }

  private async initialize() {
    try {
      // Check if Bluetooth is available and enabled
      const state = await this.checkBluetoothState();
      if (state !== State.PoweredOn) {
        console.warn('Bluetooth not powered on:', state);
        if (Platform.OS === 'ios') {
          Alert.alert(
            'Bluetooth Required',
            'Please enable Bluetooth in Settings to use RFID scanning functionality.',
            [{ text: 'OK' }]
          );
        }
      }

      // Listen for state changes
      this.bleManager.onStateChange((newState) => {
        console.log('Bluetooth state changed:', newState);
        if (newState === State.PoweredOn && !this.isInitialized) {
          this.isInitialized = true;
        } else if (newState !== State.PoweredOn) {
          this.isInitialized = false;
          this.disconnect();
        }
      }, true);

      this.isInitialized = true;
      console.log('RFID Service initialized');
    } catch (error) {
      console.error('Failed to initialize RFID Service:', error);
    }
  }

  private async checkBluetoothState(): Promise<State> {
    return new Promise((resolve) => {
      this.bleManager.state().then((state) => {
        resolve(state);
      });
    });
  }

  // Scan for RFID readers
  async scanForRFIDReaders(durationSeconds: number = 10): Promise<Device[]> {
    if (!this.isInitialized) {
      throw new Error('RFID Service not initialized or Bluetooth not available');
    }

    try {
      console.log(`Scanning for RFID readers for ${durationSeconds} seconds...`);

      const discoveredDevices: Device[] = [];

      // Start scanning
      this.bleManager.start({});

      // Listen for discovered devices
      const discoverSubscription = this.bleManager.onDiscover((device) => {
        // Filter for known RFID reader devices or generic BLE devices
        if (device.name?.includes('RFID') ||
            device.name?.includes('Scanner') ||
            device.name?.includes('Reader') ||
            device.name?.includes('NFC') ||
            device.id.length > 0) {

          console.log('Found RFID reader:', device.name || 'Unknown', device.id);
          discoveredDevices.push(device);

          // Notify listeners
          this.scanListeners.forEach(listener => listener(device));
        }
      });

      // Stop scanning after duration
      setTimeout(() => {
        this.bleManager.stopScan();
        discoverSubscription.remove();
        console.log(`Scan complete. Found ${discoveredDevices.length} devices`);
      }, durationSeconds * 1000);

      return discoveredDevices;
    } catch (error) {
      console.error('Error scanning for RFID readers:', error);
      throw error;
    }
  }

  // Connect to RFID reader
  async connectToRFIDReader(device: Device): Promise<boolean> {
    try {
      console.log(`Connecting to RFID reader: ${device.name || device.id}`);

      // Stop any ongoing scan
      this.bleManager.stopScan();

      // Connect to device
      await this.bleManager.connectToDevice(device.id);

      // Discover services and characteristics
      await this.bleManager.discoverAllServicesAndCharacteristicsForDevice(device.id);

      this.connectedDevice = device;

      // Monitor for data
      await this.monitorRFIDData(device.id);

      // Notify listeners
      this.connectionListeners.forEach(listener => listener(true, device));

      console.log('Successfully connected to RFID reader');
      return true;
    } catch (error) {
      console.error('Error connecting to RFID reader:', error);
      this.connectionListeners.forEach(listener => listener(false));
      throw error;
    }
  }

  private async monitorRFIDData(deviceId: string) {
    try {
      // Get device's services and characteristics
      const services = await this.bleManager.servicesForDevice(deviceId);

      for (const service of services) {
        const characteristics = await this.bleManager.characteristicsForDevice(deviceId, service.uuid);

        for (const characteristic of characteristics) {
          // Look for characteristic that can notify/indicate (readable)
          if (characteristic.isNotifiable || characteristic.isIndicatable) {
            console.log(`Monitoring characteristic: ${characteristic.uuid}`);

            // Monitor for data
            this.bleManager.startNotification(deviceId, service.uuid, characteristic.uuid, (error, data) => {
              if (error) {
                console.error('Notification error:', error);
                return;
              }

              if (data) {
                const rfidCode = this.parseRFIDData(data);
                if (rfidCode) {
                  console.log('RFID Code received:', rfidCode);
                  this.rfidListeners.forEach(listener => listener(rfidCode));
                }
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('Error monitoring RFID data:', error);
    }
  }

  // Parse RFID data from BLE characteristic
  private parseRFIDData(data: ArrayBuffer): string | null {
    try {
      // Convert base64 data to string
      const base64 = this.arrayBufferToBase64(data);
      const hex = this.base64ToHex(base64);

      // Remove non-hex characters and convert to readable format
      const cleanHex = hex.replace(/[^0-9A-Fa-f]/g, '');

      if (cleanHex.length >= 8) {
        // Return the RFID code (you may need to adjust parsing logic based on your specific RFID reader)
        return cleanHex.toUpperCase();
      }

      return null;
    } catch (error) {
      console.error('Error parsing RFID data:', error);
      return null;
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToHex(base64: string): string {
    const binary = atob(base64);
    let hex = '';
    for (let i = 0; i < binary.length; i++) {
      const hexByte = binary.charCodeAt(i).toString(16).padStart(2, '0');
      hex += hexByte;
    }
    return hex;
  }

  // Disconnect from RFID reader
  async disconnect() {
    try {
      if (this.connectedDevice) {
        console.log(`Disconnecting from RFID reader: ${this.connectedDevice.name || this.connectedDevice.id}`);
        await this.bleManager.cancelDeviceConnection(this.connectedDevice.id);
        this.connectedDevice = null;
      }

      this.connectionListeners.forEach(listener => listener(false));
      console.log('RFID reader disconnected');
    } catch (error) {
      console.error('Error disconnecting from RFID reader:', error);
    }
  }

  // Event listener management
  onRFIDScanned(listener: (device: Device) => void) {
    this.scanListeners.push(listener);
    return () => {
      this.scanListeners = this.scanListeners.filter(l => l !== listener);
    };
  }

  onConnectionChanged(listener: (connected: boolean, device?: Device) => void) {
    this.connectionListeners.push(listener);
    return () => {
      this.connectionListeners = this.connectionListeners.filter(l => l !== listener);
    };
  }

  onRFIDReceived(listener: (rfidCode: string) => void) {
    this.rfidListeners.push(listener);
    return () => {
      this.rfidListeners = this.rfidListeners.filter(l => l !== listener);
    };
  }

  // Cleanup
  cleanup() {
    this.disconnect();
    this.scanListeners = [];
    this.connectionListeners = [];
    this.rfidListeners = [];
  }

  // Get current status
  isConnected(): boolean {
    return this.connectedDevice !== null;
  }

  getConnectedDevice(): Device | null {
    return this.connectedDevice;
  }
}

// Create singleton instance
export const rfidService = new RFIDService();

// React hook for RFID scanning
export const useRFIDScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [rfidCode, setRfidCode] = useState<string | null>(null);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set up event listeners
    const unsubscribeScan = rfidService.onRFIDScanned((device) => {
      console.log('RFID device found:', device.name);
    });

    const unsubscribeConnection = rfidService.onConnectionChanged((connected, device) => {
      setIsConnected(connected);
      setConnectedDevice(device || null);
      setError(null);
    });

    const unsubscribeRFID = rfidService.onRFIDReceived((code) => {
      setRfidCode(code);
      setError(null);
    });

    return () => {
      unsubscribeScan();
      unsubscribeConnection();
      unsubscribeRFID();
    };
  }, []);

  const scanForReaders = async (durationSeconds: number = 10) => {
    try {
      setIsScanning(true);
      setError(null);
      const devices = await rfidService.scanForRFIDReaders(durationSeconds);
      return devices;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to scan for RFID readers';
      setError(errorMessage);
      throw error;
    } finally {
      setIsScanning(false);
    }
  };

  const connectReader = async (device: Device) => {
    try {
      setError(null);
      await rfidService.connectToRFIDReader(device);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to RFID reader';
      setError(errorMessage);
      throw error;
    }
  };

  const disconnectReader = async () => {
    try {
      setError(null);
      await rfidService.disconnect();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to disconnect from RFID reader';
      setError(errorMessage);
      throw error;
    }
  };

  const clearRfidCode = () => {
    setRfidCode(null);
  };

  return {
    isScanning,
    isConnected,
    rfidCode,
    connectedDevice,
    error,
    scanForReaders,
    connectReader,
    disconnectReader,
    clearRfidCode,
  };
};