'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/app/lib/auth';
import { Loader2 } from 'lucide-react';

export default function EmailConfirmedPage() {
  const router = useRouter();
  const supabase = createBrowserClient();

  useEffect(() => {
    const checkSession = async () => {
      console.log('[email-confirmed] Checking for session after email confirmation...');
      
      // Give Supabase a moment to establish the session
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[email-confirmed] Error getting session:', error);
        router.push('/auth/login?error=session_error');
        return;
      }
      
      if (session) {
        console.log('[email-confirmed] Session found:', session.user?.email);
        
        // Check if user selected a paid plan
        const plan = session.user?.user_metadata?.selected_plan;
        
        if (plan && plan !== 'free') {
          // Check for existing subscription
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('status', 'active')
            .maybeSingle();
          
          if (!sub) {
            router.push(`/auth/checkout-redirect?plan=${plan}`);
            return;
          }
        }
        
        router.push('/dashboard');
      } else {
        console.log('[email-confirmed] No session found, redirecting to login');
        router.push('/auth/login?error=no_session');
      }
    };
    
    checkSession();
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Email Confirmed!
        </h2>
        <p className="text-gray-600">Setting up your account...</p>
      </div>
    </div>
  );
}