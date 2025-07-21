import { NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

// This route ensures a user exists in public.users table
export async function GET() {
  console.log('[ensure-user] Starting user verification...');
  
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('[ensure-user] Session error:', sessionError);
      return NextResponse.json({ error: 'Session error', details: sessionError.message }, { status: 401 });
    }
    
    if (!session) {
      console.log('[ensure-user] No session found');
      return NextResponse.json({ error: 'No session' }, { status: 401 });
    }
    
    console.log('[ensure-user] Session found for:', session.user.email);
    
    // Check if user exists in public.users
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', session.user.id)
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[ensure-user] Error checking user:', checkError);
      return NextResponse.json({ 
        error: 'Database error', 
        details: checkError.message,
        code: checkError.code 
      }, { status: 500 });
    }
    
    if (!existingUser) {
      console.log('[ensure-user] User not found in public.users, creating...');
      
      // Create user with all metadata
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || '',
          phone: session.user.user_metadata?.phone || null,
          sms_opt_in: session.user.user_metadata?.sms_opt_in || false,
          referral_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
          referred_by: null // Will be updated by trigger if referral code was used
        });
      
      if (insertError) {
        console.error('[ensure-user] Error creating user:', insertError);
        // If it's a unique constraint violation, the user already exists
        if (insertError.code === '23505') {
          console.log('[ensure-user] User already exists (unique constraint)');
          return NextResponse.json({ success: true, message: 'User already exists' });
        }
        return NextResponse.json({ 
          error: 'Failed to create user',
          details: insertError.message,
          code: insertError.code
        }, { status: 500 });
      }
      
      // Create free subscription
      const { error: subError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: session.user.id,
          plan_id: 'free',
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
      
      if (subError && subError.code !== '23505') { // Ignore duplicate key errors
        console.error('[ensure-user] Error creating subscription:', subError);
      }
      
      console.log('[ensure-user] User created successfully');
    } else {
      console.log('[ensure-user] User already exists');
    }
    
    return NextResponse.json({ 
      success: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        existed: !!existingUser
      }
    });
  } catch (error) {
    console.error('[ensure-user] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}