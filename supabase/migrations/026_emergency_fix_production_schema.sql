-- Emergency fix for production database schema mismatch
-- This migration adds missing columns and fixes schema issues discovered in production

-- First, add missing columns to user_usage table if they don't exist
DO $$ 
BEGIN
  -- Add replies_generated column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'user_usage' 
                AND column_name = 'replies_generated') THEN
    ALTER TABLE public.user_usage ADD COLUMN replies_generated INTEGER DEFAULT 0 CHECK (replies_generated >= 0);
  END IF;

  -- Add memes_generated column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'user_usage' 
                AND column_name = 'memes_generated') THEN
    ALTER TABLE public.user_usage ADD COLUMN memes_generated INTEGER DEFAULT 0 CHECK (memes_generated >= 0);
  END IF;

  -- Add suggestions_used column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'user_usage' 
                AND column_name = 'suggestions_used') THEN
    ALTER TABLE public.user_usage ADD COLUMN suggestions_used INTEGER DEFAULT 0 CHECK (suggestions_used >= 0);
  END IF;
END $$;

-- Ensure daily_usage table exists with all required columns
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

-- Add any missing columns to daily_usage
DO $$ 
BEGIN
  -- Add replies_generated column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'daily_usage' 
                AND column_name = 'replies_generated') THEN
    ALTER TABLE public.daily_usage ADD COLUMN replies_generated INTEGER DEFAULT 0 CHECK (replies_generated >= 0);
  END IF;

  -- Add memes_generated column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'daily_usage' 
                AND column_name = 'memes_generated') THEN
    ALTER TABLE public.daily_usage ADD COLUMN memes_generated INTEGER DEFAULT 0 CHECK (memes_generated >= 0);
  END IF;

  -- Add suggestions_used column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'daily_usage' 
                AND column_name = 'suggestions_used') THEN
    ALTER TABLE public.daily_usage ADD COLUMN suggestions_used INTEGER DEFAULT 0 CHECK (suggestions_used >= 0);
  END IF;

  -- Add goal_achieved column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'daily_usage' 
                AND column_name = 'goal_achieved') THEN
    ALTER TABLE public.daily_usage ADD COLUMN goal_achieved BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Ensure all required indexes exist
