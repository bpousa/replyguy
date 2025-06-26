-- Drop existing function if it exists with different signature
DROP FUNCTION IF EXISTS public.get_current_usage(UUID);

-- Create the missing get_current_usage function
-- This function is called by check-limits/route.ts and process/route.ts but doesn't exist in migrations

CREATE OR REPLACE FUNCTION public.get_current_usage(p_user_id UUID)
RETURNS TABLE (
  total_replies INTEGER,
  total_memes INTEGER,
  total_suggestions INTEGER
) AS $$
DECLARE
  v_user_timezone TEXT;
  v_user_date DATE;
  v_month_start DATE;
BEGIN
  -- Get user timezone (default to UTC if not set)
  SELECT COALESCE(timezone, 'UTC') INTO v_user_timezone 
  FROM users WHERE id = p_user_id;
  
  -- Calculate the start of the current month in user's timezone
  v_user_date := (NOW() AT TIME ZONE v_user_timezone)::DATE;
  v_month_start := DATE_TRUNC('month', v_user_date);
  
  -- Return current month's usage
  RETURN QUERY
  SELECT 
    COALESCE(uu.replies_generated, 0)::INTEGER as total_replies,
    COALESCE(uu.memes_generated, 0)::INTEGER as total_memes,
    COALESCE(uu.suggestions_used, 0)::INTEGER as total_suggestions
  FROM users u
  LEFT JOIN user_usage uu ON uu.user_id = u.id AND uu.month = v_month_start
  WHERE u.id = p_user_id;
  
  -- If no row found, return zeros
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0::INTEGER, 0::INTEGER, 0::INTEGER;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_usage(UUID) TO authenticated;