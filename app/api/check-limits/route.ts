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

    // Get user's data with plan details
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*, subscription_plans!subscription_tier(*)')
      .eq('id', user.id)
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

    const plan: SubscriptionPlan = userData.subscription_plans || {
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

    // Check if user can generate more replies
    const canGenerate = currentUsage.total_replies < plan.reply_limit;
    const canGenerateMeme = plan.meme_limit > 0 && currentUsage.total_memes < plan.meme_limit;
    const canUseSuggestions = plan.suggestion_limit === -1 || currentUsage.total_suggestions < plan.suggestion_limit;

    // Calculate remaining
    const repliesRemaining = plan.reply_limit - currentUsage.total_replies;
    const memesRemaining = plan.meme_limit - currentUsage.total_memes;
    const suggestionsRemaining = plan.suggestion_limit === -1 ? 'unlimited' : plan.suggestion_limit - currentUsage.total_suggestions;

    return NextResponse.json({
      canGenerate,
      canGenerateMeme,
      canUseSuggestions,
      limits: {
        plan_id: mappedPlanId,
        plan_name: plan.name,
        reply_limit: plan.reply_limit,
        replies_used: currentUsage.total_replies,
        meme_limit: plan.meme_limit,
        memes_used: currentUsage.total_memes,
        suggestion_limit: plan.suggestion_limit,
        suggestions_used: currentUsage.total_suggestions,
        repliesRemaining,
        memesRemaining,
        suggestionsRemaining,
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