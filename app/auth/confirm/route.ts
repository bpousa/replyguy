import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') ?? '/';

  if (!token_hash || !type) {
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/verify?error=missing_params&error_description=Invalid+confirmation+link`
    );
  }

  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);

  try {
    // Handle email confirmation
    if (type === 'email' || type === 'signup') {
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: 'email',
      });

      if (error) {
        console.error('[confirm] Email verification error:', error);
        return NextResponse.redirect(
          `${requestUrl.origin}/auth/verify?error=verification_failed&error_description=${encodeURIComponent(error.message)}`
        );
      }

      // Check if user is authenticated after verification
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // User is authenticated, redirect to next page
        return NextResponse.redirect(`${requestUrl.origin}${next}`);
      } else {
        // Verification successful but no session, redirect to login
        return NextResponse.redirect(
          `${requestUrl.origin}/auth/login?verified=true&message=Email+confirmed+successfully`
        );
      }
    }

    // Handle other confirmation types if needed
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/verify?error=unsupported_type&error_description=Unsupported+confirmation+type`
    );

  } catch (error) {
    console.error('[confirm] Unexpected error:', error);
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/verify?error=server_error&error_description=An+unexpected+error+occurred`
    );
  }
}