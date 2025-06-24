-- Upgrade mikegiannulis@gmail.com to Professional plan
UPDATE users 
SET 
  subscription_tier = 'professional',
  subscription_status = 'active',
  monthly_limit = 500,
  subscription_current_period_end = NOW() + INTERVAL '30 days'
WHERE email = 'mikegiannulis@gmail.com';

-- Initialize user_usage if not exists
INSERT INTO user_usage (user_id, reply_count, meme_count, suggestion_count)
SELECT id, 0, 0, 0
FROM users
WHERE email = 'mikegiannulis@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- Initialize daily_usage for today
INSERT INTO daily_usage (user_id, date, replies_generated, memes_generated)
SELECT id, CURRENT_DATE, 0, 0
FROM users
WHERE email = 'mikegiannulis@gmail.com'
ON CONFLICT (user_id, date) DO NOTHING;

-- Show the updated user
SELECT 
  u.email,
  u.subscription_tier,
  u.subscription_status,
  sp.name as plan_name,
  sp.reply_limit,
  sp.meme_limit,
  sp.suggestion_limit
FROM users u
LEFT JOIN subscription_plans sp ON sp.id = u.subscription_tier
WHERE u.email = 'mikegiannulis@gmail.com';