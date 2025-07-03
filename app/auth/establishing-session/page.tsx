'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/app/lib/auth';
import { Loader2 } from 'lucide-react';

export default function EstablishingSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Establishing session...');
  const [attempts, setAttempts] = useState(0);
  const hasRedirected = useRef(false);
  
  const plan = searchParams.get('plan');
  const from = searchParams.get('from');
  const next = searchParams.get('next');

  useEffect(() => {
    // Prevent multiple redirects
    if (hasRedirected.current) return;
    
    const supabase = createBrowserClient();
    let mounted = true;
    
    const establishSession = async () => {
      console.log('[establishing-session] Starting session establishment process');
      
      // First, wait a bit for any pending auth operations
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Listen for auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[establishing-session] Auth state changed:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN' && session && mounted && !hasRedirected.current) {
          hasRedirected.current = true;
          console.log('[establishing-session] Session established via auth state change');
          
          // Clear any auth flow markers
          sessionStorage.removeItem('auth_flow_active');
          
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
            // Free plan - go directly to dashboard
            console.log('[establishing-session] Free plan, redirecting to dashboard');
            router.push(next || '/dashboard');
          }
        }
      });
      
      // Also poll for session
      const maxAttempts = 30; // 30 seconds total
      
      const checkSession = async () => {
        if (!mounted || hasRedirected.current) return;
        
        const attemptNum = attempts + 1;
        setAttempts(attemptNum);
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
            
            // Clear auth flow markers
            sessionStorage.removeItem('auth_flow_active');
            
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
              // Free plan - go directly to dashboard
              console.log('[establishing-session] Free plan, redirecting to dashboard');
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
            router.push('/auth/login?error=session_timeout&message=Unable to establish session. Please try logging in manually.');
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
      };
    };
    
    establishSession();
  }, [router, searchParams, plan, from, next, attempts]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Setting Up Your Account
        </h2>
        <p className="text-gray-600 mb-2">{status}</p>
        <p className="text-sm text-gray-500">
          This may take a few seconds. Please don&apos;t close this window.
        </p>
      </div>
    </div>
  );
}