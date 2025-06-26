-- Verify the subscription system is working correctly

-- 1. Check all users have subscriptions
SELECT 
  'Users without subscriptions' as check_name,
  COUNT(*) as count
FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.id
WHERE s.id IS NULL;

-- 2. Show subscription distribution
SELECT 
  sp.name as plan_name,
  COUNT(s.user_id) as user_count,
  s.status,
  sp.monthly_price || '/' || sp.yearly_price as pricing
FROM subscriptions s
JOIN subscription_plans sp ON sp.id = s.plan_id
GROUP BY sp.name, s.status, sp.monthly_price, sp.yearly_price, sp.sort_order
ORDER BY sp.sort_order;

-- 3. Verify plans are set up correctly
SELECT 
  id,
  name,
  monthly_price || '/' || yearly_price as "Price (M/Y)",
  COALESCE(reply_limit, monthly_limit) as reply_limit,
  meme_limit,
  suggestion_limit,
  enable_write_like_me,
  enable_perplexity_guidance
FROM subscription_plans
WHERE active = true
ORDER BY sort_order;

-- 4. Check a sample user's subscription details
SELECT 
  u.email,
  usi.plan_name,
  usi.subscription_status,
  usi.current_period_end,
  usi.reply_limit,
  usi.meme_limit,
  usi.enable_write_like_me
FROM user_subscription_info usi
JOIN users u ON u.id = usi.user_id
LIMIT 5;

-- 5. Verify no duplicate active subscriptions
SELECT 
  'Users with multiple active subscriptions' as check_name,
  COUNT(*) as count
FROM (
  SELECT user_id, COUNT(*) as sub_count
  FROM subscriptions
  WHERE is_active = true
  GROUP BY user_id
  HAVING COUNT(*) > 1
) duplicates;