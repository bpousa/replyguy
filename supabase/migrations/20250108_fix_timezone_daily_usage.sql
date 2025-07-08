-- Fix timezone issues in daily usage tracking
-- Update track_daily_usage to accept a date parameter instead of using CURRENT_DATE

CREATE OR REPLACE FUNCTION track_daily_usage(
  p_user_id UUID,
  p_usage_type TEXT,
  p_count INTEGER DEFAULT 1,
  p_date DATE DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_date DATE;
BEGIN
  -- Use provided date or fall back to database's current date
  v_date := COALESCE(p_date, CURRENT_DATE);
  
  -- Insert or update daily usage
  INSERT INTO daily_usage (user_id, usage_date, replies_used, suggestions_used, memes_used, research_used)
  VALUES (
    p_user_id, 
    v_date, 
    CASE WHEN p_usage_type = 'reply' THEN p_count ELSE 0 END,
    CASE WHEN p_usage_type = 'suggestion' THEN p_count ELSE 0 END,
    CASE WHEN p_usage_type = 'meme' THEN p_count ELSE 0 END,
    CASE WHEN p_usage_type = 'research' THEN p_count ELSE 0 END
  )
  ON CONFLICT (user_id, usage_date) DO UPDATE
  SET 
    replies_used = daily_usage.replies_used + CASE WHEN p_usage_type = 'reply' THEN p_count ELSE 0 END,
    suggestions_used = daily_usage.suggestions_used + CASE WHEN p_usage_type = 'suggestion' THEN p_count ELSE 0 END,
    memes_used = daily_usage.memes_used + CASE WHEN p_usage_type = 'meme' THEN p_count ELSE 0 END,
    research_used = daily_usage.research_used + CASE WHEN p_usage_type = 'research' THEN p_count ELSE 0 END,
    updated_at = NOW();
    
  -- Log the tracking for debugging
  RAISE NOTICE 'Tracked % usage for user % on date %', p_usage_type, p_user_id, v_date;
END;
$$ LANGUAGE plpgsql;

-- Add a helper function to get user's current date based on timezone
CREATE OR REPLACE FUNCTION get_user_current_date(p_user_id UUID)
RETURNS DATE AS $$
DECLARE
  v_timezone TEXT;
  v_date DATE;
BEGIN
  -- Get user's timezone
  SELECT timezone INTO v_timezone
  FROM users
  WHERE id = p_user_id;
  
  -- If no timezone set, use UTC
  IF v_timezone IS NULL THEN
    v_timezone := 'UTC';
  END IF;
  
  -- Get current date in user's timezone
  v_date := (NOW() AT TIME ZONE v_timezone)::DATE;
  
  RETURN v_date;
END;
$$ LANGUAGE plpgsql;

-- Add index on daily_usage for better query performance
CREATE INDEX IF NOT EXISTS idx_daily_usage_user_date 
ON daily_usage(user_id, usage_date DESC);

-- Add function to get current database timestamp for debugging
CREATE OR REPLACE FUNCTION get_current_timestamp()
RETURNS TIMESTAMPTZ AS $$
BEGIN
  RETURN NOW();
END;
$$ LANGUAGE plpgsql;