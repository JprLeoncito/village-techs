# Technology Research & Decisions

**Feature**: Household Management Mobile Application (003)
**Date**: 2025-10-09
**Purpose**: Resolve NEEDS CLARIFICATION items from Technical Context

---

## Research Task 1: Data Storage Architecture

### Decision: **Supabase Direct with AsyncStorage for Simple Caching**

### Context
The Residence Mobile App requires data access with offline support (FR-070 to FR-073) with:
- Cached viewing of stickers, guests, fees, announcements
- Queuing offline actions (sticker requests, guest scheduling)
- Automatic sync upon reconnection
- Performance target: <1 second cached data access (SC-005)

### Alternatives Considered

#### Option A: Supabase Direct + AsyncStorage
**Pros**:
- Direct access to existing data in Supabase (already used by admin dashboards)
- Simple implementation with familiar React Query patterns
- AsyncStorage provides adequate caching for offline viewing
- No complex data synchronization between local and remote databases
- Smaller bundle size and reduced complexity
- Leverages existing Supabase Row Level Security for multi-tenancy

**Cons**:
- Limited offline capabilities (viewing only, no complex queries)
- Requires manual sync queue implementation for offline actions
- Dependent on network connection for most operations
- Less sophisticated caching than dedicated offline database

#### Option B: WatermelonDB + SQLite
**Pros**:
- Built for React Native offline-first apps
- SQLite-based with lazy loading (loads only what's visible)
- Observables for automatic UI updates
- Sync adapter for bi-directional sync with Supabase
- Handles complex queries and relationships efficiently
- Mature library with active community

**Cons**:
- Slightly larger bundle size (~200KB)
- Learning curve for Watermelon-specific patterns
- Requires schema definition separate from Supabase types
- Complex data synchronization between local SQLite and remote PostgreSQL
- Overkill for simple viewing and queuing requirements

#### Option C: AsyncStorage + MMKV
**Pros**:
- Simple key-value storage
- MMKV is extremely fast (10x faster than AsyncStorage)
- Small bundle size
- Easy to use

**Cons**:
- No relational data support (everything is JSON)
- No query capabilities (must load all data to filter)
- Manual sync queue implementation required
- Poor performance for large datasets (>1MB)
- No automatic UI updates on data changes

#### Option D: Redux Persist + AsyncStorage
**Pros**:
- Integrates with Redux state management
- Automatic hydration on app start
- Simple configuration

**Cons**:
- Stores entire Redux state as JSON (no selective queries)
- All data loaded into memory on app start
- Poor performance with large datasets
- No offline sync queue built-in
- Redux overhead for mobile app

### Rationale for Supabase Direct

**For Residence Mobile App** → **Supabase Direct + AsyncStorage**:
- Existing data already in Supabase from admin dashboard implementations
- Simpler architecture reduces development time and maintenance burden
- AsyncStorage caching provides sufficient offline viewing for stickers, guests, fees, announcements
- Critical actions (sticker requests, guest scheduling) can be queued for sync when connection returns
- Removes complexity of dual database architecture and schema synchronization
- Leverages Supabase's real-time capabilities for automatic updates when online

### Implementation Guidance

**Supabase Client Setup**:

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

**AsyncStorage Caching Layer**:

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

**Offline Queue Implementation**:

```typescript
// src/lib/offlineQueue.ts
import { supabase } from './supabase'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { NetInfo } from '@react-native-community/netinfo'

interface QueuedAction {
  id: string
  type: 'sticker_request' | 'guest_schedule' | 'fee_payment'
  data: any
  timestamp: number
  retries: number
}

export class OfflineQueue {
  private static readonly QUEUE_KEY = 'offline_action_queue'

  static async addAction(type: QueuedAction['type'], data: any) {
    const action: QueuedAction = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type,
      data,
      timestamp: Date.now(),
      retries: 0,
    }

    const queue = await this.getQueue()
    queue.push(action)
    await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue))
  }

  static async getQueue(): Promise<QueuedAction[]> {
    try {
      const queue = await AsyncStorage.getItem(this.QUEUE_KEY)
      return queue ? JSON.parse(queue) : []
    } catch {
      return []
    }
  }

  static async processQueue() {
    const isConnected = (await NetInfo.fetch()).isConnected
    if (!isConnected) return

    const queue = await this.getQueue()
    const remaining: QueuedAction[] = []

    for (const action of queue) {
      try {
        await this.executeAction(action)
        // Action succeeded, don't add back to queue
      } catch (error) {
        console.error('Queue action failed:', error)
        action.retries++
        if (action.retries < 3) {
          remaining.push(action)
        }
      }
    }

    await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(remaining))
  }

  private static async executeAction(action: QueuedAction) {
    switch (action.type) {
      case 'sticker_request':
        return await supabase.from('vehicle_sticker_requests').insert(action.data)
      case 'guest_schedule':
        return await supabase.from('guest_visits').insert(action.data)
      case 'fee_payment':
        return await supabase.from('fee_payments').insert(action.data)
      default:
        throw new Error(`Unknown action type: ${action.type}`)
    }
  }
}
```

**React Hook Integration**:

```typescript
// src/hooks/useStickers.ts
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { CacheService } from '../lib/storage'
import { OfflineQueue } from '../lib/offlineQueue'

export function useStickers(householdId: string) {
  const [stickers, setStickers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStickers()
  }, [householdId])

  const loadStickers = async () => {
    setLoading(true)

    try {
      // Try cache first
      const cached = await CacheService.getCachedData('STICKERS', householdId)
      if (cached) {
        setStickers(cached.data)
      }

      // Fetch fresh data
      const { data, error } = await supabase
        .from('vehicle_stickers')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setStickers(data || [])
      await CacheService.setCachedData('STICKERS', householdId, data || [])
    } catch (error) {
      console.error('Error loading stickers:', error)
    } finally {
      setLoading(false)
    }
  }

  const requestSticker = async (stickerData: any) => {
    try {
      const { data, error } = await supabase
        .from('vehicle_sticker_requests')
        .insert({ ...stickerData, household_id: householdId })
        .select()
        .single()

      if (error) throw error

      // Refresh stickers list
      await loadStickers()
      return data
    } catch (error) {
      console.error('Error requesting sticker:', error)
      // Queue for offline sync
      await OfflineQueue.addAction('sticker_request', {
        ...stickerData,
        household_id: householdId,
      })
      throw error
    }
  }

  return { stickers, loading, requestSticker, refresh: loadStickers }
}
```

### Performance Metrics
- Supabase connection: ~50ms on app start
- AsyncStorage cache read: ~5ms
- Query 100 stickers via Supabase: ~200ms (network dependent)
- Queue offline action: ~10ms
- Meets SC-005: <1 second cached data access ✅

---

## Research Task 2: Payment Gateway Integration

### Decision: **Hybrid Approach - Stripe React Native SDK + REST APIs for PayMongo/GCash**

### Context
The app requires mobile payment integration (FR-064, FR-044) for:
- Association fee payments (monthly, quarterly, annual)
- Construction permit road fees
- Multiple payment methods: Stripe (international), PayMongo (Philippines), GCash (e-wallet)
- Performance target: <3 minutes end-to-end payment (SC-003)

### Alternatives Considered

#### Option A: Stripe React Native SDK
**Pros**:
- Official Stripe SDK with native card input UI
- PCI compliance handled by SDK (tokenization)
- 3D Secure 2.0 support built-in
- Apple Pay / Google Pay integration
- Well-documented with React Native examples

**Cons**:
- Only supports Stripe (need separate integration for PayMongo/GCash)
- Requires Stripe merchant account

#### Option B: REST APIs for All Gateways
**Pros**:
- Consistent integration pattern across all gateways
- Full control over UI/UX
- Smaller bundle size (no native SDKs)

**Cons**:
- Must build custom card input with PCI compliance
- Manual 3D Secure handling
- More security responsibilities
- Complex error handling

#### Option C: WebView with Gateway Hosted Pages
**Pros**:
- Minimal integration code
- Gateway handles all PCI compliance
- Easy to add new gateways

**Cons**:
- Poor user experience (leaves app to web page)
- No control over UI/branding
- Difficult error handling and deep linking back to app

### Rationale for Hybrid Approach

**For Stripe** → **React Native SDK**:
- Best-in-class mobile UX with native card input
- PCI compliance handled automatically
- Apple Pay/Google Pay for premium experience
- 3D Secure 2.0 seamless integration

**For PayMongo/GCash** → **REST API**:
- PayMongo doesn't have official React Native SDK
- GCash uses redirect-based flow (better suited for web integration)
- Both support payment intents/tokenization via REST
- Edge Function can proxy API calls to keep API keys secure

### Implementation Guidance

**Stripe Integration**:

```typescript
// lib/payments/stripeService.ts
import { StripeProvider, useStripe } from '@stripe/stripe-react-native'
import { supabase } from '../supabase'

export function StripePaymentScreen({ feeId, amount }) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe()

  const handlePayment = async () => {
    // 1. Create payment intent via Edge Function
    const { data } = await supabase.functions.invoke('create-payment-intent', {
      body: { feeId, amount, gateway: 'stripe' },
    })

    // 2. Initialize payment sheet
    const { error: initError } = await initPaymentSheet({
      paymentIntentClientSecret: data.clientSecret,
      merchantDisplayName: 'Village Tech HOA',
      applePay: { merchantCountryCode: 'US' },
      googlePay: { merchantCountryCode: 'US', testEnv: __DEV__ },
    })

    if (initError) throw initError

    // 3. Present payment sheet
    const { error: paymentError } = await presentPaymentSheet()

    if (paymentError) {
      Alert.alert('Payment failed', paymentError.message)
    } else {
      Alert.alert('Success', 'Payment completed!')
      // 4. Update fee status via API
      await supabase
        .from('association_fees')
        .update({ payment_status: 'paid', payment_date: new Date() })
        .eq('id', feeId)
    }
  }

  return (
    <Button onPress={handlePayment}>Pay ${amount} with Stripe</Button>
  )
}

// App.tsx
export default function App() {
  return (
    <StripeProvider publishableKey="pk_test_...">
      <NavigationContainer>
        {/* ... */}
      </NavigationContainer>
    </StripeProvider>
  )
}
```

**PayMongo Integration** (via Edge Function + REST):

```typescript
// Edge Function: create-payment-intent/index.ts
serve(async (req) => {
  const { feeId, amount, gateway } = await req.json()

  if (gateway === 'paymongo') {
    // Create PayMongo PaymentIntent
    const response = await fetch('https://api.paymongo.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(Deno.env.get('PAYMONGO_SECRET_KEY')!)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: amount * 100, // Convert to cents
            currency: 'PHP',
            description: `HOA Fee Payment - ${feeId}`,
          },
        },
      }),
    })

    const paymentIntent = await response.json()

    return new Response(JSON.stringify({
      clientSecret: paymentIntent.data.attributes.client_key,
      paymentIntentId: paymentIntent.data.id,
    }))
  }
})
```

**GCash Integration** (redirect-based):

```typescript
// lib/payments/gcashService.ts
import { Linking } from 'react-native'
import { supabase } from '../supabase'

export async function payWithGCash(feeId: string, amount: number) {
  // 1. Create GCash payment source via Edge Function
  const { data } = await supabase.functions.invoke('create-gcash-payment', {
    body: { feeId, amount },
  })

  // 2. Open GCash redirect URL
  const supported = await Linking.canOpenURL(data.redirectUrl)
  if (supported) {
    await Linking.openURL(data.redirectUrl)
  }

  // 3. User completes payment in GCash app/browser
  // 4. GCash redirects back via deep link: villagetechapp://payment-success?fee_id=...
  // 5. App handles deep link and updates fee status
}

// Handle deep link return
Linking.addEventListener('url', (event) => {
  const url = event.url
  if (url.includes('payment-success')) {
    const feeId = new URL(url).searchParams.get('fee_id')
    // Update fee status
  }
})
```

### Performance Metrics
- Stripe payment sheet init: ~1-2 seconds
- Payment processing: ~5-10 seconds (network dependent)
- Total flow: <3 minutes (SC-003) ✅

---

## Research Task 3: UI Component Library

### Decision: **NativeWind (Tailwind CSS for React Native)**

### Context
The app needs consistent, performant UI components across 25+ screens with:
- Platform-specific styling (iOS vs Android)
- Responsive layouts for different screen sizes
- Custom brand theming
- Fast iteration during development

### Alternatives Considered

#### Option A: NativeBase
**Pros**:
- 100+ pre-built components
- Accessibility built-in
- Dark mode support
- Responsive utilities

**Cons**:
- Heavy bundle size (~500KB)
- Custom theme system (not CSS-based)
- Less control over low-level styling
- Slower performance with many components

#### Option B: React Native Paper (Material Design)
**Pros**:
- Material Design 3 components
- Excellent theming system
- Accessibility compliance
- Active maintenance

**Cons**:
- Material Design may not fit brand
- Bundle size (~300KB)
- Less flexibility for custom designs

#### Option C: NativeWind (Tailwind CSS for React Native)
**Pros**:
- Tailwind CSS utility classes in React Native
- Zero runtime cost (compiled to StyleSheet)
- Tiny bundle size
- Platform-specific modifiers (ios: android:)
- Dark mode with class:dark
- Full control over styling

**Cons**:
- Must build components from scratch (no pre-built library)
- Learning curve if unfamiliar with Tailwind
- Requires custom setup for some features

### Rationale for NativeWind

**For Residence Mobile App** → **NativeWind**:
- Full design control for custom brand
- Excellent performance (compiled to native StyleSheet)
- Familiar Tailwind syntax for web developers
- Platform-specific styling: `className="bg-blue-500 ios:rounded-lg android:rounded-sm"`
- Dark mode: `className="text-gray-900 dark:text-gray-100"`
- Responsive: `className="p-4 sm:p-6 md:p-8"`

### Implementation Guidance

**Setup**:

```bash
npm install nativewind
npm install --save-dev tailwindcss
```

**Configuration**:

```js
// tailwind.config.js
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

// babel.config.js
module.exports = {
  plugins: ['nativewind/babel'],
}
```

**Component Example**:

```typescript
// components/ui/Button.tsx
import { Pressable, Text } from 'react-native'

interface ButtonProps {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'outline'
}

export function Button({ title, onPress, variant = 'primary' }: ButtonProps) {
  const variantClasses = {
    primary: 'bg-primary active:bg-primary-600',
    secondary: 'bg-secondary active:bg-secondary-600',
    outline: 'border-2 border-primary bg-transparent',
  }

  return (
    <Pressable
      onPress={onPress}
      className={`px-6 py-3 rounded-lg ${variantClasses[variant]}`}
    >
      <Text className="text-white text-center font-semibold">
        {title}
      </Text>
    </Pressable>
  )
}

// Usage
<Button title="Request Sticker" onPress={handleSubmit} variant="primary" />
```

**Platform-Specific Styling**:

```typescript
<View className="p-4 ios:shadow-lg android:elevation-4">
  <Text className="ios:text-lg android:text-base">
    Platform-specific text size
  </Text>
</View>
```

**Dark Mode**:

```typescript
import { useColorScheme } from 'nativewind'

export function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useColorScheme()

  return (
    <Button
      title={colorScheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
      onPress={toggleColorScheme}
    />
  )
}

// Component with dark mode
<View className="bg-white dark:bg-gray-900">
  <Text className="text-gray-900 dark:text-gray-100">
    Adaptive text color
  </Text>
</View>
```

### Performance Metrics
- No runtime overhead (compiled to StyleSheet)
- Bundle size impact: ~20KB
- Styling changes during development: instant hot reload

---

## Summary

All `NEEDS CLARIFICATION` items resolved:

1. ✅ **Data Storage**: Supabase Direct + AsyncStorage for simple caching (simplified from WatermelonDB)
2. ✅ **Payment Gateways**: Mock payment service for development, architecture supports Stripe React Native SDK + REST APIs for PayMongo/GCash
3. ✅ **UI Components**: NativeWind (Tailwind for React Native) for maximum control and performance

**Architecture Decision**: Simplified to Supabase-only approach to reduce complexity and leverage existing data infrastructure.

**Next Step**: Proceed to Phase 1 (quickstart.md with setup instructions).
