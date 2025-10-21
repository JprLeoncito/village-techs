# Quickstart Guide
## Feature 004: Security Gate Operations Mobile Application (Sentinel App)

This guide helps developers set up and run the Sentinel Mobile App for security officers.

---

## Prerequisites

- Node.js 18+ and npm/yarn
- Expo CLI: `npm install -g expo-cli eas-cli`
- iOS Simulator (macOS) or Android Studio (for Android development)
- Supabase project configured (see Feature 001 setup)
- Physical device for testing hardware integrations (RFID, Bluetooth, GPS)

---

## Project Setup

### 1. Create Expo App

```bash
cd apps/
npx create-expo-app sentinel-app --template expo-template-blank-typescript
cd sentinel-app
```

### 2. Install Core Dependencies

```bash
# Expo SDK modules
npx expo install expo-location expo-task-manager expo-camera expo-barcode-scanner expo-notifications expo-local-authentication expo-image-picker

# Database and offline-first
npm install @nozbe/watermelondb @nozbe/with-observables
npx expo install @react-native-async-storage/async-storage

# Bluetooth RFID reader
npm install react-native-ble-plx

# Navigation
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context

# UI and styling
npm install nativewind
npm install --save-dev tailwindcss@3.3.2

# Supabase client
npm install @supabase/supabase-js

# Utilities
npm install date-fns zustand react-hook-form zod
```

### 3. Configure NativeWind (Tailwind CSS)

```bash
npx tailwindcss init
```

**tailwind.config.js**:
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        danger: {
          DEFAULT: '#EF4444',
          600: '#DC2626',
        },
        success: {
          DEFAULT: '#10B981',
          600: '#059669',
        },
        warning: {
          DEFAULT: '#F59E0B',
          600: '#D97706',
        },
      },
    },
  },
  plugins: [],
}
```

**babel.config.js**:
```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['nativewind/babel'],
  };
};
```

---

## Database Setup (WatermelonDB)

### 1. Initialize WatermelonDB

```bash
npm install --save-dev @babel/plugin-proposal-decorators
```

**babel.config.js** (update):
```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'nativewind/babel',
      ['@babel/plugin-proposal-decorators', { legacy: true }],
    ],
  };
};
```

### 2. Create Database Schema

**src/database/schema.ts** (see research.md for full schema)

### 3. Create Database Models

**src/database/models/GateEntry.ts**:
```typescript
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
  @field('photos') photosJson;
  @date('timestamp') timestamp;
  @field('synced') synced;

  @readonly @date('created_at') createdAt;
  @readonly @date('updated_at') updatedAt;

  get photos() {
    return this.photosJson ? JSON.parse(this.photosJson) : [];
  }
}
```

### 4. Initialize Database

**src/database/index.ts**:
```typescript
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import GateEntry from './models/GateEntry';
import Sticker from './models/Sticker';
import ScheduledGuest from './models/ScheduledGuest';
import Delivery from './models/Delivery';
import ConstructionPermit from './models/ConstructionPermit';
import Incident from './models/Incident';
import SyncQueue from './models/SyncQueue';

