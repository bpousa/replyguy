-- Backfill existing users with free subscriptions
-- This ensures all users have at least a free subscription record

-- First, identify users without any subscription
WITH users_without_subscription AS (
  SELECT u.id as user_id
  FROM users u
  LEFT JOIN subscriptions s ON s.user_id = u.id
  WHERE s.id IS NULL
)
-- Create free subscriptions for these users
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
  'active',
  NULL,
  NOW(),
  NOW() + INTERVAL '30 days',
  false
FROM users_without_subscription;

-- Also ensure all users have initial usage records
-- Insert missing user_usage records for the current billing period
INSERT INTO user_usage (
  user_id, 
  billing_period_start, 
  total_replies, 
  total_memes, 
  total_suggestions, 
  total_cost
)
SELECT 
  u.id,
  DATE_TRUNC('month', CURRENT_DATE),
  0,
  0,
  0,
  0
FROM users u
WHERE NOT EXISTS (
  SELECT 1 
  FROM user_usage uu 
  WHERE uu.user_id = u.id 
    AND uu.billing_period_start = DATE_TRUNC('month', CURRENT_DATE)
)
ON CONFLICT (user_id, billing_period_start) DO NOTHING;

-- Insert missing daily_usage records for today
INSERT INTO daily_usage (
  user_id,
  date,
  replies_generated,
  memes_generated,
  suggestions_generated
)
SELECT 
  u.id,
  CURRENT_DATE,
  0,
  0,
  0
FROM users u
WHERE NOT EXISTS (
  SELECT 1 
  FROM daily_usage du 
  WHERE du.user_id = u.id 
    AND du.date = CURRENT_DATE
)
ON CONFLICT (user_id, date) DO NOTHING;

-- Report on the migration results
SELECT 
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT s.user_id) as users_with_subscriptions,
  COUNT(DISTINCT CASE WHEN s.plan_id = 'free' THEN s.user_id END) as free_users,
  COUNT(DISTINCT CASE WHEN s.plan_id IN ('basic', 'growth') THEN s.user_id END) as basic_users,
  COUNT(DISTINCT CASE WHEN s.plan_id IN ('pro', 'professional') THEN s.user_id END) as pro_users,
  COUNT(DISTINCT CASE WHEN s.plan_id IN ('business', 'enterprise') THEN s.user_id END) as business_users
FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.id AND s.is_active = true;