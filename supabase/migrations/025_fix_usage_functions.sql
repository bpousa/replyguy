-- Fix usage tracking functions to ensure they work properly

-- First create daily_usage table if it doesn't exist
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

-- Enable RLS if not already enabled
ALTER TABLE daily_usage ENABLE ROW LEVEL SECURITY;

-- Create policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'daily_usage' 
    AND policyname = 'Users can view own daily usage'
  ) THEN
    CREATE POLICY "Users can view own daily usage" ON daily_usage
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- Then ensure columns have correct defaults
DO $$ 
BEGIN
  -- Ensure date column is NOT NULL
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_usage' AND column_name = 'date') THEN
    ALTER TABLE daily_usage ALTER COLUMN date SET NOT NULL;
  END IF;
  
  -- Set defaults for counter columns
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_usage' AND column_name = 'replies_generated') THEN
    ALTER TABLE daily_usage ALTER COLUMN replies_generated SET DEFAULT 0;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_usage' AND column_name = 'memes_generated') THEN
    ALTER TABLE daily_usage ALTER COLUMN memes_generated SET DEFAULT 0;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_usage' AND column_name = 'suggestions_used') THEN
    ALTER TABLE daily_usage ALTER COLUMN suggestions_used SET DEFAULT 0;
  END IF;
END $$;

-- Recreate get_current_usage function with better error handling
DROP FUNCTION IF EXISTS public.get_current_usage(UUID);

CREATE OR REPLACE FUNCTION public.get_current_usage(p_user_id UUID)
RETURNS TABLE (
  total_replies INTEGER,
  total_memes INTEGER, 
  total_suggestions INTEGER
) AS $$
DECLARE
  v_has_subscription BOOLEAN;
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  -- Check if user has any subscription
  SELECT EXISTS (
    SELECT 1 FROM subscriptions 
    WHERE user_id = p_user_id 
    AND status IN ('active', 'trialing', 'past_due')
  ) INTO v_has_subscription;
  
  -- If user has subscription, use billing period
  IF v_has_subscription THEN
    -- Try to get billing period
    BEGIN
      SELECT period_start, period_end 
      INTO v_period_start, v_period_end
      FROM get_current_billing_period(p_user_id);
    EXCEPTION WHEN OTHERS THEN
      -- Fallback to current month if billing period fails
      v_period_start := DATE_TRUNC('month', CURRENT_DATE);
      v_period_end := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    END;
  ELSE
    -- For free users, use current month
    v_period_start := DATE_TRUNC('month', CURRENT_DATE);
    v_period_end := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  END IF;
  
  -- Return usage for the period (sum from daily_usage)
  RETURN QUERY
  SELECT 
    COALESCE(SUM(du.replies_generated), 0)::INTEGER as total_replies,
    COALESCE(SUM(du.memes_generated), 0)::INTEGER as total_memes,
    COALESCE(SUM(du.suggestions_used), 0)::INTEGER as total_suggestions
  FROM daily_usage du
  WHERE du.user_id = p_user_id
    AND du.date >= v_period_start
    AND du.date <= v_period_end;
    
  -- If no rows found, return zeros
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0::INTEGER, 0::INTEGER, 0::INTEGER;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure track_daily_usage function exists and works
DROP FUNCTION IF EXISTS public.track_daily_usage(UUID, TEXT, INTEGER);

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
  
  -- Also update monthly usage (user_usage table)
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
    
  -- Try to update billing period usage if it exists
  BEGIN
    -- Get current billing period
    DECLARE
      v_period_start DATE;
      v_period_end DATE;
      v_subscription_id UUID;
    BEGIN
      SELECT period_start, period_end 
      INTO v_period_start, v_period_end
      FROM get_current_billing_period(p_user_id);
      
      -- Get active subscription ID
      SELECT id INTO v_subscription_id
      FROM subscriptions
      WHERE user_id = p_user_id 
        AND status IN ('active', 'trialing', 'past_due')
      ORDER BY created_at DESC
      LIMIT 1;
      
      IF v_period_start IS NOT NULL AND v_subscription_id IS NOT NULL THEN
        -- Update billing period usage
        INSERT INTO billing_period_usage (
          user_id, 
          subscription_id,
          billing_period_start, 
          billing_period_end,
          replies_generated, 
          memes_generated, 
          suggestions_used
        )
        VALUES (
          p_user_id,
          v_subscription_id,
          v_period_start,
          v_period_end,
          CASE WHEN p_usage_type = 'reply' THEN p_count ELSE 0 END,
          CASE WHEN p_usage_type = 'meme' THEN p_count ELSE 0 END,
          CASE WHEN p_usage_type = 'suggestion' THEN p_count ELSE 0 END
        )
        ON CONFLICT (user_id, billing_period_start) DO UPDATE SET
          replies_generated = billing_period_usage.replies_generated + 
            CASE WHEN p_usage_type = 'reply' THEN p_count ELSE 0 END,
          memes_generated = billing_period_usage.memes_generated + 
            CASE WHEN p_usage_type = 'meme' THEN p_count ELSE 0 END,
          suggestions_used = billing_period_usage.suggestions_used + 
            CASE WHEN p_usage_type = 'suggestion' THEN p_count ELSE 0 END,
          updated_at = NOW();
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Ignore billing period errors, daily and monthly tracking is sufficient
      NULL;
    END;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_current_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_daily_usage(UUID, TEXT, INTEGER) TO authenticated;

-- Create index for performance (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_usage') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_daily_usage_user_date_desc') THEN
      CREATE INDEX idx_daily_usage_user_date_desc ON daily_usage(user_id, date DESC);
    END IF;
  END IF;
END $$;