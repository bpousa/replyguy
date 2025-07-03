import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Log middleware hit for debugging with more details
  console.log(`[middleware] Hit for path: ${pathname}`);
  console.log(`[middleware] Full URL: ${request.url}`);
  console.log(`[middleware] Referrer: ${request.headers.get('referer')}`);
  
  // Check for auth cookie on API routes (except auth-related ones)
  if (pathname.startsWith('/api/') && 
      !pathname.startsWith('/api/auth/') && 
      !pathname.startsWith('/api/stripe/webhook') &&
      !pathname.startsWith('/api/health')) {
    
    // Look for Supabase auth cookie - be more flexible with cookie names
    const cookies = request.cookies;
    const allCookies = cookies.getAll();
    
    // Log all cookies for debugging
    console.log(`[middleware] Checking auth for ${pathname}, cookies:`, allCookies.map(c => c.name));
    
    // Check if this is an internal API call
    // 1. Has x-forwarded headers from within our app
    // 2. Has cookie header passed from another API route (process -> meme)
    // 3. Specific internal routes that should bypass auth when called internally
    const isInternalCall = request.headers.get('x-forwarded-for') === '::1' || 
                          request.headers.get('x-forwarded-for')?.includes('127.0.0.1') ||
                          request.headers.get('x-forwarded-for')?.includes('::ffff:127.0.0.1') ||
                          // Allow meme API when called with cookies from process API
                          (pathname === '/api/meme' && request.headers.get('cookie'));
    
    // Check cookies from the request object first
    let hasAuthCookie = allCookies.some(cookie => {
      // Supabase cookie patterns: sb-<project-ref>-auth-token
      // In this case: sb-aaplsgskmoeyvvedjzxp-auth-token
      const isAuthCookie = cookie.name.includes('sb-') && cookie.name.includes('-auth-token');
      if (isAuthCookie) {
        console.log(`[middleware] Found auth cookie: ${cookie.name}`);
      }
      return isAuthCookie;
    });
    
    // If no auth cookie found in parsed cookies, check the cookie header string
    // This handles internal API calls where cookies are forwarded as a header
    if (!hasAuthCookie && request.headers.get('cookie')) {
      const cookieHeader = request.headers.get('cookie') || '';
      hasAuthCookie = cookieHeader.includes('sb-') && cookieHeader.includes('-auth-token');
      if (hasAuthCookie) {
        console.log(`[middleware] Found auth cookie in header string for ${pathname}`);
      }
    }
    
    if (!hasAuthCookie && !isInternalCall) {
      console.log(`[middleware] No auth cookie for API route: ${pathname}`);
      console.log(`[middleware] Available cookies:`, allCookies.map(c => c.name).join(', '));
      console.log(`[middleware] Cookie header present:`, !!request.headers.get('cookie'));
      console.log(`[middleware] Is internal call check:`, isInternalCall);
      return NextResponse.json(
        { error: 'Unauthenticated', message: 'Please sign in to access this resource' },
        { status: 401 }
      );
    }
    
    if (isInternalCall) {
      console.log(`[middleware] Allowing internal API call to ${pathname}`);
    }
  }
  
  // Check for auth cookie on protected pages
  if (pathname.startsWith('/dashboard') || 
      pathname.startsWith('/billing') ||
      pathname.startsWith('/settings')) {
    
    const cookies = request.cookies;
    const hasAuthCookie = cookies.getAll().some(cookie => {
      // Supabase cookie patterns: sb-<project-ref>-auth-token
      // In this case: sb-aaplsgskmoeyvvedjzxp-auth-token
      return cookie.name.includes('sb-') && cookie.name.includes('-auth-token');
    });
    
    // Check if this might be a redirect from email confirmation
    // Supabase might include session info in URL hash or as a referrer
    const referrer = request.headers.get('referer');
    const isFromSupabase = referrer && referrer.includes('supabase.co');
    const hasHashFragment = request.url.includes('#');
    
    if (!hasAuthCookie) {
      console.log(`[middleware] No auth cookie for protected page: ${pathname}`);
      console.log(`[middleware] Referrer: ${referrer}`);
      console.log(`[middleware] Has hash fragment: ${hasHashFragment}`);
      
      // If coming from Supabase, allow the request to proceed
      // The client-side code will handle session establishment
      if (isFromSupabase || hasHashFragment) {
        console.log(`[middleware] Allowing request from Supabase email confirmation`);
        return NextResponse.next();
      }
      
      const signInUrl = new URL('/auth/login', request.url);
      signInUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(signInUrl);
    }
  }
  
  // Allow request to proceed
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/billing/:path*',
    '/settings/:path*',
    '/api/:path*',
  ],
};