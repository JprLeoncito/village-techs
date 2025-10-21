import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { supabase, testConnection } from '../lib/supabase';
import authService from '../lib/auth';
import { Session, User } from '@supabase/supabase-js';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  householdId: string | null;
  householdName: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithBiometric: () => Promise<boolean>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  updateProfile: (data: any) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [householdName, setHouseholdName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize auth state
    initializeAuth();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('=== Auth State Change Event ===');
        console.log('Event:', event);
        console.log('Has session:', !!session);
        console.log('User email:', session?.user?.email);

        if (event === 'SIGNED_IN' && session) {
          console.log('Processing SIGNED_IN event...');
          await handleSignIn(session);
          console.log('SIGNED_IN processing complete');
        } else if (event === 'SIGNED_OUT') {
          console.log('Processing SIGNED_OUT event...');
          handleSignOut();
          console.log('SIGNED_OUT processing complete');
        } else if (event === 'TOKEN_REFRESHED' && session) {
          console.log('Processing TOKEN_REFRESHED event...');
          await handleTokenRefresh(session);
          console.log('TOKEN_REFRESHED processing complete');
        }
        console.log('=== End Auth State Change ===');
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      console.log('=== Auth Initialization ===');

      // Test basic database connection first
      const connectionTest = await testConnection();
      if (!connectionTest) {
        console.error('❌ Database connection test failed during auth initialization');
        Alert.alert(
          'Connection Error',
          'Unable to connect to the database. Please check your network connection and try again.',
          [{ text: 'OK' }]
        );
        // Don't return here - continue with auth initialization
      }

      // Get current session
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Failed to get session:', error);
        // Handle specific database errors
        if (error.message?.includes('Database error querying schema') ||
            error.message?.includes('Network') ||
            error.message?.includes('fetch') ||
            error.message?.includes('timeout')) {
          console.log('Database or network connectivity issue during auth init');
          Alert.alert(
            'Database Connection Error',
            'Unable to connect to the database. Please check your network connection and try again.',
            [{ text: 'OK' }]
          );
        }
        // Clear any corrupted session data
        await handleSignOut();
        return;
      }

      if (session) {
        console.log('Session found, initializing user state...');
        await handleSignIn(session);
      } else {
        console.log('No active session found');
        // Ensure clean state when no session exists
        await handleSignOut();
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      // For network errors, handle gracefully
      if (error instanceof Error &&
          (error.message.includes('Network') ||
           error.message.includes('fetch') ||
           error.message.includes('timeout'))) {
        console.log('Network connectivity issue during auth init');
      } else {
        console.error('Unexpected auth initialization error:', error);
      }
      // Ensure clean state on errors
      await handleSignOut();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (session: Session) => {
    try {
      console.log('>>> handleSignIn called');
      console.log('Setting session and user state...');
      setSession(session);
      setUser(session.user);

      console.log('=== Household ID Debug ===');
      console.log('User email:', session.user.email);
      console.log('User user_metadata:', session.user.user_metadata);
      console.log('User app_metadata:', session.user.app_metadata);
      console.log('=====================');

      let hId: string | null = null;
      let tenantId: string | null = null;

      // PRIMARY METHOD: Use user metadata (most reliable for seeded demo accounts)
      console.log('Using user metadata for household lookup...');
      hId = session.user.user_metadata?.household_id ||
            session.user.app_metadata?.household_id;
      tenantId = session.user.user_metadata?.tenant_id ||
                 session.user.app_metadata?.tenant_id;

      if (hId) {
        console.log('✅ Found household in user metadata:');
        console.log('  Household ID:', hId);
        console.log('  Tenant ID:', tenantId);
        console.log('  User email:', session.user.email);
      } else {
        console.log('No household metadata found, trying database lookup as fallback...');

        // FALLBACK METHOD: Query household_members table as fallback
        if (session.user.email) {
          try {
            const { data: memberData, error: memberError } = await supabase
              .from('household_members')
              .select('household_id, tenant_id, first_name, last_name')
              .eq('contact_email', session.user.email)
              .maybeSingle();

            if (memberError) {
              console.error('Error querying household_members (fallback):', memberError);
            } else if (memberData?.household_id) {
              hId = memberData.household_id;
              tenantId = memberData.tenant_id;
              console.log('✅ Found household in household_members table (fallback):');
              console.log('  Household ID:', hId);
              console.log('  Tenant ID:', tenantId);
              console.log('  Member:', `${memberData.first_name} ${memberData.last_name}`);
            } else {
              console.log('No household member record found for email:', session.user.email);
            }
          } catch (error) {
            console.error('Error searching household_members (fallback):', error);
          }
        }
      }

      // DEMO ACCOUNT FALLBACK: For seeded demo accounts
      if (!hId && session.user.email) {
        // Check for demo accounts from the seed
        const demoEmails = [
          'juan.cruz@greenvalley.com',
          'pedro.santos@greenvalley.com',
          'carlos.reyes@greenvalley.com',
          'roberto.lim@greenvalley.com',
          'luis.garcia@greenvalley.com',
          'maria.fernando@greenvalley.com',
          'roberto.mendoza@greenvalley.com',
          'amy.tan@greenvalley.com',
          'jose.villanueva@greenvalley.com',
          'rosa.castillo@greenvalley.com'
        ];

        if (demoEmails.includes(session.user.email)) {
          console.log('Using demo account fallback for:', session.user.email);

          // Use the first household from the seed data (Cruz Family)
          if (session.user.email === 'juan.cruz@greenvalley.com') {
            hId = 'c5c7e3a7-4a3d-4b5b-8b6b-3b3b3b3b3b3b';  // Cruz Family household
          } else if (session.user.email === 'pedro.santos@greenvalley.com') {
            hId = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';  // Santos Family household
          } else if (session.user.email === 'carlos.reyes@greenvalley.com') {
            hId = 'f1e2d3c4-b5a6-7890-1234-567890abcdef';  // Reyes Family household
          } else {
            // Fallback to Cruz family for any other demo account
            hId = 'c5c7e3a7-4a3d-4b5b-8b6b-3b3b3b3b3b3b';
          }

          // Use the Green Valley Estates community ID from seed
          tenantId = '9b8d9497-c371-4803-92ec-25f26c5f9350';  // Green Valley Estates
          console.log('Demo account - Assigned Household ID:', hId);
          console.log('Demo account - Assigned Tenant ID:', tenantId);
        }

        // Legacy test accounts
        if (session.user.email === 'jasper.leoncito@988labs.com' || session.user.email === 'jasper.leoncito@98labs.com') {
          console.log('Using temporary fallback for jasper.leoncito...');
          hId = '2e344659-cecd-4705-996f-a31e2cd77a9c';  // Correct household ID from database
          tenantId = '017ebbad-4fe8-4336-b834-bd7dc0b87c9e';    // Correct tenant ID
        } else if (session.user.email === 'jasper.leoncito1@98labs.com') {
          console.log('Using temporary fallback for jasper.leoncito1...');
          hId = 'e5a02540-45ea-4d30-9f0e-3be4eca12676';  // Alternative household ID
          tenantId = '017ebbad-4fe8-4336-b834-bd7dc0b87c9e';    // Same tenant ID
        } else if (session.user.email === 'resident@testcommunity.com') {
          console.log('Using fallback for resident@testcommunity.com...');
          hId = 'fb65d0e0-52d2-46f1-945a-60e3572690b5';  // Correct household ID
          tenantId = '017ebbad-4fe8-4336-b834-bd7dc0b87c9e';    // Correct tenant ID
        }
        console.log('Assigned fallback household ID:', hId);
      }

      if (hId) {
        setHouseholdId(hId);

        // Fetch household details from households table
        console.log('Fetching household details for ID:', hId);
        const { data: household } = await supabase
          .from('households')
          .select(`
            id,
            status,
            move_in_date,
            contact_email,
            contact_phone,
            residences!inner(
              id,
              unit_number,
              type
            )
          `)
          .eq('id', hId)
          .maybeSingle();

        console.log('Household data:', household);

        if (household && household.residences) {
          const name = household.residences.unit_number;
          setHouseholdName(name);

          // Store household info locally
          await AsyncStorage.setItem('household_id', hId);
          await AsyncStorage.setItem('household_name', name);
          console.log('Household info stored:', name);
        }
      } else {
        console.warn('❌ No household ID found - user is not associated with any household');
      }

      // Store session
      await AsyncStorage.setItem('auth_session', JSON.stringify(session));
      console.log('Session stored in AsyncStorage');
      console.log('<<< handleSignIn complete');

    } catch (error) {
      console.error('Error handling sign in:', error);
    }
  };

  const handleSignOut = async () => {
    setUser(null);
    setSession(null);
    setHouseholdId(null);
    setHouseholdName(null);

    // Clear stored data
    await AsyncStorage.multiRemove([
      'auth_session',
      'household_id',
      'household_name',
      'biometric_enabled',
    ]);
  };

  const handleTokenRefresh = async (session: Session) => {
    console.log('Token refreshed');
    setSession(session);
    await AsyncStorage.setItem('auth_session', JSON.stringify(session));
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('Login attempt for:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        Alert.alert('Login Failed', error.message);
        return false;
      }

      console.log('Login successful, session will be handled by auth state listener');
      // Don't call handleSignIn here - let the onAuthStateChange listener handle it
      // This prevents double state updates and race conditions
      return !!data.session;
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Login Error', 'An unexpected error occurred');
      return false;
    }
  };

  const loginWithBiometric = async (): Promise<boolean> => {
    try {
      // Use auth service for biometric login
      const success = await authService.loginWithBiometric();

      // Don't call handleSignIn here - let the onAuthStateChange listener handle it
      // The auth state listener will automatically trigger when biometric login succeeds
      return success;
    } catch (error) {
      console.error('Biometric login error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Logout error:', error);
        Alert.alert('Logout Failed', error.message);
      }

      await handleSignOut();
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Logout Error', 'An unexpected error occurred');
    }
  };

  const refreshSession = async () => {
    try {
      console.log('Attempting to refresh session...');
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error('Session refresh error:', error);

        // Handle different types of refresh errors
        if (error.message.includes('refresh_token_not_found') ||
            error.message.includes('AuthSessionMissingError') ||
            error.message.includes('session is null') ||
            error.message.includes('Network request failed') ||
            error.message.includes('fetch failed')) {
          console.log('Session expired or network error, signing out gracefully...');
          await handleSignOut();
          // Only show alert for actual session issues, not network connectivity issues
          if (!error.message.includes('Network') && !error.message.includes('fetch')) {
            Alert.alert(
              'Session Expired',
              'Your session has expired. Please log in again to continue.',
              [{ text: 'OK' }]
            );
          }
        } else {
          console.log('Other refresh error, will retry later...');
        }
        return;
      }

      if (data.session) {
        console.log('Session refreshed successfully');
        await handleSignIn(data.session);
      } else {
        console.log('No session returned after refresh, signing out...');
        await handleSignOut();
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again to continue.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Session refresh error:', error);
      // For network or unexpected errors, sign out gracefully without alerts
      await handleSignOut();
      // Only show alert for actual auth errors, not network issues
      if (error instanceof Error &&
          !error.message.includes('Network') &&
          !error.message.includes('fetch') &&
          !error.message.includes('timeout')) {
        Alert.alert(
          'Authentication Error',
          'An authentication error occurred. Please log in again.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const updateProfile = async (data: any): Promise<boolean> => {
    try {
      if (!user) return false;

      console.log('Current user metadata:', user.user_metadata);
      console.log('Updating with data:', data);

      const updatedMetadata = {
        ...user.user_metadata,
        ...data,
      };

      console.log('Merged metadata:', updatedMetadata);

      const { error } = await supabase.auth.updateUser({
        data: updatedMetadata,
      });

      if (error) {
        console.error('Supabase update error:', error);
        Alert.alert('Update Failed', error.message);
        return false;
      }

      console.log('Update successful, refreshing session...');

      // Refresh session to get updated user data
      await refreshSession();

      console.log('Session refreshed, new user metadata:', user.user_metadata);
      return true;
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('Update Error', 'An unexpected error occurred');
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    session,
    householdId,
    householdName,
    isLoading,
    isAuthenticated: !!user && !!session,
    login,
    loginWithBiometric,
    logout,
    refreshSession,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;