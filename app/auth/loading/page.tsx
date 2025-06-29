'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/app/lib/auth';
import { Loader2 } from 'lucide-react';

// This page gives Supabase time to establish the session after magic link
export default function AuthLoadingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get('plan');
  const supabase = createBrowserClient();

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 15; // Increased for PKCE flow
    let checkInterval: NodeJS.Timeout;
    
    const checkSession = async () => {
      attempts++;
      console.log(`[auth-loading] Checking session, attempt ${attempts}/${maxAttempts}`);
      
      let { data: { session } } = await supabase.auth.getSession();
      
      // For early attempts, always try to refresh to handle PKCE delay
      if (!session && attempts <= 5) {
        console.log('[auth-loading] No session found, trying to refresh...');
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.log('[auth-loading] Refresh error:', refreshError.message);
        } else if (refreshedSession) {
          console.log('[auth-loading] Session obtained via refresh');
          session = refreshedSession;
        }
      }
      
      // Also check for auth state changes
      const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
        if (event === 'SIGNED_IN' && newSession) {
          console.log('[auth-loading] Auth state changed to SIGNED_IN');
          session = newSession;
        }
      });
      
      if (session) {
        // Session found
        console.log('[auth-loading] Session established successfully for:', session.user.email);
        
        // Clean up
        if (checkInterval) clearInterval(checkInterval);
        authListener.subscription.unsubscribe();
        
        // Determine redirect
        if (planId && planId !== 'free') {
          console.log('[auth-loading] Redirecting to checkout for plan:', planId);
          router.push(`/auth/checkout-redirect?plan=${planId}`);
        } else {
          console.log('[auth-loading] Redirecting to dashboard');
          router.push('/dashboard');
        }
      } else if (attempts >= maxAttempts) {
        // No session after multiple attempts
        console.error('[auth-loading] Failed to establish session after', attempts, 'attempts');
        authListener.subscription.unsubscribe();
        router.push('/auth/login?error=session_not_found');
      }
    };
    
    // Start checking immediately
    checkSession();
    
    // Then check every 500ms
    checkInterval = setInterval(checkSession, 500);
    
    // Cleanup on unmount
    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [router, supabase, planId]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
        <p className="text-gray-600">Completing sign in...</p>
        <p className="text-sm text-gray-500 mt-2">Please wait a moment</p>
      </div>
    </div>
  );
}