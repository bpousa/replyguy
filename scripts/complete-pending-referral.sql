-- Complete the pending referral for antoni.mike+36
-- This will award bonuses to both users

-- First check the current state
SELECT 
  r.id,
  r.status,
  referrer.email as referrer_email,
  referred.email as referred_email,
  referrer.bonus_replies as referrer_bonus,
  referred.bonus_replies as referred_bonus
FROM referrals r
JOIN users referrer ON referrer.id = r.referrer_id
JOIN users referred ON referred.id = r.referred_id
WHERE r.status = 'pending'
  AND referred.email = 'antoni.mike+36@gmail.com';

-- Complete the referral
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the referred user ID
  SELECT id INTO v_user_id 
  FROM users 
  WHERE email = 'antoni.mike+36@gmail.com';
  
  -- Call complete_referral to process it
  PERFORM complete_referral(v_user_id);
  
  RAISE NOTICE 'Completed referral for antoni.mike+36@gmail.com';
END $$;

-- Verify the results - check both users
SELECT 
  u.email,
  u.bonus_replies,
  u.bonus_research,
  r.status as referral_status,
  r.completed_at,
  (SELECT COUNT(*) FROM referrals WHERE referrer_id = u.id AND status = 'completed') as total_referrals
FROM users u
LEFT JOIN referrals r ON r.referred_id = u.id
WHERE u.email IN ('antoni.mike+35@gmail.com', 'antoni.mike+36@gmail.com')
ORDER BY u.email;

-- Check referral bonuses table
SELECT 
  u.email,
  rb.bonus_type,
  rb.bonus_replies,
  rb.bonus_memes as bonus_research,
  rb.description,
  rb.created_at
FROM referral_bonuses rb
JOIN users u ON u.id = rb.user_id
WHERE u.email IN ('antoni.mike+35@gmail.com', 'antoni.mike+36@gmail.com')
ORDER BY rb.created_at;