-- Fix the generate_user_trial_token function - use direct column mapping approach
-- Avoid ambiguous column references by using a simpler direct mapping

DROP FUNCTION IF EXISTS generate_user_trial_token(UUID, VARCHAR);

CREATE OR REPLACE FUNCTION generate_user_trial_token(
  p_user_id UUID,
  p_source VARCHAR DEFAULT 'email'
)
RETURNS TABLE(result_token VARCHAR, result_expires_at TIMESTAMPTZ, result_url TEXT) AS $$
BEGIN
  -- Direct query mapping without aliases to avoid column ambiguity
  RETURN QUERY 
    SELECT 
      ctt.token::VARCHAR as result_token,
      ctt.expires_at as result_expires_at,
      ctt.url as result_url
    FROM create_trial_offer_token(p_user_id, p_source) ctt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION generate_user_trial_token(UUID, VARCHAR) TO service_role;