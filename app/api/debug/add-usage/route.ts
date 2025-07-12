import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  
  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Parse request body
    const body = await req.json();
    const { date, count = 1 } = body;
    
    // Get user's timezone if no date provided
    let targetDate = date;
    if (!targetDate) {
      const { data: userData } = await supabase
        .from('users')
        .select('timezone')
        .eq('id', user.id)
        .single();
      
      const now = new Date();
      if (userData?.timezone) {
        try {
          const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: userData.timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          });
          targetDate = formatter.format(now);
        } catch (e) {
          targetDate = now.toISOString().split('T')[0];
        }
      } else {
        targetDate = now.toISOString().split('T')[0];
      }
    }
    
    // Call the track_daily_usage function
    const { data, error } = await supabase
      .rpc('track_daily_usage', {
        p_user_id: user.id,
        p_usage_type: 'reply',
        p_count: count,
        p_date: targetDate
      });
    
    if (error) {
      return NextResponse.json({ 
        error: 'Failed to add usage',
        details: error 
      }, { status: 500 });
    }
    
    // Fetch the updated record
    const { data: updatedUsage } = await supabase
      .from('daily_usage')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', targetDate)
      .single();
    
    return NextResponse.json({
      success: true,
      date: targetDate,
      usage: updatedUsage
    });
    
  } catch (error) {
    console.error('Add usage error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}