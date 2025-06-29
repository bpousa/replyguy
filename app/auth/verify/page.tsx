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

  useEffect(() => {
    let isMounted = true;
    const supabase = supabaseRef.current;
    
    const verifyAndEstablishSession = async () => {
      if (!token || !type) {
        // This might be a magic link callback, check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('[verify] Magic link session found');
          setStatus('success');
          setMessage('Successfully signed in!');
          setTimeout(() => {
            if (isMounted) router.push('/dashboard');
          }, 1000);
          return;
        }
        
        setStatus('error');
        setMessage('Invalid verification link');
        return;
      }

      console.log('[verify] Starting PKCE token verification...', { token: token.substring(0, 20), type });
      
      // For PKCE tokens, we need to wait for Supabase to process the token
      // The client SDK should automatically detect and verify it
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
      
      // Also listen for auth state changes
      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('[verify] Auth state changed:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN' && session && isMounted) {
          if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
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
      });
      
      // Cleanup
      return () => {
        authListener.subscription.unsubscribe();
      };
    };
    
    verifyAndEstablishSession();
    
    return () => {
      isMounted = false;
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
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