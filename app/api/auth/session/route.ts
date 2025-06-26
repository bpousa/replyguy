import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    
    // Get all cookies for debugging
    const allCookies = cookieStore.getAll();
    const authCookies = allCookies.filter(c => 
      c.name.includes('sb-') || c.name.includes('supabase')
    );
    
    // Create Supabase client
    const supabase = createServerClient(cookieStore);
    
    // Try to get the session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // Try to get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // Prepare debug information
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      cookies: {
        total: allCookies.length,
        authCookies: authCookies.map(c => ({
          name: c.name,
          hasValue: !!c.value,
          length: c.value?.length || 0
        }))
      },
      session: {
        exists: !!session,
        user: session?.user ? {
          id: session.user.id,
          email: session.user.email,
          emailConfirmed: session.user.email_confirmed_at,
          createdAt: session.user.created_at,
          lastSignIn: session.user.last_sign_in_at
        } : null,
        expiresAt: session?.expires_at,
        error: sessionError?.message
      },
      user: {
        exists: !!user,
        data: user ? {
          id: user.id,
          email: user.email,
          role: user.role,
          appMetadata: user.app_metadata,
          userMetadata: user.user_metadata
        } : null,
        error: userError?.message
      },
      headers: {
        cookie: request.headers.get('cookie') ? 'present' : 'missing',
        authorization: request.headers.get('authorization') ? 'present' : 'missing'
      }
    };
    
    // Log for server-side debugging
    console.log('[session-debug] Session info:', {
      hasSession: !!session,
      hasUser: !!user,
      authCookiesCount: authCookies.length,
      errors: {
        session: sessionError?.message,
        user: userError?.message
      }
    });
    
    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error('[session-debug] Error:', error);
    return NextResponse.json({
      error: 'Failed to get session debug info',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}