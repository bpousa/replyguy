-- Debug referral bonuses issue
-- Check if referral was created and its status

-- 1. Check if the referral exists and its status
SELECT 
  r.id,
  r.referrer_id,
  r.referred_id,
  r.referral_code,
  r.status,
  r.created_at,
  r.completed_at,
  u_referrer.email as referrer_email,
  u_referred.email as referred_email
FROM referrals r
JOIN users u_referrer ON r.referrer_id = u_referrer.id
JOIN users u_referred ON r.referred_id = u_referred.id
WHERE u_referrer.email = 'antoni.mike+17@gmail.com'
   OR u_referred.email = 'antoni.mike+18@gmail.com'
ORDER BY r.created_at DESC;

-- 2. Check if referral bonuses exist for the referrer
SELECT 
  rb.*,
  u.email
FROM referral_bonuses rb
JOIN users u ON rb.user_id = u.id
WHERE u.email = 'antoni.mike+17@gmail.com';

-- 3. Check if the email verification trigger exists
SELECT 
  tgname as trigger_name,
  tgtype,
  proname as function_name,
  tgenabled as enabled
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE tgname = 'on_email_verified';

-- 4. Check if the referred user's email is confirmed
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email IN ('antoni.mike+17@gmail.com', 'antoni.mike+18@gmail.com')
ORDER BY created_at DESC;

-- 5. Check the complete_referral function exists
SELECT 
  proname as function_name,
  prosrc as function_source
FROM pg_proc
WHERE proname = 'complete_referral'
LIMIT 1;

-- 6. Manually test the complete_referral function for the referred user
-- First get the referred user's ID
DO $$
DECLARE
  v_referred_id UUID;
BEGIN
  SELECT id INTO v_referred_id
  FROM auth.users
  WHERE email = 'antoni.mike+18@gmail.com';
  
  IF v_referred_id IS NOT NULL THEN
    RAISE NOTICE 'Attempting to complete referral for user: %', v_referred_id;
    PERFORM complete_referral(v_referred_id);
    RAISE NOTICE 'Complete referral function executed';
  ELSE
    RAISE NOTICE 'User not found';
  END IF;
END $$;

-- 7. Check the results after manual execution
SELECT 
  r.id,
  r.status,
  r.completed_at,
  rb.bonus_replies,
  rb.bonus_research,
  rb.total_referrals
FROM referrals r
LEFT JOIN referral_bonuses rb ON r.referrer_id = rb.user_id
JOIN users u_referrer ON r.referrer_id = u_referrer.id
JOIN users u_referred ON r.referred_id = u_referred.id
WHERE u_referrer.email = 'antoni.mike+17@gmail.com'
   AND u_referred.email = 'antoni.mike+18@gmail.com';