'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { DashboardContent } from '@/app/components/dashboard/dashboard-content';

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Check if we came here directly from Supabase email confirmation
    // This happens when Supabase redirects to dashboard instead of callback
    const urlParams = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = urlParams.get('access_token');
    const type = urlParams.get('type');
    
    if (accessToken && type === 'signup') {
      console.log('[dashboard] Detected Supabase email confirmation redirect, redirecting to callback...');
      
      // Supabase put the session info in the URL fragment
      // Redirect to callback to properly handle it
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      callbackUrl.hash = window.location.hash;
      
      // Preserve any query params
      const plan = searchParams.get('plan');
      if (plan) callbackUrl.searchParams.set('plan', plan);
      
      window.location.href = callbackUrl.toString();
      return;
    }
    
    // Check for error params
    const error = searchParams.get('error');
    if (error === 'session_timeout') {
      toast.error('Session establishment timed out. Please try logging in again.');
    }
  }, [router, searchParams]);
  
  return <DashboardContent />;
}