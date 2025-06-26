'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createBrowserClient } from '@/app/lib/auth';
import { User } from '@supabase/supabase-js';

interface AuthContextValue {
  user: User | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthContextValue['status']>('loading');
  const supabase = createBrowserClient();

  const refreshSession = async () => {
    try {
      console.log('[auth-context] Refreshing session...');
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('[auth-context] Failed to refresh session:', error);
        setUser(null);
        setStatus('unauthenticated');
        return;
      }
      
      if (session) {
        console.log('[auth-context] Session refreshed for:', session.user.email);
        setUser(session.user);
        setStatus('authenticated');
      } else {
        setUser(null);
        setStatus('unauthenticated');
      }
    } catch (error) {
      console.error('[auth-context] Unexpected error refreshing session:', error);
      setUser(null);
      setStatus('unauthenticated');
    }
  };

  useEffect(() => {
    // Initial session check
    const checkSession = async () => {
      try {
        console.log('[auth-context] Checking initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[auth-context] Error getting session:', error);
          setStatus('unauthenticated');
          return;
        }
        
        if (session) {
          console.log('[auth-context] Initial session found for:', session.user.email);
          setUser(session.user);
          setStatus('authenticated');
        } else {
          console.log('[auth-context] No initial session found');
          setStatus('unauthenticated');
        }
      } catch (error) {
        console.error('[auth-context] Unexpected error checking session:', error);
        setStatus('unauthenticated');
      }
    };

    checkSession();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[auth-context] Auth state changed:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setUser(session?.user || null);
          setStatus(session ? 'authenticated' : 'unauthenticated');
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setStatus('unauthenticated');
        } else if (event === 'USER_UPDATED') {
          setUser(session?.user || null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const value: AuthContextValue = {
    user,
    status,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Utility hook to require authentication
export function useRequireAuth(redirectTo = '/auth/sign-in') {
  const { status } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      window.location.href = redirectTo;
    } else if (status === 'authenticated') {
      setIsReady(true);
    }
  }, [status, redirectTo]);

  return { isReady, isAuthenticated: status === 'authenticated' };
}