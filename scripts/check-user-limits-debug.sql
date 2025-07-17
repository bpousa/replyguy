-- Debug query to check user limits including referral bonuses
-- For user: antoni.mike+35@gmail.com

-- 1. Check user details and bonuses
SELECT 
  u.id,
  u.email,
  u.subscription_tier,
  u.bonus_replies,
  u.bonus_research,
  u.referral_code
FROM users u
WHERE u.email = 'antoni.mike+35@gmail.com';

-- 2. Check active subscription and plan limits
SELECT 
  u.email,
  s.plan_id,
  s.status as subscription_status,
  sp.reply_limit as base_reply_limit,
  sp.research_limit as base_research_limit,
  u.bonus_replies,
  u.bonus_research,
  (sp.reply_limit + COALESCE(u.bonus_replies, 0)) as total_reply_limit,
  (sp.research_limit + COALESCE(u.bonus_research, 0)) as total_research_limit
FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status IN ('active', 'trialing')
LEFT JOIN subscription_plans sp ON sp.id = COALESCE(s.plan_id, 'free')
WHERE u.email = 'antoni.mike+35@gmail.com';

-- 3. Check referral bonuses in detail
SELECT 
  rb.*,
  r.status as referral_status,
  referred.email as referred_user
FROM referral_bonuses rb
JOIN referrals r ON r.id = rb.referral_id
JOIN users referred ON referred.id = r.referred_id
WHERE rb.user_id = (SELECT id FROM users WHERE email = 'antoni.mike+35@gmail.com');

-- 4. Check what get_user_limits function returns
SELECT * FROM get_user_limits(
  (SELECT id FROM users WHERE email = 'antoni.mike+35@gmail.com')
);

-- 5. Check current month usage
SELECT * FROM get_current_usage(
  (SELECT id FROM users WHERE email = 'antoni.mike+35@gmail.com')
);

-- 6. Manual calculation of what limits should be
WITH user_data AS (
  SELECT 
    u.id,
    u.email,
    u.subscription_tier,
    COALESCE(u.bonus_replies, 0) as bonus_replies,
    COALESCE(u.bonus_research, 0) as bonus_research
  FROM users u
  WHERE u.email = 'antoni.mike+35@gmail.com'
),
plan_data AS (
  SELECT 
    sp.*,
    ud.bonus_replies,
    ud.bonus_research
  FROM user_data ud
  CROSS JOIN subscription_plans sp
  WHERE sp.id = COALESCE(ud.subscription_tier, 'free')
)
SELECT 
  'Expected Limits:' as info,
  reply_limit as base_replies,
  bonus_replies,
  (reply_limit + bonus_replies) as total_replies,
  research_limit as base_research,
  bonus_research,
  (research_limit + bonus_research) as total_research
FROM plan_data;