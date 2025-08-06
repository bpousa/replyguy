'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/app/lib/auth';
import { Loader2 } from 'lucide-react';
import { startAuthFlow, endAuthFlow, clearAllAuthData } from '@/app/lib/auth-utils';

export default function EstablishingSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Establishing session...');
  const attemptsRef = useRef(0);
  const isNewUserRef = useRef<boolean | null>(null);
  const hasRedirected = useRef(false);
  const isEstablishing = useRef(false);
  
  const plan = searchParams.get('plan');
  const from = searchParams.get('from');
  const next = searchParams.get('next');

  useEffect(() => {
    // Prevent multiple redirects or concurrent establishment
    if (hasRedirected.current || isEstablishing.current) return;
    
    const supabase = createBrowserClient();
    let mounted = true;
    
    const establishSession = async () => {
      // Mark as establishing to prevent concurrent calls
      if (isEstablishing.current) return;
      isEstablishing.current = true;
      console.log('[establishing-session] Starting session establishment process');
      
      // Mark auth flow as active
      startAuthFlow();
      
      // First, wait a bit for any pending auth operations
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if this is a new user
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (initialSession?.user) {
          // More robust check for new user:
          // 1. Check if user was created in the last 10 minutes (more lenient for OAuth)
          // 2. Check for OAuth provider in metadata
          // 3. Check if coming from signup flow
          // 4. Check if they haven't seen trial offer yet
          
          const createdAt = new Date(initialSession.user.created_at);
          const now = new Date();
          const timeSinceCreation = now.getTime() - createdAt.getTime();
          const isRecentlyCreated = timeSinceCreation < 10 * 60 * 1000; // 10 minutes for OAuth delays
          
          // Check if user signed up via OAuth
          const isOAuthUser = !!initialSession.user.app_metadata?.provider && 
                             initialSession.user.app_metadata.provider !== 'email';
          
          // Check if user has signed in before (for email users)
          const lastSignIn = initialSession.user.last_sign_in_at;
          const hasSignedInBefore = lastSignIn && new Date(lastSignIn) < createdAt;
          
          // Check if coming from signup
          const fromSignup = from === 'signup' || 
                           document.referrer.includes('/auth/signup') ||
                           sessionStorage.getItem('auth_flow_from') === 'signup' ||
                           sessionStorage.getItem('oauth_signup') === 'true';
          
          // For OAuth users, consider them new if recently created
          // For email users, use the more strict check
          const isNew = isOAuthUser ? isRecentlyCreated : (isRecentlyCreated && !hasSignedInBefore || fromSignup);
          isNewUserRef.current = isNew;
          
          // Clear the OAuth signup flag after checking
          if (sessionStorage.getItem('oauth_signup') === 'true') {
            sessionStorage.removeItem('oauth_signup');
          }
          
          console.log('[establishing-session] User type check:', {
            isRecentlyCreated,
            isOAuthUser,
            provider: initialSession.user.app_metadata?.provider,
            hasSignedInBefore,
            fromSignup,
            isNew
          });
        }
      } catch (e) {
        console.error('[establishing-session] Error checking user status:', e);
        // Default to generic message on error
        isNewUserRef.current = null;
      }
      
      // Listen for auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[establishing-session] Auth state changed:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN' && session && mounted && !hasRedirected.current) {
          hasRedirected.current = true;
          console.log('[establishing-session] Session established via auth state change');
          
          // Clear auth flow
          endAuthFlow();
          
          // Send post-signup notification for new users (don't fail on errors)
          try {
            const response = await fetch('/api/auth/post-signup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: session.user.id })
            });
            
            if (!response.ok) {
              console.warn(`[establishing-session] Post-signup API returned ${response.status}, continuing...`);
            }
          } catch (error) {
            console.warn('[establishing-session] Post-signup notification failed (continuing):', error);
          }
          
          // Determine redirect based on plan
          const userPlan = plan || session.user.user_metadata?.selected_plan;
          console.log('[establishing-session] User plan:', userPlan);
          
          // Handle different plan types
          if (userPlan && userPlan !== 'free') {
            // Paid plans: growth, professional, enterprise
            console.log('[establishing-session] Paid plan detected:', userPlan);
            
            // Check for existing subscription
            const { data: sub } = await supabase
              .from('subscriptions')
              .select('*')
              .eq('user_id', session.user.id)
              .eq('status', 'active')
              .maybeSingle();
            
            if (!sub) {
              console.log('[establishing-session] No active subscription, redirecting to checkout');
              router.push(`/auth/checkout-redirect?plan=${userPlan}`);
              return;
            } else {
              console.log('[establishing-session] Active subscription found, redirecting to dashboard');
              router.push(next || '/dashboard');
            }
          } else {
            // Free plan - check if they should see trial offer
            console.log('[establishing-session] Free plan, checking trial offer eligibility');
            
            // Check if user has seen trial offer
            try {
              const { data: userData, error: userError } = await supabase
                .from('users')
                .select('has_seen_trial_offer')
                .eq('id', session.user.id)
                .maybeSingle();
              
              if (userError) {
                console.error('[establishing-session] Error checking trial offer:', userError);
                // Handle 406 errors or database issues gracefully
                if (userError.code === 'PGRST116' || userError.code === 'PGRST301' || userError.message?.includes('406')) {
                  console.log('[establishing-session] 406/PGRST116 error - user record missing, treating as new user');
                  if (isNewUserRef.current || isNewUserRef.current === null) {
                    console.log('[establishing-session] Showing trial offer for missing user record');
                    router.push('/auth/trial-offer');
                    return;
                  }
                } else if (isNewUserRef.current) {
                  console.log('[establishing-session] Other error but user is new, showing trial offer');
                  router.push('/auth/trial-offer');
                  return;
                }
              } else if (userData && !userData.has_seen_trial_offer) {
                console.log('[establishing-session] User eligible for trial offer, redirecting');
                router.push('/auth/trial-offer');
                return;
              } else if (!userData && (isNewUserRef.current || isNewUserRef.current === null)) {
                // No user record found but user appears to be new
                console.log('[establishing-session] No user record found for new user, showing trial offer');
                router.push('/auth/trial-offer');
                return;
              }
            } catch (error) {
              console.error('[establishing-session] Unexpected error checking trial offer:', error);
              // For new users, show the trial offer anyway
              if (isNewUserRef.current || isNewUserRef.current === null) {
                console.log('[establishing-session] Error but user appears new, showing trial offer');
                router.push('/auth/trial-offer');
                return;
              }
            }
            
            console.log('[establishing-session] User has seen trial offer or ineligible, redirecting to dashboard');
            router.push(next || '/dashboard');
          }
        }
      });
      
      // Also poll for session
      const maxAttempts = 30; // 30 seconds total
      
      const checkSession = async () => {
        if (!mounted || hasRedirected.current) return;
        
        const attemptNum = attemptsRef.current + 1;
        attemptsRef.current = attemptNum;
        setStatus(`Establishing session... (attempt ${attemptNum}/${maxAttempts})`);
        
        try {
          // Force a fresh session check
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('[establishing-session] Session check error:', error);
          }
          
          if (session && !hasRedirected.current) {
            hasRedirected.current = true;
            console.log('[establishing-session] Session found via polling:', session.user?.email);
            
            // Clear auth flow
            endAuthFlow();
            
            // Send post-signup notification for new users (don't fail on errors)
            try {
              const response = await fetch('/api/auth/post-signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: session.user.id })
              });
              
              if (!response.ok) {
                console.warn(`[establishing-session] Post-signup API returned ${response.status}, continuing...`);
              }
            } catch (error) {
              console.warn('[establishing-session] Post-signup notification failed (continuing):', error);
            }
            
            // Handle redirect based on plan
            const userPlan = plan || session.user.user_metadata?.selected_plan;
            console.log('[establishing-session] User plan (polling):', userPlan);
            
            if (userPlan && userPlan !== 'free') {
              // Paid plans: growth, professional, enterprise
              const { data: sub } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', session.user.id)
                .eq('status', 'active')
                .maybeSingle();
              
              if (!sub) {
                console.log('[establishing-session] No active subscription, redirecting to checkout');
                router.push(`/auth/checkout-redirect?plan=${userPlan}`);
                return;
              } else {
                console.log('[establishing-session] Active subscription found, redirecting to dashboard');
                router.push(next || '/dashboard');
              }
            } else {
              // Free plan - check if they should see trial offer
              console.log('[establishing-session] Free plan, checking trial offer eligibility');
              
              // Check if user has seen trial offer
              try {
                const { data: userData, error: userError } = await supabase
                  .from('users')
                  .select('has_seen_trial_offer')
                  .eq('id', session.user.id)
                  .maybeSingle();
                
                if (userError) {
                  console.error('[establishing-session] Error checking trial offer (polling):', userError);
                  // Handle 406 errors or database issues gracefully
                  if (userError.code === 'PGRST116' || userError.code === 'PGRST301' || userError.message?.includes('406')) {
                    console.log('[establishing-session] 406/PGRST116 error (polling) - user record missing, treating as new user');
                    if (isNewUserRef.current || isNewUserRef.current === null) {
                      console.log('[establishing-session] Showing trial offer for missing user record (polling)');
                      router.push('/auth/trial-offer');
                      return;
                    }
                  } else if (isNewUserRef.current) {
                    console.log('[establishing-session] Other error but user is new, showing trial offer (polling)');
                    router.push('/auth/trial-offer');
                    return;
                  }
                } else if (userData && !userData.has_seen_trial_offer) {
                  console.log('[establishing-session] User eligible for trial offer, redirecting (polling)');
                  router.push('/auth/trial-offer');
                  return;
                } else if (!userData && (isNewUserRef.current || isNewUserRef.current === null)) {
                  // No user record found but user appears to be new
                  console.log('[establishing-session] No user record found for new user, showing trial offer (polling)');
                  router.push('/auth/trial-offer');
                  return;
                }
              } catch (error) {
                console.error('[establishing-session] Unexpected error checking trial offer (polling):', error);
                // For new users, show the trial offer anyway
                if (isNewUserRef.current || isNewUserRef.current === null) {
                  console.log('[establishing-session] Error but user appears new, showing trial offer (polling)');
                  router.push('/auth/trial-offer');
                  return;
                }
              }
              
              console.log('[establishing-session] User has seen trial offer or ineligible, redirecting to dashboard');
              router.push(next || '/dashboard');
            }
            return;
          }
          
          // Try to refresh session if we're early in the process
          if (attemptNum <= 3) {
            const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
            if (refreshedSession && !hasRedirected.current) {
              hasRedirected.current = true;
              console.log('[establishing-session] Session obtained via refresh');
              router.push(next || '/dashboard');
              return;
            }
          }
          
          // Continue checking
          if (attemptNum < maxAttempts) {
            setTimeout(checkSession, 1000);
          } else {
            // Final timeout
            console.error('[establishing-session] Failed to establish session after all attempts');
            // Clear all auth data before redirecting
            clearAllAuthData().then(() => {
              endAuthFlow();
              router.push('/auth/login?error=session_timeout&message=Unable to establish session. Please try logging in manually.');
            }).catch(e => {
              console.error('[establishing-session] Error clearing auth data:', e);
              endAuthFlow();
              router.push('/auth/login?error=session_timeout&message=Unable to establish session. Please try logging in manually.');
            });
          }
        } catch (err) {
          console.error('[establishing-session] Unexpected error:', err);
          if (attemptNum < maxAttempts) {
            setTimeout(checkSession, 1000);
          }
        }
      };
      
      // Start checking
      checkSession();
      
      // Cleanup
      return () => {
        mounted = false;
        subscription.unsubscribe();
        // Reset establishing flag
        isEstablishing.current = false;
        // Ensure auth flow is ended if component unmounts
        if (!hasRedirected.current) {
          endAuthFlow();
        }
      };
    };
    
    establishSession();
  }, [router, searchParams, plan, from, next]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          {isNewUserRef.current === false ? 'Signing You In' : 'Setting Up Your Account'}
        </h2>
        <p className="text-gray-600 mb-2">{status}</p>
        <p className="text-sm text-gray-500">
          This may take a few seconds. Please don&apos;t close this window.
        </p>
      </div>
    </div>
  );
}