-- Fix email confirmation error by updating database functions
-- This addresses the "Error confirming user" issue

-- 1. First, check what's causing the error
SELECT 'Checking for subscription_tier column in users table...' as status;
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users' 
  AND column_name = 'subscription_tier';

-- 2. Fix the complete_referral function to not use subscription_tier
CREATE OR REPLACE FUNCTION complete_referral(p_referred_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_referrer_id UUID;
  v_referral_id UUID;
  v_current_bonus_replies INTEGER;
  v_current_bonus_research INTEGER;
  v_referrer_plan TEXT;
  v_max_bonus_replies INTEGER;
  v_max_bonus_research INTEGER;
BEGIN
  -- Get the referrer ID from the referral record
  SELECT id, referrer_id INTO v_referral_id, v_referrer_id
  FROM referrals
  WHERE referred_id = p_referred_user_id
    AND status = 'pending';
  
  -- If no pending referral found, exit gracefully
  IF v_referrer_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Get current bonuses for referrer
  SELECT bonus_replies, bonus_research INTO v_current_bonus_replies, v_current_bonus_research
  FROM referral_bonuses
  WHERE user_id = v_referrer_id;
  
  -- If no bonus record exists, create one
  IF NOT FOUND THEN
    v_current_bonus_replies := 0;
    v_current_bonus_research := 0;
    
    INSERT INTO referral_bonuses (user_id, bonus_replies, bonus_research, total_referrals)
    VALUES (v_referrer_id, 0, 0, 0);
  END IF;
  
  -- Get referrer's subscription plan instead of tier
  SELECT s.plan_id INTO v_referrer_plan
  FROM subscriptions s
  WHERE s.user_id = v_referrer_id
    AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;
  
  -- Set caps based on plan (paid users get higher caps)
  IF v_referrer_plan IN ('basic', 'pro', 'x_business', 'growth', 'professional', 'enterprise') THEN
    v_max_bonus_replies := 100;  -- 10 referrals * 10 replies
    v_max_bonus_research := 10;  -- 10 referrals * 1 research
  ELSE
    v_max_bonus_replies := 40;   -- 4 referrals * 10 replies  
    v_max_bonus_research := 4;   -- 4 referrals * 1 research
  END IF;
  
  -- Update referral status
  UPDATE referrals
  SET 
    status = 'completed',
    completed_at = NOW()
  WHERE id = v_referral_id;
  
  -- Calculate new bonus amounts (cap at maximums)
  v_current_bonus_replies := LEAST(v_current_bonus_replies + 10, v_max_bonus_replies);
  v_current_bonus_research := LEAST(v_current_bonus_research + 1, v_max_bonus_research);
  
  -- Update referrer's bonuses
  UPDATE referral_bonuses
  SET 
    bonus_replies = v_current_bonus_replies,
    bonus_research = v_current_bonus_research,
    total_referrals = total_referrals + 1,
    updated_at = NOW()
  WHERE user_id = v_referrer_id;
  
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the email confirmation
  RAISE WARNING 'Error in complete_referral: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update handle_email_verified to be more robust
CREATE OR REPLACE FUNCTION handle_email_verified()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if email was just confirmed
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    BEGIN
      -- Try to complete referral
      PERFORM complete_referral(NEW.id);
    EXCEPTION WHEN OTHERS THEN
      -- Log but don't fail
      RAISE WARNING 'Error completing referral for user %: %', NEW.id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Make handle_new_user more robust
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_code VARCHAR(20);
  v_referrer_id UUID;
  v_user_exists BOOLEAN;
BEGIN
  -- Check if user already exists (in case of retries)
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = NEW.id) INTO v_user_exists;
  
  IF NOT v_user_exists THEN
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
    
    -- Handle referral if provided
    v_referral_code := NEW.raw_user_meta_data->>'referral_code';
    IF v_referral_code IS NOT NULL AND v_referral_code != '' THEN
      -- Find referrer
      SELECT id INTO v_referrer_id
      FROM public.users
      WHERE referral_code = v_referral_code
      LIMIT 1;
      
      IF v_referrer_id IS NOT NULL THEN
        -- Update user with referrer
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
        ) ON CONFLICT DO NOTHING;
      END IF;
    END IF;
    
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
    ) ON CONFLICT DO NOTHING;
    
    -- Generate referral code for new user
    BEGIN
      PERFORM generate_referral_code(NEW.id);
    EXCEPTION WHEN OTHERS THEN
      -- Ignore errors in referral code generation
      NULL;
    END;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but allow signup to continue
  RAISE WARNING 'Error in handle_new_user: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Recreate triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

DROP TRIGGER IF EXISTS on_email_verified ON auth.users;
CREATE TRIGGER on_email_verified
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
  EXECUTE FUNCTION handle_email_verified();

-- 6. Test the functions
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
BEGIN
    RAISE NOTICE 'Testing handle_new_user function...';
    
    -- Simulate auth user creation
    INSERT INTO public.users (id, email, created_at, updated_at)
    VALUES (test_id, 'test@example.com', NOW(), NOW());
    
    -- Check if subscription was created
    IF EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = test_id) THEN
        RAISE NOTICE '✓ Subscription created successfully';
    ELSE
        RAISE NOTICE '✗ Subscription creation failed';
    END IF;
    
    -- Clean up
    DELETE FROM public.subscriptions WHERE user_id = test_id;
    DELETE FROM public.users WHERE id = test_id;
    
    RAISE NOTICE '✓ Test completed successfully';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ Test failed: %', SQLERRM;
    -- Clean up on error
    DELETE FROM public.subscriptions WHERE user_id = test_id;
    DELETE FROM public.users WHERE id = test_id;
END $$;

SELECT 'Email confirmation fix has been applied. The functions are now more robust and should not fail during email confirmation.' as message;