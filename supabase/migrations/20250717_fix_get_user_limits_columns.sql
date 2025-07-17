-- Fix get_user_limits function to use correct column names
-- The subscription_plans table doesn't have research_limit, it's part of reply_limit

CREATE OR REPLACE FUNCTION get_user_limits(p_user_id UUID)
RETURNS TABLE (
  reply_limit INTEGER,
  suggestion_limit INTEGER,
  meme_limit INTEGER,
  research_limit INTEGER,
  replies_used INTEGER,
  suggestions_used INTEGER,
  memes_used INTEGER,
  research_used INTEGER,
  max_tweet_length INTEGER,
  max_response_idea_length INTEGER,
  max_reply_length INTEGER,
  enable_long_replies BOOLEAN,
  enable_style_matching BOOLEAN,
  enable_perplexity_guidance BOOLEAN,
  enable_memes BOOLEAN,
  enable_write_like_me BOOLEAN
) AS $$
DECLARE
  v_subscription_tier TEXT;
  v_usage RECORD;
  v_bonus_replies INTEGER;
  v_bonus_research INTEGER;
BEGIN
  -- Get user's subscription tier and bonuses
  SELECT 
    subscription_tier,
    COALESCE(bonus_replies, 0),
    COALESCE(bonus_research, 0)
  INTO v_subscription_tier, v_bonus_replies, v_bonus_research
  FROM users 
  WHERE id = p_user_id;
  
  -- Get current usage
  SELECT * INTO v_usage FROM get_current_usage(p_user_id);
  
  -- Return limits and usage with bonuses applied
  RETURN QUERY
  SELECT 
    sp.reply_limit + v_bonus_replies,  -- Add bonus replies
    sp.suggestion_limit,
    sp.meme_limit,
    COALESCE(sp.suggestion_limit, 1) + v_bonus_research,  -- Research uses suggestion limit + bonus
    v_usage.total_replies,
    v_usage.total_suggestions,
    v_usage.total_memes,
    COALESCE(v_usage.total_research, 0),
    sp.max_tweet_length,
    sp.max_response_idea_length,
    sp.max_reply_length,
    sp.enable_long_replies,
    sp.enable_style_matching,
    sp.enable_perplexity_guidance,
    sp.enable_memes,
    sp.enable_write_like_me
  FROM subscription_plans sp
  WHERE sp.id = COALESCE(v_subscription_tier, 'free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the fix works
SELECT * FROM get_user_limits(
  (SELECT id FROM users WHERE email = 'antoni.mike+35@gmail.com')
);