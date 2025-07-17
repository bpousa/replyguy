-- Check what columns exist in subscription_plans
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'subscription_plans' 
  AND table_schema = 'public'
  AND column_name LIKE '%limit%' OR column_name LIKE '%research%'
ORDER BY ordinal_position;

-- Show a sample subscription plan
SELECT * FROM subscription_plans WHERE id = 'professional' LIMIT 1;