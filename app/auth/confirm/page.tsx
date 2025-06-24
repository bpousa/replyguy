'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/app/lib/auth';
import { Loader2 } from 'lucide-react';

export default function ConfirmPage() {
  const router = useRouter();
  const supabase = createBrowserClient();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      // Get the hash from the URL
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const access_token = hashParams.get('access_token');
      const refresh_token = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      if (access_token && refresh_token) {
        try {
          // Set the session with the tokens
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (!error) {
            // Session set successfully
            console.log('Email confirmed successfully');
            
            // Small delay to ensure session is fully established
            setTimeout(() => {
              router.push('/dashboard');
            }, 100);
          } else {
            console.error('Error setting session:', error);
            router.push('/auth/login?error=confirmation_failed');
          }
        } catch (error) {
          console.error('Confirmation error:', error);
          router.push('/auth/login?error=confirmation_failed');
        }
      } else {
        // No tokens in URL, redirect to login
        router.push('/auth/login');
      }
    };

    handleEmailConfirmation();
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
        <p className="text-gray-600">Confirming your email...</p>
      </div>
    </div>
  );
}