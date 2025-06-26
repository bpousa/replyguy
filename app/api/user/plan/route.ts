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

    // Get user's subscription and plan details
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        subscriptions!inner(
          id,
          status,
          current_period_end,
          current_period_start,
          trial_end,
          plan_id,
          subscription_plans!inner(
            id,
            name,
            monthly_limit,
            suggestion_limit,
            meme_limit,
            max_reply_length,
            enable_memes,
            enable_style_matching,
            enable_write_like_me,
            enable_perplexity_guidance,
            enable_long_replies,
            enable_sentiment_boost,
            enable_humor_boost,
            enable_formality_control,
            stripe_price_id_monthly,
            stripe_price_id_yearly
          )
        )
      `)
      .eq('id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching user plan:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch plan data' },
        { status: 500 }
      );
    }

    // Get current usage
    const { data: usage, error: usageError } = await supabase
      .rpc('get_current_usage', { p_user_id: user.id })
      .single();

    if (usageError) {
      console.error('Error fetching usage:', usageError);
    }

    // Handle case where user has no subscription (free plan)
    if (!userData?.subscriptions || userData.subscriptions.length === 0) {
      // Get the free plan
      const { data: freePlan } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', 'free')
        .single();

      return NextResponse.json({
        plan: freePlan,
        subscription: null,
        usage: usage || { total_replies: 0, total_suggestions: 0, total_memes: 0 },
      });
    }

    const subscription = userData.subscriptions[0];
    const plan = subscription.subscription_plans;

    return NextResponse.json({
      plan,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        current_period_end: subscription.current_period_end,
        current_period_start: subscription.current_period_start,
        trial_end: subscription.trial_end,
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