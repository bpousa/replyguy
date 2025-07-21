-- Drop and recreate user_subscription_info view to include phone fields for GHL sync
DROP VIEW IF EXISTS user_subscription_info;

CREATE VIEW user_subscription_info AS
SELECT 
  u.id as user_id,
  u.email,
  u.full_name,
  u.stripe_customer_id,
  u.phone,
  u.phone_verified,
  u.sms_opt_in,
  u.sms_opt_in_date,
  u.daily_goal,
  u.timezone,
  u.created_at,
  u.referral_code,
  u.referred_by,
  s.id as subscription_id,
  s.plan_id,
  s.status as subscription_status,
  s.current_period_start,
  s.current_period_end,
  s.cancel_at_period_end,
  s.billing_anchor_day,
  s.trialing_until,
  s.payment_failed_at,
  s.payment_retry_count,
  s.stripe_subscription_id,
  sp.name as plan_name,
  sp.monthly_price as price_monthly,
  sp.yearly_price as price_yearly,
  COALESCE(sp.reply_limit, sp.monthly_limit, 10) as reply_limit,
  COALESCE(sp.meme_limit, 0) as meme_limit,
  sp.suggestion_limit,
  sp.max_tweet_length,
  sp.max_response_idea_length,
  sp.max_reply_length,
  sp.enable_long_replies,
  sp.enable_style_matching,
  sp.enable_perplexity_guidance,
  COALESCE(sp.enable_write_like_me, false) as enable_write_like_me,
  sp.enable_memes,
  sp.features
FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.id AND s.is_active = true
LEFT JOIN subscription_plans sp ON sp.id = COALESCE(s.plan_id, 'free');

-- Grant permissions
GRANT SELECT ON user_subscription_info TO authenticated;

-- Update comment
COMMENT ON VIEW user_subscription_info IS 'Comprehensive view of user subscription data including phone/SMS info for GHL sync and other integrations';