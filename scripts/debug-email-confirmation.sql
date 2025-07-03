-- Debug script for email confirmation issues
-- Run this in Supabase SQL editor to diagnose problems

-- 1. Check recent auth users and their confirmation status
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  raw_user_meta_data->>'referral_code' as referral_code,
  raw_user_meta_data->>'selected_plan' as selected_plan
FROM auth.users
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- 2. Check if users are being created in public.users table
SELECT 
  u.id,
  u.email,
  u.created_at,
  u.referral_code,
  u.referred_by,
  u.subscription_tier
FROM public.users u
WHERE u.created_at > NOW() - INTERVAL '24 hours'
ORDER BY u.created_at DESC;

-- 3. Check for any failed referral records
SELECT 
  r.*,
  u1.email as referrer_email,
  u2.email as referred_email
FROM referrals r
LEFT JOIN public.users u1 ON r.referrer_id = u1.id
LEFT JOIN public.users u2 ON r.referred_id = u2.id
WHERE r.created_at > NOW() - INTERVAL '24 hours'
ORDER BY r.created_at DESC;

-- 4. Check if handle_new_user trigger is working
-- This will show any errors in the postgres logs
DO $$
BEGIN
  RAISE NOTICE 'Checking handle_new_user function...';
  -- Test with a dummy user ID (won't actually insert)
  PERFORM handle_new_user();
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in handle_new_user: %', SQLERRM;
END $$;

-- 5. Check email verification trigger
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'handle_email_verified';

-- 6. Temporary fix: If users exist in auth but not in public.users
-- This will create missing user records
INSERT INTO public.users (id, email, full_name, referred_by)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', ''),
  NULL
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
  AND au.created_at > NOW() - INTERVAL '7 days'
ON CONFLICT (id) DO NOTHING;

-- 7. Fix missing subscriptions for users
INSERT INTO public.subscriptions (
  user_id,
  plan_id,
  status,
  current_period_start,
  current_period_end
)
SELECT 
  u.id,
  'free',
  'active',
  NOW(),
  NOW() + INTERVAL '30 days'
FROM public.users u
LEFT JOIN public.subscriptions s ON u.id = s.user_id
WHERE s.id IS NULL
  AND u.created_at > NOW() - INTERVAL '7 days'
ON CONFLICT DO NOTHING;

-- 8. Generate missing referral codes
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id FROM public.users 
    WHERE referral_code IS NULL
    AND created_at > NOW() - INTERVAL '7 days'
  LOOP
    PERFORM generate_referral_code(user_record.id);
  END LOOP;
END $$;

-- 9. Complete any pending referrals for confirmed emails
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT au.id 
    FROM auth.users au
    JOIN referrals r ON r.referred_id = au.id
    WHERE au.email_confirmed_at IS NOT NULL
    AND r.status = 'pending'
  LOOP
    PERFORM complete_referral(user_record.id);
  END LOOP;
END $$;

-- 10. Show current auth configuration
SELECT 
  key,
  value
FROM auth.config
WHERE key IN ('site_url', 'redirect_url', 'external_url');