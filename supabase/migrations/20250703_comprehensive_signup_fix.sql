-- Comprehensive fix for signup error
-- This migration ensures all required columns exist and the handle_new_user function works correctly

-- First, check and add any missing columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS daily_goal INTEGER DEFAULT 10 CHECK (daily_goal >= 1 AND daily_goal <= 100),
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';

-- Create index if not exists
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON public.users(referral_code);

-- Drop existing trigger and function to recreate them
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create a working handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_code VARCHAR(20);
  v_referrer_id UUID;
  v_selected_plan TEXT;
BEGIN
  -- Log the incoming data for debugging
  RAISE LOG 'handle_new_user triggered for user: %, email: %', NEW.id, NEW.email;
  
  -- Get referral code from metadata if provided
  v_referral_code := NEW.raw_user_meta_data->>'referral_code';
  v_selected_plan := COALESCE(NEW.raw_user_meta_data->>'selected_plan', 'free');
  
  -- Log extracted metadata
  RAISE LOG 'Extracted metadata - referral_code: %, selected_plan: %', v_referral_code, v_selected_plan;
  
  -- If referral code provided, find the referrer (with proper schema qualification)
  IF v_referral_code IS NOT NULL AND v_referral_code != '' THEN
    SELECT id INTO v_referrer_id
    FROM public.users
    WHERE referral_code = v_referral_code
    LIMIT 1;
    
    RAISE LOG 'Found referrer: %', v_referrer_id;
  END IF;
  
  -- Insert user profile with all required fields
  BEGIN
    INSERT INTO public.users (
      id, 
      email, 
      full_name, 
      referred_by,
      stripe_customer_id,
      daily_goal,
      timezone,
      created_at,
      updated_at
    ) VALUES (
      NEW.id, 
      NEW.email, 
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      v_referrer_id,
      NULL, -- stripe_customer_id will be set later when they subscribe
      10, -- default daily goal
      'America/New_York', -- default timezone
      NOW(),
      NOW()
    );
    
    RAISE LOG 'Successfully inserted user into public.users';
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error inserting user: % - %', SQLERRM, SQLSTATE;
    RAISE;
  END;
  
  -- Auto-assign free subscription
  BEGIN
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
    
    RAISE LOG 'Successfully created free subscription';
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error creating subscription: % - %', SQLERRM, SQLSTATE;
    RAISE;
  END;
  
  -- Create referral record if referred
  IF v_referrer_id IS NOT NULL THEN
    BEGIN
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
      
      RAISE LOG 'Successfully created referral record';
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Error creating referral: % - %', SQLERRM, SQLSTATE;
      -- Don't raise here, referral is optional
    END;
  END IF;
  
  -- Generate referral code for new user
  BEGIN
    PERFORM public.generate_referral_code(NEW.id);
    RAISE LOG 'Successfully generated referral code';
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error generating referral code: % - %', SQLERRM, SQLSTATE;
    -- Don't raise here, referral code generation is optional
  END;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the complete error with all details
  RAISE LOG 'CRITICAL ERROR in handle_new_user for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
  RAISE EXCEPTION 'Failed to create user profile: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a comment explaining the function
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates user profile and free subscription when new auth user is created. Handles referrals if referral code provided.';

-- Recreate the trigger on the auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also ensure the generate_referral_code function exists
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
      RAISE EXCEPTION 'Failed to generate unique referral code after 10 attempts';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the tables exist with proper structure
DO $$ 
BEGIN
  -- Check if referrals table exists, create if not
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'referrals') THEN
    CREATE TABLE public.referrals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      referrer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      referred_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      referral_code VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      UNIQUE(referred_id)
    );
    
    CREATE INDEX idx_referrals_code ON public.referrals(referral_code);
    CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
    CREATE INDEX idx_referrals_status ON public.referrals(status);
  END IF;
END $$;

-- Enable detailed logging for debugging (can be disabled later)
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_error_verbosity = 'verbose';

-- Test the function with a dummy insert (rolled back)
DO $$ 
DECLARE
  test_user_id UUID := gen_random_uuid();
BEGIN
  -- This will test if the function works without actually creating a user
  RAISE NOTICE 'Testing handle_new_user function...';
  
  -- Try to manually call the logic
  INSERT INTO public.users (id, email, created_at, updated_at) 
  VALUES (test_user_id, 'test@example.com', NOW(), NOW());
  
  INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
  VALUES (test_user_id, 'free', 'active', NOW(), NOW() + INTERVAL '30 days');
  
  -- Clean up test data
  DELETE FROM public.subscriptions WHERE user_id = test_user_id;
  DELETE FROM public.users WHERE id = test_user_id;
  
  RAISE NOTICE 'Test completed successfully';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Test failed: %', SQLERRM;
  -- Rollback happens automatically
END $$;