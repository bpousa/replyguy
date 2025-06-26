-- Analyze the actual database schema to understand column names

-- 1. Show all columns in subscription_plans table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'subscription_plans'
ORDER BY ordinal_position;

-- 2. Show sample data from subscription_plans
SELECT * FROM subscription_plans LIMIT 2;

-- 3. Show all columns in subscriptions table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'subscriptions'
ORDER BY ordinal_position;

-- 4. Show all columns in users table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;