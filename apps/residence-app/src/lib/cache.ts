import AsyncStorage from '@react-native-async-storage/async-storage'

const CACHE_KEYS = {
  STICKERS: 'cached_stickers_',
  GUESTS: 'cached_guests_',
  ANNOUNCEMENTS: 'cached_announcements_',
  FEES: 'cached_fees_',
  HOUSEHOLD: 'cached_household_',
  USER_PROFILE: 'cached_user_profile_',
  // Additional keys for realtime service
  sticker: 'cached_sticker_',
  guest: 'cached_guest_',
  delivery: 'cached_delivery_',
  announcement: 'cached_announcement_',
  fee: 'cached_fee_',
  permit: 'cached_permit_',
  household_stickers: 'cached_household_stickers_',
  household_guests: 'cached_household_guests_',
  household_deliveries: 'cached_household_deliveries_',
  tenant_announcements: 'cached_tenant_announcements_',
  household_fees: 'cached_household_fees_',
  household_permits: 'cached_household_permits_',
  realtime_events: 'cached_realtime_events_',
}

const CACHE_DURATION = 30 * 1000 // 30 seconds

export interface CacheItem<T> {
  data: T
  timestamp: number
}

export class CacheService {
  static async getCachedData<T>(key: string, householdId?: string): Promise<T | null> {
    try {
      // Handle direct cache keys (not from predefined keys)
      if (key.includes('_') && key.includes('{')) {
        // This is a custom key like "announcements_householdId_filter"
        const cached = await AsyncStorage.getItem(key)

        if (!cached) return null

        let cacheItem: CacheItem<T>
        try {
          cacheItem = JSON.parse(cached)
        } catch (parseError) {
          console.error('Cache JSON parse error:', parseError)
          await AsyncStorage.removeItem(key) // Remove corrupted cache
          return null
        }

        // Validate cacheItem structure
        if (!cacheItem || typeof cacheItem !== 'object' || !('data' in cacheItem) || !('timestamp' in cacheItem)) {
          console.warn('CacheService: Invalid cache structure, removing cache')
          await AsyncStorage.removeItem(key)
          return null
        }

        // Check if cache is expired
        const isExpired = Date.now() - cacheItem.timestamp > CACHE_DURATION
        if (isExpired) {
          await AsyncStorage.removeItem(key)
          return null
        }

        return cacheItem.data
      }

      // Handle predefined cache keys
      if (!key || !householdId || householdId === 'NaN' || householdId === 'undefined') {
        console.warn('CacheService: Invalid key or householdId provided', { key, householdId });
        return null;
      }

      const cacheKeyPrefix = CACHE_KEYS[key as keyof typeof CACHE_KEYS];
      if (!cacheKeyPrefix) {
        console.warn('CacheService: Unknown cache key', { key });
        return null;
      }

      const fullKey = cacheKeyPrefix + householdId
      const cached = await AsyncStorage.getItem(fullKey)

      if (!cached) return null

      let cacheItem: CacheItem<T>
      try {
        cacheItem = JSON.parse(cached)
      } catch (parseError) {
        console.error('Cache JSON parse error:', parseError)
        await AsyncStorage.removeItem(fullKey) // Remove corrupted cache
        return null
      }

      // Validate cacheItem structure
      if (!cacheItem || typeof cacheItem !== 'object' || !('data' in cacheItem) || !('timestamp' in cacheItem)) {
        console.warn('CacheService: Invalid cache structure, removing cache')
        await AsyncStorage.removeItem(fullKey)
        return null
      }

      // Check if cache is expired
      const isExpired = Date.now() - cacheItem.timestamp > CACHE_DURATION
      if (isExpired) {
        await AsyncStorage.removeItem(fullKey)
        return null
      }

      return cacheItem.data
    } catch (error) {
      console.error('Cache read error:', error)
      return null
    }
  }

  static async setCachedData<T>(key: string, householdId?: string, data?: T): Promise<void> {
    try {
      // Handle direct cache keys (not from predefined keys)
      if (key.includes('_') && key.includes('{')) {
        // This is a custom key like "announcements_householdId_filter"
        if (!data) {
          console.warn('CacheService: No data provided for custom key', { key });
          return;
        }
        const cacheItem: CacheItem<T> = {
          data,
          timestamp: Date.now(),
        }
        await AsyncStorage.setItem(key, JSON.stringify(cacheItem))
        return;
      }

      // Handle predefined cache keys
      if (!key || !householdId || householdId === 'NaN' || householdId === 'undefined') {
        console.warn('CacheService: Invalid key or householdId provided', { key, householdId });
        return;
      }

      if (!data) {
        console.warn('CacheService: No data provided', { key, householdId });
        return;
      }

      const cacheKeyPrefix = CACHE_KEYS[key as keyof typeof CACHE_KEYS];
      if (!cacheKeyPrefix) {
        console.warn('CacheService: Unknown cache key', { key });
        return;
      }

      const fullKey = cacheKeyPrefix + householdId
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
      }
      await AsyncStorage.setItem(fullKey, JSON.stringify(cacheItem))
    } catch (error) {
      console.error('Cache write error:', error)
    }
  }

  static async clearCache(householdId?: string, key?: string): Promise<void> {
    try {
      if (key && key.includes('_') && key.includes('{')) {
        // Clear specific custom key
        await AsyncStorage.removeItem(key)
        return
      }

      if (!householdId) {
        console.warn('CacheService: No householdId provided for clearCache')
        return
      }

      const keys = Object.values(CACHE_KEYS).map(cacheKey => cacheKey + householdId)
      await AsyncStorage.multiRemove(keys)
    } catch (error) {
      console.error('Cache clear error:', error)
    }
  }

  static async clearAllCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys()
      const cacheKeys = keys.filter(key =>
        Object.values(CACHE_KEYS).some(cacheKey => key.includes(cacheKey))
      )
      await AsyncStorage.multiRemove(cacheKeys)
    } catch (error) {
      console.error('Clear all cache error:', error)
    }
  }

  static async getCacheSize(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys()
      const cacheKeys = keys.filter(key =>
        Object.values(CACHE_KEYS).some(cacheKey => key.includes(cacheKey))
      )
      return cacheKeys.length
    } catch (error) {
      console.error('Get cache size error:', error)
      return 0
    }
  }
}