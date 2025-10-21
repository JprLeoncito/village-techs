import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/contexts/ThemeContext';
import { useRFIDScanner } from '@/services/rfid/RFIDService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatusIndicator } from '@/components/ui/StatusIndicator';

interface Device {
  id: string;
  name?: string;
  rssi?: number;
}

interface RFIDScannerProps {
  onRFIDScanned: (rfidCode: string) => void;
  onDeviceConnected: (device: Device) => void;
  onDeviceDisconnected: () => void;
}

const { width } = Dimensions.get('window');

export const RFIDScanner: React.FC<RFIDScannerProps> = ({
  onRFIDScanned,
  onDeviceConnected,
  onDeviceDisconnected,
}) => {
  const { theme } = useTheme();
  const {
    isScanning,
    isConnected,
    rfidCode,
    connectedDevice,
    error,
    scanForReaders,
    connectReader,
    disconnectReader,
    clearRfidCode,
  } = useRFIDScanner();

  const [isScanningAnimation, setIsScanningAnimation] = useState(false);
  const [scannedDevices, setScannedDevices] = useState<Device[]>([]);
  const pulseAnim = new Animated.Value(1);

  useEffect(() => {
    if (isScanning) {
      setIsScanningAnimation(true);
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      setIsScanningAnimation(false);
      pulseAnim.setValue(1);
    }
  }, [isScanning]);

  useEffect(() => {
    if (rfidCode) {
      onRFIDScanned(rfidCode);
    }
  }, [rfidCode, onRFIDScanned]);

  useEffect(() => {
    if (connectedDevice && isConnected) {
      onDeviceConnected(connectedDevice);
    }
  }, [connectedDevice, isConnected, onDeviceConnected]);

  const handleScan = async () => {
    try {
      clearRfidCode();
      setScannedDevices([]);
      const devices = await scanForReaders(10);
      setScannedDevices(devices);
    } catch (error) {
      console.error('Scan error:', error);
    }
  };

  const handleConnectDevice = async (device: Device) => {
    try {
      await connectReader(device);
      setScannedDevices([]);
    } catch (error) {
      console.error('Connect error:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectReader();
      onDeviceDisconnected();
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  const getConnectionStatus = () => {
    if (isScanning) return { status: 'syncing' as const, text: 'Scanning...', color: theme.colors.warning };
    if (isConnected) return { status: 'success' as const, text: 'Connected', color: theme.colors.success };
    return { status: 'offline' as const, text: 'Not Connected', color: theme.colors.muted };
  };

  const connectionStatus = getConnectionStatus();

  const textStyles = {
    title: [styles.title, { color: theme.colors.text }],
    subtitle: [styles.subtitle, { color: theme.colors.muted }],
    deviceName: [styles.deviceName, { color: theme.colors.text }],
    deviceInfo: [styles.deviceInfo, { color: theme.colors.muted }],
    scannedCode: [styles.scannedCode, { color: theme.colors.text }],
    noDevicesText: [styles.noDevicesText, { color: theme.colors.muted }],
    errorText: [styles.errorText, { color: theme.colors.error }],
  };

  return (
    <Card style={styles.container} padding={20}>
      {/* Header */}
      <View style={styles.header}>
        <Icon name="radio-tower" size={32} color={theme.colors.primary} />
        <Text style={textStyles.title}>RFID Scanner</Text>
        <Text style={textStyles.subtitle}>Connect and scan RFID stickers</Text>
      </View>

      {/* Connection Status */}
      <View style={styles.statusContainer}>
        <View style={styles.statusRow}>
          <StatusIndicator status={connectionStatus.status} size="small" />
          <Text style={[styles.statusText, { color: connectionStatus.color }]}>
            {connectionStatus.text}
          </Text>
        </View>

        {connectedDevice && (
          <View style={styles.connectedDevice}>
            <Icon name="check-circle" size={20} color={theme.colors.success} />
            <View style={styles.deviceInfoContainer}>
              <Text style={textStyles.deviceName}>
                {connectedDevice.name || 'Unknown Device'}
              </Text>
              <Text style={textStyles.deviceInfo}>
                ID: {connectedDevice.id.slice(0, 8)}...
              </Text>
            </View>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={20} color={theme.colors.error} />
            <Text style={textStyles.errorText}>{error}</Text>
          </View>
        )}
      </View>

      {/* RFID Code Display */}
      {rfidCode && (
        <View style={styles.scannedCodeContainer}>
          <Text style={textStyles.subtitle}>RFID Code Scanned:</Text>
          <Animated.View style={[styles.scannedCodeWrapper, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={textStyles.scannedCode}>{rfidCode}</Text>
          </Animated.View>
          <TouchableOpacity
            style={[styles.clearButton, { borderColor: theme.colors.border }]}
            onPress={clearRfidCode}
          >
            <Icon name="close" size={16} color={theme.colors.muted} />
            <Text style={[styles.clearButtonText, { color: theme.colors.muted }]}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Scanning Animation */}
      {isScanningAnimation && (
        <View style={styles.scanningContainer}>
          <Animated.View style={[styles.scanningRing, { transform: [{ scale: pulseAnim }] }]} />
          <Animated.View style={[styles.scanningRing, styles.scanningRing2, { transform: [{ scale: pulseAnim }] }]} />
          <View style={styles.scanningCenter}>
            <Icon name="radar" size={32} color={theme.colors.primary} />
            <Text style={textStyles.subtitle}>Scanning...</Text>
          </View>
        </View>
      )}

      {/* Device List */}
      {scannedDevices.length > 0 && !isConnected && (
        <View style={styles.devicesList}>
          <Text style={textStyles.subtitle}>Available Devices:</Text>
          {scannedDevices.map((device) => (
            <TouchableOpacity
              key={device.id}
              style={[styles.deviceItem, { borderColor: theme.colors.border }]}
              onPress={() => handleConnectDevice(device)}
            >
              <View style={styles.deviceItemInfo}>
                <Icon name="bluetooth" size={20} color={theme.colors.primary} />
                <View style={styles.deviceItemDetails}>
                  <Text style={textStyles.deviceName}>
                    {device.name || 'Unknown Device'}
                  </Text>
                  <Text style={textStyles.deviceInfo}>
                    {device.id.slice(0, 12)}...
                    {device.rssi !== undefined && ` • Signal: ${device.rssi} dBm`}
                  </Text>
                </View>
              </View>
              <Icon name="chevron-right" size={20} color={theme.colors.muted} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* No Devices Found */}
      {!isScanning && !isConnected && scannedDevices.length === 0 && !error && (
        <View style={styles.noDevicesContainer}>
          <Icon name="bluetooth-off" size={48} color={theme.colors.muted} />
          <Text style={textStyles.noDevicesText}>No devices found</Text>
          <Text style={textStyles.subtitle}>
            Make sure your RFID reader is powered on and in range
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        {!isConnected ? (
          <Button
            title="Scan for Devices"
            onPress={handleScan}
            loading={isScanning}
            disabled={isScanning}
            icon={<Icon name="bluetooth" size={20} color="#ffffff" />}
          />
        ) : (
          <Button
            title="Disconnect"
            onPress={handleDisconnect}
            variant="outline"
            icon={<Icon name="bluetooth-off" size={20} color={theme.colors.primary} />}
          />
        )}
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={textStyles.subtitle}>Instructions:</Text>
        <Text style={textStyles.deviceInfo}>
          1. Make sure your RFID reader is powered on and in pairing mode
        </Text>
        <Text style={textStyles.deviceInfo}>
          2. Tap "Scan for Devices" to find nearby RFID readers
        </Text>
        <Text style={textStyles.deviceInfo}>
          3. Select a device to connect and start scanning stickers
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
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  statusContainer: {
    marginBottom: 20,
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  connectedDevice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dcfce7',
    gap: 12,
  },
  deviceInfoContainer: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
  },
  deviceInfo: {
    fontSize: 14,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },
  scannedCodeContainer: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  scannedCodeWrapper: {
    marginVertical: 8,
  },
  scannedCode: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    textAlign: 'center',
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 6,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
    marginTop: 8,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  scanningContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 150,
    marginBottom: 20,
  },
  scanningRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#3b82f6',
    opacity: 0.3,
  },
  scanningRing2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#3b82f6',
    opacity: 0.5,
  },
  scanningCenter: {
    alignItems: 'center',
  },
  devicesList: {
    marginBottom: 20,
    gap: 8,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  deviceItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  deviceItemDetails: {
    flex: 1,
  },
  noDevicesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  noDevicesText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actions: {
    gap: 12,
  },
  instructions: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    gap: 4,
  },
});