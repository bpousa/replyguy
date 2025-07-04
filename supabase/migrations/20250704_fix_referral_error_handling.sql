-- Fix referral system to not break email verification
-- This ensures referral errors don't prevent users from confirming their email

-- Update complete_referral to handle errors gracefully
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
    SELECT s.plan_id INTO v_referrer_plan_id
    FROM subscriptions s
    WHERE s.user_id = v_referral.referrer_id
    AND s.is_active = true
    LIMIT 1;
    
    SELECT s.plan_id INTO v_referred_plan_id
    FROM subscriptions s
    WHERE s.user_id = v_referral.referred_id
    AND s.is_active = true
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
    PERFORM get_referral_bonus_values(
      v_referrer_plan_id, 
      v_referred_plan_id,
      v_referrer_plan_name,
      v_referred_plan_name,
      v_referrer_bonus_replies,
      v_referrer_bonus_memes,
      v_referred_bonus_replies,
      v_referred_bonus_memes
    );
    
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

-- Update handle_email_verified to be more defensive
CREATE OR REPLACE FUNCTION handle_email_verified()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if email was just confirmed
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    -- Use a separate block to catch any errors
    BEGIN
      PERFORM complete_referral(NEW.id);
    EXCEPTION 
      WHEN OTHERS THEN
        -- Log but don't fail the trigger
        RAISE WARNING 'Error in handle_email_verified for user %: %', NEW.id, SQLERRM;
    END;
  END IF;
  
  -- Always return NEW so the UPDATE proceeds
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;