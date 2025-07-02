-- Create user feedback table for tracking AI detection issues
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
CREATE INDEX idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX idx_user_feedback_feedback_type ON user_feedback(feedback_type);
CREATE INDEX idx_user_feedback_created_at ON user_feedback(created_at DESC);
CREATE INDEX idx_user_feedback_detected_as_ai ON user_feedback(detected_as_ai);

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
    (ARRAY_AGG(DISTINCT LEFT(reply_text, 100) ORDER BY reply_text) FILTER (WHERE reply_text IS NOT NULL))[1:5] as example_replies
  FROM feedback_analysis
  GROUP BY issue
  ORDER BY occurrence_count DESC;
END;
$$ LANGUAGE plpgsql;