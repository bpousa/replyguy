-- Update existing free plan
UPDATE public.subscription_plans SET
  name = 'Free',
  description = 'Get started with basic features',
  price_monthly = 0,
  price_yearly = 0,
  reply_limit = 10,
  meme_limit = 0,
  enable_memes = false,
  max_tweet_length = 280,
  max_response_idea_length = 200,
  max_reply_length = 280,
  suggestion_limit = 0,
  enable_long_replies = false,
  enable_style_matching = false,
  enable_perplexity_guidance = false,
  sort_order = 1
WHERE id = 'free';

-- Delete old plans that will be replaced
DELETE FROM public.subscription_plans WHERE id IN ('growth', 'professional', 'enterprise');

-- Insert new pricing plans
INSERT INTO public.subscription_plans (
  id, name, description, price_monthly, price_yearly, 
  reply_limit, meme_limit, enable_memes,
  max_tweet_length, max_response_idea_length, max_reply_length,
  suggestion_limit, enable_long_replies, enable_style_matching, 
  enable_perplexity_guidance, sort_order, active
) VALUES
-- Basic Plan - $9/month
(
  'basic', 
  'Basic', 
  'Perfect for casual users', 
  9, 
  90, -- Annual discount
  50, -- replies per month
  0, -- no memes
  false, -- memes disabled
  500, -- tweet length
  300, -- response idea length
  280, -- reply length (standard)
  25, -- suggestions per month
  false, -- no long replies
  false, -- no style matching
  false, -- no perplexity
  2,
  true
),
-- Pro Plan - $19/month
(
  'pro', 
  'Pro', 
  'Great for regular tweeters with memes', 
  19, 
  190, -- Annual discount
  150, -- replies per month
  25, -- memes per month
  true, -- memes enabled
  1000, -- tweet length
  500, -- response idea length
  560, -- reply length (medium)
  50, -- suggestions per month
  true, -- long replies enabled
  true, -- style matching enabled
  false, -- no perplexity
  3,
  true
),
-- Business Plan - $29/month
(
  'business', 
  'Business', 
  'For power users and content creators', 
  29, 
  290, -- Annual discount
  300, -- replies per month
  50, -- memes per month
  true, -- memes enabled
  1500, -- tweet length
  1000, -- response idea length
  1000, -- reply length (long)
  100, -- suggestions per month
  true, -- long replies enabled
  true, -- style matching enabled
  true, -- perplexity enabled
  4,
  true
),
-- Enterprise Plan - $49/month
(
  'enterprise', 
  'Enterprise', 
  'Maximum features for professionals', 
  49, 
  490, -- Annual discount
  500, -- replies per month
  100, -- memes per month
  true, -- memes enabled
  2000, -- tweet length
  2000, -- response idea length
  2000, -- reply length (max)
  200, -- suggestions per month
  true, -- long replies enabled
  true, -- style matching enabled
  true, -- perplexity enabled
  5,
  true
);

-- Create features JSON for each plan (for display purposes)
ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}';

-- Update features for each plan
UPDATE public.subscription_plans SET features = jsonb_build_object(
  'replies', '10 replies/month',
  'tweet_length', 'Standard tweets (280 chars)',
  'response_length', 'Short replies only',
  'memes', false,
  'suggestions', false,
  'style_matching', false,
  'perplexity', false,
  'support', 'Community support'
) WHERE id = 'free';

UPDATE public.subscription_plans SET features = jsonb_build_object(
  'replies', '50 replies/month',
  'tweet_length', 'Extended tweets (500 chars)',
  'response_length', 'Short replies only',
  'memes', false,
  'suggestions', '25 AI suggestions/month',
  'style_matching', false,
  'perplexity', false,
  'support', 'Email support'
) WHERE id = 'basic';

UPDATE public.subscription_plans SET features = jsonb_build_object(
  'replies', '150 replies/month',
  'tweet_length', 'Long tweets (1000 chars)',
  'response_length', 'Medium replies (560 chars)',
  'memes', '25 memes/month',
  'suggestions', '50 AI suggestions/month',
  'style_matching', true,
  'perplexity', false,
  'support', 'Priority email support'
) WHERE id = 'pro';

UPDATE public.subscription_plans SET features = jsonb_build_object(
  'replies', '300 replies/month',
  'tweet_length', 'Extended tweets (1500 chars)',
  'response_length', 'Long replies (1000 chars)',
  'memes', '50 memes/month',
  'suggestions', '100 AI suggestions/month',
  'style_matching', true,
  'perplexity', 'Real-time fact checking',
  'support', 'Priority support'
) WHERE id = 'business';

UPDATE public.subscription_plans SET features = jsonb_build_object(
  'replies', '500 replies/month',
  'tweet_length', 'Maximum length (2000 chars)',
  'response_length', 'Maximum replies (2000 chars)',
  'memes', '100 memes/month',
  'suggestions', '200 AI suggestions/month',
  'style_matching', true,
  'perplexity', 'Real-time fact checking',
  'api_access', true,
  'support', 'Dedicated support'
) WHERE id = 'enterprise';

-- Add display order for pricing page
ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS popular BOOLEAN DEFAULT false;

-- Mark Pro plan as popular
UPDATE public.subscription_plans SET popular = true WHERE id = 'pro';