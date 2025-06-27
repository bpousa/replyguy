import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Request validation schema
const updateSchema = z.object({
  dailyGoal: z.number().min(1).max(100),
});

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

    // Get user's daily goal
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('daily_goal')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      console.error('[daily-goal] Error fetching user data:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch daily goal' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      dailyGoal: userData?.daily_goal || 10,
    });
  } catch (error) {
    console.error('[daily-goal] Unexpected error:', error);
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

    // Validate request body
    const body = await req.json();
    const { dailyGoal } = updateSchema.parse(body);

    // Update user's daily goal
    const { error: updateError } = await supabase
      .from('users')
      .update({ daily_goal: dailyGoal })
      .eq('id', user.id);

    if (updateError) {
      console.error('[daily-goal] Error updating daily goal:', updateError);
      return NextResponse.json(
        { error: 'Failed to update daily goal' },
        { status: 500 }
      );
    }

    console.log(`[daily-goal] Updated daily goal for user ${user.id} to ${dailyGoal}`);

    return NextResponse.json({
      success: true,
      dailyGoal,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[daily-goal] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}