-- Update get_current_usage function to use billing period instead of calendar month
-- This ensures usage resets align with the user's billing cycle

-- First, let's create a new table for billing period usage tracking
CREATE TABLE IF NOT EXISTS public.billing_period_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  replies_generated INTEGER DEFAULT 0 CHECK (replies_generated >= 0),
  memes_generated INTEGER DEFAULT 0 CHECK (memes_generated >= 0),
  suggestions_used INTEGER DEFAULT 0 CHECK (suggestions_used >= 0),
  total_cost DECIMAL(10,4) DEFAULT 0 CHECK (total_cost >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, billing_period_start)
);

-- Add indexes for performance
CREATE INDEX idx_billing_period_usage_user_period ON billing_period_usage(user_id, billing_period_start DESC);
CREATE INDEX idx_billing_period_usage_subscription ON billing_period_usage(subscription_id);

-- Enable RLS
ALTER TABLE billing_period_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own billing period usage
CREATE POLICY "Users can view own billing period usage" ON billing_period_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Update trigger for billing_period_usage
CREATE TRIGGER update_billing_period_usage_updated_at BEFORE UPDATE ON billing_period_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate current billing period for a user
CREATE OR REPLACE FUNCTION public.get_current_billing_period(p_user_id UUID)
RETURNS TABLE (
  period_start DATE,
  period_end DATE
) AS $$
DECLARE
  v_billing_anchor_day INTEGER;
  v_current_date DATE;
  v_period_start DATE;
  v_period_end DATE;
  v_subscription_start DATE;
BEGIN
  -- Get the active subscription's billing anchor day and start date
  SELECT 
    s.billing_anchor_day,
    s.current_period_start::DATE
  INTO 
    v_billing_anchor_day,
    v_subscription_start
  FROM subscriptions s
  WHERE s.user_id = p_user_id 
    AND s.status IN ('active', 'trialing', 'past_due')
  ORDER BY s.created_at DESC
  LIMIT 1;
  
  -- If no active subscription or no billing anchor day, use calendar month
  IF v_billing_anchor_day IS NULL THEN
    v_period_start := DATE_TRUNC('month', CURRENT_DATE);
    v_period_end := (v_period_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  ELSE
    v_current_date := CURRENT_DATE;
    
    -- Calculate the billing period start
    IF EXTRACT(DAY FROM v_current_date) >= v_billing_anchor_day THEN
      -- We're past the billing day this month
      v_period_start := DATE_TRUNC('month', v_current_date) + (v_billing_anchor_day - 1) * INTERVAL '1 day';
    ELSE
      -- We haven't reached the billing day yet this month
      v_period_start := DATE_TRUNC('month', v_current_date - INTERVAL '1 month') + (v_billing_anchor_day - 1) * INTERVAL '1 day';
    END IF;
    
    -- Handle edge case where billing day is greater than days in month
    -- (e.g., billing on 31st but current month has 30 days)
    IF v_billing_anchor_day > EXTRACT(DAY FROM (DATE_TRUNC('month', v_period_start) + INTERVAL '1 month' - INTERVAL '1 day')) THEN
      v_period_start := DATE_TRUNC('month', v_period_start) + INTERVAL '1 month' - INTERVAL '1 day';
    END IF;
    
    -- Calculate period end (day before next billing date)
    v_period_end := (v_period_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  END IF;
  
  RETURN QUERY SELECT v_period_start, v_period_end;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated get_current_usage function that uses billing periods
CREATE OR REPLACE FUNCTION public.get_current_usage(p_user_id UUID)
RETURNS TABLE (
  total_replies INTEGER,
  total_memes INTEGER,
  total_suggestions INTEGER
) AS $$
DECLARE
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  -- Get current billing period
  SELECT period_start, period_end 
  INTO v_period_start, v_period_end
  FROM get_current_billing_period(p_user_id);
  
  -- Return current billing period's usage
  RETURN QUERY
  SELECT 
    COALESCE(bpu.replies_generated, 0)::INTEGER as total_replies,
    COALESCE(bpu.memes_generated, 0)::INTEGER as total_memes,
    COALESCE(bpu.suggestions_used, 0)::INTEGER as total_suggestions
  FROM users u
  LEFT JOIN billing_period_usage bpu ON 
    bpu.user_id = u.id AND 
    bpu.billing_period_start = v_period_start
  WHERE u.id = p_user_id;
  
  -- If no row found, return zeros
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0::INTEGER, 0::INTEGER, 0::INTEGER;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update track_daily_usage to also update billing period usage
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
  v_period_start DATE;
  v_period_end DATE;
  v_subscription_id UUID;
BEGIN
  -- Get user timezone and goal
  SELECT timezone, daily_goal INTO v_user_timezone, v_daily_goal
  FROM users WHERE id = p_user_id;
  
  -- Calculate user's current date based on their timezone
  v_user_date := (NOW() AT TIME ZONE v_user_timezone)::DATE;
  
  -- Insert or update daily usage (existing logic)
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
  
  -- Get current billing period
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
  
  -- Also update monthly usage for backwards compatibility
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

-- Function to migrate existing usage data to billing periods
CREATE OR REPLACE FUNCTION migrate_usage_to_billing_periods()
RETURNS void AS $$
DECLARE
  v_user RECORD;
  v_usage RECORD;
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  -- For each user with usage data
  FOR v_user IN 
    SELECT DISTINCT u.id as user_id
    FROM users u
    JOIN user_usage uu ON uu.user_id = u.id
  LOOP
    -- For each month of usage
    FOR v_usage IN
      SELECT * FROM user_usage
      WHERE user_id = v_user.user_id
      ORDER BY month
    LOOP
      -- Calculate what the billing period would have been
      SELECT period_start, period_end 
      INTO v_period_start, v_period_end
      FROM get_current_billing_period(v_user.user_id);
      
      -- If the usage month overlaps with a billing period, add it
      IF v_usage.month >= v_period_start AND v_usage.month <= v_period_end THEN
        INSERT INTO billing_period_usage (
          user_id,
          billing_period_start,
          billing_period_end,
          replies_generated,
          memes_generated,
          suggestions_used,
          total_cost,
          created_at,
          updated_at
        ) VALUES (
          v_user.user_id,
          v_period_start,
          v_period_end,
          v_usage.replies_generated,
          v_usage.memes_generated,
          v_usage.suggestions_used,
          v_usage.total_cost,
          v_usage.created_at,
          v_usage.updated_at
        )
        ON CONFLICT (user_id, billing_period_start) DO UPDATE SET
          replies_generated = billing_period_usage.replies_generated + EXCLUDED.replies_generated,
          memes_generated = billing_period_usage.memes_generated + EXCLUDED.memes_generated,
          suggestions_used = billing_period_usage.suggestions_used + EXCLUDED.suggestions_used,
          total_cost = billing_period_usage.total_cost + EXCLUDED.total_cost;
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the migration
SELECT migrate_usage_to_billing_periods();

-- Drop the migration function
DROP FUNCTION migrate_usage_to_billing_periods();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_current_billing_period(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_daily_usage(UUID, TEXT, INTEGER) TO authenticated;

-- Add comment
COMMENT ON TABLE billing_period_usage IS 'Tracks usage aligned with user billing periods instead of calendar months';
COMMENT ON FUNCTION get_current_billing_period IS 'Calculates the current billing period for a user based on their subscription billing anchor day';