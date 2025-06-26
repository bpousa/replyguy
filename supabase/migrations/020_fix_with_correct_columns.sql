-- Fix subscription system with correct column names
-- This version uses the actual column names in the database

-- 1. First check what columns exist and add aliases
DO $$
BEGIN
    -- Add price columns if they don't exist (as aliases)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'subscription_plans' 
                   AND column_name = 'price_monthly') THEN
        ALTER TABLE public.subscription_plans 
        ADD COLUMN price_monthly NUMERIC GENERATED ALWAYS AS (monthly_price) STORED;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'subscription_plans' 
                   AND column_name = 'price_yearly') THEN
        ALTER TABLE public.subscription_plans 
        ADD COLUMN price_yearly NUMERIC GENERATED ALWAYS AS (annual_price) STORED;
    END IF;
END $$;

-- 2. Add other missing columns
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS reply_limit INTEGER,
ADD COLUMN IF NOT EXISTS meme_limit INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS enable_write_like_me BOOLEAN DEFAULT false;

-- 3. Update limits
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
  END
WHERE reply_limit IS NULL OR meme_limit = 0;

-- 4. Update pricing using correct columns
UPDATE public.subscription_plans 
SET 
  monthly_price = CASE 
    WHEN id = 'free' THEN 0
    WHEN id IN ('basic', 'growth') THEN 19
    WHEN id IN ('pro', 'professional') THEN 49
    WHEN id IN ('business', 'enterprise') THEN 99
    ELSE monthly_price
  END,
  annual_price = CASE 
    WHEN id = 'free' THEN 0
    WHEN id IN ('basic', 'growth') THEN 190
    WHEN id IN ('pro', 'professional') THEN 490
    WHEN id IN ('business', 'enterprise') THEN 990
    ELSE annual_price
  END
WHERE monthly_price IS NULL OR monthly_price = 0;

-- 5. Enhanced handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert user profile
  INSERT INTO public.users (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  
  -- Auto-assign free subscription
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

-- 6. Create comprehensive view
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
  COALESCE(sp.monthly_price, 0) as price_monthly,
  COALESCE(sp.annual_price, 0) as price_yearly,
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

-- 7. Summary report
DO $$
DECLARE
    v_total_users INTEGER;
    v_trial_users INTEGER;
    v_plans_fixed INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_users FROM users;
    SELECT COUNT(*) INTO v_trial_users FROM subscriptions WHERE status = 'trialing';
    SELECT COUNT(*) INTO v_plans_fixed FROM subscription_plans WHERE reply_limit IS NOT NULL;
    
    RAISE NOTICE '=== Subscription System Update Complete ===';
    RAISE NOTICE 'Total Users: %', v_total_users;
    RAISE NOTICE 'Trial Users: %', v_trial_users;
    RAISE NOTICE 'Plans Updated: %', v_plans_fixed;
    RAISE NOTICE '';
    RAISE NOTICE 'Free Trial Details:';
    RAISE NOTICE '- Plan: Free (10 replies/month)';
    RAISE NOTICE '- Duration: 30 days';
    RAISE NOTICE '- Status: Trialing';
    RAISE NOTICE '- After trial: Continues as free plan';
END $$;