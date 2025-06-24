import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
});

// Function to execute SQL in chunks
async function executeSQLChunks() {
  console.log('Creating Write Like Me table using RPC...\n');
  
  // First, let's create the exec_sql function if it doesn't exist
  const createExecFunction = `
CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
RETURNS void AS $$
BEGIN
  EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
  `;
  
  // Try to create the function using a direct approach
  console.log('Note: The user_styles table needs to be created manually in Supabase dashboard.');
  console.log('\nPlease go to your Supabase project SQL Editor and run this SQL:\n');
  
  const fullSQL = `
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
  analyzed_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_styles_user_id ON user_styles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_styles_active ON user_styles(user_id, is_active) WHERE is_active = true;

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
    UPDATE user_styles 
    SET is_active = false 
    WHERE user_id = NEW.user_id 
      AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce single active style
DROP TRIGGER IF EXISTS enforce_single_active_style ON user_styles;
CREATE TRIGGER enforce_single_active_style
  BEFORE INSERT OR UPDATE ON user_styles
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_active_style();

-- Update trigger for updated_at
DROP TRIGGER IF EXISTS update_user_styles_updated_at ON user_styles;
CREATE TRIGGER update_user_styles_updated_at 
  BEFORE UPDATE ON user_styles
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
  `;
  
  console.log(fullSQL);
  
  console.log('\n\n=================');
  console.log('Alternative: Save this as a .sql file and upload via Supabase dashboard');
  console.log('=================\n');
  
  // Also create a SQL file for easy copying
  const fs = require('fs').promises;
  await fs.writeFile('./create_user_styles_table.sql', fullSQL);
  console.log('✅ SQL saved to: create_user_styles_table.sql');
}

executeSQLChunks().catch(console.error);