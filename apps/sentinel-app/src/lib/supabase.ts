import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

// Supabase configuration for Sentinel Security App
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project-id.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

// Create Supabase client with AsyncStorage for session persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important for mobile apps
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // Real-time subscription rate limit
    },
  },
});

// Helper function to check if user is authenticated and has proper role
export const getCurrentSecurityOfficer = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session?.user) {
    return null;
  }

  // Get user metadata to check role
  const userRole = session.user.user_metadata?.role;

  if (!['security_officer', 'security_head'].includes(userRole)) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email!,
    role: userRole,
    tenantId: session.user.user_metadata?.tenant_id,
  };
};

// Helper function to check if user is security head
export const isSecurityHead = async () => {
  const officer = await getCurrentSecurityOfficer();
  return officer?.role === 'security_head';
};

// Export types for better TypeScript support
export type SecurityOfficer = Awaited<ReturnType<typeof getCurrentSecurityOfficer>>;

export default supabase;