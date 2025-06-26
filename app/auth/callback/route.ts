import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const plan = requestUrl.searchParams.get('plan');
  const code = requestUrl.searchParams.get('code');
  const cookieStore = cookies();
  
  // Log for debugging
  console.log('Auth callback hit with URL:', request.url);
  console.log('Search params:', requestUrl.searchParams.toString());
  console.log('Plan selected:', plan);
  console.log('Code present:', !!code);
  
  // After Supabase processes the magic link, it redirects here
  // Let's ensure the session is properly established
  const supabase = createServerClient(cookieStore);
  
  // If we have a code, exchange it for a session
  if (code) {
    try {
      const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);
      if (session) {
        console.log('Code exchanged successfully, user:', session.user.email);
      } else if (error) {
        console.error('Failed to exchange code:', error);
      }
    } catch (error) {
      console.error('Error exchanging code:', error);
    }
  }
  
  // Try to get the session to ensure cookies are properly set
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (session) {
    console.log('Session verified in callback, user:', session.user.email);
  } else {
    console.log('No session found in callback, attempting refresh...');
    // Try to refresh the session
    const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
    if (refreshedSession) {
      console.log('Session refreshed successfully, user:', refreshedSession.user.email);
    }
  }
  
  // Redirect to loading page with plan parameter if present
  const loadingUrl = new URL('/auth/loading', requestUrl.origin);
  if (plan) {
    loadingUrl.searchParams.set('plan', plan);
  }
  
  return NextResponse.redirect(loadingUrl);
}