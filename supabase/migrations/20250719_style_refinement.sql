-- Add refinement examples to user_styles table
ALTER TABLE public.user_styles
ADD COLUMN IF NOT EXISTS refinement_examples JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS is_refined BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS refined_at TIMESTAMPTZ;

-- Create style_refinement_sessions table for tracking refinement progress
CREATE TABLE IF NOT EXISTS public.style_refinement_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style_id UUID NOT NULL REFERENCES public.user_styles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_state TEXT CHECK (session_state IN ('active', 'completed', 'abandoned')) DEFAULT 'active',
  current_example_index INT DEFAULT 0,
  total_examples INT DEFAULT 10,
  examples JSONB DEFAULT '[]',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX idx_style_refinement_sessions_style_id ON public.style_refinement_sessions(style_id);
CREATE INDEX idx_style_refinement_sessions_user_id ON public.style_refinement_sessions(user_id);

-- Enable RLS
ALTER TABLE public.style_refinement_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for refinement sessions
CREATE POLICY "Users can manage their own refinement sessions"
ON public.style_refinement_sessions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update trigger for refinement sessions
CREATE TRIGGER set_style_refinement_sessions_timestamp
BEFORE UPDATE ON public.style_refinement_sessions
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Function to generate refinement examples
CREATE OR REPLACE FUNCTION generate_refinement_prompt(
  p_style_analysis JSONB,
  p_example_type TEXT
) RETURNS TEXT AS $$
DECLARE
  v_prompt TEXT;
BEGIN
  -- This returns a prompt type for the refinement process
  -- The actual tweet generation happens in the application layer
  CASE p_example_type
    WHEN 'reaction' THEN
      v_prompt := 'Generate a reaction to surprising news';
    WHEN 'opinion' THEN
      v_prompt := 'Share an opinion on a trending topic';
    WHEN 'joke' THEN
      v_prompt := 'Make a humorous observation';
    WHEN 'question' THEN
      v_prompt := 'Ask an engaging question';
    WHEN 'story' THEN
      v_prompt := 'Share a brief personal anecdote';
    WHEN 'advice' THEN
      v_prompt := 'Give helpful advice';
    WHEN 'observation' THEN
      v_prompt := 'Make an interesting observation';
    WHEN 'complaint' THEN
      v_prompt := 'Express mild frustration humorously';
    WHEN 'excitement' THEN
      v_prompt := 'Share excitement about something';
    WHEN 'reflection' THEN
      v_prompt := 'Share a thoughtful reflection';
    ELSE
      v_prompt := 'Write a typical tweet';
  END CASE;
  
  RETURN v_prompt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON TABLE public.style_refinement_sessions IS 'Tracks interactive refinement sessions where users provide feedback on generated examples to improve style accuracy';
COMMENT ON COLUMN public.user_styles.refinement_examples IS 'Array of examples with user feedback from the refinement process';
COMMENT ON COLUMN public.user_styles.is_refined IS 'Whether this style has gone through the refinement process';