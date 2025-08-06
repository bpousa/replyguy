import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/app/lib/auth';

// Rate limiting: track requests per IP
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // max 10 requests per minute

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const clientIp = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    
    const now = Date.now();
    const clientData = requestCounts.get(clientIp) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
    
    if (now > clientData.resetTime) {
      // Reset window
      clientData.count = 0;
      clientData.resetTime = now + RATE_LIMIT_WINDOW;
    }
    
    clientData.count++;
    requestCounts.set(clientIp, clientData);
    
    if (clientData.count > RATE_LIMIT_MAX) {
      console.warn(`[clear-session] Rate limit exceeded for IP: ${clientIp}`);
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }
    
    // Verify the request is from an authenticated session
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    const { data: { session } } = await supabase.auth.getSession();
    
    // Allow clearing cookies for authenticated users, active auth flows, or cleanup operations
    const authFlowActive = request.headers.get('x-auth-flow-active') === 'true';
    const isCleanupOperation = request.headers.get('x-cleanup-operation') === 'true';
    
    if (!session && !authFlowActive && !isCleanupOperation) {
      console.warn('[clear-session] Unauthorized attempt to clear cookies');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('[clear-session] Clearing auth cookies for:', session?.user?.email || 'auth-flow');
    
    // Get all cookies
    const allCookies = cookieStore.getAll();
    
    // Clear all Supabase-related cookies
    allCookies.forEach(cookie => {
      if (cookie.name.includes('sb-') || 
          cookie.name.includes('supabase') ||
          cookie.name.includes('auth')) {
        console.log(`[clear-session] Clearing cookie: ${cookie.name}`);
        
        // Clear with various path and domain combinations to ensure removal
        cookieStore.delete(cookie.name);
        cookieStore.set({
          name: cookie.name,
          value: '',
          expires: new Date(0),
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'lax'
        });
        
        // Also try without httpOnly/secure flags
        cookieStore.set({
          name: cookie.name,
          value: '',
          expires: new Date(0),
          path: '/'
        });
      }
    });
    
    // Return success with cache prevention headers
    return NextResponse.json(
      { success: true, message: 'Auth cookies cleared' },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (error) {
    console.error('[clear-session] Error clearing cookies:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear cookies' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to clear session.' },
    { status: 405 }
  );
}