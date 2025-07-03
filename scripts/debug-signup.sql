-- Debug script to check signup configuration

-- Check if users table exists and its structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'users'
ORDER BY ordinal_position;

-- Check if handle_new_user function exists
SELECT 
    proname as function_name,
    pronamespace::regnamespace as schema
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Check if trigger exists
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgtype,
    tgenabled
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- Check recent errors in postgres logs (if available)
-- This might need superuser access
-- SELECT * FROM pg_stat_activity WHERE state = 'active';

-- Check if subscription_plans table has the 'free' plan
SELECT * FROM public.subscription_plans WHERE id = 'free';

-- Check if referrals table exists
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'referrals'
);

-- Test the handle_new_user function manually
-- This will help identify exactly where it fails
DO $$ 
DECLARE
    test_user_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    test_email TEXT := 'test-' || extract(epoch from now()) || '@example.com';
BEGIN
    RAISE NOTICE 'Starting manual test of user creation process...';
    
    -- Step 1: Create user in public.users
    BEGIN
        INSERT INTO public.users (
            id, 
            email, 
            full_name,
            created_at,
            updated_at
        ) VALUES (
            test_user_id,
            test_email,
            'Test User',
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Step 1 SUCCESS: User created in public.users';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Step 1 FAILED: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        RAISE;
    END;
    
    -- Step 2: Create subscription
    BEGIN
        INSERT INTO public.subscriptions (
            user_id,
            plan_id,
            status,
            current_period_start,
            current_period_end
        ) VALUES (
            test_user_id,
            'free',
            'active',
            NOW(),
            NOW() + INTERVAL '30 days'
        );
        RAISE NOTICE 'Step 2 SUCCESS: Subscription created';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Step 2 FAILED: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    END;
    
    -- Clean up
    DELETE FROM public.subscriptions WHERE user_id = test_user_id;
    DELETE FROM public.users WHERE id = test_user_id;
    
    RAISE NOTICE 'Test completed and cleaned up successfully';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Test failed during cleanup: %', SQLERRM;
END $$;