-- Check if subscription_plans table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'subscription_plans'
) as table_exists;

-- If it exists, show its structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'subscription_plans'
ORDER BY ordinal_position;

-- Check if the update_updated_at_column function exists
SELECT EXISTS (
    SELECT FROM pg_proc
    WHERE proname = 'update_updated_at_column'
) as function_exists;