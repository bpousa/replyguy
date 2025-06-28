-- Create table to track recent memes per user to avoid repetition
CREATE TABLE IF NOT EXISTS recent_memes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    meme_text VARCHAR(200) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add index after table creation
    CONSTRAINT idx_unique_user_meme UNIQUE (user_id, meme_text)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_recent_memes_user_created ON recent_memes (user_id, created_at DESC);

-- Function to clean up old memes (keep only last 20 per user)
CREATE OR REPLACE FUNCTION cleanup_old_memes(p_user_id UUID)
RETURNS void AS $$
BEGIN
    DELETE FROM recent_memes
    WHERE user_id = p_user_id
    AND id NOT IN (
        SELECT id
        FROM recent_memes
        WHERE user_id = p_user_id
        ORDER BY created_at DESC
        LIMIT 20
    );
END;
$$ LANGUAGE plpgsql;

-- Function to track a new meme
CREATE OR REPLACE FUNCTION track_meme_usage(
    p_user_id UUID,
    p_meme_text VARCHAR(200)
)
RETURNS void AS $$
BEGIN
    -- Insert the new meme (ignore duplicates)
    INSERT INTO recent_memes (user_id, meme_text)
    VALUES (p_user_id, p_meme_text)
    ON CONFLICT (user_id, meme_text) DO NOTHING;
    
    -- Clean up old ones
    PERFORM cleanup_old_memes(p_user_id);
END;
$$ LANGUAGE plpgsql;

-- Function to get recent memes for a user
CREATE OR REPLACE FUNCTION get_recent_memes(p_user_id UUID)
RETURNS TABLE(meme_text VARCHAR(200)) AS $$
BEGIN
    RETURN QUERY
    SELECT rm.meme_text
    FROM recent_memes rm
    WHERE rm.user_id = p_user_id
    ORDER BY rm.created_at DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;