-- Fix signup error by correcting the handle_new_user function
-- The function was referencing a non-existent subscription_tier column
-- Also ensure all required columns exist on the users table

-- First, ensure all required columns exist on users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;

-- Create index if not exists
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON public.users(referral_code);

-- Then drop the existing function and trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Create the corrected handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_code VARCHAR(20);
  v_referrer_id UUID;
  v_selected_plan TEXT;
BEGIN
  -- Get referral code from metadata if provided
  v_referral_code := NEW.raw_user_meta_data->>'referral_code';
  v_selected_plan := COALESCE(NEW.raw_user_meta_data->>'selected_plan', 'free');
  
  -- If referral code provided, find the referrer
  IF v_referral_code IS NOT NULL AND v_referral_code != '' THEN
    SELECT id INTO v_referrer_id
    FROM users
    WHERE referral_code = v_referral_code
    LIMIT 1;
  END IF;
  
  -- Insert user profile with referral info
  -- Note: subscription_tier column doesn't exist, removing it
  INSERT INTO public.users (
    id, 
    email, 
    full_name, 
    referred_by,
    created_at,
    updated_at
  ) VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    v_referrer_id,
    NOW(),
    NOW()
  );
  
  -- Auto-assign free subscription
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
  
  -- Create referral record if referred
  IF v_referrer_id IS NOT NULL THEN
    INSERT INTO referrals (
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
  
  -- Generate referral code for new user
  PERFORM generate_referral_code(NEW.id);
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error for debugging
  RAISE LOG 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
  -- Re-raise the exception to see it in the application
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Also fix the complete_referral function to use the correct way to get subscription tier
CREATE OR REPLACE FUNCTION complete_referral(p_referred_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_referrer_id UUID;
  v_referral_id UUID;
  v_current_bonus_replies INTEGER;
  v_current_bonus_research INTEGER;
  v_referrer_tier TEXT;
  v_max_bonus_replies INTEGER;
  v_max_bonus_research INTEGER;
BEGIN
  -- Get the referrer ID from the referral record
  SELECT id, referrer_id INTO v_referral_id, v_referrer_id
  FROM referrals
  WHERE referred_id = p_referred_user_id
    AND status = 'pending';
  
  -- If no pending referral found, exit
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
  
  -- Get referrer's subscription tier from the subscriptions table
  SELECT s.plan_id INTO v_referrer_tier
  FROM subscriptions s
  WHERE s.user_id = v_referrer_id
    AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;
  
  -- Default to 'free' if no active subscription found
  v_referrer_tier := COALESCE(v_referrer_tier, 'free');
  
  -- Set caps based on tier (paid users get higher caps)
  IF v_referrer_tier IN ('basic', 'pro', 'x_business', 'growth', 'professional', 'enterprise') THEN
    v_max_bonus_replies := 100;  -- 10 referrals * 10 replies
    v_max_bonus_research := 10;  -- 10 referrals * 1 research
  ELSE
    v_max_bonus_replies := 40;   -- 4 referrals * 10 replies  
    v_max_bonus_research := 4;   -- 4 referrals * 1 research
  END IF;
  
  -- Update referral status
  UPDATE referrals
  SET status = 'completed',
      completed_at = NOW()
  WHERE id = v_referral_id;
  
  -- Update referrer's bonuses (with tier-specific caps)
  UPDATE referral_bonuses
  SET bonus_replies = LEAST(bonus_replies + 10, v_max_bonus_replies),
      bonus_research = LEAST(bonus_research + 1, v_max_bonus_research),
      total_referrals = total_referrals + 1,
      updated_at = NOW()
  WHERE user_id = v_referrer_id;
  
  -- Log the successful referral
  RAISE NOTICE 'Referral completed: % referred % successfully', v_referrer_id, p_referred_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also update the get_user_limits function to get subscription tier correctly
DROP FUNCTION IF EXISTS get_user_limits(UUID);
CREATE OR REPLACE FUNCTION get_user_limits(p_user_id UUID)
RETURNS TABLE (
  reply_limit INTEGER,
  suggestion_limit INTEGER,
  meme_limit INTEGER,
  research_limit INTEGER,
  replies_used INTEGER,
  suggestions_used INTEGER,
  memes_used INTEGER,
  research_used INTEGER,
  max_tweet_length INTEGER,
  max_response_idea_length INTEGER,
  max_reply_length INTEGER,
  enable_long_replies BOOLEAN,
  enable_style_matching BOOLEAN,
  enable_perplexity_guidance BOOLEAN,
  enable_memes BOOLEAN,
  enable_write_like_me BOOLEAN
) AS $$
DECLARE
  v_subscription_tier TEXT;
  v_usage RECORD;
  v_bonus_replies INTEGER;
  v_bonus_research INTEGER;
BEGIN
  -- Get user's subscription tier from subscriptions table
  SELECT s.plan_id INTO v_subscription_tier
  FROM subscriptions s
  WHERE s.user_id = p_user_id
    AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;
  
  -- Default to 'free' if no active subscription
  v_subscription_tier := COALESCE(v_subscription_tier, 'free');
  
  -- Get current usage
  SELECT * INTO v_usage FROM get_current_usage(p_user_id);
  
  -- Get referral bonuses for ALL users (both free and paid)
  SELECT COALESCE(bonus_replies, 0), COALESCE(bonus_research, 0) 
  INTO v_bonus_replies, v_bonus_research
  FROM referral_bonuses 
  WHERE user_id = p_user_id;
  
  -- Default to 0 if no bonus record
  v_bonus_replies := COALESCE(v_bonus_replies, 0);
  v_bonus_research := COALESCE(v_bonus_research, 0);
  
  -- Return limits and usage with bonuses applied
  RETURN QUERY
  SELECT 
    sp.reply_limit + v_bonus_replies,  -- Add bonus replies
    sp.suggestion_limit,
    sp.meme_limit,
    sp.research_limit + v_bonus_research,  -- Add bonus research
    v_usage.total_replies,
    v_usage.total_suggestions,
    v_usage.total_memes,
    COALESCE(v_usage.total_research, 0),
    sp.max_tweet_length,
    sp.max_response_idea_length,
    sp.max_reply_length,
    sp.enable_long_replies,
    sp.enable_style_matching,
    sp.enable_perplexity_guidance,
    sp.enable_memes,
    sp.enable_write_like_me
  FROM subscription_plans sp
  WHERE sp.id = v_subscription_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a helpful comment
COMMENT ON FUNCTION handle_new_user() IS 'Creates user profile and free subscription when new auth user is created. Fixed to remove non-existent subscription_tier column reference.';