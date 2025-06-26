-- Final subscription system fixes with correct schema
-- This matches the actual table structure

-- 1. Add missing columns to subscription_plans (only if they don't exist)
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS price_monthly NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_yearly NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS reply_limit INTEGER,
ADD COLUMN IF NOT EXISTS meme_limit INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS enable_write_like_me BOOLEAN DEFAULT false;

-- 2. Update reply_limit from monthly_limit
UPDATE public.subscription_plans 
SET reply_limit = COALESCE(reply_limit, monthly_limit, 10)
WHERE reply_limit IS NULL;

-- 3. Set correct limits and features
UPDATE public.subscription_plans 
SET 
  meme_limit = CASE 
    WHEN id = 'free' THEN 0
    WHEN id IN ('basic', 'growth') THEN 10
    WHEN id IN ('pro', 'professional') THEN 50
    WHEN id IN ('business', 'enterprise') THEN 100
    ELSE 0
  END,
  enable_write_like_me = CASE 
    WHEN id IN ('pro', 'professional', 'business', 'enterprise') THEN true 
    ELSE false 
  END,
  price_monthly = CASE 
    WHEN id = 'free' THEN 0
    WHEN id IN ('basic', 'growth') THEN 19
    WHEN id IN ('pro', 'professional') THEN 49
    WHEN id IN ('business', 'enterprise') THEN 99
    ELSE 0
  END,
  price_yearly = CASE 
    WHEN id = 'free' THEN 0
    WHEN id IN ('basic', 'growth') THEN 190
    WHEN id IN ('pro', 'professional') THEN 490
    WHEN id IN ('business', 'enterprise') THEN 990
    ELSE 0
  END;

-- 4. Insert dev_test plan (without non-existent columns)
INSERT INTO public.subscription_plans (
  id, name, description, 
  price_monthly, price_yearly,
  reply_limit, monthly_limit, meme_limit, suggestion_limit,
  max_tweet_length, max_response_idea_length, max_reply_length,
  enable_long_replies, enable_style_matching, 
  enable_perplexity_guidance, enable_write_like_me,
  sort_order, active
)
SELECT 
  'dev_test', 'Development Test', 'For local development only',
  0, 0,
  9999, 9999, 9999, -1,
  2000, 2000, 2000,
  true, true, true, true,
  99, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscription_plans WHERE id = 'dev_test'
);

-- 5. Create or replace the enhanced handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert user profile if it doesn't exist
  INSERT INTO public.users (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  
  -- Auto-assign free subscription with trial status if user doesn't have one
  INSERT INTO public.subscriptions (
    user_id,
    plan_id,
    status,
    current_period_start,
    current_period_end
  )
  SELECT
    NEW.id,
    'free',
    'trialing',
    NOW(),
    NOW() + INTERVAL '30 days'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.subscriptions 
    WHERE user_id = NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create user_subscription_info view
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
  sp.price_monthly,
  sp.price_yearly,
  sp.reply_limit,
  sp.meme_limit,
  sp.suggestion_limit,
  sp.max_tweet_length,
  sp.max_response_idea_length,
  sp.max_reply_length,
  sp.enable_long_replies,
  sp.enable_style_matching,
  sp.enable_perplexity_guidance,
  sp.enable_write_like_me,
  sp.features
FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.id AND s.is_active = true
LEFT JOIN subscription_plans sp ON sp.id = s.plan_id;

-- Grant permissions
GRANT SELECT ON user_subscription_info TO authenticated;

-- 7. Show final state
SELECT 
  id,
  name,
  price_monthly || '/' || price_yearly as "Price (M/Y)",
  reply_limit,
  meme_limit,
  CASE WHEN enable_write_like_me THEN '✓' ELSE '✗' END as "Write Like Me",
  CASE WHEN enable_perplexity_guidance THEN '✓' ELSE '✗' END as "Perplexity"
FROM subscription_plans
WHERE active = true
ORDER BY sort_order;

-- 8. Show user subscription status
SELECT 
  'Total Users' as metric,
  COUNT(DISTINCT u.id) as count
FROM users u
UNION ALL
SELECT 
  'Users with Active Subscriptions',
  COUNT(DISTINCT s.user_id)
FROM subscriptions s
WHERE s.is_active = true
UNION ALL
SELECT 
  'Free Plan (Trial)',
  COUNT(*)
FROM subscriptions s
WHERE s.plan_id = 'free' AND s.status = 'trialing'
UNION ALL
SELECT 
  'Paid Plans',
  COUNT(*)
FROM subscriptions s
WHERE s.plan_id != 'free' AND s.status = 'active';