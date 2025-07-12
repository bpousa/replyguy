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
    
    // Get user's timezone
    const { data: userData } = await supabase
      .from('users')
      .select('timezone, daily_goal')
      .eq('id', user.id)
      .single();
    
    // Get all daily usage records for this user (last 7 days)
    const { data: usageRecords, error: usageError } = await supabase
      .from('daily_usage')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(7);
    
    if (usageError) {
      return NextResponse.json({ 
        error: 'Failed to fetch usage records',
        details: usageError 
      }, { status: 500 });
    }
    
    // Calculate various dates for debugging
    const now = new Date();
    const utcDate = now.toISOString().split('T')[0];
    
    let userTimezoneDate = utcDate;
    if (userData?.timezone) {
      try {
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: userData.timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        userTimezoneDate = formatter.format(now);
      } catch (e) {
        console.error('Invalid timezone:', userData.timezone);
      }
    }
    
    // Get database server time
    const { data: dbTime } = await supabase
      .rpc('get_current_timestamp');
    
    const debugInfo = {
      user: {
        id: user.id,
        email: user.email,
        timezone: userData?.timezone || 'Not set',
        daily_goal: userData?.daily_goal || 10
      },
      dates: {
        client_utc_date: utcDate,
        client_timezone_date: userTimezoneDate,
        client_timezone_name: userData?.timezone || 'UTC',
        database_time: dbTime,
        database_date: dbTime ? new Date(dbTime).toISOString().split('T')[0] : 'Unknown'
      },
      usage_records: usageRecords || [],
      summary: {
        total_records: usageRecords?.length || 0,
        today_usage: usageRecords?.find(r => r.date === userTimezoneDate) || null,
        today_utc_usage: usageRecords?.find(r => r.date === utcDate) || null
      }
    };
    
    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}