import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  
  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Get user data including timezone
    const { data: userData } = await supabase
      .from('users')
      .select('id, email, timezone, created_at')
      .eq('id', user.id)
      .single();
    
    // Calculate user's current date
    const now = new Date();
    let userDate: string;
    
    if (userData?.timezone) {
      try {
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: userData.timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        userDate = formatter.format(now);
      } catch (e) {
        userDate = now.toISOString().split('T')[0];
      }
    } else {
      userDate = now.toISOString().split('T')[0];
    }
    
    // Get today's usage
    const { data: dailyUsage, error: dailyError } = await supabase
      .from('daily_usage')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', userDate)
      .maybeSingle();
    
    // Get current month usage
    const { data: monthlyUsage, error: monthlyError } = await supabase
      .rpc('get_current_usage', { p_user_id: user.id })
      .single();
    
    // Get last 7 days of usage
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: recentUsage, error: recentError } = await supabase
      .from('daily_usage')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });
    
    return NextResponse.json({
      user: {
        id: user.id,
        email: userData?.email,
        timezone: userData?.timezone || 'UTC',
        created_at: userData?.created_at
      },
      dates: {
        server_utc: now.toISOString(),
        user_date: userDate,
        user_timezone: userData?.timezone || 'UTC'
      },
      daily_usage: {
        data: dailyUsage,
        error: dailyError?.message
      },
      monthly_usage: {
        data: monthlyUsage,
        error: monthlyError?.message
      },
      recent_usage: {
        data: recentUsage,
        error: recentError?.message,
        count: recentUsage?.length || 0
      }
    });
    
  } catch (error) {
    console.error('Debug check error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}