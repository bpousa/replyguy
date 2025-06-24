import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

// Create a Supabase client for the route handler
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  if (code) {
    try {
      // Exchange the code for a session
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (!error) {
        // Redirect to the dashboard or next URL
        return NextResponse.redirect(new URL(next, requestUrl.origin));
      }
    } catch (error) {
      console.error('Auth callback error:', error);
    }
  }

  // Handle hash-based tokens (email confirmation)
  // Since hash fragments aren't sent to the server, we need to handle this client-side
  // Redirect to a client-side handler page
  return NextResponse.redirect(new URL('/auth/confirm', requestUrl.origin));
}