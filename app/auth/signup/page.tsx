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
  const [showSuccess, setShowSuccess] = useState(false);
  const [validatedReferral, setValidatedReferral] = useState<{ valid: boolean; message?: string } | null>(null);
  
  // Validate referral code on mount
  useEffect(() => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify${planId ? `?plan=${planId}` : ''}`,
          data: {
            selected_plan: planId || 'free',
            referral_code: referralCode || ''
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
                  Referred by a friend! You&apos;ll get bonus features when you sign up.
                </span>
              </div>
            </div>
          )}
          
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