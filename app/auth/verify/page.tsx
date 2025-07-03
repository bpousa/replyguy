'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/app/lib/auth';
import { Loader2, CheckCircle } from 'lucide-react';

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Verifying your email...');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  
  // Extract parameters
  const token = searchParams.get('token');
  const type = searchParams.get('type');
  const plan = searchParams.get('plan');
  const next = searchParams.get('next');

  const addDebugInfo = (info: string) => {
    console.log('[verify]', info);
    setDebugInfo(prev => [...prev, `${new Date().toISOString().substr(11, 8)} - ${info}`]);
  };

  useEffect(() => {
    let isMounted = true;
    
    const verifyEmail = async () => {
      const supabase = createBrowserClient();
      
      addDebugInfo('Starting email verification process...');
      addDebugInfo(`URL: ${window.location.href}`);
      addDebugInfo(`Token present: ${!!token}`);
      addDebugInfo(`Type: ${type}`);
      
      // Check if we already have a session
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      if (existingSession) {
        addDebugInfo('Existing session found, redirecting...');
        setStatus('success');
        setMessage('Already signed in!');
        const redirectUrl = plan && plan !== 'free' 
          ? `/auth/checkout-redirect?plan=${plan}`
          : next || '/dashboard';
        setTimeout(() => router.push(redirectUrl), 500);
        return;
      }
    
      if (!token || !type) {
        addDebugInfo('No token or type in URL, checking for session...');
        
        // This might be a redirect from Supabase after processing
        // Let's check the URL hash for tokens
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (accessToken && refreshToken) {
          addDebugInfo('Found tokens in URL hash, setting session...');
          try {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            
            if (error) throw error;
            
            if (data.session) {
              addDebugInfo('Session set successfully from hash tokens!');
              setStatus('success');
              setMessage('Email verified successfully!');
              
              // Ensure user exists
              await fetch('/auth/ensure-user', { credentials: 'include' });
              
              const redirectUrl = plan && plan !== 'free' 
                ? `/auth/checkout-redirect?plan=${plan}`
                : next || '/dashboard';
              setTimeout(() => router.push(redirectUrl), 1000);
              return;
            }
          } catch (error) {
            addDebugInfo(`Failed to set session from hash: ${error}`);
          }
        }
      
        // No tokens found, wait for session
        addDebugInfo('No tokens found, polling for session...');
        let attempts = 0;
        const maxAttempts = 20; // 10 seconds
        
        const checkInterval = setInterval(async () => {
          attempts++;
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            clearInterval(checkInterval);
            addDebugInfo('Session found after polling!');
            setStatus('success');
            setMessage('Email verified successfully!');
            
            // Ensure user exists
            await fetch('/auth/ensure-user', { credentials: 'include' });
            
            const redirectUrl = plan && plan !== 'free' 
              ? `/auth/checkout-redirect?plan=${plan}`
              : '/dashboard';
            setTimeout(() => router.push(redirectUrl), 1000);
          } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            addDebugInfo('Session polling timed out');
            setStatus('error');
            setMessage('Verification timed out. Please try logging in.');
            setTimeout(() => router.push('/auth/login'), 2000);
          }
        }, 500);
        
        return;
      }

      // We have a PKCE token, let Supabase process it
      addDebugInfo('PKCE token detected, waiting for Supabase to process...');
      sessionStorage.setItem('auth_flow_active', 'true');
      
      // For PKCE tokens, Supabase needs to process them automatically
      // We just need to wait for the session to appear
      let attempts = 0;
      const maxAttempts = 40; // 20 seconds
      
      const checkInterval = setInterval(async () => {
        attempts++;
        addDebugInfo(`Checking for session (attempt ${attempts}/${maxAttempts})...`);
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          addDebugInfo(`Session check error: ${error.message}`);
        }
        
        if (session) {
          clearInterval(checkInterval);
          addDebugInfo('Session established successfully!');
          setStatus('success');
          setMessage('Email verified successfully!');
          
          // Ensure user exists
          try {
            const response = await fetch('/auth/ensure-user', { credentials: 'include' });
            if (response.ok) {
              addDebugInfo('User existence confirmed');
            } else {
              addDebugInfo('Failed to ensure user exists');
            }
          } catch (err) {
            addDebugInfo(`Error ensuring user: ${err}`);
          }
          
          const redirectUrl = plan && plan !== 'free' 
            ? `/auth/checkout-redirect?plan=${plan}`
            : next || '/dashboard';
          
          addDebugInfo(`Redirecting to: ${redirectUrl}`);
          setTimeout(() => {
            if (isMounted) router.push(redirectUrl);
          }, 1000);
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          addDebugInfo('Session establishment timed out');
          setStatus('error');
          setMessage('Verification timed out. Please try logging in.');
          setTimeout(() => {
            if (isMounted) router.push('/auth/login?error=verification_timeout');
          }, 2000);
        }
      }, 500);
    };
    
    verifyEmail();
    
    return () => {
      isMounted = false;
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
            {process.env.NODE_ENV === 'development' && debugInfo.length > 0 && (
              <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-left max-h-40 overflow-y-auto">
                {debugInfo.map((info, i) => (
                  <div key={i} className="font-mono">{info}</div>
                ))}
              </div>
            )}
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