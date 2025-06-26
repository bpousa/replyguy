'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/app/lib/auth';
import { toast } from 'react-hot-toast';
import { Loader2, CheckCircle, CreditCard } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

export default function CheckoutRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get('plan');
  const supabase = createBrowserClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [user, setUser] = useState<any>(null);

  const planNames: Record<string, string> = {
    'growth': 'X Basic',
    'professional': 'X Pro',
    'enterprise': 'X Business'
  };

  useEffect(() => {
    checkAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
      return;
    }
    setUser(user);
    setIsLoading(false);
  };

  const proceedToCheckout = async () => {
    if (!planId || !user) return;

    setIsRedirecting(true);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          billingCycle: 'monthly',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      
      // Redirect to Stripe checkout
      window.location.href = url;
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start checkout');
      setIsRedirecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
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