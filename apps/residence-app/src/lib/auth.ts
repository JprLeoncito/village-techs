import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

interface SignInCredentials {
  email: string;
  password: string;
}

interface SignUpData extends SignInCredentials {
  householdId?: string;
  tenantId?: string;
  fullName?: string;
}

interface AuthResponse {
  success: boolean;
  error?: string;
  user?: any;
}

class AuthService {
  /**
   * Sign in with email and password
   */
  async signIn({ email, password }: SignInCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Store user metadata locally for quick access
        await this.cacheUserData(data.user);

        // Store session token securely for biometric login
        if (data.session?.access_token) {
          await SecureStore.setItemAsync('access_token', data.session.access_token);
        }

        return { success: true, user: data.user };
      }

      return { success: false, error: 'Login failed' };
    } catch (error) {
      console.error('Sign in error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred during sign in'
      };
    }
  }

  /**
   * Sign up new user
   */
  async signUp({ email, password, householdId, tenantId, fullName }: SignUpData): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            household_id: householdId,
            tenant_id: tenantId,
            full_name: fullName,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        return { success: true, user: data.user };
      }

      return { success: false, error: 'Sign up failed' };
    } catch (error) {
      console.error('Sign up error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred during sign up'
      };
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut();
      await AsyncStorage.multiRemove([
        'user_data',
        'household_id',
        'tenant_id',
      ]);
      await SecureStore.deleteItemAsync('access_token');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'residenceapp://reset-password',
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Reset password error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred during password reset'
      };
    }
  }

  /**
   * Update password
   */
  async updatePassword(newPassword: string): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Update password error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred during password update'
      };
    }
  }

  /**
   * Get current session
   */
  async getSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    } catch (error) {
      console.error('Get session error:', error);
      return null;
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession();
    return !!session;
  }

  /**
   * Refresh session
   */
  async refreshSession(): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.session) {
        return { success: true, user: data.user };
      }

      return { success: false, error: 'Session refresh failed' };
    } catch (error) {
      console.error('Refresh session error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred during session refresh'
      };
    }
  }

  /**
   * Sign in with biometric authentication
   */
  async signInWithBiometric(): Promise<AuthResponse> {
    try {
      // Retrieve stored access token
      const accessToken = await SecureStore.getItemAsync('access_token');

      if (!accessToken) {
        return { success: false, error: 'No stored credentials found' };
      }

      // Set the session using the stored token
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: '', // We'll handle refresh separately
      });

      if (error) {
        // Token might be expired, try to refresh
        const refreshResult = await this.refreshSession();
        if (!refreshResult.success) {
          return refreshResult;
        }
        return { success: true, user: refreshResult.user };
      }

      if (data.user) {
        await this.cacheUserData(data.user);
        return { success: true, user: data.user };
      }

      return { success: false, error: 'Biometric authentication failed' };
    } catch (error) {
      console.error('Biometric sign in error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred during biometric authentication'
      };
    }
  }

  /**
   * Cache user data locally
   */
  private async cacheUserData(user: any): Promise<void> {
    try {
      await AsyncStorage.setItem('user_data', JSON.stringify(user));

      if (user.user_metadata?.household_id) {
        await AsyncStorage.setItem('household_id', user.user_metadata.household_id);
      }

      if (user.user_metadata?.tenant_id) {
        await AsyncStorage.setItem('tenant_id', user.user_metadata.tenant_id);
      }
    } catch (error) {
      console.error('Error caching user data:', error);
    }
  }

  /**
   * Get cached user data
   */
  async getCachedUserData() {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting cached user data:', error);
      return null;
    }
  }

  /**
   * Get household ID from cache or session
   */
  async getHouseholdId(): Promise<string | null> {
    try {
      // First check cache
      const cached = await AsyncStorage.getItem('household_id');
      if (cached) return cached;

      // Fallback to getting from current user
      const user = await this.getCurrentUser();
      return user?.user_metadata?.household_id || null;
    } catch (error) {
      console.error('Error getting household ID:', error);
      return null;
    }
  }

  /**
   * Get tenant ID from cache or session
   */
  async getTenantId(): Promise<string | null> {
    try {
      // First check cache
      const cached = await AsyncStorage.getItem('tenant_id');
      if (cached) return cached;

      // Fallback to getting from current user
      const user = await this.getCurrentUser();
      return user?.user_metadata?.tenant_id || null;
    } catch (error) {
      console.error('Error getting tenant ID:', error);
      return null;
    }
  }

  /**
   * Set up auth state change listener
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;