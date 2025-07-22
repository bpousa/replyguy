-- Comprehensive diagnostic and fix for trigger and RLS issues
-- Run this migration to fix user creation and 406 errors

-- Step 1: Show current state
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== DIAGNOSTIC INFORMATION ===';
  RAISE NOTICE '';
END $$;

-- Check if trigger exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created')
    THEN 'NOTICE: Trigger on_auth_user_created EXISTS'
    ELSE 'WARNING: Trigger on_auth_user_created is MISSING!'
  END as trigger_check;

-- Check if function exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user')
    THEN 'NOTICE: Function handle_new_user EXISTS'
    ELSE 'WARNING: Function handle_new_user is MISSING!'
  END as function_check;

-- Check if pg_net is enabled
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')
    THEN 'NOTICE: pg_net extension is ENABLED'
    ELSE 'WARNING: pg_net extension is NOT ENABLED!'
  END as pgnet_check;

-- Step 2: Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Step 3: Grant necessary permissions for webhooks
GRANT USAGE ON SCHEMA extensions TO postgres, service_role;
GRANT EXECUTE ON FUNCTION extensions.http_post TO postgres, service_role;

-- Also try the net schema in case it's there
DO $$
BEGIN
  -- Check if net schema exists and grant permissions
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'net') THEN
    EXECUTE 'GRANT USAGE ON SCHEMA net TO postgres, service_role';
    EXECUTE 'GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA net TO postgres, service_role';
    RAISE NOTICE 'Granted permissions on net schema';
  END IF;
END $$;

-- Step 4: Drop and recreate the trigger to ensure it's properly attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Log that trigger was recreated
DO $$
BEGIN
  RAISE NOTICE 'Trigger on_auth_user_created has been recreated';
END $$;

-- Step 5: Fix RLS policies - Make them more permissive
-- First, list current policies
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'users' AND schemaname = 'public';
  
  RAISE NOTICE 'Current number of policies on public.users: %', policy_count;
END $$;

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Service role can do anything" ON public.users;
DROP POLICY IF EXISTS "Enable all operations for users on their own row" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can check if user exists" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can read own data" ON public.users;

-- Create new, more permissive policies
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (
    auth.uid() = id 
    OR auth.role() = 'service_role'
    OR auth.role() = 'authenticated' -- Allow any authenticated user to check if user exists
  );

CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id OR auth.role() = 'service_role');

CREATE POLICY "Service role bypass"
  ON public.users
  FOR ALL
  USING (auth.role() = 'service_role');

-- Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Fix policies for other tables
-- Daily usage
DROP POLICY IF EXISTS "Users can view own usage" ON public.daily_usage;
DROP POLICY IF EXISTS "Users can insert own usage" ON public.daily_usage;
DROP POLICY IF EXISTS "Users can update own usage" ON public.daily_usage;

CREATE POLICY "Users can manage own usage"
  ON public.daily_usage
  FOR ALL
  USING (auth.uid() = user_id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;

-- Subscriptions
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;

CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Referrals
DROP POLICY IF EXISTS "Users can view own referrals" ON public.referrals;

CREATE POLICY "Users can view related referrals"
  ON public.referrals
  FOR SELECT
  USING (
    auth.uid() = referrer_id 
    OR auth.uid() = referred_id 
    OR auth.role() = 'service_role'
  );

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Step 6: Test webhook connectivity
DO $$
DECLARE
  test_result TEXT;
  test_response_id BIGINT;
BEGIN
  -- Test if we can call webhooks
  BEGIN
    -- Try extensions schema first
    SELECT extensions.http_post(
      url := 'https://replyguy.appendment.com/api/ghl/test-webhook',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'test', true, 
        'source', 'migration_test',
        'timestamp', NOW()::TEXT
      )
    ) INTO test_response_id;
    
    RAISE NOTICE 'Webhook test sent successfully with ID: %', test_response_id;
  EXCEPTION WHEN OTHERS THEN
    -- If extensions.http_post fails, try net.http_post
    BEGIN
      SELECT net.http_post(
        url := 'https://replyguy.appendment.com/api/ghl/test-webhook',
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := jsonb_build_object(
          'test', true, 
          'source', 'migration_test_net',
          'timestamp', NOW()::TEXT
        )
      ) INTO test_response_id;
      
      RAISE NOTICE 'Webhook test sent via net schema with ID: %', test_response_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Webhook test failed: %', SQLERRM;
    END;
  END;
END $$;

-- Step 7: Show final summary
DO $$
DECLARE
  user_count INTEGER;
  orphaned_count INTEGER;
BEGIN
  -- Count users
  SELECT COUNT(*) INTO user_count FROM public.users;
  
  -- Count orphaned auth users
  SELECT COUNT(*) INTO orphaned_count
  FROM auth.users a
  LEFT JOIN public.users u ON a.id = u.id
  WHERE u.id IS NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== MIGRATION COMPLETE ===';
  RAISE NOTICE 'Total users in public.users: %', user_count;
  RAISE NOTICE 'Orphaned auth.users (missing from public.users): %', orphaned_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Check Vercel logs for webhook test reception';
  RAISE NOTICE '2. Run the manual user fix migration for orphaned users';
  RAISE NOTICE '3. Test creating a new user';
END $$;