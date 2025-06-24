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

async function createWriteLikeMeTable() {
  console.log('Creating Write Like Me table...\n');
  
  // SQL to create the table
  const createTableSQL = `
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
  `;

  // Since we can't execute raw SQL directly, let's check if the table exists
  const { data, error } = await supabase
    .from('user_styles')
    .select('id')
    .limit(1);
    
  if (error && error.code === '42P01') {
    console.log('Table does not exist. Please run the following SQL in Supabase dashboard:\n');
    console.log(createTableSQL);
    console.log('\n\nAlso run these commands for indexes and RLS:\n');
    console.log(`
-- Create indexes for performance
CREATE INDEX idx_user_styles_user_id ON user_styles(user_id);
CREATE INDEX idx_user_styles_active ON user_styles(user_id, is_active) WHERE is_active = true;

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
CREATE TRIGGER enforce_single_active_style
  BEFORE INSERT OR UPDATE ON user_styles
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_active_style();
    `);
  } else if (!error) {
    console.log('✅ Table already exists!');
  } else {
    console.error('Error checking table:', error);
  }
}

createWriteLikeMeTable().catch(console.error);