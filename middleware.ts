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
    const hasAuthCookie = cookies.getAll().some(cookie => {
      // Supabase cookie patterns can vary, check for any auth-related cookie
      return cookie.name.includes('sb-') && 
        (cookie.name.includes('auth-token') || 
         cookie.name.includes('session') ||
         cookie.name.includes('access-token') ||
         cookie.name.includes('refresh-token'));
    });
    
    if (!hasAuthCookie) {
      console.log(`[middleware] No auth cookie for API route: ${pathname}`);
      return NextResponse.json(
        { error: 'Unauthenticated', message: 'Please sign in to access this resource' },
        { status: 401 }
      );
    }
  }
  
  // Check for auth cookie on protected pages
  if (pathname.startsWith('/dashboard') || 
      pathname.startsWith('/billing') ||
      pathname.startsWith('/settings')) {
    
    const cookies = request.cookies;
    const hasAuthCookie = cookies.getAll().some(cookie => {
      // Supabase cookie patterns can vary, check for any auth-related cookie
      return cookie.name.includes('sb-') && 
        (cookie.name.includes('auth-token') || 
         cookie.name.includes('session') ||
         cookie.name.includes('access-token') ||
         cookie.name.includes('refresh-token'));
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