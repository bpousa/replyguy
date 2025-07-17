-- Script to manually fix the specific referral case
-- antoni.mike+36@gmail.com was referred by antoni.mike+35@gmail.com

-- First check the current state
SELECT 
  u.id,
  u.email,
  u.referral_code,
  u.referred_by,
  u.bonus_replies,
  u.bonus_research,
  s.plan_id,
  s.status as subscription_status
FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status IN ('active', 'trialing')
WHERE u.email IN ('antoni.mike+35@gmail.com', 'antoni.mike+36@gmail.com')
ORDER BY u.email;

-- Check existing referrals
SELECT 
  r.*,
  referrer.email as referrer_email,
  referred.email as referred_email
FROM referrals r
JOIN users referrer ON referrer.id = r.referrer_id
JOIN users referred ON referred.id = r.referred_id
WHERE referrer.email = 'antoni.mike+35@gmail.com'
   OR referred.email = 'antoni.mike+36@gmail.com';

-- Manually complete the referral
DO $$
DECLARE
  v_referrer_id UUID;
  v_referred_id UUID;
BEGIN
  -- Get user IDs
  SELECT id INTO v_referrer_id FROM users WHERE email = 'antoni.mike+35@gmail.com';
  SELECT id INTO v_referred_id FROM users WHERE email = 'antoni.mike+36@gmail.com';
  
  IF v_referrer_id IS NOT NULL AND v_referred_id IS NOT NULL THEN
    -- Call complete_referral which will handle everything
    PERFORM complete_referral(v_referred_id);
    
    RAISE NOTICE 'Completed referral for % (referred by %)', v_referred_id, v_referrer_id;
  ELSE
    RAISE NOTICE 'Could not find one or both users';
  END IF;
END $$;

-- Check the results
SELECT 
  u.email,
  u.bonus_replies,
  u.bonus_research,
  rb.bonus_type,
  rb.bonus_replies as awarded_replies,
  rb.bonus_memes as awarded_research,
  rb.description,
  rb.created_at
FROM users u
LEFT JOIN referral_bonuses rb ON rb.user_id = u.id
WHERE u.email IN ('antoni.mike+35@gmail.com', 'antoni.mike+36@gmail.com')
ORDER BY u.email, rb.created_at;