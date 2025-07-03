import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next');
  const plan = requestUrl.searchParams.get('plan');
  const error = requestUrl.searchParams.get('error');
  const error_description = requestUrl.searchParams.get('error_description');
  
  console.log('[auth-callback] Received callback:', {
    code: !!code,
    plan,
    error,
    url: request.url
  });

  // Handle Supabase auth errors
  if (error) {
    console.error('[auth-callback] Auth error:', error, error_description);
    return NextResponse.redirect(
      new URL(`/auth/error?message=${encodeURIComponent(error_description || error)}`, requestUrl.origin)
    );
  }

  // If no code, redirect to dashboard to handle the session
  if (!code) {
    console.log('[auth-callback] No code, redirecting to dashboard...');
    // Supabase might have already set the session cookies
    // Dashboard will handle session checking
    return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
  }

  try {
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    
    let session;
    let user;
    
    if (code) {
      // Standard OAuth code exchange flow
      console.log('[auth-callback] Exchanging code for session...');
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (exchangeError) {
        console.error('[auth-callback] Exchange error:', exchangeError);
        return NextResponse.redirect(
          new URL(`/auth/error?message=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
        );
      }
      
      session = data.session;
      user = data.user;
    
    if (!session) {
      console.error('[auth-callback] No session created or found');
      return NextResponse.redirect(
        new URL('/auth/error?message=No%20session%20created', requestUrl.origin)
      );
    }
    
    console.log('[auth-callback] Session established successfully:', {
      userId: session.user.id,
      email: session.user.email,
      expiresAt: session.expires_at
    });
    
    // The session should now be automatically stored in cookies by Supabase
    // Let's verify it's accessible
    const { data: { session: verifySession } } = await supabase.auth.getSession();
    
    if (!verifySession) {
      console.error('[auth-callback] Session verification failed - session not persisted');
      // In production, add a small delay to ensure cookies propagate
      if (process.env.NODE_ENV === 'production') {
        await new Promise(resolve => setTimeout(resolve, 500));
        // Try once more
        const { data: { session: retrySession } } = await supabase.auth.getSession();
        if (retrySession) {
          console.log('[auth-callback] Session verified on retry');
        } else {
          console.error('[auth-callback] Session still not available after retry');
        }
      }
    } else {
      console.log('[auth-callback] Session verified successfully');
    }
    
    // Determine where to redirect
    let redirectTo = '/dashboard'; // Default destination
    
    if (plan) {
      // User selected a plan during signup
      redirectTo = `/auth/checkout-redirect?plan=${plan}`;
    } else if (next) {
      // Explicit next destination
      redirectTo = next;
    } else if (user?.user_metadata?.selected_plan) {
      // Plan was stored in user metadata during signup
      redirectTo = `/auth/checkout-redirect?plan=${user.user_metadata.selected_plan}`;
    } else if (session.user.user_metadata?.selected_plan && session.user.user_metadata.selected_plan !== 'free') {
      // Check metadata for plan even without user object
      redirectTo = `/auth/checkout-redirect?plan=${session.user.user_metadata.selected_plan}`;
    }
    
    console.log('[auth-callback] Redirecting to:', redirectTo);
    
    // Create redirect response - let Supabase handle cookie setting
    return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
    
  } catch (error) {
    console.error('[auth-callback] Unexpected error:', error);
    return NextResponse.redirect(
      new URL('/auth/error?message=Authentication%20failed', requestUrl.origin)
    );
  }
}