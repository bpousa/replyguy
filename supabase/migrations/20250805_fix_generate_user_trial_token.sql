-- Fix the generate_user_trial_token function with correct column references
-- The previous version had ambiguous column references

DROP FUNCTION IF EXISTS generate_user_trial_token(UUID, VARCHAR);

CREATE OR REPLACE FUNCTION generate_user_trial_token(
  p_user_id UUID,
  p_source VARCHAR DEFAULT 'email'
)
RETURNS TABLE(result_token VARCHAR, result_expires_at TIMESTAMPTZ, result_url TEXT) AS $$
BEGIN
  -- Call the existing create_trial_offer_token function and map results correctly
  RETURN QUERY 
    SELECT 
      token_result.token::VARCHAR as result_token,
      token_result.expires_at as result_expires_at,
      token_result.url as result_url
    FROM create_trial_offer_token(p_user_id, p_source) as token_result(token VARCHAR, expires_at TIMESTAMPTZ, url TEXT);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION generate_user_trial_token(UUID, VARCHAR) TO service_role;