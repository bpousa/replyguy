import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  
  // Handle both token (email links) and code (OAuth)
  const verifier = url.searchParams.get('token') || url.searchParams.get('code');
  const type = url.searchParams.get('type'); // signup | magiclink | recovery
  const plan = url.searchParams.get('plan');
  const next = url.searchParams.get('next');
  const error = url.searchParams.get('error');
  const error_description = url.searchParams.get('error_description');
  
  console.log('[auth-callback] Received callback:', {
    hasVerifier: !!verifier,
    type,
    plan,
    next,
    error,
    url: request.url,
    timestamp: new Date().toISOString()
  });

  // Handle Supabase auth errors
  if (error) {
    console.error('[auth-callback] Auth error:', error, error_description);
    return NextResponse.redirect(
      new URL(`/auth/error?message=${encodeURIComponent(error_description || error)}`, url.origin),
      { status: 302 }
    );
  }

  // Guard against missing verifier
  if (!verifier) {
    console.error('[auth-callback] No verifier (token/code) provided');
    // If no verifier, might be a direct navigation - redirect to login
    return NextResponse.redirect(
      new URL('/auth/login?error=missing_verifier', url.origin), 
      { status: 302 }
    );
  }

  try {
    // Use centralized auth client to ensure consistent cookie configuration
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    
    // Exchange the verifier for session (this mutates cookies)
    console.log('[auth-callback] Exchanging verifier for session...');
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(verifier);
    
    if (exchangeError) {
      console.error('[auth-callback] Exchange failed:', exchangeError.message);
      return NextResponse.redirect(
        new URL(`/auth/error?message=${encodeURIComponent(exchangeError.message)}`, url.origin),
        { status: 302 }
      );
    }
    
    const session = data?.session;
    const user = data?.user;
    
    if (!session) {
      console.error('[auth-callback] No session created after exchange');
      return NextResponse.redirect(
        new URL('/auth/error?message=No%20session%20created', url.origin),
        { status: 302 }
      );
    }
    
    console.log('[auth-callback] OAuth session established successfully:', {
      userId: session.user.id,
      email: session.user.email,
      provider: session.user.app_metadata?.provider,
      expiresAt: session.expires_at
    });
    
    // Log cookie configuration for OAuth debugging
    if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_AUTH_DEBUG === 'true') {
      const allCookies = cookieStore.getAll();
      const authCookies = allCookies.filter(c => c.name.includes('sb-') || c.name.includes('supabase'));
      console.log('[auth-callback] OAuth auth cookies set:', authCookies.length);
      console.log('[auth-callback] Using centralized auth configuration for OAuth cookies');
      
      // Log specific auth cookies for OAuth debugging
      authCookies.forEach(cookie => {
        console.log(`[auth-callback] OAuth cookie ${cookie.name}: ${cookie.value.length} bytes`);
      });
    }
    
    // Verify session is accessible
    const { data: { session: verifySession } } = await supabase.auth.getSession();
    
    if (!verifySession) {
      console.error('[auth-callback] Session verification failed - session not persisted');
      // Still proceed as cookies might need a moment to propagate
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
    } else if (session.user.user_metadata?.selected_plan && session.user.user_metadata.selected_plan !== 'free') {
      // Check metadata for paid plan even without user object
      redirectTo = `/auth/checkout-redirect?plan=${session.user.user_metadata.selected_plan}`;
    }
    
    console.log('[auth-callback] Redirecting to:', redirectTo);
    
    // Use establishing-session as an intermediate step
    const establishingUrl = new URL('/auth/establishing-session', url.origin);
    if (plan) establishingUrl.searchParams.set('plan', plan);
    if (next) establishingUrl.searchParams.set('next', next);
    
    console.log('[auth-callback] Intermediate redirect to establishing-session:', {
      url: establishingUrl.toString(),
      plan,
      next,
      finalDestination: redirectTo
    });
    
    // Use 302 redirect to ensure Set-Cookie headers are preserved
    return NextResponse.redirect(establishingUrl, { status: 302 });
    
  } catch (error) {
    console.error('[auth-callback] Unexpected error:', error);
    return NextResponse.redirect(
      new URL('/auth/error?message=Authentication%20failed', url.origin),
      { status: 302 }
    );
  }
}