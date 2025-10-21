# Technology Research & Decisions
## Feature 004: Security Gate Operations Mobile Application

This document records key technical decisions made during implementation planning, with rationale and code examples.

---

## Decision 1: RFID Reader Integration Strategy

**Question**: How should the mobile app integrate with Bluetooth RFID readers for vehicle sticker scanning?

**Options Considered**:

1. **react-native-ble-plx** - Full Bluetooth Low Energy library with comprehensive device management
2. **react-native-bluetooth-serial** - Classic Bluetooth serial communication for RFID readers
3. **Native module** - Custom iOS/Android modules for specific RFID reader models

**Decision**: **Use react-native-ble-plx for Bluetooth Low Energy RFID readers**

**Rationale**:
- Most modern RFID readers (UHF, HF) support BLE with standardized protocols
- react-native-ble-plx provides cross-platform BLE management with device scanning, pairing, and data streaming
- Active maintenance, strong community support, TypeScript definitions
- Handles complex BLE characteristics (read, write, notify) needed for RFID communication
- Supports background scanning for automatic device reconnection during shifts

**Implementation Example**:

```typescript
// src/services/rfid/RFIDService.ts
import { BleManager, Device, Characteristic } from 'react-native-ble-plx';
import { useState, useEffect } from 'react';

class RFIDService {
  private bleManager: BleManager;
  private rfidDevice: Device | null = null;
  private readonly RFID_SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb'; // Common RFID service
  private readonly RFID_CHAR_UUID = '0000ffe1-0000-1000-8000-00805f9b34fb'; // Common RFID characteristic

  constructor() {
    this.bleManager = new BleManager();
  }

  async scanForRFIDReaders(): Promise<Device[]> {
    const devices: Device[] = [];

    this.bleManager.startDeviceScan(
      [this.RFID_SERVICE_UUID],
      { allowDuplicates: false },
      (error, device) => {
        if (error) {
          console.error('Scan error:', error);
          return;
        }
        if (device && device.name?.includes('RFID')) {
          devices.push(device);
        }
      }
    );

    await new Promise(resolve => setTimeout(resolve, 10000)); // Scan for 10 seconds
    this.bleManager.stopDeviceScan();
    return devices;
  }

  async connectToRFIDReader(deviceId: string): Promise<void> {
    this.rfidDevice = await this.bleManager.connectToDevice(deviceId);
    await this.rfidDevice.discoverAllServicesAndCharacteristics();

    // Subscribe to RFID tag notifications
    this.rfidDevice.monitorCharacteristicForService(
      this.RFID_SERVICE_UUID,
      this.RFID_CHAR_UUID,
      (error, characteristic) => {
        if (error) {
          console.error('Monitor error:', error);
          return;
        }
        if (characteristic?.value) {
          const rfidCode = this.parseRFIDData(characteristic.value);
          this.onRFIDScanned(rfidCode);
        }
      }
    );
  }

  private parseRFIDData(base64Data: string): string {
    const buffer = Buffer.from(base64Data, 'base64');
    return buffer.toString('hex').toUpperCase();
  }

  private onRFIDScanned(rfidCode: string): void {
    // Emit event for UI to handle
    EventEmitter.emit('rfid:scanned', { rfidCode, timestamp: new Date() });
  }

  async disconnect(): Promise<void> {
    if (this.rfidDevice) {
      await this.rfidDevice.cancelConnection();
      this.rfidDevice = null;
    }
  }
}

export const rfidService = new RFIDService();

// React hook for RFID scanning
export function useRFIDScanner() {
  const [rfidCode, setRfidCode] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const listener = EventEmitter.addListener('rfid:scanned', ({ rfidCode }) => {
      setRfidCode(rfidCode);
    });

    return () => listener.remove();
  }, []);

  const scanForReaders = async () => {
    const devices = await rfidService.scanForRFIDReaders();
    return devices;
  };

  const connectReader = async (deviceId: string) => {
    await rfidService.connectToRFIDReader(deviceId);
    setIsConnected(true);
  };

  const disconnectReader = async () => {
    await rfidService.disconnect();
    setIsConnected(false);
  };

  return { rfidCode, isConnected, scanForReaders, connectReader, disconnectReader };
}
```

