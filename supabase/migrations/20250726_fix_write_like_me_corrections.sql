-- Create function to get user's active style with correction-aware instructions
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
  -- Look for patterns that appear in multiple generated replies but not in corrections
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
  
  -- Build style instructions with correction awareness
  v_instructions := format(
    E'Style Analysis:\n%s\n\n' ||
    E'CRITICAL CORRECTIONS: The user has corrected %s replies. Common issues to AVOID:\n' ||
    E'%s\n\n' ||
    E'FORBIDDEN PATTERNS: Never use these patterns that the user consistently corrects away:\n%s',
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
          SELECT CASE pattern
            WHEN 'coding_language' THEN '- NO coding/programming language or technical jargon'
            WHEN 'what_i_ended_up_doing' THEN '- NEVER start with "what I ended up doing"'
            WHEN 'i_tell_people' THEN '- NEVER start with "I tell people"'
            WHEN 'ever_think_feel' THEN '- AVOID "ever think about" or "ever feel like" openings'
            ELSE '- Avoid: ' || replace(pattern, '_', ' ')
          END
          FROM unnest(v_forbidden_patterns) pattern
        ),
        E'\n'
      )
      ELSE '- No specific forbidden patterns identified yet'
    END
  );
  
  RETURN QUERY 
  SELECT v_instructions, v_recent_corrections, v_forbidden_patterns;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Lower the reanalysis threshold from 5 to 3
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
  
  -- Count unanalyzed corrections
  SELECT COUNT(*) INTO v_correction_count
  FROM reply_corrections
  WHERE style_id = p_style_id
    AND analysis_completed = false;
  
  -- Lower threshold to 3 corrections (was 5)
  IF v_correction_count >= 3 THEN
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
      'correction_count', v_correction_count,
      'corrections_until_reanalysis', 3 - v_correction_count
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to get correction patterns for immediate use
CREATE OR REPLACE FUNCTION get_style_correction_patterns(p_style_id UUID)
RETURNS TABLE (
  pattern_type TEXT,
  examples TEXT[],
  frequency INT
) AS $$
BEGIN
  RETURN QUERY
  WITH patterns AS (
    SELECT 
      CASE 
        WHEN generated_reply ILIKE '%function%' OR generated_reply ILIKE '%code%' 
             OR generated_reply ILIKE '%implementation%' OR generated_reply ILIKE '%algorithm%'
        THEN 'coding_language'
        WHEN generated_reply ILIKE 'what i ended up doing%'
        THEN 'verbatim_opening_1'
        WHEN generated_reply ILIKE 'i tell people%'
        THEN 'verbatim_opening_2'
        WHEN generated_reply ILIKE 'ever think about%' OR generated_reply ILIKE 'ever feel like%'
        THEN 'rhetorical_question'
        WHEN length(generated_reply) - length(replace(generated_reply, '!', '')) > 3
        THEN 'excessive_exclamations'
        ELSE 'other'
      END as pattern,
      generated_reply,
      corrected_reply
    FROM reply_corrections
    WHERE style_id = p_style_id
      AND created_at > NOW() - INTERVAL '30 days'
  )
  SELECT 
    pattern as pattern_type,
    array_agg(DISTINCT substr(generated_reply, 1, 100)) as examples,
    count(*) as frequency
  FROM patterns
  GROUP BY pattern
  HAVING count(*) >= 2 -- Only patterns that appear multiple times
  ORDER BY frequency DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add index for better performance on correction lookups
CREATE INDEX IF NOT EXISTS idx_reply_corrections_style_created 
ON reply_corrections(style_id, created_at DESC);

-- Add comment
COMMENT ON FUNCTION get_user_active_style IS 'Gets active style with correction-aware instructions and forbidden patterns';