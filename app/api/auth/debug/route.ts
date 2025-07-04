import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';
import { toMs } from '@/app/lib/utils/time';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    
    // Get all cookies
    const allCookies = cookieStore.getAll();
    const authCookies = allCookies.filter(c => 
      c.name.includes('sb-') || c.name.includes('supabase')
    );
    
    // Create Supabase client
    const supabase = createServerClient(cookieStore);
    
    // Try multiple methods to get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // Get request headers
    const headers = Object.fromEntries(request.headers.entries());
    
    // Prepare comprehensive debug info
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
        APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'not set',
        SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'missing',
      },
      cookies: {
        total: allCookies.length,
        authCookiesCount: authCookies.length,
        authCookies: authCookies.map(c => ({
          name: c.name,
          hasValue: !!c.value,
          length: c.value?.length || 0,
          // Show partial value for debugging (first/last 10 chars)
          preview: c.value ? `${c.value.substring(0, 10)}...${c.value.substring(c.value.length - 10)}` : 'empty'
        })),
        rawCookieHeader: headers.cookie ? 'present' : 'missing'
      },
      session: {
        exists: !!session,
        error: sessionError?.message,
        details: session ? {
          userId: session.user.id,
          email: session.user.email,
          emailConfirmed: session.user.email_confirmed_at,
          expiresAt: session.expires_at,
          expiresIn: session.expires_at ? 
            `${Math.floor((toMs(session.expires_at) - Date.now()) / 1000 / 60)} minutes` : 
            'unknown'
        } : null
      },
      user: {
        exists: !!user,
        error: userError?.message,
        details: user ? {
          id: user.id,
          email: user.email,
          role: user.role,
          createdAt: user.created_at,
          lastSignIn: user.last_sign_in_at
        } : null
      },
      middleware: {
        wouldPassCheck: authCookies.some(c => 
          c.name.includes('auth-token') || 
          c.name.includes('session') ||
          c.name.includes('access-token') ||
          c.name.includes('refresh-token')
        )
      },
      headers: {
        host: headers.host,
        origin: headers.origin,
        referer: headers.referer,
        'user-agent': headers['user-agent']
      }
    };
    
    // Log server-side for debugging
    console.log('[auth-debug] Debug info:', {
      hasSession: !!session,
      hasUser: !!user,
      authCookiesCount: authCookies.length,
      wouldPassMiddleware: debugInfo.middleware.wouldPassCheck
    });
    
    return NextResponse.json(debugInfo, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (error) {
    console.error('[auth-debug] Error:', error);
    return NextResponse.json({
      error: 'Failed to get debug info',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}