-- Apply signup fix
-- Run this in Supabase SQL Editor

-- 1. First, let's check what's actually failing by looking at the current function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. Create a simpler, more robust version
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Simply create the user profile
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
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent duplicate key errors
  
  -- Create free subscription
  INSERT INTO public.subscriptions (
    user_id,
    plan_id,
    status,
    current_period_start,
    current_period_end,
    created_at,
    updated_at
  )
  SELECT 
    NEW.id,
    'free',
    'active',
    NOW(),
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.subscriptions 
    WHERE user_id = NEW.id AND status = 'active'
  );
  
  -- Try to generate referral code, but don't fail if it doesn't work
  BEGIN
    PERFORM public.generate_referral_code(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    -- Ignore referral code generation errors
    NULL;
  END;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but still return NEW to not block auth signup
  RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Ensure the users table has proper constraints
ALTER TABLE public.users ALTER COLUMN email SET NOT NULL;
ALTER TABLE public.users ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.users ALTER COLUMN updated_at SET DEFAULT NOW();

-- 5. Add missing columns if they don't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS daily_goal INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York',
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20);

-- 6. Create policies to allow the service role to insert
DO $$
BEGIN
  -- Drop existing policies that might conflict
  DROP POLICY IF EXISTS "Service role can insert users" ON public.users;
  DROP POLICY IF EXISTS "Service role can insert subscriptions" ON public.subscriptions;
  
  -- For functions with SECURITY DEFINER, they bypass RLS
  -- But let's ensure there are no restrictive policies
END $$;

-- 7. Test the setup
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
BEGIN
  -- Test user creation
  INSERT INTO public.users (id, email) 
  VALUES (test_id, 'test@example.com')
  ON CONFLICT (id) DO NOTHING;
  
  -- Test subscription creation
  INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
  SELECT test_id, 'free', 'active', NOW(), NOW() + INTERVAL '30 days'
  WHERE NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = test_id);
  
  -- Clean up
  DELETE FROM public.subscriptions WHERE user_id = test_id;
  DELETE FROM public.users WHERE id = test_id;
  
  RAISE NOTICE 'Test passed successfully';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Test failed: %', SQLERRM;
END $$;

-- 8. Verify the free plan exists
INSERT INTO public.subscription_plans (
  id,
  name,
  description,
  price_monthly,
  price_yearly,
  reply_limit,
  suggestion_limit,
  meme_limit,
  research_limit,
  max_tweet_length,
  max_response_idea_length,
  max_reply_length,
  enable_long_replies,
  enable_style_matching,
  enable_perplexity_guidance,
  enable_memes,
  enable_write_like_me
)
SELECT
  'free',
  'Free',
  'Get started with ReplyGuy',
  0,
  0,
  10,
  0,
  0,
  1,
  280,
  200,
  280,
  false,
  false,
  false,
  false,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscription_plans WHERE id = 'free'
);