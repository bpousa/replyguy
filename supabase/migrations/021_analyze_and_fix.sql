-- Comprehensive analysis and fix based on actual schema

-- First, let's see what columns actually exist
DO $$
DECLARE
    v_columns TEXT;
BEGIN
    -- Get column list for subscription_plans
    SELECT string_agg(column_name || ' (' || data_type || ')', ', ' ORDER BY ordinal_position)
    INTO v_columns
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscription_plans';
    
    RAISE NOTICE 'subscription_plans columns: %', v_columns;
    
    -- Get column list for subscriptions
    SELECT string_agg(column_name || ' (' || data_type || ')', ', ' ORDER BY ordinal_position)
    INTO v_columns
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions';
    
    RAISE NOTICE 'subscriptions columns: %', v_columns;
END $$;

-- Now fix based on actual schema
-- The error showed: column "monthly_price" ... violates not-null constraint
-- This means the table has monthly_price and annual_price, not price_monthly/price_yearly

-- 1. Add missing columns with correct names
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS reply_limit INTEGER,
ADD COLUMN IF NOT EXISTS meme_limit INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS enable_write_like_me BOOLEAN DEFAULT false;

-- 2. Update values
UPDATE public.subscription_plans 
SET 
  reply_limit = COALESCE(reply_limit, monthly_limit, 10),
  meme_limit = CASE 
    WHEN id = 'free' THEN 0
    WHEN id IN ('basic', 'growth') THEN 10
    WHEN id IN ('pro', 'professional') THEN 50
    WHEN id IN ('business', 'enterprise') THEN 100
    ELSE 0
  END,
  enable_write_like_me = CASE 
    WHEN id IN ('pro', 'professional', 'business', 'enterprise') THEN true 
    ELSE false 
  END;

-- 3. Update pricing using correct column names (monthly_price, annual_price)
UPDATE public.subscription_plans 
SET 
  monthly_price = CASE 
    WHEN id = 'free' THEN 0
    WHEN id IN ('basic', 'growth') THEN 19
    WHEN id IN ('pro', 'professional') THEN 49
    WHEN id IN ('business', 'enterprise') THEN 99
    ELSE COALESCE(monthly_price, 0)
  END,
  annual_price = CASE 
    WHEN id = 'free' THEN 0
    WHEN id IN ('basic', 'growth') THEN 190
    WHEN id IN ('pro', 'professional') THEN 490
    WHEN id IN ('business', 'enterprise') THEN 990
    ELSE COALESCE(annual_price, 0)
  END;

-- 4. Try to insert dev_test plan with correct columns
-- First check what columns are required (NOT NULL)
DO $$
DECLARE
    required_cols TEXT;
BEGIN
    SELECT string_agg(column_name, ', ')
    INTO required_cols
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'subscription_plans'
      AND is_nullable = 'NO'
      AND column_default IS NULL;
    
    RAISE NOTICE 'Required columns: %', required_cols;
END $$;

-- Insert dev plan only if it doesn't exist
INSERT INTO public.subscription_plans (
  id, 
  name, 
  description, 
  monthly_price,    -- Using correct column name
  annual_price,     -- Using correct column name
  monthly_limit,    -- This seems to be required
  reply_limit,
  meme_limit,
  suggestion_limit,
  max_tweet_length,
  max_response_idea_length,
  max_reply_length,
  enable_long_replies,
  enable_style_matching,
  enable_perplexity_guidance,
  enable_write_like_me,
  sort_order,
  active
)
SELECT 
  'dev_test',
  'Development Test',
  'For local development only',
  0,      -- monthly_price
  0,      -- annual_price  
  9999,   -- monthly_limit
  9999,   -- reply_limit
  9999,   -- meme_limit
  -1,     -- suggestion_limit (unlimited)
  2000,   -- max_tweet_length
  2000,   -- max_response_idea_length
  2000,   -- max_reply_length
  true,   -- enable_long_replies
  true,   -- enable_style_matching
  true,   -- enable_perplexity_guidance
  true,   -- enable_write_like_me
  99,     -- sort_order
  true    -- active
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscription_plans WHERE id = 'dev_test'
);

-- 5. Show current plans
SELECT 
  id,
  name,
  monthly_price || '/' || annual_price as "Price (M/Y)",
  COALESCE(reply_limit, monthly_limit) as reply_limit,
  meme_limit,
  CASE WHEN enable_write_like_me THEN '✓' ELSE '✗' END as "Write Like Me",
  CASE WHEN enable_perplexity_guidance THEN '✓' ELSE '✗' END as "Perplexity"
FROM subscription_plans
WHERE active = true
ORDER BY sort_order;