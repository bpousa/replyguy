-- Create table for user-defined forbidden patterns
CREATE TABLE IF NOT EXISTS public.style_forbidden_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style_id UUID NOT NULL REFERENCES public.user_styles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL,
  pattern_text TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique patterns per style
  UNIQUE(style_id, pattern_type, pattern_text)
);

-- Create indexes
CREATE INDEX idx_style_forbidden_patterns_style_id ON public.style_forbidden_patterns(style_id);
CREATE INDEX idx_style_forbidden_patterns_user_id ON public.style_forbidden_patterns(user_id);

-- Enable RLS
ALTER TABLE public.style_forbidden_patterns ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own forbidden patterns"
ON public.style_forbidden_patterns
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Predefined pattern types
COMMENT ON COLUMN public.style_forbidden_patterns.pattern_type IS 'Type of pattern: opening_phrase, vocabulary, theme, emoji_usage, punctuation, etc.';

-- Update get_user_active_style to include explicit forbidden patterns
CREATE OR REPLACE FUNCTION get_user_active_style(p_user_id UUID)
RETURNS TABLE (
  style_instructions TEXT,
  recent_corrections JSONB,
  forbidden_patterns TEXT[]
) AS $$
DECLARE
  v_style_id UUID;
  v_style_analysis JSONB;
  v_recent_corrections JSONB;
  v_forbidden_patterns TEXT[];
  v_explicit_forbidden TEXT[];
  v_instructions TEXT;
BEGIN
  -- Get the active style
  SELECT id, style_analysis 
  INTO v_style_id, v_style_analysis
  FROM user_styles
  WHERE user_id = p_user_id AND is_active = true
  LIMIT 1;
  
  IF v_style_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Get recent corrections (last 10)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'original', rc.generated_reply,
        'corrected', rc.corrected_reply,
        'notes', rc.correction_notes,
        'context', jsonb_build_object(
          'tweet', rc.original_tweet,
          'idea', rc.response_idea
        )
      ) ORDER BY rc.created_at DESC
    ), 
    '[]'::jsonb
  )
  INTO v_recent_corrections
  FROM (
    SELECT * FROM reply_corrections
    WHERE style_id = v_style_id
    ORDER BY created_at DESC
    LIMIT 10
  ) rc;
  
  -- Extract forbidden patterns from corrections
  WITH correction_patterns AS (
    SELECT 
      CASE 
        WHEN generated_reply ILIKE '%function%' OR generated_reply ILIKE '%code%' 
             OR generated_reply ILIKE '%implementation%' OR generated_reply ILIKE '%algorithm%'
             OR generated_reply ILIKE '%debug%' OR generated_reply ILIKE '%compile%'
             OR generated_reply ILIKE '%syntax%' OR generated_reply ILIKE '%variable%'
        THEN 'coding_language'
        WHEN generated_reply ILIKE 'what i ended up doing%'
        THEN 'what_i_ended_up_doing'
        WHEN generated_reply ILIKE 'i tell people%'
        THEN 'i_tell_people'
        WHEN generated_reply ILIKE 'ever think about%' OR generated_reply ILIKE 'ever feel like%'
        THEN 'ever_think_feel'
        ELSE NULL
      END as pattern_type
    FROM reply_corrections
    WHERE style_id = v_style_id
      AND created_at > NOW() - INTERVAL '30 days'
  )
  SELECT ARRAY_AGG(DISTINCT pattern_type)
  INTO v_forbidden_patterns
  FROM correction_patterns
  WHERE pattern_type IS NOT NULL;
  
  -- Get explicit forbidden patterns
  SELECT ARRAY_AGG(DISTINCT pattern_type || ':' || pattern_text)
  INTO v_explicit_forbidden
  FROM style_forbidden_patterns
  WHERE style_id = v_style_id;
  
  -- Combine both types of forbidden patterns
  v_forbidden_patterns := COALESCE(v_forbidden_patterns, ARRAY[]::TEXT[]) || COALESCE(v_explicit_forbidden, ARRAY[]::TEXT[]);
  
  -- Build style instructions with correction awareness
  v_instructions := format(
    E'Style Analysis:\n%s\n\n' ||
    E'CRITICAL CORRECTIONS: The user has corrected %s replies. Common issues to AVOID:\n' ||
    E'%s\n\n' ||
    E'FORBIDDEN PATTERNS: Never use these patterns:\n%s\n\n' ||
    E'EXPLICIT BLOCKLIST: User has specifically banned:\n%s',
    v_style_analysis::text,
    jsonb_array_length(v_recent_corrections),
    CASE 
      WHEN jsonb_array_length(v_recent_corrections) > 0 
      THEN (
        SELECT string_agg(
          format('- They corrected "%s" to "%s"', 
            substr(c->>'original', 1, 50) || '...', 
            substr(c->>'corrected', 1, 50) || '...'
          ), 
          E'\n'
        )
        FROM jsonb_array_elements(v_recent_corrections) c
        LIMIT 3
      )
      ELSE 'No recent corrections'
    END,
    CASE 
      WHEN v_forbidden_patterns IS NOT NULL AND array_length(v_forbidden_patterns, 1) > 0
      THEN array_to_string(
        ARRAY(
          SELECT CASE 
            WHEN pattern LIKE '%:%' THEN '- ' || split_part(pattern, ':', 2) || ' (explicit ban)'
            WHEN pattern = 'coding_language' THEN '- NO coding/programming language or technical jargon'
            WHEN pattern = 'what_i_ended_up_doing' THEN '- NEVER start with "what I ended up doing"'
            WHEN pattern = 'i_tell_people' THEN '- NEVER start with "I tell people"'
            WHEN pattern = 'ever_think_feel' THEN '- AVOID "ever think about" or "ever feel like" openings'
            ELSE '- Avoid: ' || replace(pattern, '_', ' ')
          END
          FROM unnest(v_forbidden_patterns) pattern
          WHERE pattern IS NOT NULL
        ),
        E'\n'
      )
      ELSE '- No specific forbidden patterns identified yet'
    END,
    CASE 
      WHEN v_explicit_forbidden IS NOT NULL AND array_length(v_explicit_forbidden, 1) > 0
      THEN array_to_string(
        ARRAY(
          SELECT format('- %s: "%s"', 
            split_part(fp, ':', 1), 
            split_part(fp, ':', 2)
          )
          FROM unnest(v_explicit_forbidden) fp
        ),
        E'\n'
      )
      ELSE '- No explicit bans set'
    END
  );
  
  RETURN QUERY 
  SELECT v_instructions, v_recent_corrections, v_forbidden_patterns;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add a forbidden pattern
CREATE OR REPLACE FUNCTION add_forbidden_pattern(
  p_style_id UUID,
  p_pattern_type TEXT,
  p_pattern_text TEXT,
  p_description TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_pattern_id UUID;
BEGIN
  -- Verify ownership
  SELECT user_id INTO v_user_id
  FROM user_styles
  WHERE id = p_style_id;
  
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Insert pattern
  INSERT INTO style_forbidden_patterns (style_id, user_id, pattern_type, pattern_text, description)
  VALUES (p_style_id, v_user_id, p_pattern_type, p_pattern_text, p_description)
  ON CONFLICT (style_id, pattern_type, pattern_text) DO UPDATE
  SET description = EXCLUDED.description
  RETURNING id INTO v_pattern_id;
  
  RETURN v_pattern_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE public.style_forbidden_patterns IS 'User-defined patterns to explicitly ban from their writing style';
COMMENT ON FUNCTION add_forbidden_pattern IS 'Adds a forbidden pattern to a writing style';