-- Create table for secure trial offer tokens
CREATE TABLE IF NOT EXISTS public.trial_offer_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token VARCHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  source VARCHAR(50) DEFAULT 'email', -- 'email', 'dashboard', 'webhook'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_trial_offer_tokens_token ON public.trial_offer_tokens(token);
CREATE INDEX IF NOT EXISTS idx_trial_offer_tokens_user_id ON public.trial_offer_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_trial_offer_tokens_expires_at ON public.trial_offer_tokens(expires_at);

-- Add tracking fields to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS trial_offer_email_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_offer_expires_at TIMESTAMPTZ;

-- Create function to generate secure token
CREATE OR REPLACE FUNCTION generate_trial_token()
RETURNS TEXT AS $$
DECLARE
  characters TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  token TEXT := '';
  i INTEGER;
BEGIN
  -- Generate 32 character random token
  FOR i IN 1..32 LOOP
    token := token || SUBSTRING(characters FROM (FLOOR(RANDOM() * 62) + 1)::INTEGER FOR 1);
  END LOOP;
  
  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Create function to create trial offer token for user
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
  
  RETURN QUERY SELECT 
    v_token,
    v_expires_at,
    v_app_url || '/auth/trial-offer?token=' || v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policies
ALTER TABLE public.trial_offer_tokens ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role has full access to trial tokens" ON public.trial_offer_tokens
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can only view their own tokens
CREATE POLICY "Users can view own trial tokens" ON public.trial_offer_tokens
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT SELECT ON public.trial_offer_tokens TO authenticated;
GRANT ALL ON public.trial_offer_tokens TO service_role;
GRANT EXECUTE ON FUNCTION generate_trial_token() TO service_role;
GRANT EXECUTE ON FUNCTION create_trial_offer_token(UUID, VARCHAR) TO service_role;

-- Add comments for documentation
COMMENT ON TABLE public.trial_offer_tokens IS 'Secure tokens for accessing trial offers via email or other campaigns';
COMMENT ON COLUMN public.trial_offer_tokens.source IS 'Source of token generation: email, dashboard, webhook, etc';
COMMENT ON COLUMN public.trial_offer_tokens.used_at IS 'Timestamp when token was used to access trial offer';
COMMENT ON COLUMN public.users.trial_offer_email_sent_at IS 'When trial offer email was sent via GHL';
COMMENT ON COLUMN public.users.trial_offer_expires_at IS '7 days from user creation - when trial offer expires';