'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@/app/lib/auth';
import { toast } from 'react-hot-toast';
import { Button } from '@/app/components/ui/button';
import { Loader2, CheckCircle } from 'lucide-react';
import { Logo } from '@/app/components/logo';
import { Gift } from 'lucide-react';
import { startAuthFlow, clearAllAuthData } from '@/app/lib/auth-utils';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const searchParams = useSearchParams();
  const planId = searchParams.get('plan');
  const referralCode = searchParams.get('ref');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [validatedReferral, setValidatedReferral] = useState<{ valid: boolean; message?: string } | null>(null);
  
  // Validate referral code on mount and check for incognito
  useEffect(() => {
    // Clear any stale auth data on signup page load
    const initializeSignup = async () => {
      try {
        await clearAllAuthData();
      } catch (e) {
        console.error('[signup] Error clearing auth data:', e);
      }
    };
    
    initializeSignup();
    
    // Check for incognito mode / private browsing
    const checkIncognito = async () => {
      try {
        // Test if we can persist data
        const testKey = 'replyguy_incognito_test';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        
        // Check if FileSystem API quota is restricted (common in incognito)
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          const { quota } = await navigator.storage.estimate();
          // In incognito, quota is often severely limited
          if (quota && quota < 120 * 1024 * 1024) { // Less than 120MB suggests incognito
            console.warn('[signup] Possible incognito mode detected - limited storage quota');
            toast(
              'You may be in private/incognito mode. This can cause issues with email confirmation. Consider using normal browsing mode.',
              { 
                duration: 8000,
                icon: '⚠️'
              }
            );
          }
        }
      } catch (err) {
        console.warn('[signup] Storage test failed - possible incognito mode');
      }
    };
    
    checkIncognito();
    
    const validateReferralCode = async () => {
      if (!referralCode) return;
      
      try {
        const response = await fetch('/api/referral/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referralCode })
        });
        
        const data = await response.json();
        setValidatedReferral(data);
        
        if (data.valid) {
          toast.success('Referral code applied! You\'ll both get bonus features.');
        } else {
          toast.error(data.message || 'Invalid referral code');
        }
      } catch (error) {
        console.error('Error validating referral code:', error);
      }
    };
    
    validateReferralCode();
  }, [referralCode]);

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const phoneNumber = value.replace(/\D/g, '');
    
    // Format as US phone number
    if (phoneNumber.length <= 3) {
      return phoneNumber;
    } else if (phoneNumber.length <= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else if (phoneNumber.length <= 10) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6)}`;
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  const convertToE164 = (phoneNumber: string) => {
    // Remove all non-digits
    const digits = phoneNumber.replace(/\D/g, '');
    
    // Assume US number if 10 digits
    if (digits.length === 10) {
      return `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    
    return null; // Invalid format
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    // Validate phone if provided
    let e164Phone = null;
    if (phone) {
      e164Phone = convertToE164(phone);
      if (!e164Phone) {
        toast.error('Please enter a valid 10-digit phone number');
        return;
      }
    }

    setIsLoading(true);

    try {
      // Use the configured app URL for email redirects
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${appUrl}/auth/callback${planId ? `?plan=${planId}` : ''}`,
          data: {
            selected_plan: planId || 'free',
            referral_code: referralCode || '',
            full_name: fullName,
            phone: e164Phone,
            sms_opt_in: smsOptIn && e164Phone ? true : false
          }
        },
      });

      if (error) {
        throw error;
      }

      if (data?.user?.identities?.length === 0) {
        toast.error('An account with this email already exists');
        return;
      }

      // In development mode, try to sign in immediately (email auto-confirmed)
      if (process.env.NODE_ENV === 'development') {
        console.log('[signup] Development mode - attempting immediate sign-in...');
        
        // Wait a moment for the account to be created
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Try to sign in
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (signInData?.session) {
          console.log('[signup] Auto sign-in successful in dev mode');
          toast.success('Account created and signed in! (Dev mode)');
          
          // Start auth flow for proper session handling
          startAuthFlow();
          // Mark as coming from signup
          sessionStorage.setItem('auth_flow_from', 'signup');
          
          // Redirect based on plan selection
          if (planId) {
            router.push(`/auth/checkout-redirect?plan=${planId}`);
          } else {
            router.push('/dashboard');
          }
          return;
        } else {
          console.log('[signup] Auto sign-in failed in dev mode:', signInError);
          // Fall through to normal email confirmation flow
        }
      }

      // Show success message for production
      setShowSuccess(true);
      toast.success('Account created successfully! Please check your email to confirm.');
    } catch (error: any) {
      console.error('Signup error:', error);
      // Clear auth data on signup failure
      await clearAllAuthData().catch(e => console.error('[signup] Error clearing auth data:', e));
      toast.error(error.message || 'Failed to sign up');
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
          {!showSuccess ? (
            <>
              <h2 className="mt-6 text-3xl font-bold text-gray-900">
                Create your account
              </h2>
              <p className="mt-2 text-gray-600">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-purple-600 hover:text-purple-500">
                  Sign in
                </Link>
              </p>
            </>
          ) : (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="mt-6 text-3xl font-bold text-gray-900">
                Check your email!
              </h2>
              <p className="mt-2 text-gray-600">
                We&apos;ve sent a confirmation link to <strong>{email}</strong>
              </p>
              <p className="mt-4 text-sm text-gray-500">
                Click the link in your email to complete your registration and start creating amazing replies!
              </p>
              <Link href="/auth/login" className="mt-6 inline-block text-purple-600 hover:text-purple-500">
                Back to login
              </Link>
            </>
          )}
        </div>

        {!showSuccess && (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Referral Badge */}
          {referralCode && validatedReferral?.valid && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm">
                <Gift className="h-4 w-4 text-purple-600" />
                <span className="font-medium text-purple-900 dark:text-purple-100">
                  Referred by a friend! You&apos;ll get 10 free replies per month when you sign up.
                </span>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                placeholder="Your full name"
              />
            </div>
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
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                placeholder="Password (min 6 characters)"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                placeholder="Confirm password"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number <span className="text-gray-500">(optional)</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={handlePhoneChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                placeholder="(555) 123-4567"
              />
              {phone && (
                <div className="mt-2">
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={smsOptIn}
                      onChange={(e) => setSmsOptIn(e.target.checked)}
                      className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-600">
                      <span className="font-medium text-gray-900">Get exclusive X growth tips!</span>
                      <br />
                      Unlock insider strategies to boost your engagement and grow your following faster. 
                      <span className="text-purple-600">2-3 texts per month, unsubscribe anytime.</span>
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={async () => {
              setIsLoading(true);
              try {
                const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
                const redirectTo = `${appUrl}/auth/callback${planId ? `?plan=${planId}` : ''}`;
                
                console.log('[X OAuth] Starting OAuth flow with:', {
                  provider: 'twitter',
                  redirectTo,
                  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
                });
                
                // Set a flag to indicate OAuth signup for better new user detection
                sessionStorage.setItem('oauth_signup', 'true');
                
                const { data, error } = await supabase.auth.signInWithOAuth({
                  provider: 'twitter',
                  options: {
                    redirectTo,
                    skipBrowserRedirect: false
                  }
                });
                
                console.log('[X OAuth] Response:', { data, error });
                
                if (error) throw error;
                
                // If we get here and there's a URL, something went wrong with the redirect
                if (data?.url) {
                  console.log('[X OAuth] Manual redirect to:', data.url);
                  window.location.href = data.url;
                }
              } catch (error: any) {
                console.error('X OAuth error:', error);
                toast.error('Failed to sign in with X');
                setIsLoading(false);
              }
            }}
            disabled={isLoading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            Sign up with X
          </Button>


          <p className="mt-4 text-xs text-center text-gray-600">
            By signing up, you agree to our{' '}
            <Link href="/terms" className="text-purple-600 hover:text-purple-500">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-purple-600 hover:text-purple-500">
              Privacy Policy
            </Link>
          </p>
        </form>
        )}
      </div>
    </div>
  );
}