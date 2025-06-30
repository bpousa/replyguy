-- Add 1 free research per month for free plan users
-- This allows free users to test the research feature

UPDATE subscription_plans SET
  enable_perplexity_guidance = true,
  research_limit = 1,  -- New column for research limit
  features = ARRAY[
    '10 replies per month',
    '1 research per month',  -- Added this
    'Basic reply types',
    'Standard support',
    'Daily goal tracking'
  ]
WHERE id = 'free';

-- Add research_limit column if it doesn't exist
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS research_limit INTEGER DEFAULT 0;

-- Update research limits for all plans
UPDATE subscription_plans SET research_limit = 1 WHERE id = 'free';
UPDATE subscription_plans SET research_limit = -1 WHERE id = 'growth'; -- Unlimited
UPDATE subscription_plans SET research_limit = -1 WHERE id = 'professional'; -- Unlimited
UPDATE subscription_plans SET research_limit = -1 WHERE id = 'enterprise'; -- Unlimited

-- Add research tracking to usage tracking
ALTER TABLE daily_usage 
ADD COLUMN IF NOT EXISTS research_used INTEGER DEFAULT 0;

-- Update the get_current_usage function to include research
CREATE OR REPLACE FUNCTION get_current_usage(p_user_id UUID)
RETURNS TABLE (
  total_replies INTEGER,
  total_suggestions INTEGER,
  total_memes INTEGER,
  total_research INTEGER
) AS $$
DECLARE
  v_billing_start DATE;
  v_billing_end DATE;
BEGIN
  -- Get billing period
  SELECT 
    billing_period_start,
    billing_period_end
  INTO v_billing_start, v_billing_end
  FROM get_user_billing_period(p_user_id);

  -- Get usage for billing period
  RETURN QUERY
  SELECT 
    COALESCE(SUM(replies_used), 0)::INTEGER as total_replies,
    COALESCE(SUM(suggestions_used), 0)::INTEGER as total_suggestions,
    COALESCE(SUM(memes_used), 0)::INTEGER as total_memes,
    COALESCE(SUM(research_used), 0)::INTEGER as total_research
  FROM daily_usage
  WHERE user_id = p_user_id
    AND usage_date >= v_billing_start
    AND usage_date < v_billing_end;
END;
$$ LANGUAGE plpgsql;

-- Update the track_daily_usage function to include research
CREATE OR REPLACE FUNCTION track_daily_usage(
  p_user_id UUID,
  p_usage_type TEXT,
  p_count INTEGER DEFAULT 1
)
RETURNS void AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Insert or update daily usage
  INSERT INTO daily_usage (user_id, usage_date, replies_used, suggestions_used, memes_used, research_used)
  VALUES (
    p_user_id, 
    v_today, 
    CASE WHEN p_usage_type = 'reply' THEN p_count ELSE 0 END,
    CASE WHEN p_usage_type = 'suggestion' THEN p_count ELSE 0 END,
    CASE WHEN p_usage_type = 'meme' THEN p_count ELSE 0 END,
    CASE WHEN p_usage_type = 'research' THEN p_count ELSE 0 END
  )
  ON CONFLICT (user_id, usage_date) DO UPDATE
  SET 
    replies_used = daily_usage.replies_used + CASE WHEN p_usage_type = 'reply' THEN p_count ELSE 0 END,
    suggestions_used = daily_usage.suggestions_used + CASE WHEN p_usage_type = 'suggestion' THEN p_count ELSE 0 END,
    memes_used = daily_usage.memes_used + CASE WHEN p_usage_type = 'meme' THEN p_count ELSE 0 END,
    research_used = daily_usage.research_used + CASE WHEN p_usage_type = 'research' THEN p_count ELSE 0 END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Update get_user_limits to include research limit
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
BEGIN
  -- Get user's subscription tier
  SELECT subscription_tier INTO v_subscription_tier
  FROM users WHERE id = p_user_id;
  
  -- Get current usage
  SELECT * INTO v_usage FROM get_current_usage(p_user_id);
  
  -- Return limits and usage
  RETURN QUERY
  SELECT 
    sp.reply_limit,
    sp.suggestion_limit,
    sp.meme_limit,
    sp.research_limit,
    v_usage.total_replies,
    v_usage.total_suggestions,
    v_usage.total_memes,
    v_usage.total_research,
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
$$ LANGUAGE plpgsql;