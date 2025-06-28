-- Fix missing features for plans
-- First, check if columns exist and add them if they don't

-- Add enable_memes column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='subscription_plans' 
                   AND column_name='enable_memes') THEN
        ALTER TABLE subscription_plans ADD COLUMN enable_memes BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Add enable_perplexity_guidance column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='subscription_plans' 
                   AND column_name='enable_perplexity_guidance') THEN
        ALTER TABLE subscription_plans ADD COLUMN enable_perplexity_guidance BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Now update the values for each plan
-- X Business should have all features enabled
UPDATE subscription_plans
SET 
    enable_perplexity_guidance = true,
    enable_memes = true
WHERE name = 'X Business';

-- X Pro should have these features
UPDATE subscription_plans
SET 
    enable_perplexity_guidance = true,
    enable_memes = true
WHERE name = 'X Pro';

-- X Basic should have memes but not perplexity guidance
UPDATE subscription_plans
SET 
    enable_perplexity_guidance = false,
    enable_memes = true
WHERE name = 'X Basic';

-- Free plan should have neither
UPDATE subscription_plans
SET 
    enable_perplexity_guidance = false,
    enable_memes = false
WHERE name = 'Free';