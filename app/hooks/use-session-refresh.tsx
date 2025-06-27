'use client';

import { useEffect, useRef } from 'react';
import { createBrowserClient } from '@/app/lib/auth';

export function useSessionRefresh() {
  const supabase = createBrowserClient();
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshRef = useRef<number>(Date.now());

  useEffect(() => {
    const checkAndRefreshSession = async () => {
      try {
        const now = Date.now();
        // Don't refresh too frequently (min 5 minutes between refreshes)
        if (now - lastRefreshRef.current < 5 * 60 * 1000) {
          return;
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!session || error) {
          console.log('[session-refresh] No session to refresh');
          return;
        }

        // Check if session expires within next 10 minutes
        const expiresAt = new Date(session.expires_at || 0).getTime();
        const expiresIn = expiresAt - now;
        
        if (expiresIn < 10 * 60 * 1000) {
          console.log('[session-refresh] Session expiring soon, refreshing...');
          const { data, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.error('[session-refresh] Failed to refresh session:', refreshError);
          } else if (data.session) {
            console.log('[session-refresh] Session refreshed successfully');
            lastRefreshRef.current = now;
          }
        }
      } catch (error) {
        console.error('[session-refresh] Error checking session:', error);
      }
    };

    // Check session immediately
    checkAndRefreshSession();

    // Set up interval to check every 5 minutes
    refreshIntervalRef.current = setInterval(checkAndRefreshSession, 5 * 60 * 1000);

    // Also refresh when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('[session-refresh] Tab became visible, checking session...');
        checkAndRefreshSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [supabase]);
}