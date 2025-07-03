'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@/app/lib/auth';
import { toast } from 'react-hot-toast';
import { Button } from '@/app/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/app/components/logo';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isMagicLink, setIsMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [showResendTimer, setShowResendTimer] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);

  useEffect(() => {
    // Check for incognito mode / private browsing
    const checkIncognito = async () => {
      try {
        // Test if we can persist data
        const testKey = 'replyguy_incognito_test';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        
        // Check if FileSystem API quota is restricted (common in incognito)
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          const { quota, usage } = await navigator.storage.estimate();
          // In incognito, quota is often severely limited
          if (quota && quota < 120 * 1024 * 1024) { // Less than 120MB suggests incognito
            console.warn('[login] Possible incognito mode detected - limited storage quota');
            toast.warning(
              'You may be in private/incognito mode. This can cause issues with email confirmation. Consider using normal browsing mode.',
              { duration: 8000 }
            );
          }
        }
      } catch (err) {
        console.warn('[login] Storage test failed - possible incognito mode');
      }
    };
    
    checkIncognito();
    
    // Check for error in URL params
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');
    const fromParam = params.get('from');
    const messageParam = params.get('message');
    
    if (errorParam === 'confirmation_failed') {
      toast.error(messageParam || 'Email confirmation failed. Please try again.');
    } else if (errorParam === 'session_required') {
      if (fromParam === 'checkout') {
        toast.error('Please sign in to complete your purchase.');
      } else {
        toast.error('Please sign in to continue.');
      }
    } else if (errorParam === 'session_not_found') {
      toast.error('Session expired. Please sign in again.');
    } else if (errorParam === 'verification_timeout') {
      toast.error('Email verification timed out. Please try logging in.');
    }
  }, []);

  useEffect(() => {
    if (showResendTimer && resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (resendTimer === 0) {
      setShowResendTimer(false);
      setResendTimer(60);
    }
  }, [showResendTimer, resendTimer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isMagicLink) {
        // Send magic link
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/verify`,
            shouldCreateUser: true,
          },
        });

        if (error) {
          throw error;
        }

        setMagicLinkSent(true);
        setShowResendTimer(true);
        toast.success('Check your email for the magic link!');
      } else {
        // Regular password login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        // Verify session was created with retry logic
        let sessionVerified = false;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (!sessionVerified && retryCount < maxRetries) {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            sessionVerified = true;
            toast.success('Welcome back!');
            
            // Add a small delay to ensure session is propagated
            setTimeout(() => {
              router.push('/dashboard');
            }, 100);
          } else {
            retryCount++;
            if (retryCount < maxRetries) {
              console.log(`[login] Session not found, retrying (${retryCount}/${maxRetries})...`);
              // Wait a bit before retrying
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Try to refresh session
              const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
              if (refreshedSession) {
                sessionVerified = true;
                toast.success('Welcome back!');
                setTimeout(() => {
                  router.push('/dashboard');
                }, 100);
              }
            }
          }
        }
        
        if (!sessionVerified) {
          throw new Error('Unable to establish session. Please try logging in again.');
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mb-6">
            <Logo href="/" imageClassName="w-10 h-10" textClassName="text-2xl gradient-text" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Welcome back
          </h2>
          <p className="mt-2 text-gray-600">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-purple-600 hover:text-purple-500">
              Sign up
            </Link>
          </p>
        </div>

        {magicLinkSent ? (
          <div className="mt-8 text-center space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-purple-900 mb-2">
                Check your email!
              </h3>
              <p className="text-sm text-purple-700">
                We&apos;ve sent a magic link to <strong>{email}</strong>
              </p>
              <p className="text-sm text-purple-600 mt-2">
                Click the link in the email to sign in instantly.
              </p>
            </div>
            
            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={() => {
                  setMagicLinkSent(false);
                  setIsMagicLink(false);
                }}
                className="w-full"
              >
                Use password instead
              </Button>
              
              <Button
                variant="ghost"
                onClick={handleSubmit}
                disabled={showResendTimer}
                className="w-full"
              >
                {showResendTimer ? (
                  `Resend in ${resendTimer}s`
                ) : (
                  'Resend magic link'
                )}
              </Button>
            </div>
            
            <p className="text-xs text-gray-500">
              Didn&apos;t receive the email? Check your spam folder.
            </p>
          </div>
        ) : (
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            {!isMagicLink && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required={!isMagicLink}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="magic-link"
                name="magic-link"
                type="checkbox"
                checked={isMagicLink}
                onChange={(e) => setIsMagicLink(e.target.checked)}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <label htmlFor="magic-link" className="ml-2 block text-sm text-gray-700">
                Sign in with magic link
              </label>
            </div>
            {!isMagicLink && (
            <div className="text-sm">
              <Link href="/auth/reset-password" className="text-purple-600 hover:text-purple-500">
                Forgot password?
              </Link>
            </div>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isMagicLink ? 'Sending magic link...' : 'Signing in...'}
              </>
            ) : (
              isMagicLink ? 'Send magic link' : 'Sign in'
            )}
          </Button>

        </form>
        )}
      </div>
    </div>
  );
}