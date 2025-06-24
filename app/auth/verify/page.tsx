'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/app/lib/auth';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function VerifyPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleVerification = async () => {
      try {
        // Check if we have a session from the magic link
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }
        
        if (session) {
          // Session exists, redirect to dashboard
          toast.success('Successfully signed in!');
          router.push('/dashboard');
        } else {
          // No session, might need to exchange token
          const params = new URLSearchParams(window.location.search);
          const error = params.get('error');
          const errorDescription = params.get('error_description');
          
          if (error) {
            throw new Error(errorDescription || error);
          }
          
          // If no session and no error, redirect to login
          toast.error('Verification failed. Please try again.');
          router.push('/auth/login');
        }
      } catch (err: any) {
        console.error('Verification error:', err);
        setError(err.message || 'Verification failed');
        toast.error(err.message || 'Verification failed');
        
        // Redirect to login after showing error
        setTimeout(() => {
          router.push('/auth/login');
        }, 2000);
      }
    };

    handleVerification();
  }, [router, supabase]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
        <p className="text-gray-600">Verifying your magic link...</p>
      </div>
    </div>
  );
}