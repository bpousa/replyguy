-- Fix get_user_limits function - v2 (handles missing total_research field)

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
  v_bonus_replies INTEGER;
  v_bonus_research INTEGER;
  v_total_replies INTEGER;
  v_total_suggestions INTEGER;
  v_total_memes INTEGER;
BEGIN
  -- Get user's subscription tier and bonuses
  SELECT 
    subscription_tier,
    COALESCE(bonus_replies, 0),
    COALESCE(bonus_research, 0)
  INTO v_subscription_tier, v_bonus_replies, v_bonus_research
  FROM users 
  WHERE id = p_user_id;
  
  -- Get current usage (handle different return types)
  BEGIN
    SELECT 
      total_replies,
      total_suggestions,
      total_memes
    INTO 
      v_total_replies,
      v_total_suggestions,
      v_total_memes
    FROM get_current_usage(p_user_id);
  EXCEPTION WHEN OTHERS THEN
    -- If error, default to 0
    v_total_replies := 0;
    v_total_suggestions := 0;
    v_total_memes := 0;
  END;
  
  -- Return limits and usage with bonuses applied
  RETURN QUERY
  SELECT 
    sp.reply_limit + v_bonus_replies,  -- Add bonus replies
    sp.suggestion_limit,
    sp.meme_limit,
    COALESCE(sp.suggestion_limit, 1) + v_bonus_research,  -- Research uses suggestion limit + bonus
    COALESCE(v_total_replies, 0),
    COALESCE(v_total_suggestions, 0),
    COALESCE(v_total_memes, 0),
    0,  -- Research used - set to 0 for now since it's not tracked separately
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

-- Test it
SELECT * FROM get_user_limits(
  (SELECT id FROM users WHERE email = 'antoni.mike+35@gmail.com')
);