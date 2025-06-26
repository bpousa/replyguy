import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const plan = requestUrl.searchParams.get('plan');
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next');
  const cookieStore = cookies();
  
  // Log for debugging
  console.log('[auth-callback] Hit with URL:', request.url);
  console.log('[auth-callback] Plan:', plan, 'Code:', !!code, 'Next:', next);
  
  // Create supabase client with proper cookie handling
  const supabase = createServerClient(cookieStore);
  
  // Exchange code for session if present
  if (code) {
    try {
      console.log('[auth-callback] Exchanging code for session...');
      const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('[auth-callback] Failed to exchange code:', error);
        return NextResponse.redirect(new URL('/auth/error?message=Invalid%20authentication%20code', requestUrl.origin));
      }
      
      if (!session) {
        console.error('[auth-callback] No session returned from code exchange');
        return NextResponse.redirect(new URL('/auth/error?message=Failed%20to%20establish%20session', requestUrl.origin));
      }
      
      console.log('[auth-callback] Code exchanged successfully for user:', session.user.email);
      
      // Verify the session is accessible
      const { data: { session: verifiedSession } } = await supabase.auth.getSession();
      if (!verifiedSession) {
        console.error('[auth-callback] Session not accessible after exchange');
        return NextResponse.redirect(new URL('/auth/error?message=Session%20verification%20failed', requestUrl.origin));
      }
      
      // Determine redirect URL based on whether a plan was selected
      let redirectUrl: URL;
      if (plan) {
        // User selected a plan, go to checkout
        redirectUrl = new URL('/auth/checkout-redirect', requestUrl.origin);
        redirectUrl.searchParams.set('plan', plan);
      } else if (next) {
        // Redirect to the 'next' URL if provided
        redirectUrl = new URL(next, requestUrl.origin);
      } else {
        // Default to confirmation page
        redirectUrl = new URL('/auth/confirm', requestUrl.origin);
      }
      
      console.log('[auth-callback] Redirecting to:', redirectUrl.toString());
      
      // Create response with explicit cookie forwarding
      const response = NextResponse.redirect(redirectUrl);
      
      // Forward all cookies from the cookie store to ensure they're set
      cookieStore.getAll().forEach((cookie) => {
        if (cookie.name.includes('sb-') || cookie.name.includes('supabase')) {
          response.cookies.set({
            name: cookie.name,
            value: cookie.value,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
          });
        }
      });
      
      return response;
    } catch (error) {
      console.error('[auth-callback] Unexpected error:', error);
      return NextResponse.redirect(new URL('/auth/error?message=Authentication%20failed', requestUrl.origin));
    }
  }
  
  // No code parameter - this shouldn't happen in normal flow
  console.error('[auth-callback] No code parameter provided');
  return NextResponse.redirect(new URL('/auth/error?message=Missing%20authentication%20code', requestUrl.origin));
}