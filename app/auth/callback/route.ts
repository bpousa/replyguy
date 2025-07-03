import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token = requestUrl.searchParams.get('token');
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') || 'signup'; // Default to signup if not specified
  const next = requestUrl.searchParams.get('next');
  const plan = requestUrl.searchParams.get('plan');
  const error = requestUrl.searchParams.get('error');
  const error_description = requestUrl.searchParams.get('error_description');
  
  // Also check for hash fragments (Supabase might use hash-based redirects)
  const hashFragment = requestUrl.hash;
  
  console.log('[auth-callback] Received callback:', {
    code: !!code,
    token: !!token,
    token_hash: !!token_hash,
    tokenPrefix: token?.substring(0, 20),
    type,
    next,
    plan,
    error,
    error_description,
    url: request.url,
    hashFragment,
    headers: Object.fromEntries(request.headers.entries())
  });

  // Handle Supabase auth errors
  if (error) {
    console.error('[auth-callback] Auth error:', error, error_description);
    
    // Special handling for email confirmation errors
    if (error === 'server_error' && error_description?.includes('Error confirming user')) {
      console.error('[auth-callback] Email confirmation failed - likely due to expired or invalid token');
      return NextResponse.redirect(
        new URL(`/auth/login?error=confirmation_failed&message=${encodeURIComponent('Email confirmation failed. Please try signing up again or contact support.')}`, requestUrl.origin)
      );
    }
    
    return NextResponse.redirect(
      new URL(`/auth/error?message=${encodeURIComponent(error_description || error)}`, requestUrl.origin)
    );
  }

  // Handle Supabase post-email-verification redirects
  // When Supabase verifies an email, it might redirect back with different parameters
  // or the session might already be established
  if (!code && !token && !token_hash) {
    console.log('[auth-callback] No auth parameters found, checking for existing session...');
    console.log('[auth-callback] Full URL:', request.url);
    console.log('[auth-callback] Referrer:', request.headers.get('referer'));
    
    // Special handling: If we have error=access_denied, it means the token was invalid
    if (error === 'access_denied') {
      console.error('[auth-callback] Access denied - token likely expired or invalid');
      return NextResponse.redirect(
        new URL(`/auth/login?error=verification_expired&message=${encodeURIComponent('Your confirmation link has expired. Please sign up again.')}`, requestUrl.origin)
      );
    }
    
    // Check for hash fragment parameters (Supabase might pass session info there)
    const hashParams = requestUrl.hash ? new URLSearchParams(requestUrl.hash.substring(1)) : null;
    console.log('[auth-callback] Hash fragment:', requestUrl.hash);
    console.log('[auth-callback] Referrer:', request.headers.get('referer'));
    
    try {
      const cookieStore = cookies();
      const supabase = createServerClient(cookieStore);
      
      // Log all cookies to debug
      console.log('[auth-callback] Available cookies:', cookieStore.getAll().map(c => c.name));
      
      // Check if we have a session (this happens after email verification)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[auth-callback] Error getting session:', sessionError);
      }
      
      // Also try to get user to see if there's partial data
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('[auth-callback] User check:', { user: !!user, userError });
      
      if (session && session.user) {
        console.log('[auth-callback] Found existing session after email verification:', session.user.email);
        
        // CRITICAL: Wait for cookies to fully propagate before redirecting
        // This prevents race conditions where dashboard loads before cookies are set
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verify session is still accessible after delay
        const { data: { session: verifiedSession } } = await supabase.auth.getSession();
        
        if (!verifiedSession) {
          console.error('[auth-callback] Session lost after delay, redirecting to verify page');
          const verifyUrl = new URL('/auth/verify', requestUrl.origin);
          verifyUrl.searchParams.set('from', 'session-lost');
          if (plan) verifyUrl.searchParams.set('plan', plan);
          return NextResponse.redirect(verifyUrl);
        }
        
        // Session exists! This is likely from email verification
        // Determine where to redirect
        let redirectTo = '/dashboard';
        
        if (plan && plan !== 'free') {
          redirectTo = `/auth/checkout-redirect?plan=${plan}`;
        } else if (next) {
          redirectTo = next;
        } else if (session.user.user_metadata?.selected_plan && session.user.user_metadata.selected_plan !== 'free') {
          redirectTo = `/auth/checkout-redirect?plan=${session.user.user_metadata.selected_plan}`;
        }
        
        // Add a session marker to indicate successful auth
        const response = NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
        response.cookies.set('auth_flow_complete', 'true', {
          maxAge: 60, // 1 minute
          httpOnly: false,
          sameSite: 'lax',
          path: '/'
        });
        
        console.log('[auth-callback] Redirecting authenticated user to:', redirectTo);
        return response;
      }
      
      // No session found - redirect to establishing-session page
      console.log('[auth-callback] No session found, redirecting to establishing-session page...');
      const establishUrl = new URL('/auth/establishing-session', requestUrl.origin);
      if (plan) establishUrl.searchParams.set('plan', plan);
      if (next) establishUrl.searchParams.set('next', next);
      establishUrl.searchParams.set('from', 'email-callback');
      
      return NextResponse.redirect(establishUrl);
    } catch (error) {
      console.error('[auth-callback] Error checking session:', error);
      // Fall back to verify page
      const verifyUrl = new URL('/auth/verify', requestUrl.origin);
      if (plan) verifyUrl.searchParams.set('plan', plan);
      if (next) verifyUrl.searchParams.set('next', next);
      return NextResponse.redirect(verifyUrl);
    }
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
    } else if (token || token_hash) {
      // PKCE token verification must happen client-side
      // Handle all token types, not just signup
      const actualToken = token || token_hash;
      console.log('[auth-callback] PKCE token detected, redirecting to client-side handler...', { 
        tokenPrefix: actualToken?.substring(0, 20), 
        type,
        plan 
      });
      
      // Redirect to establishing-session page to handle PKCE tokens
      const establishUrl = new URL('/auth/establishing-session', requestUrl.origin);
      establishUrl.searchParams.set('from', 'pkce-token');
      if (plan) establishUrl.searchParams.set('plan', plan);
      if (next) establishUrl.searchParams.set('next', next);
      
      // The establishing-session page will handle the PKCE token verification
      return NextResponse.redirect(establishUrl);
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
    // Let's verify it's accessible with multiple retries
    const { data: { session: verifySession } } = await supabase.auth.getSession();
    
    if (!verifySession) {
      console.error('[auth-callback] Session verification failed - session not persisted');
      
      // Try multiple times with delays to ensure cookies propagate
      let sessionFound = false;
      for (let i = 0; i < 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        const { data: { session: retrySession } } = await supabase.auth.getSession();
        
        if (retrySession) {
          console.log('[auth-callback] Session verified on retry', i + 1);
          sessionFound = true;
          session = retrySession;
          break;
        }
      }
      
      if (!sessionFound) {
        console.error('[auth-callback] Session still not available after all retries');
        // Redirect to verify page to continue waiting
        const verifyUrl = new URL('/auth/verify', requestUrl.origin);
        verifyUrl.searchParams.set('from', 'session-not-persisted');
        if (plan) verifyUrl.searchParams.set('plan', plan);
        return NextResponse.redirect(verifyUrl);
      }
    } else {
      console.log('[auth-callback] Session verified successfully');
    }
    
    // Determine where to redirect
    let redirectTo = '/dashboard'; // Default destination
    
    if (plan && plan !== 'free') {
      // User selected a paid plan during signup
      redirectTo = `/auth/checkout-redirect?plan=${plan}`;
    } else if (next) {
      // Explicit next destination
      redirectTo = next;
    } else if (user?.user_metadata?.selected_plan && user.user_metadata.selected_plan !== 'free') {
      // Paid plan was stored in user metadata during signup
      redirectTo = `/auth/checkout-redirect?plan=${user.user_metadata.selected_plan}`;
    }
    // Free plans go straight to dashboard
    
    console.log('[auth-callback] Redirecting to:', redirectTo);
    
    // Create redirect response with auth flow marker
    const response = NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
    response.cookies.set('auth_flow_complete', 'true', {
      maxAge: 60, // 1 minute
      httpOnly: false,
      sameSite: 'lax',
      path: '/'
    });
    
    return response;
    
  } catch (error) {
    console.error('[auth-callback] Unexpected error:', error);
    return NextResponse.redirect(
      new URL('/auth/error?message=Authentication%20failed', requestUrl.origin)
    );
  }
}