-- Update subscription plans to match X theme specifications exactly
-- This migration updates all plan limits and features

-- First, let's update the existing plans to match the new specifications
UPDATE subscription_plans SET
  name = 'Free',
  description = 'Perfect for trying out ReplyGuy',
  monthly_price = 0,
  yearly_price = 0,
  monthly_limit = 10,  -- 10 replies per month
  features = ARRAY[
    '10 replies per month',
    'Basic reply types',
    'Standard support',
    'Daily goal tracking'
  ],
  stripe_price_id_monthly = NULL,
  stripe_price_id_yearly = NULL,
  -- Feature flags
  max_tweet_length = 280,
  max_response_idea_length = 200,
  max_reply_length = 280,
  suggestion_limit = 0,  -- No AI suggestions for free
  enable_long_replies = false,
  enable_style_matching = false,
  enable_perplexity_guidance = false,
  enable_memes = false,
  meme_limit = 0,
  enable_write_like_me = false,
  sort_order = 0
WHERE id = 'free';

-- Update Growth to X Basic
UPDATE subscription_plans SET
  name = 'X Basic',
  description = 'For active X users',
  monthly_price = 19,  -- $19/month
  yearly_price = 190,  -- ~20% discount for annual
  monthly_limit = 300,  -- 300 replies per month
  features = ARRAY[
    '300 replies per month',
    '10 memes per month',
    '50 AI suggestions',
    'All reply types',
    'Email support'
  ],
  stripe_price_id_monthly = 'price_x_basic_monthly',  -- To be updated with actual Stripe ID
  stripe_price_id_yearly = 'price_x_basic_yearly',    -- To be updated with actual Stripe ID
  -- Feature flags
  max_tweet_length = 500,
  max_response_idea_length = 300,
  max_reply_length = 280,
  suggestion_limit = 50,  -- 50 AI suggestions
  enable_long_replies = false,
  enable_style_matching = false,
  enable_perplexity_guidance = false,
  enable_memes = true,
  meme_limit = 10,  -- 10 memes per month
  enable_write_like_me = false,
  sort_order = 1
WHERE id = 'growth';

-- Update Professional to X Pro
UPDATE subscription_plans SET
  name = 'X Pro',
  description = 'For power users and content creators',
  monthly_price = 49,  -- $49/month
  yearly_price = 490,  -- ~20% discount for annual
  monthly_limit = 500,  -- 500 replies per month
  features = ARRAY[
    '500 replies per month',
    '50 memes per month',
    '100 AI suggestions',
    'Write Like Me™ AI training',
    'Style matching',
    'Medium-length replies',
    'Priority support'
  ],
  stripe_price_id_monthly = 'price_x_pro_monthly',  -- To be updated with actual Stripe ID
  stripe_price_id_yearly = 'price_x_pro_yearly',    -- To be updated with actual Stripe ID
  -- Feature flags
  max_tweet_length = 1000,
  max_response_idea_length = 500,
  max_reply_length = 560,  -- Medium-length replies
  suggestion_limit = 100,  -- 100 AI suggestions
  enable_long_replies = true,
  enable_style_matching = true,
  enable_perplexity_guidance = false,
  enable_memes = true,
  meme_limit = 50,  -- 50 memes per month
  enable_write_like_me = true,
  is_popular = true,
  sort_order = 2
WHERE id = 'professional';

-- Update Enterprise to X Business
UPDATE subscription_plans SET
  name = 'X Business',
  description = 'For agencies and high-volume users',
  monthly_price = 99,  -- $99/month
  yearly_price = 990,  -- ~20% discount for annual
  monthly_limit = 1000,  -- 1000 replies per month
  features = ARRAY[
    '1000 replies per month',
    '100 memes per month',
    '200 AI suggestions',
    'Write Like Me™ AI training',
    'Real-time fact checking',
    'Long-form replies (1000 chars)',
    'API access',
    'Dedicated support'
  ],
  stripe_price_id_monthly = 'price_x_business_monthly',  -- To be updated with actual Stripe ID
  stripe_price_id_yearly = 'price_x_business_yearly',    -- To be updated with actual Stripe ID
  -- Feature flags
  max_tweet_length = 2000,
  max_response_idea_length = 1000,
  max_reply_length = 1000,  -- Long-form replies
  suggestion_limit = 200,  -- 200 AI suggestions
  enable_long_replies = true,
  enable_style_matching = true,
  enable_perplexity_guidance = true,  -- Real-time fact checking
  enable_memes = true,
  meme_limit = 100,  -- 100 memes per month
  enable_write_like_me = true,
  enable_api_access = true,
  sort_order = 3
WHERE id = 'enterprise';

-- Add missing columns if they don't exist
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS enable_memes BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS meme_limit INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS enable_write_like_me BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS enable_api_access BOOLEAN DEFAULT false;

-- Create a summary view for easy reference
CREATE OR REPLACE VIEW plan_summary AS
SELECT 
  id,
  name,
  monthly_price,
  yearly_price,
  monthly_limit as replies_per_month,
  meme_limit as memes_per_month,
  suggestion_limit as ai_suggestions,
  enable_write_like_me as has_write_like_me,
  enable_style_matching as has_style_matching,
  enable_perplexity_guidance as has_fact_checking,
  max_reply_length,
  CASE 
    WHEN id = 'free' THEN 'Standard'
    WHEN id = 'growth' THEN 'Email'
    WHEN id = 'professional' THEN 'Priority'
    WHEN id = 'enterprise' THEN 'Dedicated'
  END as support_level
FROM subscription_plans
ORDER BY sort_order;

-- Update user monthly limits to match their plan limits
UPDATE users u
SET monthly_limit = sp.monthly_limit
FROM subscription_plans sp
WHERE u.subscription_tier = sp.id;

-- Show the updated plans
SELECT * FROM plan_summary;