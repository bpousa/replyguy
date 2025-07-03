import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get('token_hash');
  const token = requestUrl.searchParams.get('token');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next');
  
  // Use whichever token parameter is provided
  const verificationToken = token || token_hash;
  
  console.log('[auth-confirm] Direct confirmation handler called:', {
    hasToken: !!verificationToken,
    tokenPrefix: verificationToken?.substring(0, 20),
    type,
    next
  });

  if (!verificationToken) {
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/error?message=Invalid+confirmation+link`
    );
  }

  try {
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    
    // For PKCE tokens, we need to handle this client-side
    if (verificationToken.startsWith('pkce_')) {
      console.log('[auth-confirm] PKCE token detected, redirecting to client-side handler');
      const verifyUrl = new URL('/auth/verify', requestUrl.origin);
      verifyUrl.searchParams.set('token', verificationToken);
      verifyUrl.searchParams.set('type', type || 'signup');
      if (next) verifyUrl.searchParams.set('next', next);
      
      // Mark this as coming from direct email link
      verifyUrl.searchParams.set('from', 'email-direct');
      
      return NextResponse.redirect(verifyUrl);
    }
    
    // For non-PKCE tokens, try to verify directly
    console.log('[auth-confirm] Attempting direct token verification');
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: verificationToken,
      type: type as 'signup' | 'recovery' | 'invite'
    });
    
    if (error) {
      console.error('[auth-confirm] Verification error:', error);
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/error?message=${encodeURIComponent(error.message)}`
      );
    }
    
    if (data.session) {
      console.log('[auth-confirm] Verification successful, session created');
      // Session created, redirect to dashboard or checkout
      const redirectTo = next || '/dashboard';
      return NextResponse.redirect(`${requestUrl.origin}${redirectTo}`);
    }
    
    // Verification successful but no session, redirect to login
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/login?message=Email+confirmed+successfully`
    );
    
  } catch (error) {
    console.error('[auth-confirm] Unexpected error:', error);
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/error?message=Confirmation+failed`
    );
  }
}