-- Fix subscription system with the actual schema
-- Based on the analysis, columns are: monthly_price, yearly_price (not annual_price)

-- 1. Add missing columns
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS reply_limit INTEGER,
ADD COLUMN IF NOT EXISTS meme_limit INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS enable_write_like_me BOOLEAN DEFAULT false;

-- 2. Update values
UPDATE public.subscription_plans 
SET 
  reply_limit = COALESCE(reply_limit, monthly_limit, 10),
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
  END;

-- 3. Update pricing using CORRECT column names (monthly_price, yearly_price)
UPDATE public.subscription_plans 
SET 
  monthly_price = CASE 
    WHEN id = 'free' THEN 0
    WHEN id IN ('basic', 'growth') THEN 19
    WHEN id IN ('pro', 'professional') THEN 49
    WHEN id IN ('business', 'enterprise') THEN 99
    ELSE COALESCE(monthly_price, 0)
  END,
  yearly_price = CASE 
    WHEN id = 'free' THEN 0
    WHEN id IN ('basic', 'growth') THEN 190
    WHEN id IN ('pro', 'professional') THEN 490
    WHEN id IN ('business', 'enterprise') THEN 990
    ELSE COALESCE(yearly_price, 0)
  END;

-- 4. Insert dev_test plan if missing
INSERT INTO public.subscription_plans (
  id, 
  name, 
  description, 
  monthly_price,
  yearly_price,     -- Correct column name
  monthly_limit,
  reply_limit,
  meme_limit,
  suggestion_limit,
  max_tweet_length,
  max_response_idea_length,
  max_reply_length,
  enable_long_replies,
  enable_style_matching,
  enable_perplexity_guidance,
  enable_write_like_me,
  sort_order,
  active
)
SELECT 
  'dev_test',
  'Development Test',
  'For local development only',
  0,      -- monthly_price
  0,      -- yearly_price  
  9999,   -- monthly_limit
  9999,   -- reply_limit
  9999,   -- meme_limit
  -1,     -- suggestion_limit (unlimited)
  2000,   -- max_tweet_length
  2000,   -- max_response_idea_length
  2000,   -- max_reply_length
  true,   -- enable_long_replies
  true,   -- enable_style_matching
  true,   -- enable_perplexity_guidance
  true,   -- enable_write_like_me
  99,     -- sort_order
  true    -- active
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscription_plans WHERE id = 'dev_test'
);

-- 5. Create or replace handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert user profile
  INSERT INTO public.users (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  
  -- Auto-assign free subscription with 30-day trial
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

-- 6. Create user_subscription_info view with correct column names
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
  sp.features
FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.id AND s.is_active = true
LEFT JOIN subscription_plans sp ON sp.id = s.plan_id;

-- Grant permissions
GRANT SELECT ON user_subscription_info TO authenticated;

-- 7. Final status report
DO $$
DECLARE
    v_total_users INTEGER;
    v_trial_users INTEGER;
    v_free_plan_features RECORD;
BEGIN
    SELECT COUNT(*) INTO v_total_users FROM users;
    SELECT COUNT(*) INTO v_trial_users FROM subscriptions WHERE status = 'trialing';
    
    -- Get free plan details
    SELECT monthly_limit, reply_limit, meme_limit 
    INTO v_free_plan_features
    FROM subscription_plans 
    WHERE id = 'free';
    
    RAISE NOTICE '=== Subscription System Fixed ===';
    RAISE NOTICE 'Total Users: %', v_total_users;
    RAISE NOTICE 'Users on Free Trial: %', v_trial_users;
    RAISE NOTICE '';
    RAISE NOTICE 'Free Trial Details:';
    RAISE NOTICE '- Plan: Free';
    RAISE NOTICE '- Duration: 30 days';
    RAISE NOTICE '- Reply Limit: % per month', COALESCE(v_free_plan_features.reply_limit, v_free_plan_features.monthly_limit, 10);
    RAISE NOTICE '- Meme Limit: %', COALESCE(v_free_plan_features.meme_limit, 0);
    RAISE NOTICE '- After trial: Continues as free plan (no payment required)';
END $$;

-- Show all plans
SELECT 
  id,
  name,
  monthly_price || '/' || yearly_price as "Price (M/Y)",
  COALESCE(reply_limit, monthly_limit) as replies,
  meme_limit as memes,
  CASE WHEN enable_write_like_me THEN '✓' ELSE '✗' END as "Write Like Me",
  CASE WHEN enable_perplexity_guidance THEN '✓' ELSE '✗' END as "Perplexity"
FROM subscription_plans
WHERE active = true
ORDER BY sort_order;