-- Add missing fields to subscription_plans table
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS reply_limit INTEGER,
ADD COLUMN IF NOT EXISTS meme_limit INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS enable_write_like_me BOOLEAN DEFAULT false;

-- Update the limits based on the monthly_limit field
UPDATE subscription_plans SET 
  reply_limit = monthly_limit,
  meme_limit = CASE 
    WHEN id = 'free' THEN 0
    WHEN id = 'growth' THEN 10
    WHEN id = 'professional' THEN 50
    WHEN id = 'enterprise' THEN 100
  END,
  enable_write_like_me = CASE
    WHEN id IN ('professional', 'enterprise') THEN true
    ELSE false
  END;

-- Show updated plans
SELECT id, name, monthly_limit, reply_limit, meme_limit, suggestion_limit, enable_write_like_me 
FROM subscription_plans 
ORDER BY sort_order;