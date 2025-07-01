-- Create referral system for free users to earn bonus replies
-- Users can earn +10 replies per referral (max 50 total) and +1 research (max 5 total)

-- Create referrals table to track who referred whom
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referral_code VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(referred_id), -- A user can only be referred once
  INDEX idx_referrals_code (referral_code),
  INDEX idx_referrals_referrer (referrer_id),
  INDEX idx_referrals_status (status)
);

-- Create referral bonuses table to track earned bonuses
CREATE TABLE IF NOT EXISTS public.referral_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  bonus_replies INTEGER NOT NULL DEFAULT 0 CHECK (bonus_replies >= 0 AND bonus_replies <= 100), -- Max 100 bonus for paid users (10 referrals)
  bonus_research INTEGER NOT NULL DEFAULT 0 CHECK (bonus_research >= 0 AND bonus_research <= 10), -- Max 10 bonus for paid users
  total_referrals INTEGER NOT NULL DEFAULT 0 CHECK (total_referrals >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add referral fields to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users(id);

-- Create index for faster referral code lookups
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON public.users(referral_code);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code(p_user_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_code VARCHAR(20);
  v_attempts INTEGER := 0;
BEGIN
  LOOP
    -- Generate code: first 4 chars of user ID + random string
    v_code := UPPER(SUBSTRING(p_user_id::TEXT, 1, 4) || SUBSTRING(MD5(RANDOM()::TEXT), 1, 6));
    
    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE referral_code = v_code) THEN
      -- Update user with their referral code
      UPDATE users SET referral_code = v_code WHERE id = p_user_id;
      RETURN v_code;
    END IF;
    
    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'Failed to generate unique referral code after 10 attempts';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete a referral when user verifies email
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
  
  -- Get referrer's subscription tier to determine caps
  SELECT subscription_tier INTO v_referrer_tier
  FROM users
  WHERE id = v_referrer_id;
  
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

-- Update get_user_limits to include referral bonuses
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
  -- Get user's subscription tier
  SELECT subscription_tier INTO v_subscription_tier
  FROM users WHERE id = p_user_id;
  
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
  WHERE sp.id = COALESCE(v_subscription_tier, 'free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update handle_new_user to process referral codes
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
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
  INSERT INTO public.users (id, email, full_name, referred_by)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'full_name',
    v_referrer_id
  );
  
  -- Auto-assign free subscription
  INSERT INTO public.subscriptions (
    user_id,
    plan_id,
    status,
    current_period_start,
    current_period_end
  ) VALUES (
    NEW.id,
    'free',
    'active',
    NOW(),
    NOW() + INTERVAL '30 days'
  );
  
  -- Create referral record if referred
  IF v_referrer_id IS NOT NULL THEN
    INSERT INTO referrals (
      referrer_id,
      referred_id,
      referral_code,
      status
    ) VALUES (
      v_referrer_id,
      NEW.id,
      v_referral_code,
      'pending'  -- Will be completed when email is verified
    );
  END IF;
  
  -- Generate referral code for new user
  PERFORM generate_referral_code(NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Create function to handle email verification completion
CREATE OR REPLACE FUNCTION handle_email_verified()
RETURNS TRIGGER AS $$
BEGIN
  -- Complete referral if user was referred
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    PERFORM complete_referral(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for email verification
CREATE TRIGGER on_email_verified
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
  EXECUTE FUNCTION handle_email_verified();

-- Grant permissions
GRANT SELECT ON referrals TO authenticated;
GRANT SELECT ON referral_bonuses TO authenticated;
GRANT EXECUTE ON FUNCTION generate_referral_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_referral(UUID) TO authenticated;

-- Create RLS policies
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_bonuses ENABLE ROW LEVEL SECURITY;

-- Users can view their own referrals (as referrer)
CREATE POLICY "Users can view own referrals" ON referrals
  FOR SELECT
  USING (auth.uid() = referrer_id);

-- Users can view their own bonuses
CREATE POLICY "Users can view own bonuses" ON referral_bonuses
  FOR SELECT
  USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE referrals IS 'Tracks referral relationships between users';
COMMENT ON TABLE referral_bonuses IS 'Tracks bonus replies and research earned through referrals';
COMMENT ON FUNCTION generate_referral_code(UUID) IS 'Generates a unique referral code for a user';
COMMENT ON FUNCTION complete_referral(UUID) IS 'Completes a referral and awards bonuses when user verifies email';