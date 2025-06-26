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

  if (!code) {
    console.error('[auth-callback] No code parameter provided');
    return NextResponse.redirect(
      new URL('/auth/error?message=Missing%20authentication%20code', requestUrl.origin)
    );
  }

  try {
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    
    // Exchange the code for a session
    console.log('[auth-callback] Exchanging code for session...');
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (exchangeError) {
      console.error('[auth-callback] Exchange error:', exchangeError);
      return NextResponse.redirect(
        new URL(`/auth/error?message=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
      );
    }
    
    if (!data.session) {
      console.error('[auth-callback] No session in exchange response');
      return NextResponse.redirect(
        new URL('/auth/error?message=No%20session%20created', requestUrl.origin)
      );
    }
    
    console.log('[auth-callback] Session created successfully:', {
      userId: data.session.user.id,
      email: data.session.user.email,
      expiresAt: data.session.expires_at
    });
    
    // The session should now be automatically stored in cookies by Supabase
    // Let's verify it's accessible
    const { data: { session: verifySession } } = await supabase.auth.getSession();
    
    if (!verifySession) {
      console.error('[auth-callback] Session verification failed - session not persisted');
      // Don't fail here, continue with redirect as cookies might propagate
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
    } else if (data.session.user.user_metadata?.selected_plan) {
      // Plan was stored in user metadata during signup
      redirectTo = `/auth/checkout-redirect?plan=${data.session.user.user_metadata.selected_plan}`;
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