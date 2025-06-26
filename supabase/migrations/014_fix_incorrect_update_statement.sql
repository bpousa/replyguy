-- Fix the incorrect UPDATE statement from migration 011
-- That migration tried to update non-existent columns on the users table

-- Remove the incorrect update attempt that references non-existent columns
-- The proper way to get user limits is through the subscription relationship

-- Create a helper view for easier access to user subscription info
CREATE OR REPLACE VIEW user_subscription_info AS
SELECT 
  u.id as user_id,
  u.email,
  u.full_name,
  u.stripe_customer_id,
  u.daily_goal,
  u.timezone,
  s.id as subscription_id,
  s.plan_id,
  s.status as subscription_status,
  s.current_period_start,
  s.current_period_end,
  s.cancel_at_period_end,
  sp.name as plan_name,
  sp.reply_limit,
  sp.meme_limit,
  sp.suggestion_limit,
  sp.max_tweet_length,
  sp.max_response_idea_length,
  sp.max_reply_length,
  sp.enable_memes,
  sp.enable_long_replies,
  sp.enable_style_matching,
  sp.enable_perplexity_guidance,
  sp.enable_write_like_me,
  sp.features
FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.id AND s.is_active = true
LEFT JOIN subscription_plans sp ON sp.id = s.plan_id;

-- Grant appropriate permissions
GRANT SELECT ON user_subscription_info TO authenticated;

-- Add comment for documentation
COMMENT ON VIEW user_subscription_info IS 'Convenience view joining users with their active subscription and plan details';