**Alternative Approach for USB RFID Readers** (if Bluetooth not available):
- Use react-native-usb-serialport for Android USB OTG support
- iOS does not support USB host mode without MFi certification, so Bluetooth is preferred

---

## Decision 2: Offline-First Architecture with WatermelonDB

**Question**: How should the app handle offline gate operations with local caching and sync queue?

**Options Considered**:

1. **WatermelonDB** - Offline-first SQLite database with sync engine (same as Feature 003)
2. **AsyncStorage + custom sync** - Simple key-value storage with manual sync implementation
3. **Redux Persist** - State persistence with Redux middleware

**Decision**: **Reuse WatermelonDB from Feature 003 for offline-first architecture**

**Rationale**:
- Proven solution already implemented in Residence Mobile App (Feature 003)
- Built-in sync engine with conflict resolution (server-wins strategy)
- Observable queries for real-time UI updates
- Optimized for mobile performance with lazy loading
- Handles complex relationships (entries, stickers, guests, permits)
- Supports large datasets (500+ cached RFID records) without performance issues
- Consistent architecture across both mobile apps reduces maintenance

**Implementation Example**:

```typescript
// src/database/schema.ts
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'stickers',
      columns: [
        { name: 'rfid_code', type: 'string', isIndexed: true },
        { name: 'vehicle_plate', type: 'string', isIndexed: true },
        { name: 'status', type: 'string' },
        { name: 'expiry_date', type: 'number' },
        { name: 'household_id', type: 'string', isIndexed: true },
        { name: 'household_name', type: 'string' },
        { name: 'residence_number', type: 'string' },
        { name: 'synced_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'gate_entries',
      columns: [
        { name: 'entry_type', type: 'string', isIndexed: true },
        { name: 'direction', type: 'string' },
        { name: 'vehicle_plate', type: 'string', isIndexed: true },
        { name: 'rfid_code', type: 'string' },
        { name: 'gate_id', type: 'string', isIndexed: true },
        { name: 'officer_id', type: 'string', isIndexed: true },
        { name: 'household_id', type: 'string' },
        { name: 'notes', type: 'string' },
        { name: 'photos', type: 'string' }, // JSON array
        { name: 'timestamp', type: 'number', isIndexed: true },
        { name: 'synced', type: 'boolean', isIndexed: true },
        { name: 'sync_error', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'scheduled_guests',
      columns: [
        { name: 'guest_name', type: 'string', isIndexed: true },
        { name: 'phone', type: 'string' },
        { name: 'vehicle_plate', type: 'string' },
        { name: 'household_id', type: 'string', isIndexed: true },
        { name: 'household_name', type: 'string' },
        { name: 'residence_number', type: 'string' },
        { name: 'expected_arrival', type: 'number', isIndexed: true },
        { name: 'expected_departure', type: 'number' },
        { name: 'visit_type', type: 'string' },
        { name: 'qr_code', type: 'string' },
        { name: 'arrival_status', type: 'string' },
        { name: 'arrived_at', type: 'number' },
        { name: 'departed_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'deliveries',
      columns: [
        { name: 'service_name', type: 'string' },
        { name: 'tracking_number', type: 'string' },
        { name: 'household_id', type: 'string', isIndexed: true },
        { name: 'household_name', type: 'string' },
        { name: 'residence_number', type: 'string' },
        { name: 'perishable', type: 'boolean' },
        { name: 'photos', type: 'string' }, // JSON array
        { name: 'pickup_status', type: 'string' },
        { name: 'arrived_at', type: 'number', isIndexed: true },
        { name: 'picked_up_at', type: 'number' },
        { name: 'officer_id', type: 'string' },
        { name: 'synced', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'construction_permits',
      columns: [
        { name: 'household_id', type: 'string', isIndexed: true },
        { name: 'contractor_name', type: 'string' },
        { name: 'contractor_phone', type: 'string' },
        { name: 'project_description', type: 'string' },
        { name: 'start_date', type: 'number', isIndexed: true },
        { name: 'end_date', type: 'number', isIndexed: true },
        { name: 'authorized_worker_count', type: 'number' },
        { name: 'current_worker_count', type: 'number' },
        { name: 'status', type: 'string', isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'incidents',
      columns: [
        { name: 'type', type: 'string', isIndexed: true },
        { name: 'severity', type: 'string', isIndexed: true },
        { name: 'location', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'photos', type: 'string' }, // JSON array
        { name: 'videos', type: 'string' }, // JSON array
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'officer_id', type: 'string', isIndexed: true },
        { name: 'assigned_to', type: 'string' },
        { name: 'timestamp', type: 'number', isIndexed: true },
        { name: 'synced', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'entity_type', type: 'string', isIndexed: true },
        { name: 'entity_id', type: 'string', isIndexed: true },
        { name: 'action', type: 'string' }, // create, update, delete
        { name: 'payload', type: 'string' }, // JSON
        { name: 'priority', type: 'number', isIndexed: true }, // 1=critical, 2=high, 3=normal
        { name: 'retry_count', type: 'number' },
        { name: 'error', type: 'string' },
        { name: 'created_at', type: 'number', isIndexed: true },
      ],
    }),
  ],
});

// src/database/models/GateEntry.ts
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class GateEntry extends Model {
  static table = 'gate_entries';

  @field('entry_type') entryType;
  @field('direction') direction;
  @field('vehicle_plate') vehiclePlate;
  @field('rfid_code') rfidCode;
  @field('gate_id') gateId;
  @field('officer_id') officerId;
  @field('household_id') householdId;
  @field('notes') notes;
  @field('photos') photosJson; // Stored as JSON string
  @date('timestamp') timestamp;
  @field('synced') synced;
  @field('sync_error') syncError;

  @readonly @date('created_at') createdAt;
  @readonly @date('updated_at') updatedAt;

  get photos() {
    return this.photosJson ? JSON.parse(this.photosJson) : [];
  }
}

// src/services/sync/SyncService.ts
import { database } from '../database';
import { supabase } from '../supabase';

class SyncService {
  private isSyncing = false;

  async syncQueuedEntries() {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const queueCollection = database.collections.get('sync_queue');
      const queuedItems = await queueCollection
        .query(Q.sortBy('priority', Q.asc), Q.sortBy('created_at', Q.asc))
        .fetch();

      for (const item of queuedItems) {
        try {
          await this.syncItem(item);
          await item.destroyPermanently();
        } catch (error) {
          await database.write(async () => {
            await item.update(record => {
              record.retryCount += 1;
              record.error = error.message;
            });
          });
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncItem(item: SyncQueueItem) {
    const payload = JSON.parse(item.payload);

    switch (item.entityType) {
      case 'gate_entry':
        await supabase.from('gate_entries').insert(payload);
        break;
      case 'delivery':
        await supabase.from('deliveries').insert(payload);
        // Send push notification to household
        await this.sendDeliveryNotification(payload.household_id, payload);
        break;
      case 'incident':
        await supabase.from('incidents').insert(payload);
        await this.escalateIncident(payload);
        break;
      default:
        throw new Error(`Unknown entity type: ${item.entityType}`);
    }
  }

  async queueEntry(entityType: string, payload: any, priority: number = 3) {
    await database.write(async () => {
      await database.collections.get('sync_queue').create(record => {
        record.entityType = entityType;
        record.entityId = payload.id;
        record.action = 'create';
        record.payload = JSON.stringify(payload);
        record.priority = priority;
        record.retryCount = 0;
        record.createdAt = Date.now();
      });
    });

    // Attempt immediate sync if online
    if (await this.isOnline()) {
      this.syncQueuedEntries();
    }
  }

  private async isOnline(): Promise<boolean> {
    try {
      const { error } = await supabase.from('gate_entries').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }
}

export const syncService = new SyncService();
```

