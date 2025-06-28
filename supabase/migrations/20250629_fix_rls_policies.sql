-- Fix RLS policies for users table to prevent 406 errors

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can read own row" ON users;
DROP POLICY IF EXISTS "Users can update own row" ON users;

-- Create new policies with proper permissions
CREATE POLICY "Users can view own data" ON users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Also fix subscriptions table policies
DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can read own subscriptions" ON subscriptions;

CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Ensure RLS is enabled on subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Fix daily_usage table policies
DROP POLICY IF EXISTS "Users can view own usage" ON daily_usage;
DROP POLICY IF EXISTS "Users can insert own usage" ON daily_usage;
DROP POLICY IF EXISTS "Users can update own usage" ON daily_usage;

CREATE POLICY "Users can view own usage" ON daily_usage
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage" ON daily_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage" ON daily_usage
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Ensure RLS is enabled on daily_usage
ALTER TABLE daily_usage ENABLE ROW LEVEL SECURITY;