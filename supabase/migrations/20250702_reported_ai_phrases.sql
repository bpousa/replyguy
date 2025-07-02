-- Create table for tracking user-reported AI phrases
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
CREATE INDEX idx_reported_phrases_user_id ON reported_ai_phrases(user_id);
CREATE INDEX idx_reported_phrases_phrase ON reported_ai_phrases(reported_phrase);
CREATE INDEX idx_reported_phrases_validated ON reported_ai_phrases(validated);
CREATE INDEX idx_reported_phrases_created_at ON reported_ai_phrases(created_at DESC);

-- Create a unique index for tracking duplicate reports
CREATE UNIQUE INDEX idx_reported_phrases_unique ON reported_ai_phrases(
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
CREATE INDEX idx_ai_patterns_active ON ai_phrase_patterns(active);
CREATE INDEX idx_ai_patterns_category ON ai_phrase_patterns(category);
CREATE INDEX idx_ai_patterns_severity ON ai_phrase_patterns(severity DESC);

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
    (ARRAY_AGG(DISTINCT LEFT(rp.phrase_context, 100) ORDER BY rp.created_at DESC))[1:3] as sample_contexts
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