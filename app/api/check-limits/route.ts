import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/auth';
import { cookies } from 'next/headers';

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

    // Get user's current limits and usage
    const { data: limits, error: limitsError } = await supabase
      .rpc('get_user_limits', { p_user_id: user.id })
      .single();

    if (limitsError || !limits) {
      console.error('Error fetching limits:', limitsError);
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

    // Check if user can generate more replies
    const canGenerate = limits.replies_used < limits.reply_limit;
    const canGenerateMeme = limits.meme_limit > 0 && limits.memes_used < limits.meme_limit;
    const canUseSuggestions = limits.suggestion_limit === -1 || limits.suggestions_used < limits.suggestion_limit;

    // Calculate remaining
    const repliesRemaining = limits.reply_limit - limits.replies_used;
    const memesRemaining = limits.meme_limit - limits.memes_used;
    const suggestionsRemaining = limits.suggestion_limit === -1 ? 'unlimited' : limits.suggestion_limit - limits.suggestions_used;

    return NextResponse.json({
      canGenerate,
      canGenerateMeme,
      canUseSuggestions,
      limits: {
        ...limits,
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