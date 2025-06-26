-- Upgrade mikegiannulis@gmail.com to Professional plan
-- This script properly updates the subscriptions table instead of non-existent users columns

-- First ensure the user exists
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the user ID
  SELECT id INTO v_user_id
  FROM users
  WHERE email = 'mikegiannulis@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: mikegiannulis@gmail.com';
  END IF;
  
  -- Deactivate any existing subscriptions
  UPDATE subscriptions
  SET status = 'canceled',
      updated_at = NOW()
  WHERE user_id = v_user_id
    AND status IN ('active', 'trialing');
  
  -- Create new professional subscription
  INSERT INTO subscriptions (
    id,
    user_id,
    plan_id,
    status,
    stripe_subscription_id,
    current_period_start,
    current_period_end,
    cancel_at_period_end
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    'professional', -- or 'pro' depending on which plan ID you want
    'active',
    NULL, -- No Stripe subscription for manual upgrade
    NOW(),
    NOW() + INTERVAL '30 days',
    false
  );
END $$;

-- Initialize user_usage if not exists
INSERT INTO user_usage (user_id, billing_period_start, total_replies, total_memes, total_suggestions, total_cost)
SELECT id, CURRENT_DATE, 0, 0, 0, 0
FROM users
WHERE email = 'mikegiannulis@gmail.com'
ON CONFLICT (user_id, billing_period_start) DO NOTHING;

-- Initialize daily_usage for today
INSERT INTO daily_usage (user_id, date, replies_generated, memes_generated, suggestions_generated)
SELECT id, CURRENT_DATE, 0, 0, 0
FROM users
WHERE email = 'mikegiannulis@gmail.com'
ON CONFLICT (user_id, date) DO NOTHING;

-- Show the updated user with subscription
SELECT 
  u.email,
  s.plan_id,
  s.status as subscription_status,
  s.current_period_end,
  sp.name as plan_name,
  sp.reply_limit,
  sp.meme_limit,
  sp.suggestion_limit,
  sp.enable_write_like_me,
  sp.enable_perplexity_guidance
FROM users u
INNER JOIN subscriptions s ON s.user_id = u.id AND s.is_active = true
INNER JOIN subscription_plans sp ON sp.id = s.plan_id
WHERE u.email = 'mikegiannulis@gmail.com';