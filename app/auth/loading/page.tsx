'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/app/lib/auth';
import { Loader2 } from 'lucide-react';

// This page gives Supabase time to establish the session after magic link
export default function AuthLoadingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get('plan');
  const supabase = createBrowserClient();

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 10;
    
    const checkSession = async () => {
      attempts++;
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Session found
        if (planId && planId !== 'free') {
          // User selected a paid plan, redirect to checkout confirmation page
          router.push(`/auth/checkout-redirect?plan=${planId}`);
        } else {
          // No plan selected or free plan, go to dashboard
          router.push('/dashboard');
        }
      } else if (attempts >= maxAttempts) {
        // No session after multiple attempts
        router.push('/auth/login?error=session_not_found');
      } else {
        // Try again after a short delay
        setTimeout(checkSession, 500);
      }
    };
    
    // Start checking after a short delay
    setTimeout(checkSession, 1000);
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
        <p className="text-gray-600">Completing sign in...</p>
        <p className="text-sm text-gray-500 mt-2">Please wait a moment</p>
      </div>
    </div>
  );
}