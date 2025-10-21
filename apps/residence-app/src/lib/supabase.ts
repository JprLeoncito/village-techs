import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Get platform-specific Supabase URL for local development
function getSupabaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';

  console.log('=== Supabase URL Configuration ===');
  console.log('Platform:', Platform.OS);
  console.log('Environment URL:', envUrl);

  // Always use the environment URL if it's set
  if (envUrl) {
    // Handle different URL formats for local development
    if (envUrl.includes('127.0.0.1') || envUrl.includes('localhost')) {
      // For local development, use platform-specific URL
      let finalUrl: string;
      if (Platform.OS === 'web') {
        finalUrl = 'http://127.0.0.1:54321';
      } else if (Platform.OS === 'android') {
        // For Android emulator, use the special IP
        finalUrl = 'http://10.0.2.2:54321';
      } else if (Platform.OS === 'ios') {
        // For iOS simulator, use localhost
        finalUrl = 'http://localhost:54321';
      } else {
        // Fallback for other platforms
        finalUrl = 'http://10.0.2.2:54321';
      }

      console.log('Local development - converted to:', finalUrl);
      return finalUrl;
    }
    console.log('Using environment URL as-is:', envUrl);
    return envUrl;
  }

  // Fallback for safety - should not happen with proper env setup
  console.error('No Supabase URL configured! Please set EXPO_PUBLIC_SUPABASE_URL');
  return 'http://10.0.2.2:54321'; // Default for mobile dev
}

// Environment variables - In Expo, use EXPO_PUBLIC_ prefix
const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if debug mode is enabled
const isDebugMode = process.env.NODE_ENV === 'development' && process.env.EXPO_PUBLIC_DEBUG_LOGGING === 'true';

// Debug logging (only in debug mode)
if (isDebugMode) {
  console.log('=== Supabase Configuration Debug ===');
  console.log('Platform:', Platform.OS);
  console.log('Environment URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
  console.log('Final Supabase URL:', supabaseUrl);
  console.log('Anon Key present:', !!supabaseAnonKey);
  console.log('Environment variables loaded:', {
    EXPO_PUBLIC_SUPABASE_URL: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  });
}

// Check if credentials are properly configured
const isSupabaseConfigured = supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-project') &&
  !supabaseAnonKey.includes('your-');

if (!isSupabaseConfigured) {
  console.error('❌ Supabase not configured properly!');
  console.error('URL:', supabaseUrl);
  console.error('Anon Key present:', !!supabaseAnonKey);
  console.error('Demo mode will be used - authentication features will be disabled.');
} else if (isDebugMode) {
  console.log('✅ Supabase properly configured');
  console.log('URL:', supabaseUrl);
}

// Create Supabase client only if properly configured, otherwise create a mock client
export const supabase = isSupabaseConfigured ?
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
      // Improved connection settings for reliability - only log errors and warnings
      logger: (msg: string, level: 'info' | 'debug' | 'warn' | 'error') => {
        if (level === 'error') {
          console.error(`Supabase Realtime [${level}]:`, msg);
        } else if (level === 'warn') {
          // Only log warnings in debug mode
          if (isDebugMode) {
            console.warn(`Supabase Realtime [${level}]:`, msg);
          }
        }
        // Suppress info and debug logs to reduce console noise
      },
    },
    global: {
      headers: {
        'X-Client-Info': 'village-tech-residence-app',
      },
    },
    db: {
      schema: 'public',
    },
    // Add additional configuration for better connection handling
    fetch: (url, options = {}) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      return fetch(url, {
        ...options,
        signal: controller.signal,
      }).finally(() => {
        clearTimeout(timeoutId);
      });
    },
  }) :
  // Mock client for demo mode
  {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: async () => ({ data: { session: null, user: null }, error: new Error('Demo mode - authentication disabled') }),
      signUp: async () => ({ data: { session: null, user: null }, error: new Error('Demo mode - authentication disabled') }),
    },
    from: () => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: null, error: new Error('Demo mode - database operations disabled') }),
      update: () => ({ data: null, error: new Error('Demo mode - database operations disabled') }),
      delete: () => ({ data: null, error: new Error('Demo mode - database operations disabled') }),
    }),
  } as any;

// Helper functions for common operations

/**
 * Get the current user session
 */
export async function getCurrentSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return session;
}

/**
 * Get the current user
 */
export async function getCurrentUser() {
  const session = await getCurrentSession();
  return session?.user || null;
}

/**
 * Get the user's household ID from metadata
 */
export async function getUserHouseholdId(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) {
    console.warn('No authenticated user found');
    return null;
  }

  // Try app_metadata first (more secure), then user_metadata as fallback
  const householdId = user?.app_metadata?.household_id || user?.user_metadata?.household_id;

  if (!householdId) {
    console.warn('No household_id found in user metadata:', {
      app_metadata: user?.app_metadata,
      user_metadata: user?.user_metadata
    });
  }

  return householdId || null;
}

/**
 * Get the user's tenant ID from metadata
 */
export async function getUserTenantId(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) {
    console.warn('No authenticated user found');
    return null;
  }

  // Try app_metadata first (more secure), then user_metadata as fallback
  const tenantId = user?.app_metadata?.tenant_id || user?.user_metadata?.tenant_id;

  if (!tenantId) {
    console.warn('No tenant_id found in user metadata:', {
      app_metadata: user?.app_metadata,
      user_metadata: user?.user_metadata
    });
  }

  return tenantId || null;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getCurrentSession();
  return !!session;
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
  // Clear any local data if needed
  await AsyncStorage.clear();
}

// Export types
export type { Session, User } from '@supabase/supabase-js';

/**
 * Test Supabase connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    console.log('Testing Supabase connection...');
    const { data, error } = await supabase.from('household_members').select('count').limit(1);
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('Supabase connection test error:', error);
    return false;
  }
}

/**
 * Test Supabase authentication
 */
export async function testAuth(): Promise<boolean> {
  try {
    console.log('Testing Supabase auth...');
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Supabase auth test failed:', error);
      return false;
    }
    console.log('✅ Supabase auth successful, session:', !!data.session);
    return true;
  } catch (error) {
    console.error('Supabase auth test error:', error);
    return false;
  }
}