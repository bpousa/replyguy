import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token = requestUrl.searchParams.get('token');
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
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
  // When Supabase verifies an email, it redirects back without any auth parameters
  // but the session should already be established
  if (!code && !token && !token_hash) {
    console.log('[auth-callback] No auth parameters found, checking for existing session...');
    
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
      
      if (session && session.user) {
        console.log('[auth-callback] Found existing session after email verification:', session.user.email);
        
        // Session exists! This is likely from email verification
        // Determine where to redirect
        let redirectTo = '/dashboard';
        
        if (plan) {
          redirectTo = `/auth/checkout-redirect?plan=${plan}`;
        } else if (next) {
          redirectTo = next;
        } else if (session.user.user_metadata?.selected_plan) {
          redirectTo = `/auth/checkout-redirect?plan=${session.user.user_metadata.selected_plan}`;
        }
        
        console.log('[auth-callback] Redirecting authenticated user to:', redirectTo);
        return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
      }
      
      // No session found - redirect to verify page to wait for session establishment
      console.log('[auth-callback] No session found, redirecting to verify page...');
      const verifyUrl = new URL('/auth/verify', requestUrl.origin);
      if (plan) verifyUrl.searchParams.set('plan', plan);
      if (next) verifyUrl.searchParams.set('next', next);
      
      // Add a marker to indicate this is from email verification
      verifyUrl.searchParams.set('from', 'email-callback');
      
      return NextResponse.redirect(verifyUrl);
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
      
      // Build the verification URL with all necessary parameters
      const verifyUrl = new URL('/auth/verify', requestUrl.origin);
      if (actualToken) verifyUrl.searchParams.set('token', actualToken);
      if (type) verifyUrl.searchParams.set('type', type);
      if (plan) verifyUrl.searchParams.set('plan', plan);
      if (next) verifyUrl.searchParams.set('next', next);
      
      // Redirect to client-side verification page
      return NextResponse.redirect(verifyUrl);
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