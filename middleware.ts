import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Log middleware hit for debugging
  console.log(`[middleware] Hit for path: ${pathname}`);
  
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
    
    // Check if this is an internal API call (has x-forwarded headers from within our app)
    const isInternalCall = request.headers.get('x-forwarded-for') === '::1' || 
                          request.headers.get('x-forwarded-for')?.includes('127.0.0.1') ||
                          request.headers.get('x-forwarded-for')?.includes('::ffff:127.0.0.1');
    
    const hasAuthCookie = allCookies.some(cookie => {
      // Supabase cookie patterns: sb-<project-ref>-auth-token
      // In this case: sb-aaplsgskmoeyvvedjzxp-auth-token
      const isAuthCookie = cookie.name.includes('sb-') && cookie.name.includes('-auth-token');
      if (isAuthCookie) {
        console.log(`[middleware] Found auth cookie: ${cookie.name}`);
      }
      return isAuthCookie;
    });
    
    if (!hasAuthCookie && !isInternalCall) {
      console.log(`[middleware] No auth cookie for API route: ${pathname}`);
      console.log(`[middleware] Available cookies:`, allCookies.map(c => c.name).join(', '));
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
    
    if (!hasAuthCookie) {
      console.log(`[middleware] No auth cookie for protected page: ${pathname}`);
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