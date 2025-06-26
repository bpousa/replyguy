-- Comprehensive fix for subscription system
-- This migration handles existing table structures gracefully

-- 1. Add missing columns to subscription_plans if they don't exist
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS price_monthly NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_yearly NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS reply_limit INTEGER,
ADD COLUMN IF NOT EXISTS meme_limit INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS enable_write_like_me BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS enable_perplexity_guidance BOOLEAN DEFAULT false;

-- 2. Update reply_limit from monthly_limit if needed
UPDATE public.subscription_plans 
SET reply_limit = COALESCE(reply_limit, monthly_limit, 10)
WHERE reply_limit IS NULL;

-- 3. Ensure meme_limit is set correctly
UPDATE public.subscription_plans 
SET meme_limit = CASE 
  WHEN id = 'free' THEN 0
  WHEN id IN ('basic', 'growth') THEN 10
  WHEN id IN ('pro', 'professional') THEN 50
  WHEN id IN ('business', 'enterprise') THEN 100
  ELSE 0
END
WHERE meme_limit IS NULL OR meme_limit = 0;

-- 4. Insert dev_test plan if it doesn't exist
INSERT INTO public.subscription_plans (
  id, name, description, 
  price_monthly, price_yearly,
  reply_limit, monthly_limit, meme_limit, suggestion_limit,
  max_tweet_length, max_response_idea_length, max_reply_length,
  enable_memes, enable_long_replies, enable_style_matching, 
  enable_perplexity_guidance, enable_write_like_me,
  sort_order, active
)
VALUES (
  'dev_test', 'Development Test', 'For local development only',
  0, 0,
  9999, 9999, 9999, -1,
  2000, 2000, 2000,
  true, true, true, true, true,
  99, true
)
ON CONFLICT (id) DO NOTHING;

-- 5. Add is_active column to subscriptions if it doesn't exist
DO $$
BEGIN
    -- Check if column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.subscriptions 
        ADD COLUMN is_active BOOLEAN GENERATED ALWAYS AS (
            status IN ('active', 'trialing') AND 
            (cancel_at_period_end = false OR cancel_at_period_end IS NULL)
        ) STORED;
    END IF;
END $$;

-- 6. Create unique index if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_one_active_subscription_per_user'
    ) THEN
        CREATE UNIQUE INDEX idx_one_active_subscription_per_user 
        ON public.subscriptions (user_id) 
        WHERE is_active = true;
    END IF;
END $$;

-- 7. Drop and recreate the handle_new_user function with subscription creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert user profile if it doesn't exist
  INSERT INTO public.users (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  
  -- Auto-assign free subscription with trial status if user doesn't have one
  INSERT INTO public.subscriptions (
    id,
    user_id,
    plan_id,
    status,
    stripe_subscription_id,
    current_period_start,
    current_period_end,
    cancel_at_period_end
  )
  SELECT
    gen_random_uuid(),
    NEW.id,
    'free',
    'trialing',
    NULL,
    NOW(),
    NOW() + INTERVAL '30 days',
    false
  WHERE NOT EXISTS (
    SELECT 1 FROM public.subscriptions 
    WHERE user_id = NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Backfill existing users without subscriptions
WITH users_without_subscription AS (
  SELECT u.id as user_id
  FROM users u
  LEFT JOIN subscriptions s ON s.user_id = u.id
  WHERE s.id IS NULL
)
INSERT INTO subscriptions (
  id,
  user_id,
  plan_id,
  status,
  stripe_subscription_id,
  current_period_start,
  current_period_end,
  cancel_at_period_end
)
SELECT 
  gen_random_uuid(),
  user_id,
  'free',
  'trialing',
  NULL,
  NOW(),
  NOW() + INTERVAL '30 days',
  false
FROM users_without_subscription;

-- 9. Create the user_subscription_info view if it doesn't exist
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

-- Grant permissions
GRANT SELECT ON user_subscription_info TO authenticated;

-- 10. Report the final state
DO $$
DECLARE
    v_total_users INTEGER;
    v_users_with_subs INTEGER;
    v_free_users INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_users FROM users;
    SELECT COUNT(DISTINCT user_id) INTO v_users_with_subs FROM subscriptions WHERE is_active = true;
    SELECT COUNT(*) INTO v_free_users FROM subscriptions WHERE plan_id = 'free' AND is_active = true;
    
    RAISE NOTICE 'Subscription System Fixed!';
    RAISE NOTICE 'Total Users: %', v_total_users;
    RAISE NOTICE 'Users with Subscriptions: %', v_users_with_subs;
    RAISE NOTICE 'Free Plan Users (including trials): %', v_free_users;
END $$;