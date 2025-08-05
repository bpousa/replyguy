-- Add the missing generate_user_trial_token function that the API expects
-- This wraps the existing create_trial_offer_token function with different return field names

CREATE OR REPLACE FUNCTION generate_user_trial_token(
  p_user_id UUID,
  p_source VARCHAR DEFAULT 'email'
)
RETURNS TABLE(result_token VARCHAR, result_expires_at TIMESTAMPTZ, result_url TEXT) AS $$
BEGIN
  -- Call the existing create_trial_offer_token function and rename fields
  RETURN QUERY 
    SELECT 
      t.token as result_token,
      t.expires_at as result_expires_at,
      t.url as result_url
    FROM create_trial_offer_token(p_user_id, p_source) as t;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION generate_user_trial_token(UUID, VARCHAR) TO service_role;