const adapter = new SQLiteAdapter({
  schema,
  jsi: true, // Platform.OS === 'ios'
  onSetUpError: error => {
    console.error('Database setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [
    GateEntry,
    Sticker,
    ScheduledGuest,
    Delivery,
    ConstructionPermit,
    Incident,
    SyncQueue,
  ],
});
```

---

## Bluetooth RFID Setup

### 1. Configure Bluetooth Permissions

**app.json**:
```json
{
  "expo": {
    "name": "Village Tech Sentinel",
    "slug": "sentinel-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.villagetech.sentinel",
      "infoPlist": {
        "NSBluetoothAlwaysUsageDescription": "Village Tech needs Bluetooth to connect to RFID readers for vehicle sticker scanning.",
        "NSBluetoothPeripheralUsageDescription": "Village Tech needs Bluetooth to connect to RFID readers for vehicle sticker scanning.",
        "NSCameraUsageDescription": "Village Tech needs camera access to capture entry photos and scan QR codes.",
        "NSLocationWhenInUseUsageDescription": "Village Tech needs your location to verify you are at your assigned gate.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "Village Tech tracks your location during shifts to ensure gate coverage.",
        "UIBackgroundModes": ["location"]
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.villagetech.sentinel",
      "permissions": [
        "BLUETOOTH",
        "BLUETOOTH_ADMIN",
        "BLUETOOTH_CONNECT",
        "BLUETOOTH_SCAN",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    },
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow Village Tech to use your location during shifts to verify gate assignment."
        }
      ],
      [
        "expo-camera",
        {
          "cameraPermission": "Allow Village Tech to access your camera for entry photos and QR scanning."
        }
      ]
    ]
  }
}
```

### 2. Test RFID Connection

Create a test screen to verify RFID reader pairing:

**src/screens/RFIDTestScreen.tsx**:
```typescript
import { useState } from 'react';
import { View, Text, Pressable, FlatList } from 'react-native';
import { useRFIDScanner } from '../services/rfid/RFIDService';

export function RFIDTestScreen() {
  const { rfidCode, isConnected, scanForReaders, connectReader, disconnectReader } = useRFIDScanner();
  const [devices, setDevices] = useState([]);

  const handleScan = async () => {
    const foundDevices = await scanForReaders();
    setDevices(foundDevices);
  };

  return (
    <View className="flex-1 p-4">
      <Text className="text-2xl font-bold mb-4">RFID Reader Test</Text>

      <Pressable
        onPress={handleScan}
        className="bg-primary px-6 py-3 rounded-lg mb-4"
      >
        <Text className="text-white text-center font-semibold">
          Scan for Readers
        </Text>
      </Pressable>

      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => connectReader(item.id)}
            className="bg-gray-100 p-4 rounded-lg mb-2"
          >
            <Text className="font-semibold">{item.name || 'Unknown Device'}</Text>
            <Text className="text-gray-600">{item.id}</Text>
          </Pressable>
        )}
      />

      {isConnected && (
        <View className="bg-success p-4 rounded-lg mb-4">
          <Text className="text-white font-semibold">RFID Reader Connected</Text>
          {rfidCode && (
            <Text className="text-white mt-2">Last Scanned: {rfidCode}</Text>
          )}
        </View>
      )}

      {isConnected && (
        <Pressable
          onPress={disconnectReader}
          className="bg-danger px-6 py-3 rounded-lg"
        >
          <Text className="text-white text-center font-semibold">
            Disconnect Reader
          </Text>
        </Pressable>
      )}
    </View>
  );
}
```

---

## Geolocation and Background Tracking

### 1. Request Location Permissions

**src/services/location/LocationService.ts** (see research.md for full implementation)

### 2. Test Location Verification

**src/screens/LocationTestScreen.tsx**:
```typescript
import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useGateVerification } from '../services/location/LocationService';

