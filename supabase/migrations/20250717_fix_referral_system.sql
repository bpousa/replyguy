-- Fix referral system that was broken by the auto-subscription fix
-- This restores the referral functionality while keeping the no-auto-subscription behavior

-- First, let's check and fix the referral_bonuses table structure
-- The newer migration expects individual bonus records, not cumulative
DO $$
BEGIN
  -- Check if the old cumulative structure exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'referral_bonuses' 
    AND column_name = 'total_referrals'
  ) THEN
    -- Drop the old table and recreate with new structure
    DROP TABLE IF EXISTS public.referral_bonuses CASCADE;
  END IF;
END $$;

-- Create the correct referral_bonuses table structure
CREATE TABLE IF NOT EXISTS public.referral_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  bonus_type VARCHAR(20) NOT NULL CHECK (bonus_type IN ('referrer', 'referred')),
  bonus_replies INTEGER NOT NULL DEFAULT 0,
  bonus_memes INTEGER NOT NULL DEFAULT 0,
  tier_based_on VARCHAR(100),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_user_id ON public.referral_bonuses(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_referral_id ON public.referral_bonuses(referral_id);

-- Enable RLS
ALTER TABLE public.referral_bonuses ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
DROP POLICY IF EXISTS "Users can view own bonuses" ON public.referral_bonuses;
CREATE POLICY "Users can view own bonuses" ON public.referral_bonuses
  FOR SELECT
  USING (auth.uid() = user_id);

-- Add bonus columns to users table for easy aggregation
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS bonus_replies INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bonus_research INTEGER DEFAULT 0;

-- Create function to calculate and update user bonus totals
CREATE OR REPLACE FUNCTION update_user_bonus_totals(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_replies INTEGER;
  v_total_research INTEGER;
BEGIN
  -- Calculate total bonuses from referral_bonuses table
  SELECT 
    COALESCE(SUM(bonus_replies), 0),
    COALESCE(SUM(bonus_memes), 0)  -- memes count as research
  INTO v_total_replies, v_total_research
  FROM public.referral_bonuses
  WHERE user_id = p_user_id;
  
  -- Update user record
  UPDATE public.users
  SET 
    bonus_replies = v_total_replies,
    bonus_research = v_total_research
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix the handle_new_user function to include referral functionality
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_code VARCHAR(20);
  v_referrer_id UUID;
  v_new_referral_code VARCHAR(20);
BEGIN
  -- Get referral code from metadata if provided
  v_referral_code := NEW.raw_user_meta_data->>'referral_code';
  
  -- If referral code provided, find the referrer
  IF v_referral_code IS NOT NULL AND v_referral_code != '' THEN
    SELECT id INTO v_referrer_id
    FROM public.users
    WHERE referral_code = v_referral_code
    LIMIT 1;
  END IF;
  
  -- Insert user profile WITHOUT automatic subscription
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
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    v_referrer_id,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  
  -- Generate referral code for the new user
  PERFORM generate_referral_code(NEW.id);
  
  -- Create referral record if user was referred
  IF v_referrer_id IS NOT NULL THEN
    INSERT INTO public.referrals (
      referrer_id,
      referred_id,
      referral_code,
      status
    ) VALUES (
      v_referrer_id,
      NEW.id,
      v_referral_code,
      'pending'  -- Will be completed when email is verified or first action taken
    )
    ON CONFLICT (referred_id) DO NOTHING;  -- Prevent duplicate referral records
  END IF;
  
  -- NO AUTOMATIC SUBSCRIPTION CREATION!
  -- Users start with NO subscription until they purchase one
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the signup
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix existing users who don't have referral codes
DO $$
DECLARE
  v_user RECORD;
  v_code VARCHAR(20);
BEGIN
  -- Generate referral codes for users who don't have them
  FOR v_user IN 
    SELECT id, email 
    FROM public.users 
    WHERE referral_code IS NULL
  LOOP
    v_code := generate_referral_code(v_user.id);
    RAISE NOTICE 'Generated referral code % for user %', v_code, v_user.email;
  END LOOP;
END $$;

-- Fix the specific referral case mentioned by the user
-- antoni.mike+36@gmail.com was referred by antoni.mike+35@gmail.com
DO $$
DECLARE
  v_referrer_id UUID;
  v_referred_id UUID;
  v_referral_code VARCHAR(20);
BEGIN
  -- Get the referrer (antoni.mike+35)
  SELECT id, referral_code INTO v_referrer_id, v_referral_code
  FROM public.users
  WHERE email = 'antoni.mike+35@gmail.com';
  
  -- Get the referred user (antoni.mike+36)
  SELECT id INTO v_referred_id
  FROM public.users
  WHERE email = 'antoni.mike+36@gmail.com';
  
  IF v_referrer_id IS NOT NULL AND v_referred_id IS NOT NULL THEN
    -- Update the referred_by field
    UPDATE public.users
    SET referred_by = v_referrer_id
    WHERE id = v_referred_id;
    
    -- Create the referral record if it doesn't exist
    INSERT INTO public.referrals (
      referrer_id,
      referred_id,
      referral_code,
      status,
      created_at
    ) VALUES (
      v_referrer_id,
      v_referred_id,
      v_referral_code,
      'pending',
      NOW()
    )
    ON CONFLICT (referred_id) DO NOTHING;
    
    -- Complete the referral since the user already signed up
    PERFORM complete_referral(v_referred_id);
    
    RAISE NOTICE 'Fixed referral: % referred %', v_referrer_id, v_referred_id;
  END IF;
END $$;

-- Create or update the function to get referral bonus values
CREATE OR REPLACE FUNCTION get_referral_bonus_values(
  IN p_referrer_plan_id TEXT,
  IN p_referred_plan_id TEXT,
  OUT p_referrer_plan_name TEXT,
  OUT p_referred_plan_name TEXT,
  OUT p_referrer_bonus_replies INT,
  OUT p_referrer_bonus_memes INT,
  OUT p_referred_bonus_replies INT,
  OUT p_referred_bonus_memes INT
) AS $$
BEGIN
  -- Default values
  p_referrer_bonus_replies := 10;  -- Everyone gets 10 replies per referral
  p_referrer_bonus_memes := 1;     -- Everyone gets 1 research per referral
  p_referred_bonus_replies := 10;  -- New users get 10 bonus replies
  p_referred_bonus_memes := 0;     -- No bonus research for being referred
  
  -- Set plan names
  p_referrer_plan_name := CASE p_referrer_plan_id
    WHEN 'growth' THEN 'X Basic'
    WHEN 'professional' THEN 'X Pro'
    WHEN 'enterprise' THEN 'X Business'
    ELSE 'Free'
  END;
  
  p_referred_plan_name := CASE p_referred_plan_id
    WHEN 'growth' THEN 'X Basic'
    WHEN 'professional' THEN 'X Pro'
    WHEN 'enterprise' THEN 'X Business'
    ELSE 'Free'
  END;
END;
$$ LANGUAGE plpgsql;

-- Update the complete_referral function to work with trial users
CREATE OR REPLACE FUNCTION complete_referral(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_referral RECORD;
  v_referrer_plan_id TEXT;
  v_referred_plan_id TEXT;
  v_referrer_plan_name TEXT;
  v_referred_plan_name TEXT;
  v_referrer_bonus_replies INT;
  v_referrer_bonus_memes INT;
  v_referred_bonus_replies INT;
  v_referred_bonus_memes INT;
BEGIN
  -- Wrap everything in an exception block
  BEGIN
    -- Check if user exists in public.users first
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
      RAISE NOTICE 'User % not found in public.users, skipping referral completion', p_user_id;
      RETURN;
    END IF;

    -- Find pending referral
    SELECT * INTO v_referral
    FROM referrals
    WHERE referred_id = p_user_id 
    AND status = 'pending'
    LIMIT 1;
    
    -- Exit if no pending referral
    IF v_referral.id IS NULL THEN
      RAISE NOTICE 'No pending referral found for user %', p_user_id;
      RETURN;
    END IF;
    
    -- Get both users' subscription tiers
    -- Check for active or trialing subscriptions (for trial users)
    SELECT s.plan_id INTO v_referrer_plan_id
    FROM subscriptions s
    WHERE s.user_id = v_referral.referrer_id
    AND s.status IN ('active', 'trialing')
    LIMIT 1;
    
    SELECT s.plan_id INTO v_referred_plan_id
    FROM subscriptions s
    WHERE s.user_id = v_referral.referred_id
    AND s.status IN ('active', 'trialing')
    LIMIT 1;
    
    -- Default to free if no active subscription
    v_referrer_plan_id := COALESCE(v_referrer_plan_id, 'free');
    v_referred_plan_id := COALESCE(v_referred_plan_id, 'free');
    
    -- Update referral status
    UPDATE referrals
    SET 
      status = 'completed',
      completed_at = NOW()
    WHERE id = v_referral.id;
    
    -- Get bonus values based on subscription tiers
    SELECT * FROM get_referral_bonus_values(
      v_referrer_plan_id, 
      v_referred_plan_id
    ) INTO v_referrer_plan_name, v_referred_plan_name, v_referrer_bonus_replies, v_referrer_bonus_memes, v_referred_bonus_replies, v_referred_bonus_memes;
    
    -- Apply bonuses if any
    IF v_referrer_bonus_replies > 0 OR v_referrer_bonus_memes > 0 THEN
      INSERT INTO referral_bonuses (
        referral_id,
        user_id,
        bonus_type,
        bonus_replies,
        bonus_memes,
        tier_based_on,
        description
      ) VALUES (
        v_referral.id,
        v_referral.referrer_id,
        'referrer',
        v_referrer_bonus_replies,
        v_referrer_bonus_memes,
        v_referrer_plan_name || ' tier',
        'Referral bonus for inviting a new user'
      );
      
      -- Update user totals
      PERFORM update_user_bonus_totals(v_referral.referrer_id);
    END IF;
    
    IF v_referred_bonus_replies > 0 OR v_referred_bonus_memes > 0 THEN
      INSERT INTO referral_bonuses (
        referral_id,
        user_id,
        bonus_type,
        bonus_replies,
        bonus_memes,
        tier_based_on,
        description
      ) VALUES (
        v_referral.id,
        v_referral.referred_id,
        'referred',
        v_referred_bonus_replies,
        v_referred_bonus_memes,
        v_referred_plan_name || ' tier',
        'Welcome bonus for joining via referral'
      );
      
      -- Update user totals
      PERFORM update_user_bonus_totals(v_referral.referred_id);
    END IF;
    
    RAISE NOTICE 'Referral completed successfully for user %', p_user_id;
    
  EXCEPTION 
    WHEN OTHERS THEN
      -- Log the error but don't fail
      RAISE WARNING 'Error completing referral for user %: % %', p_user_id, SQLERRM, SQLSTATE;
      -- The function returns normally, so email verification can proceed
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to complete referral when user makes their first purchase
CREATE OR REPLACE FUNCTION handle_subscription_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Complete any pending referral for this user
  IF NEW.status IN ('active', 'trialing') THEN
    PERFORM complete_referral(NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_subscription_created ON public.subscriptions;
CREATE TRIGGER on_subscription_created
  AFTER INSERT ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION handle_subscription_created();

-- Also trigger on subscription activation
DROP TRIGGER IF EXISTS on_subscription_activated ON public.subscriptions;
CREATE TRIGGER on_subscription_activated
  AFTER UPDATE ON public.subscriptions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('active', 'trialing'))
  EXECUTE FUNCTION handle_subscription_created();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_user_bonus_totals(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_referral_bonus_values(TEXT, TEXT) TO authenticated;

-- Update the get_user_limits function to use the bonus columns from users table
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
  -- Get user's subscription tier and bonuses
  SELECT 
    subscription_tier,
    COALESCE(bonus_replies, 0),
    COALESCE(bonus_research, 0)
  INTO v_subscription_tier, v_bonus_replies, v_bonus_research
  FROM users 
  WHERE id = p_user_id;
  
  -- Get current usage
  SELECT * INTO v_usage FROM get_current_usage(p_user_id);
  
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
  WHERE sp.id = COALESCE(v_subscription_tier, 'free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the fix by checking our specific users
SELECT 
  u.email,
  u.referral_code,
  u.referred_by,
  u.bonus_replies,
  u.bonus_research,
  r.status as referral_status,
  r.completed_at
FROM public.users u
LEFT JOIN public.referrals r ON r.referred_id = u.id
WHERE u.email IN ('antoni.mike+35@gmail.com', 'antoni.mike+36@gmail.com');