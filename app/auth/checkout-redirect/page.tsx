'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/contexts/auth-context';
import { toast } from 'react-hot-toast';
import { Loader2, CheckCircle, CreditCard } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

export default function CheckoutRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get('plan');
  const { user, status, refreshSession } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const planNames: Record<string, string> = {
    'growth': 'X Basic',
    'professional': 'X Pro',
    'enterprise': 'X Business'
  };

  // Log how user arrived at this page
  useEffect(() => {
    console.log('[checkout-redirect] Page loaded:', {
      planId,
      authStatus: status,
      referrer: document.referrer
    });

    // Guard: If no plan is specified, redirect to pricing
    if (!planId) {
      console.log('[checkout-redirect] No plan specified, redirecting to pricing');
      router.push('/pricing');
      return;
    }

    // Special handling for free plan - no checkout needed
    if (planId === 'free') {
      console.log('[checkout-redirect] Free plan selected, redirecting to dashboard');
      router.push('/dashboard');
      return;
    }

    // Guard: Check if user came from a valid auth flow
    // If referrer is empty and no session, they likely navigated directly
    if (status === 'unauthenticated' && !document.referrer && !sessionStorage.getItem('auth_flow_active')) {
      console.log('[checkout-redirect] Direct navigation detected without auth, redirecting to signup');
      router.push(`/auth/signup?plan=${planId}`);
      return;
    }
  }, [planId, status, router]);

  useEffect(() => {
    // Skip auth checks if free plan (handled above)
    if (planId === 'free') return;
    
    let timeoutId: NodeJS.Timeout;
    let retryCount = 0;
    const maxRetries = 10; // Increased retries for PKCE flow
    let hasRedirected = false;
    let isMounted = true;
    
    const checkAuthWithRetry = async () => {
      // Check if component is still mounted
      if (!isMounted) return;
      // Prevent multiple redirects
      if (hasRedirected) return;
      
      // If authenticated, no need to continue
      if (status === 'authenticated' && user) {
        console.log('[checkout-redirect] Authenticated! User:', user.email);
        return;
      }
      
      // If still loading, wait
      if (status === 'loading') {
        console.log('[checkout-redirect] Auth still loading, waiting...');
        timeoutId = setTimeout(checkAuthWithRetry, 500);
        return;
      }
      
      // If unauthenticated, try to refresh session
      if (status === 'unauthenticated' && retryCount < maxRetries) {
        retryCount++;
        console.log(`[checkout-redirect] Attempt ${retryCount}/${maxRetries}: Trying to refresh session...`);
        
        try {
          await refreshSession();
          // Wait a bit for the session to propagate
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          console.log('[checkout-redirect] Refresh attempt completed, scheduling next check');
        } catch (error) {
          console.error('[checkout-redirect] Session refresh failed:', error);
        }
        
        // Schedule next retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(1.5, retryCount), 5000);
        timeoutId = setTimeout(checkAuthWithRetry, delay);
      } else if (status === 'unauthenticated' && retryCount >= maxRetries) {
        // Final timeout - redirect to login
        hasRedirected = true;
        console.log('[checkout-redirect] No auth after all retries, redirecting to login');
        router.push('/auth/login?error=session_required&from=checkout');
      }
    };
    
    // Start checking after initial delay to allow session establishment
    timeoutId = setTimeout(checkAuthWithRetry, 3000); // Increased initial delay
    
    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [status, user, router, refreshSession, planId]);

  const proceedToCheckout = async () => {
    if (!planId || !user) return;

    setIsRedirecting(true);
    console.log('[checkout-redirect] Starting checkout for plan:', planId);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Ensure cookies are sent
        body: JSON.stringify({
          planId,
          billingCycle: 'monthly',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[checkout-redirect] Checkout failed:', response.status, data);
        
        // If we get a 401, try refreshing the session once
        if (response.status === 401) {
          console.log('[checkout-redirect] Got 401, refreshing session...');
          await refreshSession();
          
          // Retry the request after refresh
          const retryResponse = await fetch('/api/stripe/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              planId,
              billingCycle: 'monthly',
            }),
          });
          
          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            console.log('[checkout-redirect] Retry successful, redirecting to Stripe');
            window.location.href = retryData.url;
            return;
          }
          
          const retryError = await retryResponse.json();
          throw new Error(retryError.error || 'Authentication failed after refresh');
        }
        
        throw new Error(data.error || 'Failed to create checkout session');
      }
      
      console.log('[checkout-redirect] Checkout successful, redirecting to Stripe');
      // Redirect to Stripe checkout
      window.location.href = data.url;
    } catch (error) {
      console.error('[checkout-redirect] Checkout error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start checkout');
      setIsRedirecting(false);
    }
  };

  // Show loading state while auth is being determined
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Verifying your session...</p>
        </div>
      </div>
    );
  }

  // Wait for authentication
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Establishing session...</p>
          <p className="text-sm text-gray-500 mt-2">This may take a few seconds after email verification.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Email Verified!
          </h2>
          <p className="text-gray-600 mb-8">
            Welcome to ReplyGuy, {user?.email}
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <CreditCard className="w-8 h-8 text-purple-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            Complete Your {planNames[planId || ''] || 'Selected'} Plan Setup
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            You&apos;re one step away from unlocking powerful AI-powered reply generation.
          </p>
          <ul className="text-left text-sm text-gray-600 mb-6 space-y-2">
            <li>✓ Secure payment via Stripe</li>
            <li>✓ Cancel anytime</li>
            <li>✓ 7-day free trial included</li>
          </ul>
          
          <Button 
            className="w-full"
            size="lg"
            onClick={proceedToCheckout}
            disabled={isRedirecting}
          >
            {isRedirecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting to payment...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Continue to Secure Checkout
              </>
            )}
          </Button>
        </div>

        <div className="text-sm text-gray-500">
          <p>Changed your mind?</p>
          <Button
            variant="link"
            onClick={() => router.push('/dashboard')}
            className="text-purple-600 hover:text-purple-500"
          >
            Skip for now and explore free features
          </Button>
        </div>
      </div>
    </div>
  );
}