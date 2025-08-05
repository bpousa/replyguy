-- Fix the ambiguous column reference in create_trial_offer_token function
CREATE OR REPLACE FUNCTION create_trial_offer_token(
  p_user_id UUID,
  p_source VARCHAR DEFAULT 'email'
)
RETURNS TABLE(token VARCHAR, expires_at TIMESTAMPTZ, url TEXT) AS $$
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
  SELECT t.token INTO v_existing_token
  FROM public.trial_offer_tokens t
  WHERE t.user_id = p_user_id
    AND t.used_at IS NULL
    AND t.expires_at > NOW()
  ORDER BY t.created_at DESC
  LIMIT 1;
  
  IF v_existing_token IS NOT NULL THEN
    -- Return existing token
    v_token := v_existing_token;
  ELSE
    -- Generate new token
    LOOP
      v_token := generate_trial_token();
      -- Ensure token is unique
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.trial_offer_tokens WHERE token = v_token);
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
  
  -- Return with explicit column aliases to avoid ambiguity
  RETURN QUERY SELECT 
    v_token::VARCHAR as token,
    v_expires_at as expires_at,
    (v_app_url || '/auth/trial-offer?token=' || v_token)::TEXT as url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_trial_offer_token(UUID, VARCHAR) TO service_role;