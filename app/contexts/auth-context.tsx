'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { createBrowserClient } from '@/app/lib/auth';
import { migrateAuthFromLocalStorage, debugAuthCookies } from '@/app/lib/auth-migration';
import { clearStaleAuthData, isInAuthFlow, shouldRetryAuth, incrementAuthRetryCount, endAuthFlow, clearAllAuthData } from '@/app/lib/auth-utils';
import { toMs, debugTimestamp } from '@/app/lib/utils/time';
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
  const [lastRefreshAttempt, setLastRefreshAttempt] = useState<number>(0);
  const supabase = createBrowserClient();
  const mountedRef = useRef(true);
  const checkingSessionRef = useRef(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkSession = async () => {
    // Don't check if component is unmounted or already checking
    if (!mountedRef.current || checkingSessionRef.current) {
      console.log('[auth-context] Skipping session check - unmounted or already checking');
      return;
    }
    
    // Set mutex to prevent concurrent checks
    checkingSessionRef.current = true;
    
    try {
      const retryCount = incrementAuthRetryCount();
      console.log('[auth-context] Checking session... (attempt', retryCount, ')');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[auth-context] Session error:', sessionError);
        setError(sessionError);
        setStatus('error');
        
        // Clear auth data on persistent errors
        if (retryCount > 5) {
          console.log('[auth-context] Clearing auth data due to persistent errors');
          await clearAllAuthData().catch(e => console.error('[auth-context] Error clearing auth data:', e));
          endAuthFlow();
        }
        return;
      }
      
      if (session) {
        // Check if session is expired - add grace period
        const expiresAt = toMs(session.expires_at);
        const now = Date.now();
        
        // Calculate grace period based on token lifetime
        // Use 5 minutes or half the remaining time, whichever is smaller
        const timeUntilExpiry = expiresAt - now;
        const gracePeriod = Math.min(5 * 60 * 1000, timeUntilExpiry / 2);
        const isExpired = expiresAt < (now + gracePeriod);
        
        // Debug logging for expires_at conversion
        debugTimestamp('auth-context session.expires_at', session.expires_at, expiresAt);
        
        setIsSessionExpired(isExpired);
        
        if (isExpired) {
          console.log('[auth-context] Session expired or expiring soon, attempting refresh...');
          await refreshSession();
        } else {
          console.log('[auth-context] Valid session found for:', session.user.email);
          setUser(session.user);
          setStatus('authenticated');
          setError(null);
          // Clear auth flow on successful authentication
          endAuthFlow();
        }
      } else {
        console.log('[auth-context] No session found');
        
        // Check if we should retry
        if (shouldRetryAuth() && typeof window !== 'undefined' && mountedRef.current) {
          console.log('[auth-context] In auth flow, retrying session check in 2 seconds...');
          // Clear any existing timeout
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
          }
          // Set new timeout with reference
          retryTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              checkSession();
            }
          }, 2000);
        } else {
          // Max retries reached or not in auth flow
          if (retryCount >= 15) {
            console.log('[auth-context] Max retries reached, clearing all auth data');
            await clearAllAuthData().catch(e => console.error('[auth-context] Error clearing auth data:', e));
            endAuthFlow();
          }
          setUser(null);
          setStatus('unauthenticated');
          setError(null);
        }
      }
    } catch (err) {
      console.error('[auth-context] Unexpected error checking session:', err);
      setError(err instanceof Error ? err : new Error('Session check failed'));
      setStatus('error');
      
      // Clear auth data on unexpected errors after multiple attempts
      const retryCount = incrementAuthRetryCount();
      if (retryCount > 5) {
        console.log('[auth-context] Clearing auth data due to unexpected errors');
        await clearAllAuthData().catch(e => console.error('[auth-context] Error clearing auth data:', e));
        endAuthFlow();
      }
    } finally {
      // Always release mutex
      checkingSessionRef.current = false;
    }
  };

  const refreshSession = async () => {
    try {
      // Rate limit protection - wait at least 10 seconds between refresh attempts
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshAttempt;
      if (timeSinceLastRefresh < 10000) {
        console.log('[auth-context] Skipping refresh - too soon since last attempt', timeSinceLastRefresh);
        return;
      }
      
      console.log('[auth-context] Refreshing session...');
      setLastRefreshAttempt(now);
      
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
    mountedRef.current = true;
    
    // Clear any stale auth data on mount
    clearStaleAuthData();
    
    // Migrate from localStorage to cookies if needed
    migrateAuthFromLocalStorage();
    
    // Debug cookies in development
    if (process.env.NODE_ENV === 'development') {
      debugAuthCookies();
    }
    
    // Initial session check
    checkSession();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[auth-context] Auth state changed:', event, session?.user?.email);
        
        // Debug cookies on auth state change
        if (process.env.NODE_ENV === 'development') {
          debugAuthCookies();
        }
        
        // Check if component is still mounted before updating state
        if (!mountedRef.current) return;
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setUser(session?.user || null);
          setStatus(session ? 'authenticated' : 'unauthenticated');
          setError(null);
          setIsSessionExpired(false);
          // Clear auth flow on successful sign in
          endAuthFlow();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setStatus('unauthenticated');
          setError(null);
          setIsSessionExpired(false);
          // Clear all auth data on sign out
          clearAllAuthData().then(() => {
            endAuthFlow();
          }).catch(e => {
            console.error('[auth-context] Error clearing auth data:', e);
            endAuthFlow();
          });
        } else if (event === 'USER_UPDATED') {
          setUser(session?.user || null);
        } else if (event === 'PASSWORD_RECOVERY') {
          // Handle password recovery flow
          console.log('[auth-context] Password recovery initiated');
        }
      }
    );

    return () => {
      mountedRef.current = false;
      checkingSessionRef.current = false;
      // Clear any pending retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]); // checkSession is only used on mount, no need to include in deps

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
export function useRequireAuth(redirectTo = '/auth/login') {
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