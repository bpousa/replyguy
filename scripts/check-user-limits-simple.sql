-- Simple debug query for user limits
-- For user: antoni.mike+35@gmail.com

-- 1. Check user's bonus values
SELECT 
  id,
  email,
  subscription_tier,
  bonus_replies,
  bonus_research
FROM users 
WHERE email = 'antoni.mike+35@gmail.com';

-- 2. Check subscription plan columns (to see what columns actually exist)
SELECT * 
FROM subscription_plans 
WHERE id = 'professional'
LIMIT 1;

-- 3. Check if the referral was completed and bonuses applied
SELECT 
  'Referrer' as role,
  u.email,
  u.bonus_replies,
  u.bonus_research,
  (SELECT COUNT(*) FROM referrals WHERE referrer_id = u.id AND status = 'completed') as completed_referrals
FROM users u
WHERE u.email = 'antoni.mike+35@gmail.com'

UNION ALL

SELECT 
  'Referred' as role,
  u.email,
  u.bonus_replies,
  u.bonus_research,
  0 as completed_referrals
FROM users u
WHERE u.email = 'antoni.mike+36@gmail.com';

-- 4. Check referral_bonuses table
SELECT 
  u.email,
  rb.bonus_type,
  rb.bonus_replies,
  rb.bonus_memes,
  rb.created_at
FROM referral_bonuses rb
JOIN users u ON u.id = rb.user_id
WHERE u.email IN ('antoni.mike+35@gmail.com', 'antoni.mike+36@gmail.com')
ORDER BY rb.created_at;

-- 5. Manual check - what should the limits be?
-- This will show the base limit from the plan
SELECT 
  u.email,
  sp.reply_limit as base_replies,
  u.bonus_replies,
  sp.reply_limit + COALESCE(u.bonus_replies, 0) as total_should_be
FROM users u
LEFT JOIN subscription_plans sp ON sp.id = 'professional'  -- X Pro plan
WHERE u.email = 'antoni.mike+35@gmail.com';