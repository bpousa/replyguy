-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  stripe_customer_id TEXT UNIQUE,
  daily_goal INTEGER DEFAULT 10 CHECK (daily_goal >= 1 AND daily_goal <= 100),
  timezone TEXT DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id),
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT one_active_subscription_per_user UNIQUE (user_id, status) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Create daily usage tracking
CREATE TABLE IF NOT EXISTS public.daily_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  replies_generated INTEGER DEFAULT 0 CHECK (replies_generated >= 0),
  memes_generated INTEGER DEFAULT 0 CHECK (memes_generated >= 0),
  suggestions_used INTEGER DEFAULT 0 CHECK (suggestions_used >= 0),
  goal_achieved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Create/update user usage (monthly tracking)
CREATE TABLE IF NOT EXISTS public.user_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  replies_generated INTEGER DEFAULT 0 CHECK (replies_generated >= 0),
  memes_generated INTEGER DEFAULT 0 CHECK (memes_generated >= 0),
  suggestions_used INTEGER DEFAULT 0 CHECK (suggestions_used >= 0),
  total_cost DECIMAL(10,4) DEFAULT 0 CHECK (total_cost >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month)
);

-- Add meme columns to subscription_plans if they don't exist
ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS meme_limit INTEGER DEFAULT 0 CHECK (meme_limit >= 0),
ADD COLUMN IF NOT EXISTS enable_memes BOOLEAN DEFAULT FALSE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_daily_usage_user_date ON daily_usage(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_user_usage_user_month ON user_usage(user_id, month DESC);

-- Update trigger for users
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update trigger for subscriptions
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update trigger for user_usage
CREATE TRIGGER update_user_usage_updated_at BEFORE UPDATE ON user_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can view their own usage
CREATE POLICY "Users can view own daily usage" ON daily_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own monthly usage" ON user_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to track daily usage
CREATE OR REPLACE FUNCTION public.track_daily_usage(
  p_user_id UUID,
  p_usage_type TEXT, -- 'reply', 'meme', 'suggestion'
  p_count INTEGER DEFAULT 1
) RETURNS VOID AS $$
DECLARE
  v_user_timezone TEXT;
  v_user_date DATE;
  v_daily_goal INTEGER;
  v_current_replies INTEGER;
BEGIN
  -- Get user timezone and goal
  SELECT timezone, daily_goal INTO v_user_timezone, v_daily_goal
  FROM users WHERE id = p_user_id;
  
  -- Calculate user's current date based on their timezone
  v_user_date := (NOW() AT TIME ZONE v_user_timezone)::DATE;
  
  -- Insert or update daily usage
  INSERT INTO daily_usage (user_id, date, replies_generated, memes_generated, suggestions_used)
  VALUES (
    p_user_id,
    v_user_date,
    CASE WHEN p_usage_type = 'reply' THEN p_count ELSE 0 END,
    CASE WHEN p_usage_type = 'meme' THEN p_count ELSE 0 END,
    CASE WHEN p_usage_type = 'suggestion' THEN p_count ELSE 0 END
  )
  ON CONFLICT (user_id, date) DO UPDATE SET
    replies_generated = daily_usage.replies_generated + 
      CASE WHEN p_usage_type = 'reply' THEN p_count ELSE 0 END,
    memes_generated = daily_usage.memes_generated + 
      CASE WHEN p_usage_type = 'meme' THEN p_count ELSE 0 END,
    suggestions_used = daily_usage.suggestions_used + 
      CASE WHEN p_usage_type = 'suggestion' THEN p_count ELSE 0 END;
  
  -- Check if goal achieved (only for replies)
  IF p_usage_type = 'reply' THEN
    SELECT replies_generated INTO v_current_replies
    FROM daily_usage 
    WHERE user_id = p_user_id AND date = v_user_date;
    
    IF v_current_replies >= v_daily_goal THEN
      UPDATE daily_usage 
      SET goal_achieved = TRUE
      WHERE user_id = p_user_id AND date = v_user_date AND goal_achieved = FALSE;
    END IF;
  END IF;
  
  -- Also update monthly usage
  INSERT INTO user_usage (user_id, month, replies_generated, memes_generated, suggestions_used)
  VALUES (
    p_user_id,
    DATE_TRUNC('month', v_user_date),
    CASE WHEN p_usage_type = 'reply' THEN p_count ELSE 0 END,
    CASE WHEN p_usage_type = 'meme' THEN p_count ELSE 0 END,
    CASE WHEN p_usage_type = 'suggestion' THEN p_count ELSE 0 END
  )
  ON CONFLICT (user_id, month) DO UPDATE SET
    replies_generated = user_usage.replies_generated + 
      CASE WHEN p_usage_type = 'reply' THEN p_count ELSE 0 END,
    memes_generated = user_usage.memes_generated + 
      CASE WHEN p_usage_type = 'meme' THEN p_count ELSE 0 END,
    suggestions_used = user_usage.suggestions_used + 
      CASE WHEN p_usage_type = 'suggestion' THEN p_count ELSE 0 END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's current usage and limits
CREATE OR REPLACE FUNCTION public.get_user_limits(p_user_id UUID)
RETURNS TABLE (
  plan_id TEXT,
  plan_name TEXT,
  reply_limit INTEGER,
  replies_used INTEGER,
  meme_limit INTEGER,
  memes_used INTEGER,
  suggestion_limit INTEGER,
  suggestions_used INTEGER,
  daily_replies INTEGER,
  daily_goal INTEGER,
  goal_achieved BOOLEAN
) AS $$
DECLARE
  v_user_timezone TEXT;
  v_user_date DATE;
  v_month_start DATE;
BEGIN
  -- Get user timezone
  SELECT timezone INTO v_user_timezone FROM users WHERE id = p_user_id;
  
  -- Calculate dates
  v_user_date := (NOW() AT TIME ZONE v_user_timezone)::DATE;
  v_month_start := DATE_TRUNC('month', v_user_date);
  
  RETURN QUERY
  SELECT 
    sp.id,
    sp.name,
    sp.reply_limit,
    COALESCE(uu.replies_generated, 0),
    sp.meme_limit,
    COALESCE(uu.memes_generated, 0),
    sp.suggestion_limit,
    COALESCE(uu.suggestions_used, 0),
    COALESCE(du.replies_generated, 0),
    u.daily_goal,
    COALESCE(du.goal_achieved, FALSE)
  FROM users u
  JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
  JOIN subscription_plans sp ON sp.id = s.plan_id
  LEFT JOIN user_usage uu ON uu.user_id = u.id AND uu.month = v_month_start
  LEFT JOIN daily_usage du ON du.user_id = u.id AND du.date = v_user_date
  WHERE u.id = p_user_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;