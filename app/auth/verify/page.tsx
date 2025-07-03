'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/app/lib/auth';
import { Loader2, CheckCircle } from 'lucide-react';

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Verifying your email...');
  const checkIntervalRef = useRef<NodeJS.Timeout>();
  const supabaseRef = useRef(createBrowserClient());
  
  // Extract parameters
  const token = searchParams.get('token');
  const type = searchParams.get('type');
  const plan = searchParams.get('plan');
  const next = searchParams.get('next');
  const from = searchParams.get('from');

  useEffect(() => {
    let isMounted = true;
    const supabase = supabaseRef.current;
    
    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[verify] Auth state changed:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session && isMounted) {
        setStatus('success');
        setMessage('Email verified successfully!');
        sessionStorage.setItem('auth_flow_active', 'true');
        
        setTimeout(() => {
          if (!isMounted) return;
          const redirectUrl = plan && plan !== 'free' 
            ? `/auth/checkout-redirect?plan=${plan}`
            : next || '/dashboard';
          
          console.log('[verify] Redirecting after auth state change to:', redirectUrl);
          router.push(redirectUrl);
        }, 500);
      }
    });
    
    const verifyAndEstablishSession = async () => {
      // For PKCE token verification, explicitly verify the OTP
      if (token && type) {
        console.log('[verify] PKCE token detected, verifying OTP...');
        
        try {
          // Explicitly verify the OTP token
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: type as any
          });
          
          if (error) {
            console.error('[verify] OTP verification error:', error);
            setStatus('error');
            setMessage('Verification failed. The link may have expired.');
            setTimeout(() => {
              if (isMounted) router.push('/auth/login?error=verification_failed');
            }, 2000);
            return;
          }
          
          if (data.session) {
            console.log('[verify] OTP verified successfully, session established:', data.user?.email);
            // Session is established, the auth state change listener will handle redirect
            return;
          }
        } catch (err) {
          console.error('[verify] Unexpected error during OTP verification:', err);
        }
        
        // If OTP verification didn't work, continue to wait for session
        console.log('[verify] OTP verification completed, waiting for session...');
        return;
      }
      
      // Wait a moment for Supabase to process any auth data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if we have a session
      console.log('[verify] Checking for session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (session) {
        console.log('[verify] Session found!', session.user.email);
        setStatus('success');
        setMessage('Email verified successfully!');
        
        // Mark auth flow as active
        sessionStorage.setItem('auth_flow_active', 'true');
        
        setTimeout(() => {
          if (!isMounted) return;
          const redirectUrl = plan && plan !== 'free' 
            ? `/auth/checkout-redirect?plan=${plan}`
            : next || '/dashboard';
          
          console.log('[verify] Redirecting to:', redirectUrl);
          router.push(redirectUrl);
        }, 1000);
        return;
      }
      
      // If no token, check for existing session from regular auth flow
      if (!token || !type) {
        // This might be a redirect from Supabase after email verification
        // If we're coming from email-callback, be more aggressive about checking
        const isFromEmailCallback = from === 'email-callback';
        console.log('[verify] No token in URL, checking for session establishment...', { from, isFromEmailCallback });
        
        let attempts = 0;
        const maxAttempts = isFromEmailCallback ? 20 : 10; // More attempts if from email
        const checkInterval = isFromEmailCallback ? 250 : 500; // Faster checks if from email
        
        const checkForSession = setInterval(async () => {
          attempts++;
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            clearInterval(checkForSession);
            console.log('[verify] Session established after Supabase redirect');
            setStatus('success');
            setMessage('Email verified successfully!');
            // Mark auth flow as complete
            sessionStorage.removeItem('auth_flow_active');
            setTimeout(() => {
              if (isMounted) {
                const redirectUrl = plan && plan !== 'free' 
                  ? `/auth/checkout-redirect?plan=${plan}`
                  : next || '/dashboard';
                router.push(redirectUrl);
              }
            }, 1000);
          } else if (attempts >= maxAttempts) {
            clearInterval(checkForSession);
            console.error('[verify] Failed to find session after', attempts, 'attempts');
            setStatus('error');
            setMessage(isFromEmailCallback 
              ? 'Email verification may have expired. Please try signing up again.'
              : 'Verification failed. Please try again.');
            setTimeout(() => {
              if (isMounted) router.push('/auth/login?error=verification_failed');
            }, 2000);
          }
        }, checkInterval);
        
        return;
      }

      // This code path should not be reached anymore since we handle PKCE tokens above
      console.error('[verify] Unexpected: PKCE token present but not handled above');
      
      // Mark that we're in a valid auth flow
      sessionStorage.setItem('auth_flow_active', 'true');
      let attempts = 0;
      const maxAttempts = 30; // 15 seconds total
      
      const checkSession = async (): Promise<boolean> => {
        attempts++;
        console.log(`[verify] Checking for session (attempt ${attempts}/${maxAttempts})...`);
        
        try {
          // Get current session
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('[verify] Session check error:', error);
            return false;
          }
          
          if (session) {
            console.log('[verify] Session established successfully!', session.user.email);
            return true;
          }
          
          // On early attempts, try to refresh
          if (attempts <= 3) {
            console.log('[verify] No session yet, attempting refresh...');
            const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
              console.log('[verify] Refresh error:', refreshError.message);
            } else if (refreshedSession) {
              console.log('[verify] Session obtained via refresh!');
              return true;
            }
          }
          
          return false;
        } catch (error) {
          console.error('[verify] Unexpected error:', error);
          return false;
        }
      };
      
      // Initial check
      const hasSession = await checkSession();
      
      if (hasSession) {
        if (!isMounted) return;
        setStatus('success');
        setMessage('Email verified successfully!');
        
        setTimeout(() => {
          if (!isMounted) return;
          const redirectUrl = plan && plan !== 'free' 
            ? `/auth/checkout-redirect?plan=${plan}`
            : next || '/dashboard';
          
          console.log('[verify] Redirecting to:', redirectUrl);
          router.push(redirectUrl);
        }, 1000);
        
        return;
      }
      
      // Set up interval to keep checking
      checkIntervalRef.current = setInterval(async () => {
        if (attempts >= maxAttempts) {
          if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
          if (!isMounted) return;
          
          console.error('[verify] Failed to establish session after all attempts');
          setStatus('error');
          setMessage('Verification timed out. Please try logging in.');
          
          setTimeout(() => {
            if (!isMounted) return;
            router.push('/auth/login?error=verification_timeout');
          }, 2000);
          
          return;
        }
        
        const hasSession = await checkSession();
        
        if (hasSession) {
          if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
          if (!isMounted) return;
          
          setStatus('success');
          setMessage('Email verified successfully!');
          
          setTimeout(() => {
            if (!isMounted) return;
            const redirectUrl = plan && plan !== 'free' 
              ? `/auth/checkout-redirect?plan=${plan}`
              : next || '/dashboard';
            
            console.log('[verify] Redirecting to:', redirectUrl);
            router.push(redirectUrl);
          }, 1000);
        }
      }, 500);
    };
    
    verifyAndEstablishSession();
    
    return () => {
      isMounted = false;
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      authListener.subscription.unsubscribe();
      // Clean up auth flow flag on unmount
      sessionStorage.removeItem('auth_flow_active');
    };
  }, [token, type, plan, next, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        {status === 'processing' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Verifying Your Email
            </h2>
            <p className="text-gray-600">{message}</p>
            <p className="text-sm text-gray-500 mt-2">This may take a few seconds...</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Email Verified!
            </h2>
            <p className="text-gray-600">{message}</p>
            <p className="text-sm text-gray-500 mt-2">Redirecting you now...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Verification Failed
            </h2>
            <p className="text-gray-600">{message}</p>
            <p className="text-sm text-gray-500 mt-2">Redirecting to login...</p>
          </>
        )}
      </div>
    </div>
  );
}