export function LocationTestScreen() {
  const testGate = {
    gateId: 'gate-001',
    gateName: 'Main Gate',
    latitude: 14.5995, // Replace with actual gate coordinates
    longitude: 120.9842,
  };

  const { isAtGate, distance, isVerifying, verifyLocation } = useGateVerification(testGate);

  return (
    <View className="flex-1 p-4">
      <Text className="text-2xl font-bold mb-4">Location Verification Test</Text>

      <Pressable
        onPress={verifyLocation}
        disabled={isVerifying}
        className={`px-6 py-3 rounded-lg mb-4 ${isVerifying ? 'bg-gray-400' : 'bg-primary'}`}
      >
        <Text className="text-white text-center font-semibold">
          {isVerifying ? 'Verifying...' : 'Verify Location'}
        </Text>
      </Pressable>

      {isAtGate !== null && (
        <View className={`p-4 rounded-lg ${isAtGate ? 'bg-success' : 'bg-warning'}`}>
          <Text className="text-white font-semibold text-lg mb-2">
            {isAtGate ? '✓ At Gate' : '⚠ Not at Gate'}
          </Text>
          {distance !== null && (
            <Text className="text-white">
              Distance: {distance}m from {testGate.gateName}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
```

---

## Supabase Integration

### 1. Configure Supabase Client

**src/lib/supabase.ts**:
```typescript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### 2. Environment Variables

**.env**:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Push Notifications Setup

### 1. Configure Expo Notifications

**src/services/notifications/NotificationService.ts**:
```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  async registerForPushNotifications(): Promise<string | undefined> {
    if (!Device.isDevice) {
      alert('Push notifications only work on physical devices');
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      alert('Failed to get push notification permissions');
      return;
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
      });
    }

    return token;
  }

  async sendLocalNotification(title: string, body: string) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: null, // Immediate
    });
  }
}

export const notificationService = new NotificationService();
```

---

## Camera and QR Scanner Setup

### 1. Test QR Scanner

**src/screens/QRTestScreen.tsx**:
```typescript
import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { QRScanner } from '../components/QRScanner';

export function QRTestScreen() {
  const [showScanner, setShowScanner] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);

  const handleScan = (qrCode: string) => {
    setScannedData(qrCode);
    setShowScanner(false);
  };

  return (
    <View className="flex-1">
      {showScanner ? (
        <QRScanner
          onScan={handleScan}
          onCancel={() => setShowScanner(false)}
        />
      ) : (
        <View className="p-4">
          <Text className="text-2xl font-bold mb-4">QR Scanner Test</Text>

          <Pressable
            onPress={() => setShowScanner(true)}
            className="bg-primary px-6 py-3 rounded-lg mb-4"
          >
            <Text className="text-white text-center font-semibold">
              Open Scanner
            </Text>
          </Pressable>

          {scannedData && (
            <View className="bg-success p-4 rounded-lg">
              <Text className="text-white font-semibold mb-2">Scanned:</Text>
              <Text className="text-white">{scannedData}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
```

---

## Project Structure

```
sentinel-app/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── QRScanner.tsx
│   │   ├── PhotoCapture.tsx
│   │   └── EntryCard.tsx
│   ├── screens/             # Feature screens
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── GateSelectionScreen.tsx
│   │   ├── entry/
│   │   │   ├── EntryLogScreen.tsx
│   │   │   └── VehicleEntryScreen.tsx
│   │   ├── guest/
│   │   │   ├── GuestListScreen.tsx
│   │   │   └── GuestVerificationScreen.tsx
│   │   ├── delivery/
│   │   │   ├── DeliveryLogScreen.tsx
│   │   │   └── DeliveryDetailsScreen.tsx
│   │   ├── construction/
│   │   │   ├── PermitListScreen.tsx
│   │   │   └── WorkerEntryScreen.tsx
│   │   ├── incident/
│   │   │   ├── IncidentReportScreen.tsx
│   │   │   └── IncidentListScreen.tsx
│   │   └── monitoring/
│   │       ├── GateMonitoringScreen.tsx
│   │       └── ShiftReportScreen.tsx
│   ├── database/            # WatermelonDB setup
│   │   ├── schema.ts
│   │   ├── models/
│   │   └── index.ts
│   ├── services/            # Business logic
│   │   ├── rfid/
│   │   │   └── RFIDService.ts
│   │   ├── location/
│   │   │   └── LocationService.ts
│   │   ├── sync/
│   │   │   └── SyncService.ts
│   │   └── notifications/
│   │       └── NotificationService.ts
│   ├── lib/
│   │   └── supabase.ts
│   └── navigation/
│       └── AppNavigator.tsx
├── assets/
├── app.json
├── babel.config.js
├── tailwind.config.js
└── package.json
```

---

## Running the App

### Development Build

```bash
# Start Expo dev server
npx expo start

# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android

# Run on physical device (recommended for hardware testing)
# Scan QR code with Expo Go app
```

### Testing Hardware Integrations

**IMPORTANT**: Hardware features (RFID, Bluetooth, GPS, Camera) require physical devices:

1. **RFID Reader Testing**:
   - Pair Bluetooth RFID reader with phone via system settings first
   - Use RFIDTestScreen to verify connection
   - Test scanning with actual RFID stickers

2. **Location Testing**:
   - Enable location permissions (Always Allow for background tracking)
   - Use LocationTestScreen with actual gate coordinates
   - Test geofencing by walking away from gate

3. **Camera/QR Testing**:
   - Use QRTestScreen to verify camera permissions
   - Test with guest QR codes generated by resident app
   - Test in low-light conditions (night shift simulation)

---

## EAS Build Configuration

For production builds with native modules (required for Bluetooth, background location):

```bash
eas init
eas build:configure
```

**eas.json**:
```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "resourceClass": "m1-medium"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "resourceClass": "m1-medium"
      }
    },
    "production": {
      "ios": {
        "resourceClass": "m1-medium"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Build for Testing

```bash
# iOS development build (requires Apple Developer account)
eas build --profile development --platform ios

# Android development build
eas build --profile development --platform android
```

---

## Seeding Test Data

Create seed data for offline testing:

**scripts/seedLocalDatabase.ts**:
```typescript
import { database } from '../src/database';

async function seedDatabase() {
  await database.write(async () => {
    const stickersCollection = database.collections.get('stickers');

    // Create test stickers
    await stickersCollection.create(record => {
      record.rfidCode = 'ABC123456789';
      record.vehiclePlate = 'ABC1234';
      record.status = 'active';
      record.expiryDate = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
      record.householdId = 'household-001';
      record.householdName = 'Smith Family';
      record.residenceNumber = 'A-101';
      record.syncedAt = Date.now();
    });

    const guestsCollection = database.collections.get('scheduled_guests');

    // Create test scheduled guest
    await guestsCollection.create(record => {
      record.guestName = 'John Doe';
      record.phone = '+639171234567';
      record.vehiclePlate = 'XYZ9876';
      record.householdId = 'household-001';
      record.householdName = 'Smith Family';
      record.residenceNumber = 'A-101';
      record.expectedArrival = Date.now() + 60 * 60 * 1000; // 1 hour from now
      record.expectedDeparture = Date.now() + 4 * 60 * 60 * 1000; // 4 hours
      record.visitType = 'day-trip';
      record.qrCode = 'guest-qr-12345';
      record.arrivalStatus = 'scheduled';
    });
  });

  console.log('✅ Test data seeded successfully');
}

seedDatabase();
```

---

## Troubleshooting

### Bluetooth Issues
- **iOS**: Ensure "Bluetooth Always" permission is granted in Settings > Privacy > Bluetooth
- **Android**: Enable Location Services (required for Bluetooth scanning on Android 10+)

### Location Issues
- **Background location not working**: Check app.json UIBackgroundModes includes "location"
- **Geofencing inaccurate**: Increase GATE_PROXIMITY_RADIUS or use Accuracy.High

### Camera/QR Scanner Issues
- **Black screen**: Check camera permissions in device settings
- **QR code not detected**: Ensure adequate lighting, use torch mode for night shifts

### Database Sync Issues
- **Sync queue growing**: Check network connectivity, verify Supabase RLS policies allow inserts
- **Duplicate entries**: Verify duplicate prevention logic (2-minute window check)

---

## Next Steps

1. Implement authentication flow with gate selection
2. Build entry logging screens with RFID integration
3. Implement guest verification with QR scanning
4. Create delivery logging with photo capture
5. Build incident reporting with media uploads
6. Set up background sync service
7. Test offline mode with extended disconnection
8. Configure push notifications for broadcasts and incidents
9. Build shift tracking with clock-in/clock-out
10. Test full workflow on physical device with actual RFID reader

---

## Additional Resources

- [Expo Location Documentation](https://docs.expo.dev/versions/latest/sdk/location/)
- [react-native-ble-plx Guide](https://github.com/dotintent/react-native-ble-plx)
- [WatermelonDB Documentation](https://nozbe.github.io/WatermelonDB/)
- [Expo Barcode Scanner](https://docs.expo.dev/versions/latest/sdk/bar-code-scanner/)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
