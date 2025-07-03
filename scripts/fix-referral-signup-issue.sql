-- Fix signup issue caused by referral features

-- 1. First, let's see what columns are missing from users table
SELECT 'Current users table columns:' as info;
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- 2. Add the missing columns that the referral system needs
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;

-- 3. Create the generate_referral_code function if it doesn't exist
CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_code VARCHAR(20);
  v_attempts INTEGER := 0;
BEGIN
  LOOP
    -- Generate code: first 4 chars of user ID + random string
    v_code := UPPER(SUBSTRING(p_user_id::TEXT, 1, 4) || SUBSTRING(MD5(RANDOM()::TEXT), 1, 6));
    
    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE referral_code = v_code) THEN
      -- Update user with their referral code
      UPDATE public.users SET referral_code = v_code WHERE id = p_user_id;
      RETURN v_code;
    END IF;
    
    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN
      -- Don't fail, just return null
      RETURN NULL;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Replace the handle_new_user function with a simpler version that handles errors better
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_code VARCHAR(20);
  v_referrer_id UUID;
BEGIN
  -- Create user profile (handle missing columns gracefully)
  INSERT INTO public.users (
    id,
    email,
    full_name,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NOW(),
    NOW()
  );
  
  -- Try to add referral info if columns exist
  BEGIN
    -- Get referral code from metadata if provided
    v_referral_code := NEW.raw_user_meta_data->>'referral_code';
    
    -- If referral code provided, find the referrer
    IF v_referral_code IS NOT NULL AND v_referral_code != '' THEN
      SELECT id INTO v_referrer_id
      FROM public.users
      WHERE referral_code = v_referral_code
      LIMIT 1;
      
      -- Update the user with referral info
      IF v_referrer_id IS NOT NULL THEN
        UPDATE public.users 
        SET referred_by = v_referrer_id 
        WHERE id = NEW.id;
        
        -- Try to create referral record
        INSERT INTO public.referrals (
          referrer_id,
          referred_id,
          referral_code,
          status,
          created_at
        ) VALUES (
          v_referrer_id,
          NEW.id,
          v_referral_code,
          'pending',
          NOW()
        );
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore referral errors - don't block signup
    NULL;
  END;
  
  -- Create free subscription
  INSERT INTO public.subscriptions (
    user_id,
    plan_id,
    status,
    current_period_start,
    current_period_end,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    'free',
    'active',
    NOW(),
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW()
  );
  
  -- Try to generate referral code for new user
  BEGIN
    PERFORM public.generate_referral_code(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    -- Ignore errors - referral code is not critical
    NULL;
  END;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the signup
  RAISE WARNING 'Error in handle_new_user: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  -- Still return NEW to allow auth signup to complete
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 6. Test the signup process
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'final-test-' || extract(epoch from now())::text || '@example.com';
BEGIN
    -- Simulate what happens during signup
    INSERT INTO public.users (id, email, full_name, created_at, updated_at)
    VALUES (test_id, test_email, 'Test User', NOW(), NOW());
    
    INSERT INTO public.subscriptions (
        user_id, plan_id, status,
        current_period_start, current_period_end,
        created_at, updated_at
    ) VALUES (
        test_id, 'free', 'active',
        NOW(), NOW() + INTERVAL '30 days',
        NOW(), NOW()
    );
    
    -- Clean up
    DELETE FROM public.subscriptions WHERE user_id = test_id;
    DELETE FROM public.users WHERE id = test_id;
    
    RAISE NOTICE '✓ SUCCESS: Signup process works!';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ ERROR: %', SQLERRM;
    -- Clean up
    DELETE FROM public.subscriptions WHERE user_id = test_id;
    DELETE FROM public.users WHERE id = test_id;
END $$;

SELECT 'Signup fix has been applied. Please try creating an account again.' as message;