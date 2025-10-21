# Residence Mobile App Quickstart Guide

**Feature**: Household Management Mobile Application (003)
**Last Updated**: 2025-10-09

---

## Prerequisites

Before starting, ensure you have:

- **Node.js** 20.x or later
- **npm** 10.x or later (or yarn 1.22+)
- **Expo CLI** (`npm install -g expo-cli`)
- **iOS Development** (macOS only):
  - Xcode 14+ with iOS 13+ simulator
  - CocoaPods (`sudo gem install cocoapods`)
- **Android Development**:
  - Android Studio with Android SDK 26+ (Android 8.0+)
  - Android Emulator configured
- **Physical Device** (recommended for testing camera, biometric, payments)
- **EAS CLI** for building (`npm install -g eas-cli`)

### Verify Installations
```bash
node --version     # v20.x.x or higher
npm --version      # 10.x.x or higher
expo --version     # Latest
```

---

## Step 1: Create Expo Project

```bash
cd apps
npx create-expo-app residence-app --template expo-template-blank-typescript
cd residence-app
```

**Project Structure** (initial):
```
residence-app/
├── App.tsx
├── app.json
├── package.json
├── tsconfig.json
└── babel.config.js
```

---

## Step 2: Install Dependencies

### Core Dependencies
```bash
# Navigation
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs @react-navigation/drawer
npm install react-native-screens react-native-safe-area-context react-native-gesture-handler react-native-reanimated

# Supabase
npm install @supabase/supabase-js
npm install react-native-url-polyfill

# AsyncStorage (for caching and offline queue)
npm install @react-native-async-storage/async-storage

# Network Info (for offline detection)
npm install @react-native-community/netinfo

# Forms & Validation
npm install react-hook-form zod

# Payments
npm install @stripe/stripe-react-native
# PayMongo/GCash via REST API (no SDK needed)

# UI (NativeWind - from research.md)
npm install nativewind
npm install --save-dev tailwindcss

# Camera & Files
expo install expo-camera expo-image-picker expo-file-system expo-document-picker

# Notifications
expo install expo-notifications expo-device

# Biometric
expo install expo-local-authentication expo-secure-store

# QR Code
expo install expo-barcode-scanner
npm install react-native-qrcode-svg

# Utilities
expo install expo-constants expo-linking
```

### Configure Tailwind (NativeWind)
```bash
npx tailwindcss init
```

**tailwind.config.js**:
```js
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        secondary: '#10B981',
        danger: '#EF4444',
      },
    },
  },
  plugins: [],
}
```

**babel.config.js**:
```js
module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'nativewind/babel',
      'react-native-reanimated/plugin', // Must be last
    ],
  }
}
```

---

## Step 3: Configure Supabase

### Create Supabase Config
```typescript
// src/lib/supabase.ts
import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

### Create Environment File
```bash
# .env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Step 4: Configure Supabase and Caching

### Create Supabase Config
```typescript
// src/lib/supabase.ts
import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

### Create Caching Service
```typescript
// src/lib/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage'

const CACHE_KEYS = {
  STICKERS: 'cached_stickers_',
  GUESTS: 'cached_guests_',
  ANNOUNCEMENTS: 'cached_announcements_',
  FEES: 'cached_fees_',
}

export class CacheService {
  static async getCachedData(key: string, householdId: string) {
    try {
      const fullKey = CACHE_KEYS[key as keyof typeof CACHE_KEYS] + householdId
      const cached = await AsyncStorage.getItem(fullKey)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      console.error('Cache read error:', error)
      return null
    }
  }

  static async setCachedData(key: string, householdId: string, data: any) {
    try {
      const fullKey = CACHE_KEYS[key as keyof typeof CACHE_KEYS] + householdId
      await AsyncStorage.setItem(fullKey, JSON.stringify({
        data,
        timestamp: Date.now(),
      }))
    } catch (error) {
      console.error('Cache write error:', error)
    }
  }

