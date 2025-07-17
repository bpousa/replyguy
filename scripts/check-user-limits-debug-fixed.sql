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

-- 2. Check subscription_plans table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'subscription_plans' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check active subscription and plan limits (with correct column names)
SELECT 
  u.email,
  s.plan_id,
  s.status as subscription_status,
  sp.*,
  u.bonus_replies,
  u.bonus_research
FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status IN ('active', 'trialing')
LEFT JOIN subscription_plans sp ON sp.id = COALESCE(s.plan_id, 'free')
WHERE u.email = 'antoni.mike+35@gmail.com';

-- 4. Check referral bonuses in detail
SELECT 
  rb.*,
  r.status as referral_status,
  referred.email as referred_user
FROM referral_bonuses rb
JOIN referrals r ON r.id = rb.referral_id
JOIN users referred ON referred.id = r.referred_id
WHERE rb.user_id = (SELECT id FROM users WHERE email = 'antoni.mike+35@gmail.com');

-- 5. Check what get_user_limits function returns
SELECT * FROM get_user_limits(
  (SELECT id FROM users WHERE email = 'antoni.mike+35@gmail.com')
);

-- 6. Check current month usage
SELECT * FROM get_current_usage(
  (SELECT id FROM users WHERE email = 'antoni.mike+35@gmail.com')
);

-- 7. Check if referral was completed
SELECT 
  r.id,
  r.status,
  r.completed_at,
  referrer.email as referrer_email,
  referrer.bonus_replies as referrer_bonus,
  referred.email as referred_email,
  referred.bonus_replies as referred_bonus
FROM referrals r
JOIN users referrer ON referrer.id = r.referrer_id
JOIN users referred ON referred.id = r.referred_id
WHERE referrer.email = 'antoni.mike+35@gmail.com' 
   OR referred.email = 'antoni.mike+35@gmail.com';