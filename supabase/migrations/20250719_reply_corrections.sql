-- Create table for storing reply corrections to continuously improve styles
CREATE TABLE IF NOT EXISTS public.reply_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  style_id UUID REFERENCES public.user_styles(id) ON DELETE SET NULL,
  
  -- Original generation context
  original_tweet TEXT NOT NULL,
  response_idea TEXT NOT NULL,
  reply_type TEXT NOT NULL,
  tone TEXT NOT NULL,
  
  -- The correction
  generated_reply TEXT NOT NULL,
  corrected_reply TEXT NOT NULL,
  correction_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Analysis results (populated by background job)
  analysis_completed BOOLEAN DEFAULT false,
  analysis_results JSONB,
  analyzed_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_reply_corrections_user_id ON public.reply_corrections(user_id);
CREATE INDEX idx_reply_corrections_style_id ON public.reply_corrections(style_id);
CREATE INDEX idx_reply_corrections_analysis ON public.reply_corrections(analysis_completed, created_at);

-- Enable RLS
ALTER TABLE public.reply_corrections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own corrections"
ON public.reply_corrections
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Function to get recent corrections for a style
CREATE OR REPLACE FUNCTION get_style_corrections(
  p_style_id UUID,
  p_limit INT DEFAULT 50
) RETURNS TABLE (
  generated_reply TEXT,
  corrected_reply TEXT,
  correction_notes TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rc.generated_reply,
    rc.corrected_reply,
    rc.correction_notes,
    rc.created_at
  FROM reply_corrections rc
  WHERE rc.style_id = p_style_id
    AND rc.analysis_completed = true
  ORDER BY rc.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to analyze corrections and update style (called by background job)
CREATE OR REPLACE FUNCTION analyze_style_corrections(p_style_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_corrections JSONB;
  v_style_analysis JSONB;
  v_correction_count INT;
BEGIN
  -- Get current style analysis
  SELECT style_analysis INTO v_style_analysis
  FROM user_styles
  WHERE id = p_style_id;
  
  -- Count corrections
  SELECT COUNT(*) INTO v_correction_count
  FROM reply_corrections
  WHERE style_id = p_style_id
    AND analysis_completed = false;
  
  -- If we have enough corrections (e.g., 5+), trigger re-analysis
  IF v_correction_count >= 5 THEN
    -- Mark corrections as analyzed
    UPDATE reply_corrections
    SET analysis_completed = true,
        analyzed_at = NOW()
    WHERE style_id = p_style_id
      AND analysis_completed = false;
    
    -- Return signal to trigger re-analysis in application
    RETURN jsonb_build_object(
      'needs_reanalysis', true,
      'correction_count', v_correction_count,
      'last_analysis', v_style_analysis
    );
  ELSE
    RETURN jsonb_build_object(
      'needs_reanalysis', false,
      'correction_count', v_correction_count
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON TABLE public.reply_corrections IS 'Stores user corrections to AI-generated replies for continuous style improvement';
COMMENT ON COLUMN public.reply_corrections.correction_notes IS 'Optional notes from user about what was wrong with the generated reply';