import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  
  try {
    // Get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ 
        error: 'No session',
        details: { sessionError }
      }, { status: 401 });
    }
    
    const authUser = session.user;
    
    // Get user from users table
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();
    
    // Get ALL subscriptions for this user
    const { data: allSubs, error: allSubsError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', authUser.id);
    
    // Get active subscriptions
    const { data: activeSubs, error: activeSubsError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', authUser.id)
      .eq('status', 'active');
    
    // Check by email too
    const { data: userByEmail, error: emailError } = await supabase
      .from('users')
      .select('*')
      .eq('email', authUser.email);
    
    // Get subscriptions for all users with this email
    let emailSubs = [];
    if (userByEmail && userByEmail.length > 0) {
      const userIds = userByEmail.map(u => u.id);
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('*')
        .in('user_id', userIds);
      emailSubs = subs || [];
    }
    
    return NextResponse.json({
      debug: {
        authUser: {
          id: authUser.id,
          email: authUser.email,
          created_at: authUser.created_at
        },
        dbUser: dbUser || 'NOT FOUND IN USERS TABLE',
        allSubscriptions: allSubs || [],
        activeSubscriptions: activeSubs || [],
        subscriptionCount: {
          all: allSubs?.length || 0,
          active: activeSubs?.length || 0
        },
        usersByEmail: userByEmail || [],
        subscriptionsByEmail: emailSubs,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}