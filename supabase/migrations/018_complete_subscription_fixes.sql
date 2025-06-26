-- Complete the subscription system fixes
-- This applies remaining fixes now that the subscriptions table exists

-- 1. Add missing columns to subscription_plans
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS price_monthly NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_yearly NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS reply_limit INTEGER,
ADD COLUMN IF NOT EXISTS meme_limit INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS enable_write_like_me BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS enable_perplexity_guidance BOOLEAN DEFAULT false;

-- 2. Update reply_limit from monthly_limit
UPDATE public.subscription_plans 
SET reply_limit = COALESCE(reply_limit, monthly_limit, 10)
WHERE reply_limit IS NULL;

-- 3. Set correct meme limits
UPDATE public.subscription_plans 
SET meme_limit = CASE 
  WHEN id = 'free' THEN 0
  WHEN id IN ('basic', 'growth') THEN 10
  WHEN id IN ('pro', 'professional') THEN 50
  WHEN id IN ('business', 'enterprise') THEN 100
  ELSE 0
END;

-- 4. Set correct feature flags
UPDATE public.subscription_plans 
SET 
  enable_write_like_me = CASE 
    WHEN id IN ('pro', 'professional', 'business', 'enterprise') THEN true 
    ELSE false 
  END,
  enable_perplexity_guidance = CASE 
    WHEN id IN ('business', 'enterprise') THEN true 
    ELSE false 
  END;

-- 5. Set pricing
UPDATE public.subscription_plans 
SET 
  price_monthly = CASE 
    WHEN id = 'free' THEN 0
    WHEN id IN ('basic', 'growth') THEN 19
    WHEN id IN ('pro', 'professional') THEN 49
    WHEN id IN ('business', 'enterprise') THEN 99
    ELSE 0
  END,
  price_yearly = CASE 
    WHEN id = 'free' THEN 0
    WHEN id IN ('basic', 'growth') THEN 190
    WHEN id IN ('pro', 'professional') THEN 490
    WHEN id IN ('business', 'enterprise') THEN 990
    ELSE 0
  END;

-- 6. Insert dev_test plan
INSERT INTO public.subscription_plans (
  id, name, description, 
  price_monthly, price_yearly,
  reply_limit, monthly_limit, meme_limit, suggestion_limit,
  max_tweet_length, max_response_idea_length, max_reply_length,
  enable_memes, enable_long_replies, enable_style_matching, 
  enable_perplexity_guidance, enable_write_like_me,
  sort_order, active
)
VALUES (
  'dev_test', 'Development Test', 'For local development only',
  0, 0,
  9999, 9999, 9999, -1,
  2000, 2000, 2000,
  true, true, true, true, true,
  99, true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  reply_limit = EXCLUDED.reply_limit,
  meme_limit = EXCLUDED.meme_limit,
  enable_write_like_me = EXCLUDED.enable_write_like_me,
  enable_perplexity_guidance = EXCLUDED.enable_perplexity_guidance;

-- 7. Create or replace the enhanced handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert user profile if it doesn't exist
  INSERT INTO public.users (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  
  -- Auto-assign free subscription with trial status if user doesn't have one
  INSERT INTO public.subscriptions (
    id,
    user_id,
    plan_id,
    status,
    stripe_subscription_id,
    current_period_start,
    current_period_end,
    cancel_at_period_end
  )
  SELECT
    gen_random_uuid(),
    NEW.id,
    'free',
    'trialing',
    NULL,
    NOW(),
    NOW() + INTERVAL '30 days',
    false
  WHERE NOT EXISTS (
    SELECT 1 FROM public.subscriptions 
    WHERE user_id = NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create user_subscription_info view
CREATE OR REPLACE VIEW user_subscription_info AS
SELECT 
  u.id as user_id,
  u.email,
  u.full_name,
  u.stripe_customer_id,
  u.daily_goal,
  u.timezone,
  s.id as subscription_id,
  s.plan_id,
  s.status as subscription_status,
  s.current_period_start,
  s.current_period_end,
  s.cancel_at_period_end,
  sp.name as plan_name,
  sp.price_monthly,
  sp.price_yearly,
  sp.reply_limit,
  sp.meme_limit,
  sp.suggestion_limit,
  sp.max_tweet_length,
  sp.max_response_idea_length,
  sp.max_reply_length,
  sp.enable_memes,
  sp.enable_long_replies,
  sp.enable_style_matching,
  sp.enable_perplexity_guidance,
  sp.enable_write_like_me,
  sp.features
FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.id AND s.is_active = true
LEFT JOIN subscription_plans sp ON sp.id = s.plan_id;

-- Grant permissions
GRANT SELECT ON user_subscription_info TO authenticated;

-- 9. Add subscription state change handler
CREATE OR REPLACE FUNCTION public.handle_subscription_state_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When activating a new subscription, deactivate others for the same user
  IF NEW.is_active = true AND OLD.is_active IS DISTINCT FROM NEW.is_active THEN
    UPDATE public.subscriptions 
    SET status = 'canceled',
        updated_at = NOW()
    WHERE user_id = NEW.user_id 
      AND id != NEW.id 
      AND is_active = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'enforce_single_active_subscription'
    ) THEN
        CREATE TRIGGER enforce_single_active_subscription
          BEFORE INSERT OR UPDATE ON public.subscriptions
          FOR EACH ROW
          EXECUTE FUNCTION public.handle_subscription_state_change();
    END IF;
END $$;

-- 10. Add check constraints
ALTER TABLE public.subscriptions 
ADD CONSTRAINT chk_subscription_status CHECK (
  status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired')
) NOT VALID;

ALTER TABLE public.subscriptions 
ADD CONSTRAINT chk_subscription_periods CHECK (
  current_period_start <= current_period_end
) NOT VALID;

-- 11. Final report
DO $$
DECLARE
    v_plan_count INTEGER;
    v_free_trials INTEGER;
    v_active_paid INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_plan_count FROM subscription_plans WHERE active = true;
    SELECT COUNT(*) INTO v_free_trials FROM subscriptions WHERE plan_id = 'free' AND status = 'trialing';
    SELECT COUNT(*) INTO v_active_paid FROM subscriptions WHERE plan_id != 'free' AND status = 'active';
    
    RAISE NOTICE '=== Subscription System Fixed! ===';
    RAISE NOTICE 'Active Plans: %', v_plan_count;
    RAISE NOTICE 'Free Trial Users: %', v_free_trials;
    RAISE NOTICE 'Active Paid Users: %', v_active_paid;
    RAISE NOTICE '';
    RAISE NOTICE 'All users now have subscriptions assigned.';
    RAISE NOTICE 'New signups will automatically get 30-day free trials.';
END $$;

-- Show current plans
SELECT id, name, price_monthly, reply_limit, meme_limit, enable_write_like_me, enable_perplexity_guidance
FROM subscription_plans
WHERE active = true
ORDER BY sort_order;