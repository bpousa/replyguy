-- Update pricing plans with X theme and new limits

-- Update Basic plan
UPDATE public.subscription_plans SET
  name = 'X Basic',
  description = 'Perfect for regular X users',
  price_monthly = 19,
  price_yearly = 190,
  reply_limit = 300,
  meme_limit = 10,
  enable_memes = true,
  max_tweet_length = 500,
  max_response_idea_length = 300,
  max_reply_length = 280,
  suggestion_limit = 50,
  enable_long_replies = false,
  enable_style_matching = false,
  enable_perplexity_guidance = false,
  sort_order = 2
WHERE id = 'basic';

-- Update Pro plan
UPDATE public.subscription_plans SET
  name = 'X Pro',
  description = 'For power users and content creators',
  price_monthly = 49,
  price_yearly = 490,
  reply_limit = 500,
  meme_limit = 50,
  enable_memes = true,
  max_tweet_length = 1000,
  max_response_idea_length = 500,
  max_reply_length = 560,
  suggestion_limit = 100,
  enable_long_replies = true,
  enable_style_matching = true,
  enable_perplexity_guidance = false,
  sort_order = 3,
  popular = true
WHERE id = 'pro';

-- Update Business plan (previously might have been called 'business' or need to create)
INSERT INTO public.subscription_plans (
  id, name, description, price_monthly, price_yearly, 
  reply_limit, meme_limit, enable_memes,
  max_tweet_length, max_response_idea_length, max_reply_length,
  suggestion_limit, enable_long_replies, enable_style_matching, 
  enable_perplexity_guidance, sort_order, active, popular
) VALUES (
  'x_business', 
  'X Business', 
  'Maximum features for businesses', 
  99, 
  990,
  1000,
  100,
  true,
  1500,
  1000,
  1000,
  200,
  true,
  true,
  true,
  4,
  true,
  false
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  reply_limit = EXCLUDED.reply_limit,
  meme_limit = EXCLUDED.meme_limit,
  enable_memes = EXCLUDED.enable_memes,
  max_tweet_length = EXCLUDED.max_tweet_length,
  max_response_idea_length = EXCLUDED.max_response_idea_length,
  max_reply_length = EXCLUDED.max_reply_length,
  suggestion_limit = EXCLUDED.suggestion_limit,
  enable_long_replies = EXCLUDED.enable_long_replies,
  enable_style_matching = EXCLUDED.enable_style_matching,
  enable_perplexity_guidance = EXCLUDED.enable_perplexity_guidance,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  popular = EXCLUDED.popular;

-- Update features JSON for each plan
UPDATE public.subscription_plans SET features = jsonb_build_object(
  'replies', '10 replies/month',
  'tweet_length', 'Standard tweets (280 chars)',
  'response_length', 'Short replies only',
  'memes', false,
  'suggestions', false,
  'style_matching', false,
  'perplexity', false,
  'write_like_me', false,
  'support', 'Community support'
) WHERE id = 'free';

UPDATE public.subscription_plans SET features = jsonb_build_object(
  'replies', '300 replies/month',
  'tweet_length', 'Extended tweets (500 chars)',
  'response_length', 'Short replies only',
  'memes', '10 memes/month',
  'suggestions', '50 AI suggestions/month',
  'style_matching', false,
  'perplexity', false,
  'write_like_me', false,
  'support', 'Email support'
) WHERE id = 'basic';

UPDATE public.subscription_plans SET features = jsonb_build_object(
  'replies', '500 replies/month',
  'tweet_length', 'Long tweets (1000 chars)',
  'response_length', 'Medium replies (560 chars)',
  'memes', '50 memes/month',
  'suggestions', '100 AI suggestions/month',
  'style_matching', true,
  'perplexity', false,
  'write_like_me', 'Train AI on your style',
  'support', 'Priority email support'
) WHERE id = 'pro';

UPDATE public.subscription_plans SET features = jsonb_build_object(
  'replies', '1000 replies/month',
  'tweet_length', 'Extended tweets (1500 chars)',
  'response_length', 'Long replies (1000 chars)',
  'memes', '100 memes/month',
  'suggestions', '200 AI suggestions/month',
  'style_matching', true,
  'perplexity', 'Real-time fact checking',
  'write_like_me', 'Train AI on your style',
  'api_access', true,
  'support', 'Dedicated support'
) WHERE id = 'x_business';

-- Add write_like_me column if it doesn't exist
ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS enable_write_like_me BOOLEAN DEFAULT false;

-- Enable Write Like Me for Pro and Business plans
UPDATE public.subscription_plans SET enable_write_like_me = true WHERE id IN ('pro', 'x_business');

-- Deactivate old plans if they exist
UPDATE public.subscription_plans SET active = false WHERE id IN ('enterprise', 'professional', 'growth', 'business');