**Sync Priorities**:
1. **Priority 1 (Critical)**: Incidents with severity=critical, perishable deliveries
2. **Priority 2 (High)**: All incidents, all deliveries, guest arrivals
3. **Priority 3 (Normal)**: Gate entries, guest departures, construction logs

---

## Decision 3: Geolocation and Background Location Tracking

**Question**: How should the app verify officer location at assigned gate and track shift coverage?

**Options Considered**:

1. **expo-location** - Expo's managed location API with background support
2. **react-native-geolocation-service** - Native geolocation with better accuracy
3. **@react-native-community/geolocation** - Community-maintained location package

**Decision**: **Use expo-location with background location for gate verification**

**Rationale**:
- Seamless integration with Expo managed workflow (no ejection needed)
- Built-in background location support with TaskManager
- Geofencing capabilities for automatic gate proximity detection
- Lower battery consumption with configurable accuracy modes
- Consistent with Expo stack used in Feature 003
- Handles iOS/Android permission differences automatically
- Support for foreground service on Android (required for long shifts)

**Implementation Example**:

```typescript
// src/services/location/LocationService.ts
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { database } from '../database';

const BACKGROUND_LOCATION_TASK = 'background-location-tracking';
const GATE_PROXIMITY_RADIUS = 100; // meters

interface GateLocation {
  gateId: string;
  gateName: string;
  latitude: number;
  longitude: number;
}

class LocationService {
  private currentGate: GateLocation | null = null;

  async requestPermissions(): Promise<boolean> {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      return false;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    return backgroundStatus === 'granted';
  }

  async startShiftTracking(gate: GateLocation) {
    this.currentGate = gate;

    // Define background task
    TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
      if (error) {
        console.error('Background location error:', error);
        return;
      }
      if (data) {
        const { locations } = data as any;
        await this.handleLocationUpdate(locations[0]);
      }
    });

    // Start background location updates
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 300000, // 5 minutes
      distanceInterval: 50, // 50 meters
      foregroundService: {
        notificationTitle: 'Village Tech Security',
        notificationBody: 'Tracking your shift at ' + gate.gateName,
        notificationColor: '#3B82F6',
      },
    });
  }

  async stopShiftTracking() {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
    this.currentGate = null;
  }

  async verifyAtGate(gate: GateLocation): Promise<{ isAtGate: boolean; distance?: number }> {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const distance = this.calculateDistance(
      location.coords.latitude,
      location.coords.longitude,
      gate.latitude,
      gate.longitude
    );

    return {
      isAtGate: distance <= GATE_PROXIMITY_RADIUS,
      distance: Math.round(distance),
    };
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private async handleLocationUpdate(location: Location.LocationObject) {
    if (!this.currentGate) return;

    const distance = this.calculateDistance(
      location.coords.latitude,
      location.coords.longitude,
      this.currentGate.latitude,
      this.currentGate.longitude
    );

    // Log location verification
    await database.write(async () => {
      await database.collections.get('shift_logs').create(record => {
        record.gateId = this.currentGate!.gateId;
        record.latitude = location.coords.latitude;
        record.longitude = location.coords.longitude;
        record.distance = distance;
        record.isAtGate = distance <= GATE_PROXIMITY_RADIUS;
        record.timestamp = Date.now();
      });
    });

    // Alert if officer has left gate area for extended period
    if (distance > GATE_PROXIMITY_RADIUS) {
      EventEmitter.emit('location:outside-gate', { distance, gate: this.currentGate });
    }
  }
}

export const locationService = new LocationService();

// React hook for gate verification
export function useGateVerification(gate: GateLocation) {
  const [isAtGate, setIsAtGate] = useState<boolean | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const verifyLocation = async () => {
    setIsVerifying(true);
    try {
      const result = await locationService.verifyAtGate(gate);
      setIsAtGate(result.isAtGate);
      setDistance(result.distance);
    } catch (error) {
      console.error('Location verification failed:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  return { isAtGate, distance, isVerifying, verifyLocation };
}
```

