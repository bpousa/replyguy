-- Add missing columns needed for GHL sync
-- These columns are referenced in the sync-user route

-- 1. Add created_at to users table if missing
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Add referral columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users(id);

-- Generate referral codes for existing users
UPDATE public.users 
SET referral_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))
WHERE referral_code IS NULL;

-- Make referral_code unique
ALTER TABLE public.users 
ADD CONSTRAINT users_referral_code_unique UNIQUE (referral_code);

-- 3. Add missing columns to subscriptions table
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS billing_anchor_day INTEGER CHECK (billing_anchor_day >= 1 AND billing_anchor_day <= 31),
ADD COLUMN IF NOT EXISTS trialing_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_retry_count INTEGER DEFAULT 0;

-- 4. Update the user_subscription_info view to include all necessary columns
CREATE OR REPLACE VIEW user_subscription_info AS
SELECT 
  u.id as user_id,
  u.email,
  u.full_name,
  u.stripe_customer_id,
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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON public.users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON public.users(referred_by);
CREATE INDEX IF NOT EXISTS idx_subscriptions_billing_anchor_day ON public.subscriptions(billing_anchor_day);

-- Add comment
COMMENT ON VIEW user_subscription_info IS 'Comprehensive view of user subscription data for GHL sync and other integrations';