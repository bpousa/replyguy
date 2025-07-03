'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message') || 'An authentication error occurred';
  const errorCode = searchParams.get('error_code');
  
  const isExpiredLink = errorCode === 'otp_expired' || message.includes('expired');
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="max-w-md w-full p-6 space-y-4">
        <div className="flex items-center gap-3 text-red-600">
          <AlertCircle className="h-6 w-6" />
          <h1 className="text-xl font-semibold">Authentication Error</h1>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400">
          {message}
        </p>
        
        {isExpiredLink && (
          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Email confirmation links expire after 24 hours. Please sign up again to receive a new confirmation email.
            </p>
          </div>
        )}
        
        <div className="flex gap-3">
          {isExpiredLink ? (
            <>
              <Button asChild className="flex-1">
                <Link href="/auth/signup">Sign Up Again</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/auth/login">Login</Link>
              </Button>
            </>
          ) : (
            <Button asChild className="w-full">
              <Link href="/auth/login">Back to Login</Link>
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}