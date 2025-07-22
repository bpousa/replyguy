-- Fix Row Level Security (RLS) policies for users table
-- These policies are causing 406 errors on user queries

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Service role can do anything" ON public.users;

-- Create comprehensive RLS policies for users table
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role can do anything"
  ON public.users
  FOR ALL
  USING (auth.role() = 'service_role');

-- Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Fix policies for daily_usage table
DROP POLICY IF EXISTS "Users can view own usage" ON public.daily_usage;
DROP POLICY IF EXISTS "Users can insert own usage" ON public.daily_usage;
DROP POLICY IF EXISTS "Users can update own usage" ON public.daily_usage;

CREATE POLICY "Users can view own usage"
  ON public.daily_usage
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage"
  ON public.daily_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage"
  ON public.daily_usage
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Ensure RLS is enabled
ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;

-- Fix policies for subscriptions table
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;

CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Ensure RLS is enabled
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Fix policies for referrals table
DROP POLICY IF EXISTS "Users can view own referrals" ON public.referrals;

CREATE POLICY "Users can view own referrals"
  ON public.referrals
  FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Ensure RLS is enabled
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Verify the policies are working
DO $$
BEGIN
  RAISE NOTICE 'RLS policies have been updated. Users should now be able to query their own data.';
END $$;