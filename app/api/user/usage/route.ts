import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

interface UsageData {
  total_replies: number;
  total_suggestions: number;
  total_memes: number;
}

export async function GET(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  
  try {
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get current usage using the RPC function
    const { data: usage, error: usageError } = await supabase
      .rpc('get_current_usage', { p_user_id: user.id })
      .single() as { data: UsageData | null; error: any };

    if (usageError) {
      console.error('[user-usage] Error fetching usage:', usageError);
      return NextResponse.json(
        { error: 'Failed to fetch usage data' },
        { status: 500 }
      );
    }

    // Get daily usage
    const { data: dailyUsage, error: dailyError } = await supabase
      .from('daily_usage')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', new Date().toISOString().split('T')[0])
      .maybeSingle(); // Use maybeSingle to handle no records gracefully

    // Get user's daily goal
    const { data: userSettings, error: settingsError } = await supabase
      .from('users')
      .select('daily_goal')
      .eq('id', user.id)
      .single();

    const dailyGoal = userSettings?.daily_goal || 10;

    return NextResponse.json({
      monthlyUsage: {
        replies: usage?.total_replies || 0,
        suggestions: usage?.total_suggestions || 0,
        memes: usage?.total_memes || 0,
      },
      dailyUsage: {
        replies: dailyUsage?.replies_generated || 0,
        suggestions: dailyUsage?.suggestions_used || 0,
        memes: dailyUsage?.memes_generated || 0,
        date: dailyUsage?.date || new Date().toISOString().split('T')[0],
      },
      dailyGoal,
    });
  } catch (error) {
    console.error('[user-usage] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  
  try {
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Parse request body
    const { type = 'reply', count = 1 } = await req.json();

    // Track usage
    const { error: trackError } = await supabase
      .rpc('track_daily_usage', {
        p_user_id: user.id,
        p_usage_type: type,
        p_count: count
      });

    if (trackError) {
      console.error('[user-usage] Error tracking usage:', trackError);
      return NextResponse.json(
        { error: 'Failed to track usage' },
        { status: 500 }
      );
    }

    // Return updated usage
    const { data: usage, error: usageError } = await supabase
      .rpc('get_current_usage', { p_user_id: user.id })
      .single() as { data: UsageData | null; error: any };

    if (usageError) {
      console.error('[user-usage] Error fetching updated usage:', usageError);
    }

    return NextResponse.json({
      success: true,
      usage: {
        replies: usage?.total_replies || 0,
        suggestions: usage?.total_suggestions || 0,
        memes: usage?.total_memes || 0,
      }
    });
  } catch (error) {
    console.error('[user-usage] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}