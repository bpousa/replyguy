-- Plan enhancements for character limits and features

-- Add new columns to subscription_plans
ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS max_tweet_length INTEGER DEFAULT 500,
ADD COLUMN IF NOT EXISTS max_response_idea_length INTEGER DEFAULT 200,
ADD COLUMN IF NOT EXISTS max_reply_length INTEGER DEFAULT 280,
ADD COLUMN IF NOT EXISTS suggestion_limit INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS enable_long_replies BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS enable_style_matching BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS enable_perplexity_guidance BOOLEAN DEFAULT false;

-- Update plan limits based on tiers
UPDATE public.subscription_plans SET
    max_tweet_length = 500,
    max_response_idea_length = 200,
    max_reply_length = 280,
    suggestion_limit = 10,
    enable_long_replies = false,
    enable_style_matching = false,
    enable_perplexity_guidance = false
WHERE id = 'free';

UPDATE public.subscription_plans SET
    max_tweet_length = 1000,
    max_response_idea_length = 500,
    max_reply_length = 560,
    suggestion_limit = 100,
    enable_long_replies = true,
    enable_style_matching = true,
    enable_perplexity_guidance = false
WHERE id = 'growth';

UPDATE public.subscription_plans SET
    max_tweet_length = 1500,
    max_response_idea_length = 1000,
    max_reply_length = 1000,
    suggestion_limit = 500,
    enable_long_replies = true,
    enable_style_matching = true,
    enable_perplexity_guidance = true
WHERE id = 'professional';

UPDATE public.subscription_plans SET
    max_tweet_length = 2000,
    max_response_idea_length = 2000,
    max_reply_length = 1000,
    suggestion_limit = -1, -- unlimited
    enable_long_replies = true,
    enable_style_matching = true,
    enable_perplexity_guidance = true
WHERE id = 'enterprise';

-- Add suggestions tracking to user_usage
ALTER TABLE public.user_usage
ADD COLUMN IF NOT EXISTS suggestions_used INTEGER DEFAULT 0;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_usage_suggestions ON user_usage(user_id, month, suggestions_used);