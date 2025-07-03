-- Fixed diagnosis of signup error

-- 1. Check if handle_new_user function exists in the correct schema
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'handle_new_user';

-- 2. Check if the free plan exists
SELECT id, name, reply_limit 
FROM public.subscription_plans 
WHERE id = 'free';

-- 3. Check users table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- 4. Simple test of the operations
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_email TEXT := 'test-' || extract(epoch from now())::text || '@example.com';
    error_msg TEXT;
    error_detail TEXT;
BEGIN
    RAISE NOTICE '=== Starting Signup Process Test ===';
    
    -- Test 1: Check if free plan exists
    IF EXISTS (SELECT 1 FROM public.subscription_plans WHERE id = 'free') THEN
        RAISE NOTICE '✓ Free plan exists';
    ELSE
        RAISE NOTICE '✗ ERROR: Free plan does not exist! This will cause signup to fail.';
    END IF;
    
    -- Test 2: Try to insert a user
    BEGIN
        INSERT INTO public.users (id, email, created_at, updated_at)
        VALUES (test_user_id, test_email, NOW(), NOW());
        
        RAISE NOTICE '✓ Can insert into users table';
        
        -- Clean up
        DELETE FROM public.users WHERE id = test_user_id;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS 
            error_msg = MESSAGE_TEXT,
            error_detail = PG_EXCEPTION_DETAIL;
        RAISE NOTICE '✗ ERROR inserting into users: %', error_msg;
        RAISE NOTICE '  Detail: %', error_detail;
    END;
    
    -- Test 3: Try to create a user and subscription (simulating handle_new_user)
    BEGIN
        -- Insert user
        INSERT INTO public.users (id, email, full_name, created_at, updated_at)
        VALUES (test_user_id, test_email, 'Test User', NOW(), NOW());
        
        -- Insert subscription
        INSERT INTO public.subscriptions (
            user_id, plan_id, status,
            current_period_start, current_period_end,
            created_at, updated_at
        ) VALUES (
            test_user_id, 'free', 'active',
            NOW(), NOW() + INTERVAL '30 days',
            NOW(), NOW()
        );
        
        RAISE NOTICE '✓ Can create user and subscription successfully';
        
        -- Clean up
        DELETE FROM public.subscriptions WHERE user_id = test_user_id;
        DELETE FROM public.users WHERE id = test_user_id;
        
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS 
            error_msg = MESSAGE_TEXT,
            error_detail = PG_EXCEPTION_DETAIL;
        RAISE NOTICE '✗ ERROR in signup simulation: %', error_msg;
        RAISE NOTICE '  Detail: %', error_detail;
        
        -- Try to clean up
        BEGIN
            DELETE FROM public.subscriptions WHERE user_id = test_user_id;
            DELETE FROM public.users WHERE id = test_user_id;
        EXCEPTION WHEN OTHERS THEN
            NULL; -- Ignore cleanup errors
        END;
    END;
    
    RAISE NOTICE '=== Test Complete ===';
END $$;

-- 5. Check for constraints that might cause issues
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
    AND tc.table_name IN ('users', 'subscriptions')
    AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- 6. Check the actual function source
SELECT prosrc 
FROM pg_proc 
WHERE proname = 'handle_new_user' 
AND pronamespace = 'public'::regnamespace;