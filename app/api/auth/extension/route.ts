import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('[extension-auth] Checking authentication...');
    
    // Log request details
    console.log('[extension-auth] Origin:', request.headers.get('origin'));
    console.log('[extension-auth] Cookie header:', request.headers.get('cookie') ? 'present' : 'missing');
    
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    
    // Get the session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('[extension-auth] Session error:', sessionError);
      return NextResponse.json({ 
        authenticated: false, 
        error: sessionError.message 
      });
    }
    
    if (!session) {
      console.log('[extension-auth] No session found');
      return NextResponse.json({ authenticated: false });
    }
    
    console.log('[extension-auth] Session found for user:', session.user.email);
    
    // Return user data in a simple format
    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
      },
      // Don't send the actual token - the extension should use cookies
    });
    
  } catch (error) {
    console.error('[extension-auth] Error:', error);
    return NextResponse.json({
      authenticated: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Cookie',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}