'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createBrowserClient } from '@/app/lib/auth';
import { User } from '@supabase/supabase-js';

interface AuthContextValue {
  user: User | null;
  status: 'loading' | 'authenticated' | 'unauthenticated' | 'error';
  error: Error | null;
  refreshSession: () => Promise<void>;
  checkSession: () => Promise<void>;
  isSessionExpired: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthContextValue['status']>('loading');
  const [error, setError] = useState<Error | null>(null);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const supabase = createBrowserClient();

  const checkSession = async () => {
    try {
      console.log('[auth-context] Checking session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[auth-context] Session error:', sessionError);
        setError(sessionError);
        setStatus('error');
        return;
      }
      
      if (session) {
        // Check if session is expired
        const expiresAt = new Date(session.expires_at || 0).getTime();
        const now = new Date().getTime();
        const isExpired = expiresAt < now;
        
        setIsSessionExpired(isExpired);
        
        if (isExpired) {
          console.log('[auth-context] Session expired, attempting refresh...');
          await refreshSession();
        } else {
          console.log('[auth-context] Valid session found for:', session.user.email);
          setUser(session.user);
          setStatus('authenticated');
          setError(null);
        }
      } else {
        console.log('[auth-context] No session found');
        setUser(null);
        setStatus('unauthenticated');
        setError(null);
      }
    } catch (err) {
      console.error('[auth-context] Unexpected error checking session:', err);
      setError(err instanceof Error ? err : new Error('Session check failed'));
      setStatus('error');
    }
  };

  const refreshSession = async () => {
    try {
      console.log('[auth-context] Refreshing session...');
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('[auth-context] Failed to refresh session:', error);
        setUser(null);
        setStatus('unauthenticated');
        setError(error);
        setIsSessionExpired(true);
        return;
      }
      
      if (session) {
        console.log('[auth-context] Session refreshed for:', session.user.email);
        setUser(session.user);
        setStatus('authenticated');
        setError(null);
        setIsSessionExpired(false);
      } else {
        setUser(null);
        setStatus('unauthenticated');
        setError(null);
        setIsSessionExpired(false);
      }
    } catch (error) {
      console.error('[auth-context] Unexpected error refreshing session:', error);
      setUser(null);
      setStatus('error');
      setError(error instanceof Error ? error : new Error('Session refresh failed'));
    }
  };

  useEffect(() => {
    // Initial session check
    checkSession();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[auth-context] Auth state changed:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setUser(session?.user || null);
          setStatus(session ? 'authenticated' : 'unauthenticated');
          setError(null);
          setIsSessionExpired(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setStatus('unauthenticated');
          setError(null);
          setIsSessionExpired(false);
        } else if (event === 'USER_UPDATED') {
          setUser(session?.user || null);
        } else if (event === 'PASSWORD_RECOVERY') {
          // Handle password recovery flow
          console.log('[auth-context] Password recovery initiated');
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
    error,
    refreshSession,
    checkSession,
    isSessionExpired,
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