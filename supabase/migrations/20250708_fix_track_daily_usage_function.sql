-- Fix the track_daily_usage function to accept parameters in the correct order
-- Drop the existing function first
DROP FUNCTION IF EXISTS public.track_daily_usage(UUID, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.track_daily_usage(INTEGER, DATE, TEXT, UUID);
DROP FUNCTION IF EXISTS public.track_daily_usage(UUID, TEXT, INTEGER, DATE);

-- Create the function with the expected parameter order
CREATE OR REPLACE FUNCTION public.track_daily_usage(
  p_user_id UUID,
  p_usage_type TEXT, -- 'reply', 'meme', 'suggestion'
  p_count INTEGER DEFAULT 1,
  p_date DATE DEFAULT NULL  -- Allow passing a specific date
) RETURNS JSONB AS $$
DECLARE
  v_user_timezone TEXT;
  v_user_date DATE;
  v_daily_goal INTEGER;
  v_current_replies INTEGER;
  v_goal_achieved BOOLEAN := FALSE;
BEGIN
  -- Get user timezone and goal
  SELECT timezone, daily_goal INTO v_user_timezone, v_daily_goal
  FROM users WHERE id = p_user_id;
  
  -- Use the provided date or calculate user's current date based on their timezone
  IF p_date IS NOT NULL THEN
    v_user_date := p_date;
  ELSE
    v_user_date := (NOW() AT TIME ZONE COALESCE(v_user_timezone, 'America/New_York'))::DATE;
  END IF;
  
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
      
      v_goal_achieved := TRUE;
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
    
  -- Return tracking status
  RETURN jsonb_build_object(
    'success', true,
    'date', v_user_date,
    'timezone', v_user_timezone,
    'goal_achieved', v_goal_achieved,
    'current_count', v_current_replies,
    'daily_goal', v_daily_goal
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'date', v_user_date,
      'timezone', v_user_timezone
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.track_daily_usage TO authenticated;