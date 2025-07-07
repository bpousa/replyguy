import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

interface CurrentUsage {
  total_replies: number;
  total_memes: number;
  total_suggestions: number;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  reply_limit: number;
  meme_limit: number;
  suggestion_limit: number;
  enable_style_matching?: boolean;
  enable_write_like_me?: boolean;
  enable_perplexity_guidance?: boolean;
  enable_memes?: boolean;
  enable_long_replies?: boolean;
  max_tweet_length?: number;
  max_response_idea_length?: number;
  max_reply_length?: number;
}

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);

  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's data with active subscription and plan details
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        *,
        bonus_replies,
        bonus_research,
        subscriptions!inner(
          status,
          plan_id,
          current_period_end,
          subscription_plans!inner(*)
        )
      `)
      .eq('id', user.id)
      .eq('subscriptions.is_active', true)
      .single();

    if (userError || !userData) {
      console.error('Error fetching user data:', userError);
      // Default to free plan limits
      return NextResponse.json({
        canGenerate: true,
        limits: {
          plan_id: 'free',
          plan_name: 'Free',
          reply_limit: 10,
          replies_used: 0,
          meme_limit: 0,
          memes_used: 0,
          suggestion_limit: 0,
          suggestions_used: 0,
        }
      });
    }

    // Get current usage
    const { data: usage } = await supabase
      .rpc('get_current_usage', { p_user_id: user.id })
      .single() as { data: CurrentUsage | null };

    // Extract plan from the subscription relationship
    const plan: SubscriptionPlan = userData?.subscriptions?.[0]?.subscription_plans || {
      id: 'free',
      name: 'Free',
      reply_limit: 10,
      meme_limit: 0,
      suggestion_limit: 0
    };

    const currentUsage: CurrentUsage = usage || {
      total_replies: 0,
      total_memes: 0,
      total_suggestions: 0
    };

    // Map old plan names to new ones for consistency
    const planMapping: Record<string, string> = {
      'growth': 'basic',
      'professional': 'pro',
      'enterprise': 'business'
    };

    const mappedPlanId = planMapping[plan.id] || plan.id;

    // Use meme limit from the plan
    const memeLimit = plan.meme_limit || 0;
    
    // Add bonus replies to the base limit
    const totalReplyLimit = plan.reply_limit + (userData.bonus_replies || 0);
    
    // Check if user can generate more replies
    const canGenerate = currentUsage.total_replies < totalReplyLimit;
    const canGenerateMeme = memeLimit > 0 && currentUsage.total_memes < memeLimit;
    const canUseSuggestions = plan.suggestion_limit === -1 || currentUsage.total_suggestions < plan.suggestion_limit;

    // Calculate remaining
    const repliesRemaining = totalReplyLimit - currentUsage.total_replies;
    const memesRemaining = memeLimit - currentUsage.total_memes;
    const suggestionsRemaining = plan.suggestion_limit === -1 ? 'unlimited' : plan.suggestion_limit - currentUsage.total_suggestions;

    return NextResponse.json({
      canGenerate,
      canGenerateMeme,
      canUseSuggestions,
      limits: {
        plan_id: mappedPlanId,
        plan_name: plan.name,
        reply_limit: totalReplyLimit,
        base_reply_limit: plan.reply_limit,
        bonus_replies: userData.bonus_replies || 0,
        replies_used: currentUsage.total_replies,
        meme_limit: memeLimit,
        memes_used: currentUsage.total_memes,
        suggestion_limit: plan.suggestion_limit,
        suggestions_used: currentUsage.total_suggestions,
        repliesRemaining,
        memesRemaining,
        suggestionsRemaining,
        enable_style_matching: plan.enable_style_matching || false,
        enable_write_like_me: plan.enable_write_like_me || false,
        enable_perplexity_guidance: plan.enable_perplexity_guidance || false,
        enable_memes: plan.enable_memes || false,
        enable_long_replies: plan.enable_long_replies || false,
        // Character limits
        max_tweet_length: plan.max_tweet_length || 280,
        max_response_idea_length: plan.max_response_idea_length || 200,
        max_reply_length: plan.max_reply_length || 280,
      },
      upgradeUrl: !canGenerate ? '/pricing' : null,
    });
  } catch (error) {
    console.error('Check limits error:', error);
    return NextResponse.json(
      { error: 'Failed to check limits' },
      { status: 500 }
    );
  }
}