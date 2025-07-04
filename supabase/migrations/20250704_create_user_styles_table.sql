
-- Create the user_styles table to store personalized writing styles
CREATE TABLE IF NOT EXISTS public.user_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sample_tweets TEXT[] NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  style_analysis JSONB,
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX idx_user_styles_user_id ON public.user_styles(user_id);
CREATE INDEX idx_user_styles_is_active ON public.user_styles(user_id, is_active);

-- Add comments for documentation
COMMENT ON TABLE public.user_styles IS 'Stores personalized writing styles trained from user-provided tweets.';
COMMENT ON COLUMN public.user_styles.name IS 'User-defined name for the style (e.g., "Casual Friday", "Professional").';
COMMENT ON COLUMN public.user_styles.sample_tweets IS 'Array of tweets provided by the user for analysis.';
COMMENT ON COLUMN public.user_styles.is_active IS 'If true, this style is the default for the user.';
COMMENT ON COLUMN public.user_styles.style_analysis IS 'JSONB object containing the detailed style analysis from the AI model.';
COMMENT ON COLUMN public.user_styles.analyzed_at IS 'Timestamp of when the style was last analyzed.';

-- Enable Row Level Security
ALTER TABLE public.user_styles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can manage their own styles
CREATE POLICY "Users can manage their own styles"
ON public.user_styles
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Function to set a single style as active for a user
CREATE OR REPLACE FUNCTION set_active_style(p_user_id UUID, p_style_id UUID)
RETURNS VOID AS $$
BEGIN
  -- First, deactivate all styles for the user
  UPDATE public.user_styles
  SET is_active = false, updated_at = NOW()
  WHERE user_id = p_user_id AND is_active = true;

  -- Then, activate the specified style
  UPDATE public.user_styles
  SET is_active = true, updated_at = NOW()
  WHERE id = p_style_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update the 'updated_at' column
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_user_styles_timestamp
BEFORE UPDATE ON public.user_styles
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
