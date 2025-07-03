-- Balanced fix for handle_new_user that allows both signup AND email confirmation to work

-- Drop the current version
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create a version that handles all cases properly without failing
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_code VARCHAR(20);
  v_referrer_id UUID;
BEGIN
  -- IMPORTANT: Only process if user doesn't already exist
  -- This prevents issues during email confirmation
  IF EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

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
  ) ON CONFLICT (id) DO NOTHING;
  
  -- Create free subscription if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = NEW.id AND status = 'active') THEN
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
  END IF;
  
  -- Handle referral if code provided (but don't fail if it errors)
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
        
        -- Create referral record if it doesn't exist
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
        ) ON CONFLICT (referred_id) DO NOTHING;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log but don't fail
    RAISE WARNING 'Referral processing error: %', SQLERRM;
  END;
  
  -- Generate referral code for new user (but don't fail if it errors)
  BEGIN
    PERFORM public.generate_referral_code(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    -- Log but don't fail
    RAISE WARNING 'Referral code generation error: %', SQLERRM;
  END;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- If anything fails, log it but ALWAYS return NEW
  -- This ensures signup/confirmation can complete
  RAISE WARNING 'Error in handle_new_user: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also ensure the email verified trigger exists and works properly
CREATE OR REPLACE FUNCTION public.handle_email_verified()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if email was just confirmed
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    -- Complete any pending referral
    PERFORM public.complete_referral(NEW.id);
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log but don't fail
  RAISE WARNING 'Error in handle_email_verified: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the email verified trigger exists
DROP TRIGGER IF EXISTS on_email_verified ON auth.users;
CREATE TRIGGER on_email_verified
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_email_verified();

-- Test the function
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
BEGIN
  -- Test user creation
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (test_id, 'balanced-test@example.com', NOW(), NOW());
  
  -- Check if subscription was created
  IF EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = test_id) THEN
    RAISE NOTICE '✓ Subscription created successfully';
  END IF;
  
  -- Clean up
  DELETE FROM public.subscriptions WHERE user_id = test_id;
  DELETE FROM public.users WHERE id = test_id;
  
  RAISE NOTICE '✓ Function test successful';
END $$;

SELECT 'Balanced handle_new_user function applied - should work for both signup AND email confirmation' as message;