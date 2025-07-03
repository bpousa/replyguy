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
      // Mark that we're in an active auth flow immediately
      if (token || type || from === 'email-callback') {
        sessionStorage.setItem('auth_flow_active', 'true');
      }
      
      // For PKCE token verification, explicitly verify the OTP
      if (token && type) {
        console.log('[verify] PKCE token detected, verifying OTP...', {
          tokenLength: token.length,
          tokenPrefix: token.substring(0, 20),
          type
        });
        
        try {
          // Verify the OTP token with Supabase
          console.log('[verify] Verifying OTP token with Supabase...');
          // For PKCE tokens from email, use 'token_hash'
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: type as 'signup' | 'recovery' | 'invite' | 'magiclink' | 'email_change' | 'email'
          });
          
          if (verifyError) {
            console.error('[verify] OTP verification error:', verifyError);
            throw verifyError;
          }
          
          if (data?.user) {
            console.log('[verify] OTP verified successfully, user:', data.user.email);
            
            // Check if we now have a session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
              console.error('[verify] Error getting session after OTP verification:', sessionError);
              throw sessionError;
            }
            
            if (session) {
              console.log('[verify] Session established after OTP verification:', session.user?.email);
              // Let the auth state listener handle the redirect
              return;
            } else {
              console.log('[verify] No session immediately after OTP verification, will continue checking...');
              // Continue to the polling logic below
            }
          } else {
            console.error('[verify] OTP verification succeeded but no user data returned');
            throw new Error('Verification succeeded but no user data returned');
          }
        } catch (err: any) {
          console.error('[verify] Error during OTP verification:', err);
          setStatus('error');
          
          // Provide specific error messages based on the error
          let errorMessage = 'Verification failed. Please try again.';
          if (err.message?.includes('expired') || err.code === 'otp_expired') {
            errorMessage = 'This confirmation link has expired. Please sign up again.';
          } else if (err.message?.includes('invalid') || err.code === 'invalid_request') {
            errorMessage = 'This confirmation link is invalid. Please sign up again.';
          }
          
          setMessage(errorMessage);
          setTimeout(() => {
            if (isMounted) router.push('/auth/login?error=verification_failed');
          }, 3000);
          return;
        }
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
      
      // Continue with session checking whether we came from token verification or not
      console.log('[verify] Starting session check...', { hasToken: !!token, from });
      
      // This handles both token verification follow-up and regular session establishment
      // If we're coming from email-callback or just verified a token, be more aggressive about checking
      const isFromEmailCallback = from === 'email-callback';
      const isAfterTokenVerification = !!token && !!type;
      const needsAggressiveChecking = isFromEmailCallback || isAfterTokenVerification;
      
      let attempts = 0;
      const maxAttempts = needsAggressiveChecking ? 30 : 10; // More attempts if we expect a session
      const checkInterval = needsAggressiveChecking ? 250 : 500; // Faster checks if we expect a session
      
      const checkForSession = setInterval(async () => {
        attempts++;
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          clearInterval(checkForSession);
          console.log('[verify] Session established!', { attempts, email: session.user?.email });
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
          
          let errorMessage = 'Verification failed. Please try again.';
          if (isFromEmailCallback) {
            errorMessage = 'Email verification may have expired. Please try signing up again.';
          } else if (isAfterTokenVerification) {
            errorMessage = 'Email verified but session could not be established. Please try logging in.';
          }
          
          setMessage(errorMessage);
          setTimeout(() => {
            if (isMounted) router.push('/auth/login?error=verification_failed');
          }, 2000);
        } else if (attempts % 5 === 0) {
          console.log(`[verify] Still checking for session... (attempt ${attempts}/${maxAttempts})`);
        }
      }, checkInterval);

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