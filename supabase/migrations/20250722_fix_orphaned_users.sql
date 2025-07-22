-- Fix orphaned users that exist in auth.users but not in public.users
-- This includes the test user antoni.mike+102@gmail.com

-- First, show which users will be fixed
DO $$
DECLARE
  orphan_record RECORD;
  fixed_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Finding orphaned users...';
  RAISE NOTICE '';
  
  FOR orphan_record IN 
    SELECT 
      a.id,
      a.email,
      a.created_at,
      a.raw_user_meta_data->>'full_name' as full_name,
      a.raw_user_meta_data->>'phone' as phone,
      a.raw_user_meta_data->>'sms_opt_in' as sms_opt_in
    FROM auth.users a
    LEFT JOIN public.users u ON a.id = u.id
    WHERE u.id IS NULL
    ORDER BY a.created_at DESC
  LOOP
    RAISE NOTICE 'Found orphaned user: % (%)', orphan_record.email, orphan_record.id;
    fixed_count := fixed_count + 1;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Total orphaned users found: %', fixed_count;
END $$;

-- Fix all orphaned users
INSERT INTO public.users (
  id,
  email,
  full_name,
  phone,
  sms_opt_in,
  referral_code,
  created_at,
  updated_at
) 
SELECT 
  a.id,
  a.email,
  COALESCE(a.raw_user_meta_data->>'full_name', ''),
  a.raw_user_meta_data->>'phone',
  COALESCE((a.raw_user_meta_data->>'sms_opt_in')::boolean, false),
  UPPER(SUBSTRING(MD5(RANDOM()::TEXT || a.id::TEXT || CLOCK_TIMESTAMP()::TEXT) FOR 6)),
  a.created_at,
  NOW()
FROM auth.users a
LEFT JOIN public.users u ON a.id = u.id
WHERE u.id IS NULL
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = CASE 
    WHEN public.users.full_name = '' OR public.users.full_name IS NULL 
    THEN EXCLUDED.full_name 
    ELSE public.users.full_name 
  END,
  phone = CASE 
    WHEN public.users.phone IS NULL 
    THEN EXCLUDED.phone 
    ELSE public.users.phone 
  END,
  updated_at = NOW();

-- Create free subscriptions for users without one
INSERT INTO public.subscriptions (
  user_id,
  plan_id,
  status,
  current_period_start,
  current_period_end,
  created_at,
  updated_at
)
SELECT 
  u.id,
  'free',
  'active',
  COALESCE(u.created_at, NOW()),
  COALESCE(u.created_at, NOW()) + INTERVAL '30 days',
  COALESCE(u.created_at, NOW()),
  NOW()
FROM public.users u
LEFT JOIN public.subscriptions s ON u.id = s.user_id AND s.status = 'active'
WHERE s.id IS NULL
ON CONFLICT (user_id, plan_id) WHERE status = 'active' DO NOTHING;

-- Generate trial tokens for recently created users (last 7 days) who don't have one
INSERT INTO public.trial_offer_tokens (
  user_id,
  token,
  expires_at,
  source
)
SELECT 
  u.id,
  encode(gen_random_bytes(32), 'hex'),
  NOW() + INTERVAL '7 days',
  'migration_fix'
FROM public.users u
LEFT JOIN public.trial_offer_tokens t ON u.id = t.user_id
WHERE u.created_at > NOW() - INTERVAL '7 days'
  AND t.id IS NULL
ON CONFLICT DO NOTHING;

-- Final report
DO $$
DECLARE
  users_fixed INTEGER;
  subs_created INTEGER;
  tokens_created INTEGER;
BEGIN
  -- Count fixes
  SELECT COUNT(*) INTO users_fixed
  FROM public.users
  WHERE updated_at > NOW() - INTERVAL '1 minute';
  
  SELECT COUNT(*) INTO subs_created
  FROM public.subscriptions
  WHERE created_at > NOW() - INTERVAL '1 minute';
  
  SELECT COUNT(*) INTO tokens_created
  FROM public.trial_offer_tokens
  WHERE created_at > NOW() - INTERVAL '1 minute';
  
  RAISE NOTICE '';
  RAISE NOTICE '=== FIX COMPLETE ===';
  RAISE NOTICE 'Users fixed: %', users_fixed;
  RAISE NOTICE 'Subscriptions created: %', subs_created;
  RAISE NOTICE 'Trial tokens created: %', tokens_created;
  RAISE NOTICE '';
  
  -- Show the fixed user
  PERFORM 
    RAISE NOTICE 'User % now has:' || E'\n' ||
                 '  - Referral code: %' || E'\n' ||
                 '  - Subscription: %' || E'\n' ||
                 '  - Trial token: %',
    u.email,
    u.referral_code,
    s.plan_id,
    CASE WHEN t.id IS NOT NULL THEN 'Yes' ELSE 'No' END
  FROM public.users u
  LEFT JOIN public.subscriptions s ON u.id = s.user_id AND s.status = 'active'
  LEFT JOIN public.trial_offer_tokens t ON u.id = t.user_id
  WHERE u.email = 'antoni.mike+102@gmail.com';
END $$;