import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

// Types
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'guard' | 'supervisor' | 'admin' | 'user' | 'security_officer' | 'security_head';
  gateId?: string;
  gateName?: string;
  shiftStart?: string;
  shiftEnd?: string;
  tenantId?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  session: Session | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  selectGate: (gateId: string, gateName: string) => Promise<void>;
  clockIn: () => Promise<void>;
  clockOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage keys
const STORAGE_KEYS = {
  GATE_ID: '@sentinel_gate_id',
  GATE_NAME: '@sentinel_gate_name',
  CLOCK_IN_TIME: '@sentinel_clock_in_time',
};

// Mock security account for development (hybrid approach)
const MOCK_SECURITY_USER: AuthUser = {
  id: 'mock-security-001',
  email: 'security@sentinel.com',
  name: 'Security Officer',
  role: 'security_officer',
};

// Mock security credentials
const MOCK_SECURITY_CREDENTIALS = {
  email: 'security@sentinel.com',
  password: 'sentinel123',
};

// Available mock gates
const MOCK_GATES = [
  { id: 'gate-1', name: 'Main Gate' },
  { id: 'gate-2', name: 'North Gate' },
  { id: 'gate-3', name: 'South Gate' },
  { id: 'gate-4', name: 'Emergency Exit' },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    session: null,
  });

  // Initialize auth state on app start
  useEffect(() => {
    loadStoredAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);

        if (session?.user) {
          const authUser = await mapSupabaseUserToAuthUser(session.user);
          setAuthState({
            isAuthenticated: true,
            isLoading: false,
            user: authUser,
            session,
          });
        } else {
          // Try mock security account fallback
          const mockUser = await tryMockSecurityAuth();
          if (mockUser) {
            setAuthState({
              isAuthenticated: true,
              isLoading: false,
              user: mockUser,
              session: null, // Mock user has no session
            });
          } else {
            setAuthState({
              isAuthenticated: false,
              isLoading: false,
              user: null,
              session: null,
            });
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadStoredAuth = async () => {
    try {
      // Check for existing Supabase session
      const { data: { session }, error } = await supabase.auth.getSession();

      if (session?.user) {
        const authUser = await mapSupabaseUserToAuthUser(session.user);

        // Check if user is clocked in
        const clockInTime = await AsyncStorage.getItem(STORAGE_KEYS.CLOCK_IN_TIME);
        if (clockInTime) {
          authUser.shiftStart = clockInTime;
        }

        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          user: authUser,
          session,
        });
        return;
      }

      // Try mock security account fallback
      const mockUser = await tryMockSecurityAuth();
      if (mockUser) {
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          user: mockUser,
          session: null,
        });
        return;
      }

      // No authentication found
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        session: null,
      });
    } catch (error) {
      console.error('Error loading stored auth:', error);
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        session: null,
      });
    }
  };

  const mapSupabaseUserToAuthUser = async (supabaseUser: User): Promise<AuthUser> => {
    const metadata = supabaseUser.user_metadata || {};

    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      name: metadata.name || supabaseUser.email?.split('@')[0] || 'Unknown User',
      role: metadata.role || 'user',
      tenantId: metadata.tenant_id,
    };
  };

  const tryMockSecurityAuth = async (): Promise<AuthUser | null> => {
    try {
      // Check if mock security credentials are stored
      const storedEmail = await AsyncStorage.getItem('@sentinel_mock_email');
      const storedPassword = await AsyncStorage.getItem('@sentinel_mock_password');

      if (storedEmail === MOCK_SECURITY_CREDENTIALS.email &&
          storedPassword === MOCK_SECURITY_CREDENTIALS.password) {

        const mockUser = { ...MOCK_SECURITY_USER };

        // Check if user is clocked in
        const clockInTime = await AsyncStorage.getItem(STORAGE_KEYS.CLOCK_IN_TIME);
        if (clockInTime) {
          mockUser.shiftStart = clockInTime;
        }

        return mockUser;
      }
    } catch (error) {
      console.error('Error checking mock security auth:', error);
    }
    return null;
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Check for mock security account first
      if (email === MOCK_SECURITY_CREDENTIALS.email && password === MOCK_SECURITY_CREDENTIALS.password) {
        // Store mock credentials
        await AsyncStorage.setItem('@sentinel_mock_email', email);
        await AsyncStorage.setItem('@sentinel_mock_password', password);

        const mockUser = { ...MOCK_SECURITY_USER };
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          user: mockUser,
          session: null,
        });

        return { success: true };
      }

      // Try Supabase authentication for regular users
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user && data.session) {
        const authUser = await mapSupabaseUserToAuthUser(data.user);
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          user: authUser,
          session: data.session,
        });

        return { success: true };
      }

      return { success: false, error: 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const signUp = async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: 'user', // Default role for signups
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const logout = async () => {
    try {
      // Clear Supabase session
      await supabase.auth.signOut();

      // Clear mock credentials
      await AsyncStorage.removeItem('@sentinel_mock_email');
      await AsyncStorage.removeItem('@sentinel_mock_password');

      // Clear all stored data
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.GATE_ID),
        AsyncStorage.removeItem(STORAGE_KEYS.GATE_NAME),
        AsyncStorage.removeItem(STORAGE_KEYS.CLOCK_IN_TIME),
      ]);

      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        session: null,
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const selectGate = async (gateId: string, gateName: string) => {
    try {
      if (!authState.user) return;

      const updatedUser = {
        ...authState.user,
        gateId,
        gateName,
      };

      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.GATE_ID, gateId),
        AsyncStorage.setItem(STORAGE_KEYS.GATE_NAME, gateName),
      ]);

      setAuthState(prev => ({
        ...prev,
        user: updatedUser,
      }));
    } catch (error) {
      console.error('Gate selection error:', error);
    }
  };

  const clockIn = async () => {
    try {
      if (!authState.user) return;

      const now = new Date().toISOString();
      const updatedUser = {
        ...authState.user,
        shiftStart: now,
      };

      await AsyncStorage.setItem(STORAGE_KEYS.CLOCK_IN_TIME, now);

      setAuthState(prev => ({
        ...prev,
        user: updatedUser,
      }));
    } catch (error) {
      console.error('Clock in error:', error);
    }
  };

  const clockOut = async () => {
    try {
      if (!authState.user) return;

      const updatedUser = {
        ...authState.user,
        shiftStart: undefined,
        shiftEnd: new Date().toISOString(),
      };

      await AsyncStorage.removeItem(STORAGE_KEYS.CLOCK_IN_TIME);

      setAuthState(prev => ({
        ...prev,
        user: updatedUser,
      }));
    } catch (error) {
      console.error('Clock out error:', error);
    }
  };

  const refreshSession = async () => {
    try {
      if (authState.session) {
        // Refresh Supabase session
        const { data, error } = await supabase.auth.refreshSession();
        if (error) {
          console.error('Session refresh error:', error);
          await logout();
        }
      } else {
        // Reload stored auth for mock user
        await loadStoredAuth();
      }
    } catch (error) {
      console.error('Session refresh error:', error);
      await logout();
    }
  };

  const value: AuthContextType = {
    ...authState,
    login,
    signUp,
    logout,
    selectGate,
    clockIn,
    clockOut,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { MOCK_GATES };