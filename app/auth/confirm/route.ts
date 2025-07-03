import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

// Alternative route to handle email confirmations
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next');
  
  console.log('[auth-confirm] Email confirmation route called:', {
    token_hash: !!token_hash,
    type,
    next,
    url: request.url
  });

  if (!token_hash || !type) {
    return NextResponse.redirect(
      new URL('/auth/error?message=Invalid%20confirmation%20link', requestUrl.origin)
    );
  }

  try {
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    
    // For email confirmations, we need to exchange the token
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any
    });
    
    if (error) {
      console.error('[auth-confirm] OTP verification error:', error);
      return NextResponse.redirect(
        new URL(`/auth/error?message=${encodeURIComponent(error.message)}`, requestUrl.origin)
      );
    }
    
    // Check if we now have a session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      console.log('[auth-confirm] Session established after email confirmation:', session.user.email);
      
      // Get the user's selected plan from metadata
      const selectedPlan = session.user.user_metadata?.selected_plan;
      
      // Determine redirect URL
      let redirectTo = '/dashboard';
      if (selectedPlan && selectedPlan !== 'free') {
        redirectTo = `/auth/checkout-redirect?plan=${selectedPlan}`;
      } else if (next) {
        redirectTo = next;
      }
      
      return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
    } else {
      // No session after verification, redirect to login
      console.error('[auth-confirm] No session after email confirmation');
      return NextResponse.redirect(
        new URL('/auth/login?message=Please%20log%20in%20to%20continue', requestUrl.origin)
      );
    }
  } catch (error) {
    console.error('[auth-confirm] Unexpected error:', error);
    return NextResponse.redirect(
      new URL('/auth/error?message=Confirmation%20failed', requestUrl.origin)
    );
  }
}