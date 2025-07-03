-- Restore the original handle_new_user function that was working

-- Drop the current simplified version
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Recreate the original version that handles referrals properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_code VARCHAR(20);
  v_referrer_id UUID;
BEGIN
  -- Create user profile
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
  
  -- Handle referral if code provided
  BEGIN
    v_referral_code := NEW.raw_user_meta_data->>'referral_code';
    
    IF v_referral_code IS NOT NULL AND v_referral_code != '' THEN
      -- Find referrer
      SELECT id INTO v_referrer_id
      FROM public.users
      WHERE referral_code = v_referral_code
      LIMIT 1;
      
      IF v_referrer_id IS NOT NULL THEN
        -- Update user with referral info
        UPDATE public.users 
        SET referred_by = v_referrer_id 
        WHERE id = NEW.id;
        
        -- Create referral record
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
    -- Log but don't fail signup
    RAISE WARNING 'Referral processing error: %', SQLERRM;
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
  
  -- Generate referral code for new user
  BEGIN
    PERFORM public.generate_referral_code(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Referral code generation error: %', SQLERRM;
  END;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but allow signup to complete
  RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Verify the change
SELECT 'Function restored. Testing with a dummy user...' as status;

-- Quick test
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
BEGIN
  -- Test the function works
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (test_id, 'restore-test@example.com', NOW(), NOW());
  
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
  
  RAISE NOTICE 'Function test successful';
END $$;

SELECT 'Original handle_new_user function restored' as message;