**Geolocation Configuration**:
```json
// app.json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Village Tech needs your location to verify you are at your assigned gate during shifts.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "Village Tech tracks your location during shifts to ensure gate coverage and security.",
        "UIBackgroundModes": ["location"]
      }
    },
    "android": {
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION"
      ]
    }
  }
}
```

**Battery Optimization**:
- Use `Accuracy.Balanced` instead of `Accuracy.High` for background updates
- 5-minute interval for location checks (not continuous tracking)
- 50-meter distance threshold to avoid unnecessary updates
- Stop tracking immediately on clock-out

---

## Decision 4: QR Code Scanning for Guest Verification

**Question**: How should the app scan guest QR codes for quick verification?

**Options Considered**:

1. **expo-barcode-scanner** - Expo's managed barcode/QR scanner
2. **react-native-camera** - Full-featured camera with QR scanning
3. **react-native-qrcode-scanner** - Dedicated QR code scanner

**Decision**: **Use expo-barcode-scanner for guest QR code verification**

**Rationale**:
- Native Expo integration (no native code required)
- Supports multiple barcode formats (QR Code, Data Matrix, etc.)
- Fast scanning performance with camera preview
- Automatic QR code detection without manual trigger
- Consistent with Expo stack and Feature 003
- Built-in torch/flashlight support for night shifts
- Works with expo-camera for photo capture (single camera permission)

