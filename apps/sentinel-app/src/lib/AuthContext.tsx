import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, getCurrentSecurityOfficer, isSecurityHead, SecurityOfficer } from './supabase';

// Authentication context for security officers
interface AuthContextType {
  officer: SecurityOfficer | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string; success?: boolean }>;
  signOut: () => Promise<void>;
  isSecurityHead: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [officer, setOfficer] = useState<SecurityOfficer | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSecurityHeadRole, setIsSecurityHeadRole] = useState(false);

  useEffect(() => {
    // Check authentication state on app start
    const checkAuth = async () => {
      try {
        const currentOfficer = await getCurrentSecurityOfficer();
        setOfficer(currentOfficer);

        if (currentOfficer) {
          const isHead = currentOfficer.role === 'security_head';
          setIsSecurityHeadRole(isHead);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          const currentOfficer = await getCurrentSecurityOfficer();
          setOfficer(currentOfficer);
          setIsSecurityHeadRole(currentOfficer?.role === 'security_head');
        } else if (event === 'SIGNED_OUT') {
          setOfficer(null);
          setIsSecurityHeadRole(false);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      // Verify user has security officer role
      const userRole = data.user?.user_metadata?.role;
      if (!['security_officer', 'security_head'].includes(userRole)) {
        await supabase.auth.signOut();
        return { error: 'Access denied. Security officer role required.' };
      }

      return { success: true };
    } catch (error) {
      return { error: 'An unexpected error occurred during sign in.' };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setOfficer(null);
      setIsSecurityHeadRole(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value: AuthContextType = {
    officer,
    loading,
    signIn,
    signOut,
    isSecurityHead: isSecurityHeadRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;