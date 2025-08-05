-- Create a new function with a different name to avoid conflicts
CREATE OR REPLACE FUNCTION generate_user_trial_token(
  p_user_id UUID,
  p_source VARCHAR DEFAULT 'email'
)
RETURNS TABLE(result_token VARCHAR, result_expires_at TIMESTAMPTZ, result_url TEXT) AS $$
DECLARE
  v_token VARCHAR;
  v_expires_at TIMESTAMPTZ;
  v_user_created_at TIMESTAMPTZ;
  v_existing_token VARCHAR;
  v_app_url TEXT;
BEGIN
  -- Get user creation date
  SELECT created_at INTO v_user_created_at
  FROM public.users
  WHERE id = p_user_id;
  
  IF v_user_created_at IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Calculate expiration (7 days from user creation)
  v_expires_at := v_user_created_at + INTERVAL '7 days';
  
  -- Check if token already expired
  IF v_expires_at < NOW() THEN
    RAISE EXCEPTION 'Trial offer period has expired';
  END IF;
  
  -- Check for existing unused token
  SELECT trial_tokens.token INTO v_existing_token
  FROM public.trial_offer_tokens trial_tokens
  WHERE trial_tokens.user_id = p_user_id
    AND trial_tokens.used_at IS NULL
    AND trial_tokens.expires_at > NOW()
  ORDER BY trial_tokens.created_at DESC
  LIMIT 1;
  
  IF v_existing_token IS NOT NULL THEN
    -- Return existing token
    v_token := v_existing_token;
  ELSE
    -- Generate new token
    LOOP
      v_token := generate_trial_token();
      -- Ensure token is unique
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.trial_offer_tokens 
        WHERE trial_offer_tokens.token = v_token
      );
    END LOOP;
    
    -- Insert new token
    INSERT INTO public.trial_offer_tokens (user_id, token, expires_at, source)
    VALUES (p_user_id, v_token, v_expires_at, p_source);
  END IF;
  
  -- Get app URL from settings or use default
  v_app_url := COALESCE(
    current_setting('app.settings.app_url', true),
    'https://replyguy.appendment.com'
  );
  
  -- Return with completely unique column names
  RETURN QUERY SELECT 
    v_token::VARCHAR,
    v_expires_at::TIMESTAMPTZ,
    (v_app_url || '/auth/trial-offer?token=' || v_token)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION generate_user_trial_token(UUID, VARCHAR) TO service_role;