  static async clearCache(householdId: string) {
    try {
      const keys = Object.values(CACHE_KEYS).map(key => key + householdId)
      await AsyncStorage.multiRemove(keys)
    } catch (error) {
      console.error('Cache clear error:', error)
    }
  }
}
```

---

## Step 5: Configure app.json

```json
{
  "expo": {
    "name": "Village Tech Residence",
    "slug": "residence-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.villagetech.residence",
      "infoPlist": {
        "NSCameraUsageDescription": "This app uses the camera to capture photos for sticker requests and permit documents.",
        "NSPhotoLibraryUsageDescription": "This app accesses your photo library to upload documents.",
        "NSFaceIDUsageDescription": "Use Face ID to securely log in to your account."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.villagetech.residence",
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "USE_BIOMETRIC",
        "USE_FINGERPRINT"
      ]
    },
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "Allow Village Tech to use your camera for document uploads."
        }
      ],
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#3B82F6"
        }
      ],
      "@stripe/stripe-react-native"
    ],
    "scheme": "villagetechapp",
    "extra": {
      "eas": {
        "projectId": "your-eas-project-id"
      }
    }
  }
}
```

---

## Step 6: Set Up Navigation

### Root Navigator
```typescript
// src/navigation/AppNavigator.tsx
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { useAuth } from '../hooks/useAuth'
import AuthNavigator from './AuthNavigator'
import MainNavigator from './MainNavigator'

const Stack = createStackNavigator()

export default function AppNavigator() {
  const { session } = useAuth()

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
```

### Main Tab Navigator
```typescript
// src/navigation/MainNavigator.tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import DashboardScreen from '../screens/dashboard/DashboardScreen'
import StickersNavigator from './StickersNavigator'
import GuestsNavigator from './GuestsNavigator'
import FeesNavigator from './FeesNavigator'
import MoreNavigator from './MoreNavigator'

const Tab = createBottomTabNavigator()

export default function MainNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Stickers" component={StickersNavigator} />
      <Tab.Screen name="Guests" component={GuestsNavigator} />
      <Tab.Screen name="Fees" component={FeesNavigator} />
      <Tab.Screen name="More" component={MoreNavigator} />
    </Tab.Navigator>
  )
}
```

---

## Step 7: Run the App

### Start Development Server
```bash
npx expo start
```

**Output**:
```
› Metro waiting on exp://192.168.1.100:8081
› Scan the QR code above with Expo Go (Android) or Camera app (iOS)

› Press a │ open Android
› Press i │ open iOS simulator
› Press w │ open web
```

### Run on iOS Simulator
```bash
# Press 'i' or
npx expo run:ios
```

### Run on Android Emulator
```bash
# Press 'a' or
npx expo run:android
```

### Run on Physical Device
1. Install **Expo Go** app from App Store/Play Store
2. Scan QR code with camera (iOS) or Expo Go (Android)
3. App loads on device

---

## Step 8: Configure Push Notifications

### Register for Push Notifications
```typescript
// src/lib/notifications/pushService.ts
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { supabase } from '../supabase'

export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    alert('Push notifications require a physical device')
    return null
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    alert('Push notification permissions denied')
    return null
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data

  // Save token to Supabase
  const { data: { user } } = await supabase.auth.getUser()
  await supabase
    .from('household_members')
    .update({ push_token: token })
    .eq('user_id', user?.id)

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    })
  }

  return token
}

// Handle foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})
```

---

## Step 9: Configure Biometric Authentication

### Biometric Login
```typescript
// src/lib/auth/authService.ts
import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'

export async function enableBiometric(userId: string) {
  const compatible = await LocalAuthentication.hasHardwareAsync()
  const enrolled = await LocalAuthentication.isEnrolledAsync()

  if (!compatible || !enrolled) {
    throw new Error('Biometric authentication not available')
  }

  // Store user credentials securely
  await SecureStore.setItemAsync('biometric_enabled', 'true')
  await SecureStore.setItemAsync('user_id', userId)

  return true
}

