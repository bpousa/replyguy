import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple rate limiting middleware
const rateLimit = new Map<string, { count: number; resetTime: number }>();

export function middleware(request: NextRequest) {
  // Only apply to API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Skip rate limiting in development
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  // Get client IP
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 10; // 10 requests per minute

  // Get or create rate limit entry
  const clientData = rateLimit.get(ip) || { count: 0, resetTime: now + windowMs };

  // Reset if window has passed
  if (now > clientData.resetTime) {
    clientData.count = 0;
    clientData.resetTime = now + windowMs;
  }

  // Increment count
  clientData.count++;
  rateLimit.set(ip, clientData);

  // Check if limit exceeded
  if (clientData.count > maxRequests) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  // Add rate limit headers
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', maxRequests.toString());
  response.headers.set('X-RateLimit-Remaining', (maxRequests - clientData.count).toString());
  response.headers.set('X-RateLimit-Reset', new Date(clientData.resetTime).toISOString());

  return response;
}

export const config = {
  matcher: '/api/:path*',
};