import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token = requestUrl.searchParams.get('token');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next');
  const plan = requestUrl.searchParams.get('plan');
  const error = requestUrl.searchParams.get('error');
  const error_description = requestUrl.searchParams.get('error_description');
  
  console.log('[auth-callback] Received callback:', {
    code: !!code,
    token: !!token,
    tokenPrefix: token?.substring(0, 20),
    type,
    next,
    plan,
    error,
    error_description,
    url: request.url
  });

  // Handle Supabase auth errors
  if (error) {
    console.error('[auth-callback] Auth error:', error, error_description);
    return NextResponse.redirect(
      new URL(`/auth/error?message=${encodeURIComponent(error_description || error)}`, requestUrl.origin)
    );
  }

  // Check if we have either code or token
  if (!code && !token) {
    console.error('[auth-callback] No code or token parameter provided');
    return NextResponse.redirect(
      new URL('/auth/error?message=Missing%20authentication%20parameters', requestUrl.origin)
    );
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
    } else if (token && type === 'signup') {
      // PKCE token verification flow (from email verification)
      console.log('[auth-callback] Handling PKCE token verification...');
      
      // For PKCE flow, the token verification happens automatically when Supabase redirects
      // We need to check if a session already exists
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      
      if (existingSession) {
        console.log('[auth-callback] Found existing session from PKCE verification');
        session = existingSession;
        user = existingSession.user;
      } else {
        // Try to refresh to get the session
        console.log('[auth-callback] No immediate session, trying refresh...');
        const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
        
        if (refreshedSession) {
          session = refreshedSession;
          user = refreshedSession.user;
        } else {
          // As a last resort, redirect to auth loading page to give more time
          console.log('[auth-callback] No session found, redirecting to auth loading...');
          const redirectUrl = new URL('/auth/loading', requestUrl.origin);
          if (plan) redirectUrl.searchParams.set('plan', plan);
          if (next) redirectUrl.searchParams.set('next', next);
          return NextResponse.redirect(redirectUrl);
        }
      }
    }
    
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