export async function authenticateWithBiometric(): Promise<boolean> {
  const enabled = await SecureStore.getItemAsync('biometric_enabled')
  if (enabled !== 'true') return false

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Authenticate to access your account',
    fallbackLabel: 'Use password instead',
  })

  return result.success
}
```

---

## Step 10: Test Payment Integration

### Stripe Test Mode
```typescript
// src/screens/fees/FeePaymentScreen.tsx
import { StripeProvider, useStripe } from '@stripe/stripe-react-native'

export default function FeePaymentScreen({ route }) {
  const { fee } = route.params
  const { initPaymentSheet, presentPaymentSheet } = useStripe()

  const handlePayment = async () => {
    // Create payment intent
    const { data } = await supabase.functions.invoke('create-payment-intent', {
      body: { feeId: fee.id, amount: fee.amount, gateway: 'stripe' },
    })

    await initPaymentSheet({
      paymentIntentClientSecret: data.clientSecret,
      merchantDisplayName: 'Village Tech HOA',
    })

    const { error } = await presentPaymentSheet()

    if (!error) {
      Alert.alert('Success', 'Payment completed!')
    }
  }

  return (
    <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY}>
      <Button title="Pay Now" onPress={handlePayment} />
    </StripeProvider>
  )
}
```

**Test Cards**:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0027 6000 3184`

---

## Step 11: Build for Production

### Configure EAS Build
```bash
eas init
eas build:configure
```

**eas.json**:
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "ios": {
        "bundleIdentifier": "com.villagetech.residence"
      },
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

### Build iOS
```bash
eas build --platform ios --profile production
```

### Build Android
```bash
eas build --platform android --profile production
```

---

## Troubleshooting

### Issue: Metro bundler errors

**Solution**: Clear cache and restart
```bash
npx expo start -c
```

### Issue: WatermelonDB not working on iOS

**Solution**: Reinstall pods
```bash
cd ios
pod install
cd ..
npx expo run:ios
```

### Issue: Push notifications not received

**Solution**:
1. Check physical device (simulators don't support push)
2. Verify permissions granted
3. Check Expo push token saved correctly
4. Test with Expo push notification tool: https://expo.dev/notifications

### Issue: Stripe payment sheet crashes

**Solution**:
1. Ensure `@stripe/stripe-react-native` installed correctly
2. Run `npx expo prebuild` to generate native folders
3. Rebuild app: `npx expo run:ios` or `npx expo run:android`

### Issue: Biometric auth not working

**Solution**:
1. Physical device required (simulators limited)
2. iOS: Ensure Face ID/Touch ID configured in Settings
3. Android: Ensure fingerprint/face unlock configured
4. Check permissions in app.json

---

## Next Steps

1. ✅ Verify app runs on iOS simulator/Android emulator
2. ✅ Test on physical device (camera, biometric, payments)
3. ✅ Configure push notifications and receive test notification
4. ✅ Test offline mode (enable airplane mode, queue action, reconnect)
5. Read the full specification: [`spec.md`](spec.md)
6. Review technology decisions: [`research.md`](research.md)
7. Generate implementation tasks:
   ```bash
   /speckit.tasks
   ```
8. Begin implementation following task order in `tasks.md`

---

## Support

- **Expo Documentation**: https://docs.expo.dev/
- **React Navigation**: https://reactnavigation.org/docs/getting-started
- **WatermelonDB**: https://watermelondb.dev/docs
- **Stripe React Native**: https://stripe.com/docs/payments/accept-a-payment?platform=react-native
- **Supabase JS**: https://supabase.com/docs/reference/javascript
- **Issues**: Create an issue in the GitHub repository

---

**Estimated Setup Time**: 60-90 minutes

**Last Updated**: 2025-10-09
