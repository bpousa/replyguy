import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // For now, we'll handle auth checks in the components themselves
  // The middleware can't properly access Supabase auth state without the proper setup
  
  // Skip auth checks in middleware to avoid issues
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/auth/:path*',
    '/api/:path*',
  ],
};