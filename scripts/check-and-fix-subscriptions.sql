-- Script to check current database state and apply necessary fixes
-- Run this with: supabase db execute -f scripts/check-and-fix-subscriptions.sql

-- First, let's check what columns exist in subscription_plans
DO $$
BEGIN
    RAISE NOTICE 'Checking subscription_plans table structure...';
END $$;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'subscription_plans'
ORDER BY ordinal_position;

-- Add missing columns if they don't exist
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS price_monthly NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_yearly NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS reply_limit INTEGER,
ADD COLUMN IF NOT EXISTS meme_limit INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS enable_write_like_me BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS enable_perplexity_guidance BOOLEAN DEFAULT false;

-- Update reply_limit from monthly_limit if it exists and reply_limit is null
UPDATE public.subscription_plans 
SET reply_limit = monthly_limit 
WHERE reply_limit IS NULL AND monthly_limit IS NOT NULL;

-- Check if we need to insert the dev_test plan
INSERT INTO public.subscription_plans (
  id, name, description, 
  price_monthly, price_yearly,
  reply_limit, monthly_limit, meme_limit, suggestion_limit,
  max_tweet_length, max_response_idea_length, max_reply_length,
  enable_memes, enable_long_replies, enable_style_matching, 
  enable_perplexity_guidance, enable_write_like_me,
  sort_order, active, popular
)
SELECT 
  'dev_test', 'Development Test', 'For local development only',
  0, 0,
  9999, 9999, 9999, -1,
  2000, 2000, 2000,
  true, true, true, true, true,
  99, true, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscription_plans WHERE id = 'dev_test'
);

-- Show current plans
SELECT id, name, price_monthly, reply_limit, meme_limit, enable_write_like_me
FROM public.subscription_plans
ORDER BY sort_order;

-- Check if subscriptions table has the is_active column
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN GENERATED ALWAYS AS (
  status IN ('active', 'trialing') AND 
  (cancel_at_period_end = false OR cancel_at_period_end IS NULL)
) STORED;

-- Create the unique index if it doesn't exist
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

-- Check current user subscriptions
SELECT 
  u.email,
  s.plan_id,
  s.status,
  sp.name as plan_name
FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.id AND s.is_active = true
LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
LIMIT 10;

-- Count users without subscriptions
SELECT COUNT(*) as users_without_subscriptions
FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.id
WHERE s.id IS NULL;

-- Backfill users without subscriptions with free plan
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
  'trialing',  -- 30-day trial at free tier
  NULL,
  NOW(),
  NOW() + INTERVAL '30 days',
  false
FROM users_without_subscription
ON CONFLICT DO NOTHING;

-- Report final state
SELECT 
  'Total Users' as metric,
  COUNT(*) as count
FROM users
UNION ALL
SELECT 
  'Users with Subscriptions',
  COUNT(DISTINCT user_id)
FROM subscriptions
WHERE is_active = true
UNION ALL
SELECT 
  'Free Plan Users',
  COUNT(*)
FROM subscriptions
WHERE plan_id = 'free' AND is_active = true;