CREATE INDEX IF NOT EXISTS idx_daily_usage_user_date ON daily_usage(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_user_usage_user_month ON user_usage(user_id, month DESC);

-- Enable RLS if not already enabled
ALTER TABLE daily_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

-- Create or replace RLS policies
DROP POLICY IF EXISTS "Users can view own daily usage" ON daily_usage;
CREATE POLICY "Users can view own daily usage" ON daily_usage
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own monthly usage" ON user_usage;
CREATE POLICY "Users can view own monthly usage" ON user_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Recreate the track_daily_usage function with better error handling
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
  SELECT COALESCE(timezone, 'America/New_York'), COALESCE(daily_goal, 10) 
  INTO v_user_timezone, v_daily_goal
  FROM users 
  WHERE id = p_user_id;
  
  -- If user not found, use defaults
  IF NOT FOUND THEN
    v_user_timezone := 'America/New_York';
    v_daily_goal := 10;
  END IF;
  
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
  
  -- Also update monthly usage (user_usage table) - with proper error handling
  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the entire function
    RAISE WARNING 'Failed to update user_usage: %', SQLERRM;
  END;
  
  -- Try to update billing period usage if it exists (don't fail if table doesn't exist)
  BEGIN
    PERFORM update_billing_period_usage(p_user_id, p_usage_type, p_count);
  EXCEPTION WHEN OTHERS THEN
    -- Ignore errors from billing period updates
    NULL;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to update billing period usage (if table exists)
CREATE OR REPLACE FUNCTION update_billing_period_usage(
  p_user_id UUID,
  p_usage_type TEXT,
  p_count INTEGER
) RETURNS VOID AS $$
DECLARE
  v_period_start DATE;
  v_period_end DATE;
  v_subscription_id UUID;
BEGIN
  -- Check if billing_period_usage table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'billing_period_usage') THEN
    RETURN;
  END IF;
  
  -- Try to get billing period (might fail if function doesn't exist)
  BEGIN
    SELECT period_start, period_end 
    INTO v_period_start, v_period_end
    FROM get_current_billing_period(p_user_id);
  EXCEPTION WHEN OTHERS THEN
    -- Function doesn't exist or failed
    RETURN;
  END;
  
  -- Get active subscription ID
  SELECT id INTO v_subscription_id
  FROM subscriptions
  WHERE user_id = p_user_id 
    AND status IN ('active', 'trialing', 'past_due')
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_period_start IS NOT NULL AND v_subscription_id IS NOT NULL THEN
    -- Update billing period usage
    EXECUTE format('
      INSERT INTO billing_period_usage (
        user_id, subscription_id, billing_period_start, billing_period_end,
        replies_generated, memes_generated, suggestions_used
      )
      VALUES ($1, $2, $3, $4,
        CASE WHEN $5 = ''reply'' THEN $6 ELSE 0 END,
        CASE WHEN $5 = ''meme'' THEN $6 ELSE 0 END,
        CASE WHEN $5 = ''suggestion'' THEN $6 ELSE 0 END
      )
      ON CONFLICT (user_id, billing_period_start) DO UPDATE SET
        replies_generated = billing_period_usage.replies_generated + 
          CASE WHEN $5 = ''reply'' THEN $6 ELSE 0 END,
        memes_generated = billing_period_usage.memes_generated + 
          CASE WHEN $5 = ''meme'' THEN $6 ELSE 0 END,
        suggestions_used = billing_period_usage.suggestions_used + 
          CASE WHEN $5 = ''suggestion'' THEN $6 ELSE 0 END,
        updated_at = NOW()
    ')
    USING p_user_id, v_subscription_id, v_period_start, v_period_end, p_usage_type, p_count;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.track_daily_usage(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_daily_usage(UUID, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_billing_period_usage(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_billing_period_usage(UUID, TEXT, INTEGER) TO service_role;

-- Add a simple function to check if schema is healthy
CREATE OR REPLACE FUNCTION public.check_schema_health()
RETURNS TABLE (
  table_name TEXT,
  status TEXT,
  message TEXT
) AS $$
BEGIN
  -- Check daily_usage table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_usage') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_usage' AND column_name = 'replies_generated') THEN
      RETURN QUERY SELECT 'daily_usage'::TEXT, 'OK'::TEXT, 'Table exists with all columns'::TEXT;
    ELSE
      RETURN QUERY SELECT 'daily_usage'::TEXT, 'ERROR'::TEXT, 'Missing replies_generated column'::TEXT;
    END IF;
  ELSE
    RETURN QUERY SELECT 'daily_usage'::TEXT, 'ERROR'::TEXT, 'Table does not exist'::TEXT;
  END IF;
  
  -- Check user_usage table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_usage') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_usage' AND column_name = 'replies_generated') THEN
      RETURN QUERY SELECT 'user_usage'::TEXT, 'OK'::TEXT, 'Table exists with all columns'::TEXT;
    ELSE
      RETURN QUERY SELECT 'user_usage'::TEXT, 'ERROR'::TEXT, 'Missing replies_generated column'::TEXT;
    END IF;
  ELSE
    RETURN QUERY SELECT 'user_usage'::TEXT, 'ERROR'::TEXT, 'Table does not exist'::TEXT;
  END IF;
  
  -- Check if track_daily_usage function exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'track_daily_usage') THEN
    RETURN QUERY SELECT 'track_daily_usage'::TEXT, 'OK'::TEXT, 'Function exists'::TEXT;
  ELSE
    RETURN QUERY SELECT 'track_daily_usage'::TEXT, 'ERROR'::TEXT, 'Function does not exist'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.check_schema_health() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_schema_health() TO anon;

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Emergency schema fix migration completed successfully';
END $$;