**Implementation Example**:

```typescript
// src/components/QRScanner.tsx
import { BarCodeScanner, BarCodeScannerResult } from 'expo-barcode-scanner';
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

interface QRScannerProps {
  onScan: (qrCode: string) => void;
  onCancel: () => void;
}

export function QRScanner({ onScan, onCancel }: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = ({ type, data }: BarCodeScannerResult) => {
    if (scanned) return;
    setScanned(true);

    // Validate QR code format (should be guest pass UUID or signed token)
    if (data.length > 10) {
      onScan(data);
    } else {
      alert('Invalid guest QR code');
      setScanned(false);
    }
  };

  if (hasPermission === null) {
    return <Text>Requesting camera permission...</Text>;
  }

  if (hasPermission === false) {
    return <Text>Camera permission denied. Please enable in settings.</Text>;
  }

  return (
    <View style={styles.container}>
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
        barCodeTypes={[BarCodeScanner.Constants.BarCodeType.qr]}
        torchMode={torchOn ? 'on' : 'off'}
      />

      <View style={styles.overlay}>
        <View style={styles.scanArea} />
        <Text style={styles.instruction}>
          Align QR code within the frame
        </Text>
      </View>

      <View style={styles.controls}>
        <Pressable
          onPress={() => setTorchOn(!torchOn)}
          style={styles.torchButton}
        >
          <Text style={styles.buttonText}>{torchOn ? 'Flash Off' : 'Flash On'}</Text>
        </Pressable>

        <Pressable onPress={onCancel} style={styles.cancelButton}>
          <Text style={styles.buttonText}>Cancel</Text>
        </Pressable>

        {scanned && (
          <Pressable
            onPress={() => setScanned(false)}
            style={styles.rescanButton}
          >
            <Text style={styles.buttonText}>Scan Again</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// Usage in guest verification flow
export function GuestVerificationScreen() {
  const [showScanner, setShowScanner] = useState(false);
  const [guestDetails, setGuestDetails] = useState(null);

  const handleQRScanned = async (qrCode: string) => {
    setShowScanner(false);

    // Lookup guest by QR code
    const guest = await database.collections
      .get('scheduled_guests')
      .query(Q.where('qr_code', qrCode))
      .fetch();

    if (guest.length > 0) {
      setGuestDetails(guest[0]);
    } else {
      alert('Guest not found. Please verify manually.');
    }
  };

  return (
    <View>
      {showScanner ? (
        <QRScanner
          onScan={handleQRScanned}
          onCancel={() => setShowScanner(false)}
        />
      ) : (
        <Pressable onPress={() => setShowScanner(true)}>
          <Text>Scan Guest QR Code</Text>
        </Pressable>
      )}

      {guestDetails && (
        <GuestDetailsCard guest={guestDetails} />
      )}
    </View>
  );
}
```

---

## Summary

These technology decisions provide the foundation for the Sentinel Mobile App:

1. **react-native-ble-plx** for Bluetooth RFID reader integration with standardized BLE communication
2. **WatermelonDB** for offline-first architecture, reusing proven solution from Feature 003
3. **expo-location** with background tracking for gate assignment verification and geofencing
4. **expo-barcode-scanner** for quick guest QR code verification with torch support

All decisions prioritize:
- **Offline-first operation** for reliable 8-hour shifts without network dependency
- **Battery efficiency** for long duty periods
- **Cross-platform consistency** (iOS and Android)
- **Code reuse** from Feature 003 to reduce development time
- **Hardware integration** (RFID readers, camera, GPS) with graceful fallbacks
