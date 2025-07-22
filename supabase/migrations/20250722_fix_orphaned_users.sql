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
-- First check if the table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'trial_offer_tokens'
  ) THEN
    -- Only insert if user doesn't already have a token
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
    WHERE u.created_at > NOW() - INTERVAL '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM public.trial_offer_tokens t 
        WHERE t.user_id = u.id
      );
  ELSE
    RAISE NOTICE 'trial_offer_tokens table does not exist, skipping token generation';
  END IF;
END $$;

-- Final report
DO $$
DECLARE
  users_fixed INTEGER;
  subs_created INTEGER;
  tokens_created INTEGER;
  user_record RECORD;
BEGIN
  -- Count fixes
  SELECT COUNT(*) INTO users_fixed
  FROM public.users
  WHERE updated_at > NOW() - INTERVAL '1 minute';
  
  SELECT COUNT(*) INTO subs_created
  FROM public.subscriptions
  WHERE created_at > NOW() - INTERVAL '1 minute';
  
  -- Check if trial_offer_tokens table exists before counting
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'trial_offer_tokens'
  ) THEN
    SELECT COUNT(*) INTO tokens_created
    FROM public.trial_offer_tokens
    WHERE created_at > NOW() - INTERVAL '1 minute';
  ELSE
    tokens_created := 0;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== FIX COMPLETE ===';
  RAISE NOTICE 'Users fixed: %', users_fixed;
  RAISE NOTICE 'Subscriptions created: %', subs_created;
  RAISE NOTICE 'Trial tokens created: %', tokens_created;
  RAISE NOTICE '';
  
  -- Show the fixed user details
  FOR user_record IN
    SELECT 
      u.email,
      u.referral_code,
      s.plan_id,
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'trial_offer_tokens'
        ) THEN (
          SELECT CASE WHEN COUNT(*) > 0 THEN 'Yes' ELSE 'No' END
          FROM public.trial_offer_tokens t 
          WHERE t.user_id = u.id
        )
        ELSE 'N/A (table missing)'
      END as has_token
    FROM public.users u
    LEFT JOIN public.subscriptions s ON u.id = s.user_id AND s.status = 'active'
    WHERE u.email = 'antoni.mike+102@gmail.com'
  LOOP
    RAISE NOTICE 'User % now has:', user_record.email;
    RAISE NOTICE '  - Referral code: %', user_record.referral_code;
    RAISE NOTICE '  - Subscription: %', user_record.plan_id;
    RAISE NOTICE '  - Trial token: %', user_record.has_token;
  END LOOP;
END $$;