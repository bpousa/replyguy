-- Create subscription_plans table
-- This was missing from the original migrations and is required for the subscription system

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC NOT NULL DEFAULT 0,
  price_yearly NUMERIC NOT NULL DEFAULT 0,
  
  -- Reply and content limits
  reply_limit INTEGER NOT NULL DEFAULT 10,
  monthly_limit INTEGER NOT NULL DEFAULT 10, -- Legacy column for compatibility
  meme_limit INTEGER NOT NULL DEFAULT 0,
  suggestion_limit INTEGER NOT NULL DEFAULT 0,
  
  -- Character limits
  max_tweet_length INTEGER NOT NULL DEFAULT 280,
  max_response_idea_length INTEGER NOT NULL DEFAULT 200,
  max_reply_length INTEGER NOT NULL DEFAULT 280,
  
  -- Feature flags
  enable_memes BOOLEAN NOT NULL DEFAULT false,
  enable_long_replies BOOLEAN NOT NULL DEFAULT false,
  enable_style_matching BOOLEAN NOT NULL DEFAULT false,
  enable_perplexity_guidance BOOLEAN NOT NULL DEFAULT false,
  enable_write_like_me BOOLEAN NOT NULL DEFAULT false,
  
  -- Display and ordering
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  popular BOOLEAN NOT NULL DEFAULT false,
  features JSONB DEFAULT '[]'::jsonb,
  
  -- Stripe integration
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Allow public read access to subscription plans
CREATE POLICY "Public can view active subscription plans" ON public.subscription_plans
  FOR SELECT
  USING (active = true);

-- Create index for common queries
CREATE INDEX idx_subscription_plans_active ON public.subscription_plans(active);
CREATE INDEX idx_subscription_plans_sort_order ON public.subscription_plans(sort_order);

-- Insert initial subscription plans with both old and new naming conventions
-- This includes aliases to support the transition from old to new plan names
INSERT INTO public.subscription_plans (
  id, name, description, price_monthly, price_yearly,
  reply_limit, monthly_limit, meme_limit, suggestion_limit,
  max_tweet_length, max_response_idea_length, max_reply_length,
  enable_memes, enable_long_replies, enable_style_matching, 
  enable_perplexity_guidance, enable_write_like_me,
  sort_order, active, popular, features
) VALUES 
-- Free plan
('free', 'Free', 'Perfect for trying out ReplyGuy', 0, 0,
  10, 10, 0, 0,
  280, 200, 280,
  false, false, false, false, false,
  1, true, false, '["Basic reply generation", "All tones and reply types"]'::jsonb),

-- X Basic (formerly Growth)
('basic', 'X Basic', 'For regular X users', 19, 190,
  300, 300, 10, 50,
  1000, 500, 560,
  true, false, true, false, false,
  2, true, true, '["AI suggestions", "Medium-length replies", "Style matching (50% influence)", "Meme generation"]'::jsonb),

-- Legacy alias for X Basic
('growth', 'X Basic', 'For regular X users', 19, 190,
  300, 300, 10, 50,
  1000, 500, 560,
  true, false, true, false, false,
  2, false, false, '["AI suggestions", "Medium-length replies", "Style matching (50% influence)", "Meme generation"]'::jsonb),

-- X Pro (formerly Professional)
('pro', 'X Pro', 'For power users and creators', 49, 490,
  500, 500, 50, -1,
  2000, 1000, 1000,
  true, true, true, false, true,
  3, true, false, '["Unlimited AI suggestions", "Long replies", "Style matching", "Write Like Me™", "Advanced meme generation"]'::jsonb),

-- Legacy alias for X Pro
('professional', 'X Pro', 'For power users and creators', 49, 490,
  500, 500, 50, -1,
  2000, 1000, 1000,
  true, true, true, false, true,
  3, false, false, '["Unlimited AI suggestions", "Long replies", "Style matching", "Write Like Me™", "Advanced meme generation"]'::jsonb),

-- X Business (formerly Enterprise)
('business', 'X Business', 'For brands and agencies', 99, 990,
  1000, 1000, 100, -1,
  2000, 2000, 2000,
  true, true, true, true, true,
  4, true, false, '["Everything in X Pro", "Perplexity real-time guidance", "Priority support", "API access", "Usage analytics"]'::jsonb),

-- Legacy alias for X Business
('enterprise', 'X Business', 'For brands and agencies', 99, 990,
  1000, 1000, 100, -1,
  2000, 2000, 2000,
  true, true, true, true, true,
  4, false, false, '["Everything in X Pro", "Perplexity real-time guidance", "Priority support", "API access", "Usage analytics"]'::jsonb),

-- Dev/test plan for local development without Stripe
('dev_test', 'Development Test', 'For local development only', 0, 0,
  9999, 9999, 9999, -1,
  2000, 2000, 2000,
  true, true, true, true, true,
  99, true, false, '["All features enabled", "For testing only"]'::jsonb);

-- Update trigger for updated_at
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.subscription_plans IS 'Stores all available subscription plans and their features';
COMMENT ON COLUMN public.subscription_plans.monthly_limit IS 'Legacy column, use reply_limit instead';
COMMENT ON COLUMN public.subscription_plans.suggestion_limit IS '-1 means unlimited, 0 means disabled';