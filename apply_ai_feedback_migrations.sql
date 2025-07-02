-- Combined migration file for AI feedback system
-- Run this manually in Supabase SQL Editor if migrations fail

-- Migration 1: Create user feedback table for tracking AI detection issues
CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reply_text TEXT NOT NULL,
  original_tweet TEXT,
  response_idea TEXT,
  detected_as_ai BOOLEAN DEFAULT false,
  feedback_type VARCHAR(50) NOT NULL CHECK (feedback_type IN ('sounds_ai', 'sounds_human', 'report_issue')),
  feedback_details TEXT,
  ai_detection_score INTEGER,
  ai_detection_issues TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_feedback_type ON user_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_detected_as_ai ON user_feedback(detected_as_ai);

-- Add RLS policies
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback" ON user_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback" ON user_feedback
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_feedback_updated_at
  BEFORE UPDATE ON user_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add function to analyze feedback patterns
CREATE OR REPLACE FUNCTION analyze_ai_detection_patterns(
  time_range INTERVAL DEFAULT '7 days'
)
RETURNS TABLE(
  pattern_type TEXT,
  occurrence_count BIGINT,
  example_replies TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH feedback_analysis AS (
    SELECT 
      UNNEST(ai_detection_issues) as issue,
      reply_text
    FROM user_feedback
    WHERE detected_as_ai = true
      AND created_at > NOW() - time_range
  )
  SELECT 
    issue as pattern_type,
    COUNT(*) as occurrence_count,
    ARRAY_AGG(DISTINCT LEFT(reply_text, 100) ORDER BY reply_text) FILTER (WHERE reply_text IS NOT NULL)[1:5] as example_replies
  FROM feedback_analysis
  GROUP BY issue
  ORDER BY occurrence_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Migration 2: Create table for tracking user-reported AI phrases
CREATE TABLE IF NOT EXISTS reported_ai_phrases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- The full reply text
  reply_text TEXT NOT NULL,
  
  -- The specific phrase that sounds like AI
  reported_phrase TEXT NOT NULL,
  
  -- Context around the phrase (for better analysis)
  phrase_context TEXT,
  
  -- User's explanation of why it sounds like AI (optional)
  user_feedback TEXT,
  
  -- Metadata from the original generation
  original_tweet TEXT,
  response_idea TEXT,
  reply_type VARCHAR(100),
  
  -- Analysis results
  validated BOOLEAN DEFAULT NULL, -- NULL = pending review, TRUE = confirmed AI phrase, FALSE = false positive
  validation_reason TEXT,
  added_to_blocklist BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  validated_at TIMESTAMP WITH TIME ZONE,
  
  -- Tracking
  report_count INTEGER DEFAULT 1, -- How many times this exact phrase has been reported
  last_reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reported_phrases_user_id ON reported_ai_phrases(user_id);
CREATE INDEX IF NOT EXISTS idx_reported_phrases_phrase ON reported_ai_phrases(reported_phrase);
CREATE INDEX IF NOT EXISTS idx_reported_phrases_validated ON reported_ai_phrases(validated);
CREATE INDEX IF NOT EXISTS idx_reported_phrases_created_at ON reported_ai_phrases(created_at DESC);

-- Create a unique index for tracking duplicate reports
CREATE UNIQUE INDEX IF NOT EXISTS idx_reported_phrases_unique ON reported_ai_phrases(
  LOWER(reported_phrase),
  COALESCE(validated, FALSE)
) WHERE validated IS NOT FALSE;

-- Enable RLS
ALTER TABLE reported_ai_phrases ENABLE ROW LEVEL SECURITY;

-- Users can insert their own reports
CREATE POLICY "Users can report AI phrases" ON reported_ai_phrases
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can view all reported phrases (for transparency)
CREATE POLICY "Users can view reported phrases" ON reported_ai_phrases
  FOR SELECT USING (true);

-- Create table for storing validated AI patterns
CREATE TABLE IF NOT EXISTS ai_phrase_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern TEXT NOT NULL UNIQUE,
  pattern_type VARCHAR(50) CHECK (pattern_type IN ('exact', 'regex', 'partial')),
  category VARCHAR(50) CHECK (category IN ('transition', 'opening', 'cliche', 'word', 'pattern')),
  replacement TEXT, -- Optional replacement text
  severity INTEGER DEFAULT 1 CHECK (severity BETWEEN 1 AND 5),
  report_count INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_patterns_active ON ai_phrase_patterns(active);
CREATE INDEX IF NOT EXISTS idx_ai_patterns_category ON ai_phrase_patterns(category);
CREATE INDEX IF NOT EXISTS idx_ai_patterns_severity ON ai_phrase_patterns(severity DESC);

-- Enable RLS
ALTER TABLE ai_phrase_patterns ENABLE ROW LEVEL SECURITY;

-- Read-only access for all users
CREATE POLICY "Users can view AI patterns" ON ai_phrase_patterns
  FOR SELECT USING (true);

-- Function to handle duplicate phrase reports
CREATE OR REPLACE FUNCTION handle_duplicate_phrase_report()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this phrase was already reported
  UPDATE reported_ai_phrases
  SET 
    report_count = report_count + 1,
    last_reported_at = NOW()
  WHERE 
    LOWER(reported_phrase) = LOWER(NEW.reported_phrase)
    AND (validated IS NULL OR validated = TRUE);
    
  -- If we updated a row, prevent the insert
  IF FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Otherwise, allow the insert
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for handling duplicates
DROP TRIGGER IF EXISTS handle_duplicate_reports ON reported_ai_phrases;
CREATE TRIGGER handle_duplicate_reports
  BEFORE INSERT ON reported_ai_phrases
  FOR EACH ROW
  EXECUTE FUNCTION handle_duplicate_phrase_report();

-- Function to analyze reported phrases
CREATE OR REPLACE FUNCTION analyze_reported_phrases(
  min_reports INTEGER DEFAULT 3
)
RETURNS TABLE(
  phrase TEXT,
  total_reports BIGINT,
  unique_users BIGINT,
  avg_phrase_length DOUBLE PRECISION,
  sample_contexts TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rp.reported_phrase as phrase,
    SUM(rp.report_count) as total_reports,
    COUNT(DISTINCT rp.user_id) as unique_users,
    AVG(LENGTH(rp.reported_phrase))::DOUBLE PRECISION as avg_phrase_length,
    ARRAY_AGG(DISTINCT LEFT(rp.phrase_context, 100) ORDER BY rp.created_at DESC)[1:3] as sample_contexts
  FROM reported_ai_phrases rp
  WHERE rp.validated IS NOT FALSE
  GROUP BY rp.reported_phrase
  HAVING SUM(rp.report_count) >= min_reports
  ORDER BY total_reports DESC, unique_users DESC;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_ai_patterns_updated_at
  BEFORE UPDATE ON ai_phrase_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get report count for a phrase
CREATE OR REPLACE FUNCTION get_phrase_report_count(phrase TEXT)
RETURNS TABLE(count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT COALESCE(SUM(report_count), 0) as count
  FROM reported_ai_phrases
  WHERE LOWER(reported_phrase) = LOWER(phrase)
    AND (validated IS NULL OR validated = TRUE);
END;
$$ LANGUAGE plpgsql;

-- Insert migration records (if migration tracking is available)
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES 
  ('20250702000001', '20250702_add_user_feedback', ARRAY['CREATE TABLE user_feedback...']),
  ('20250702000002', '20250702_reported_ai_phrases', ARRAY['CREATE TABLE reported_ai_phrases...'])
ON CONFLICT (version) DO NOTHING;