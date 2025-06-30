import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

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

    // Get user's subscription first (include both active and trialing)
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1);
    
    // If no active subscription, return free plan
    if (subError || !subscriptions || subscriptions.length === 0) {
      console.log('[user-plan] No active subscription found, using free plan');
      
      // Get the free plan
      const { data: freePlan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', 'free')
        .single();
      
      if (planError) {
        console.error('[user-plan] Error fetching free plan:', planError);
        return NextResponse.json(
          { error: 'Failed to fetch plan data' },
          { status: 500 }
        );
      }
      
      // Get usage anyway
      let usage = null;
      try {
        const { data } = await supabase
          .rpc('get_current_usage', { p_user_id: user.id })
          .single();
        usage = data;
      } catch (e) {
        console.error('[user-plan] Usage fetch error:', e);
      }
      
      return NextResponse.json({
        plan: freePlan,
        subscription: null,
        usage: usage || { total_replies: 0, total_suggestions: 0, total_memes: 0 },
      });
    }
    
    const subscription = subscriptions[0];
    
    // Get the plan details
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', subscription.plan_id)
      .single();

    if (planError) {
      console.error('[user-plan] Error fetching plan details:', planError);
      return NextResponse.json(
        { error: 'Failed to fetch plan data' },
        { status: 500 }
      );
    }

    // Get current usage
    let usage = null;
    try {
      const { data } = await supabase
        .rpc('get_current_usage', { p_user_id: user.id })
        .single()
        .throwOnError();
      
      usage = data;
      console.log('[user-plan] Usage fetched successfully:', usage);
    } catch (usageError) {
      console.error('[user-plan] Failed to fetch usage:', {
        error: usageError,
        userId: user.id,
        message: usageError instanceof Error ? usageError.message : 'Unknown error'
      });
      // Continue with null usage - don't fail the whole request
    }

    return NextResponse.json({
      plan,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        current_period_end: subscription.current_period_end,
        current_period_start: subscription.current_period_start,
        trial_end: subscription.trial_end,
        plan_id: subscription.plan_id,
      },
      usage: usage || { total_replies: 0, total_suggestions: 0, total_memes: 0 },
    });
  } catch (error) {
    console.error('Plan API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}