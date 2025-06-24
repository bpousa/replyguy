# Write Like Me Feature - Fix Summary

## Issues Fixed

### 1. Authentication Error (401)
**Problem**: The `/api/user-style` endpoint was checking for subscriptions in a non-existent `subscriptions` table.
**Fix**: Updated to check `subscription_tier` directly from the `users` table.

### 2. Missing Stripe Portal Endpoint (404)
**Problem**: The `/api/stripe/portal` endpoint was missing.
**Fix**: Created the endpoint with proper authentication and Stripe integration.

### 3. Missing Database Table
**Problem**: The `user_styles` table doesn't exist in the database.
**Solution**: Created SQL script to create the table with proper RLS policies.

## Action Required

### Create the user_styles table in Supabase:

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the SQL from the file `create_user_styles_table.sql` (created in project root)

OR copy and paste this SQL:

```sql
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
```

## Testing

After creating the table, you can test the Write Like Me feature by:

1. Logging in as `test-business@replyguy.com` (enterprise tier)
2. Going to Settings > Write Like Me
3. Creating a new style with at least 3 sample tweets

## Files Modified

1. `/app/api/user-style/route.ts` - Fixed subscription check
2. `/app/api/stripe/portal/route.ts` - Created endpoint with proper auth
3. `/app/settings/page.tsx` - Updated Stripe portal call
4. Created `create_user_styles_table.sql` - SQL to create missing table