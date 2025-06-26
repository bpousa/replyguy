-- Enhance handle_new_user trigger to auto-assign free subscription on signup
-- This ensures every new user gets a free plan by default

-- Drop the existing trigger and function to replace it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create enhanced function that also creates a subscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert user profile
  INSERT INTO public.users (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  -- Auto-assign free subscription with trial status
  INSERT INTO public.subscriptions (
    id,
    user_id,
    plan_id,
    status,
    stripe_subscription_id,
    current_period_start,
    current_period_end,
    cancel_at_period_end
  ) VALUES (
    gen_random_uuid(),
    NEW.id,
    'free',
    'trialing',
    NULL, -- No Stripe subscription for free plan
    NOW(),
    NOW() + INTERVAL '30 days', -- 30-day trial period
    false
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates user profile and assigns free subscription on signup';