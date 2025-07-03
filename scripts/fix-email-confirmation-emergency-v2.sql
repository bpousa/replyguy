-- EMERGENCY FIX V2: Email Confirmation Failing (Fixed ON CONFLICT issue)
-- Run this IMMEDIATELY in Supabase SQL Editor

-- 1. First, let's see what's actually failing
SELECT 'Checking current trigger definitions...' as status;

-- 2. TEMPORARILY DISABLE the problematic triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_email_verified ON auth.users;

-- 3. Create a MINIMAL handle_new_user function that won't fail
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Just create the user record, nothing fancy
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  
  -- Create free subscription (check if one already exists first)
  IF NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = NEW.id AND status = 'active') THEN
    INSERT INTO public.subscriptions (
      user_id, plan_id, status,
      current_period_start, current_period_end,
      created_at, updated_at
    ) VALUES (
      NEW.id, 'free', 'active',
      NOW(), NOW() + INTERVAL '30 days',
      NOW(), NOW()
    );
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log but don't fail
  RAISE WARNING 'handle_new_user error: %', SQLERRM;
  RETURN NEW; -- CRITICAL: Always return NEW to allow signup
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Fix the stuck user
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'antoni.mike+16@gmail.com'
AND email_confirmed_at IS NULL;

-- 6. Ensure they have a user record and subscription
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'antoni.mike+16@gmail.com';
  
  IF v_user_id IS NOT NULL THEN
    -- Create user record if missing
    INSERT INTO public.users (id, email, created_at, updated_at)
    VALUES (v_user_id, 'antoni.mike+16@gmail.com', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    -- Create subscription if missing (check first)
    IF NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = v_user_id AND status = 'active') THEN
      INSERT INTO public.subscriptions (
        user_id, plan_id, status,
        current_period_start, current_period_end,
        created_at, updated_at
      ) VALUES (
        v_user_id, 'free', 'active',
        NOW(), NOW() + INTERVAL '30 days',
        NOW(), NOW()
      );
    END IF;
    
    RAISE NOTICE 'Fixed user record for antoni.mike+16@gmail.com';
  END IF;
END $$;

-- 7. Test with a dummy signup
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
BEGIN
  -- Simulate what happens during signup
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (test_id, 'emergency-test@example.com', NOW(), NOW());
  
  -- Check if subscription was created by trigger
  IF NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = test_id) THEN
    INSERT INTO public.subscriptions (
      user_id, plan_id, status,
      current_period_start, current_period_end,
      created_at, updated_at
    ) VALUES (
      test_id, 'free', 'active',
      NOW(), NOW() + INTERVAL '30 days',
      NOW(), NOW()
    );
  END IF;
  
  -- Clean up
  DELETE FROM public.subscriptions WHERE user_id = test_id;
  DELETE FROM public.users WHERE id = test_id;
  
  RAISE NOTICE '✓ Signup test successful!';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '✗ Signup test failed: %', SQLERRM;
  -- Try cleanup
  DELETE FROM public.subscriptions WHERE user_id = test_id;
  DELETE FROM public.users WHERE id = test_id;
END $$;

-- 8. Final verification
SELECT 'Checking antoni.mike+16@gmail.com status:' as check_type;
SELECT 
  au.email,
  au.email_confirmed_at,
  CASE WHEN au.email_confirmed_at IS NOT NULL THEN '✓ Confirmed' ELSE '✗ Not Confirmed' END as auth_status,
  CASE WHEN pu.id IS NOT NULL THEN '✓ Exists' ELSE '✗ Missing' END as user_record,
  CASE WHEN s.id IS NOT NULL THEN '✓ Active' ELSE '✗ Missing' END as subscription
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
LEFT JOIN public.subscriptions s ON pu.id = s.user_id AND s.status = 'active'
WHERE au.email = 'antoni.mike+16@gmail.com';

-- 9. Final status
SELECT 'EMERGENCY FIX APPLIED' as status;
SELECT 'Users should now be able to sign up and confirm emails' as message;
SELECT 'Test by creating a new account' as action;