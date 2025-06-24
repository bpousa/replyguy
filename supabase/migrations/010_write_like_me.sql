-- Create user_styles table for Write Like Me feature
CREATE TABLE IF NOT EXISTS public.user_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Style',
  is_active BOOLEAN DEFAULT false,
  sample_tweets TEXT[] NOT NULL CHECK (array_length(sample_tweets, 1) >= 3),
  
  -- Analyzed style attributes
  tone TEXT,
  formality TEXT CHECK (formality IN ('casual', 'neutral', 'formal')),
  vocabulary TEXT CHECK (vocabulary IN ('simple', 'moderate', 'complex')),
  sentence_length TEXT CHECK (sentence_length IN ('short', 'medium', 'long')),
  has_emojis BOOLEAN DEFAULT false,
  has_hashtags BOOLEAN DEFAULT false,
  uses_punctuation JSONB DEFAULT '{}',
  characteristics TEXT[] DEFAULT '{}',
  
  -- Style instructions for AI
  style_instructions TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  analyzed_at TIMESTAMPTZ,
  
  -- Ensure one active style per user
  CONSTRAINT one_active_style_per_user UNIQUE (user_id, is_active) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Create index for performance
CREATE INDEX idx_user_styles_user_id ON user_styles(user_id);
CREATE INDEX idx_user_styles_active ON user_styles(user_id, is_active) WHERE is_active = true;

-- Update trigger for user_styles
CREATE TRIGGER update_user_styles_updated_at BEFORE UPDATE ON user_styles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE user_styles ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own styles
CREATE POLICY "Users can view own styles" ON user_styles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own styles" ON user_styles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own styles" ON user_styles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own styles" ON user_styles
  FOR DELETE USING (auth.uid() = user_id);

-- Function to ensure only one active style per user
CREATE OR REPLACE FUNCTION ensure_single_active_style()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    -- Deactivate all other styles for this user
    UPDATE user_styles 
    SET is_active = false 
    WHERE user_id = NEW.user_id 
      AND id != NEW.id 
      AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce single active style
CREATE TRIGGER enforce_single_active_style
  BEFORE INSERT OR UPDATE OF is_active ON user_styles
  FOR EACH ROW EXECUTE FUNCTION ensure_single_active_style();

-- Function to analyze user style from sample tweets
CREATE OR REPLACE FUNCTION analyze_user_style(p_style_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_samples TEXT[];
  v_analysis JSONB;
BEGIN
  -- Get sample tweets
  SELECT sample_tweets INTO v_samples
  FROM user_styles
  WHERE id = p_style_id;
  
  -- This is a placeholder - actual analysis would be done by AI
  -- For now, return basic analysis
  v_analysis := jsonb_build_object(
    'status', 'pending_analysis',
    'message', 'Style analysis will be performed by AI service'
  );
  
  RETURN v_analysis;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's active style
CREATE OR REPLACE FUNCTION get_user_active_style(p_user_id UUID)
RETURNS TABLE (
  style_id UUID,
  style_name TEXT,
  style_instructions TEXT,
  sample_tweets TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id,
    name,
    style_instructions,
    sample_tweets
  FROM user_styles
  WHERE user_id = p_user_id 
    AND is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;