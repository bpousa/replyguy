-- Direct test to identify the exact error

-- 1. Check if the free plan exists
SELECT id, name, reply_limit FROM public.subscription_plans WHERE id = 'free';

-- 2. Check the users table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- 3. Check if the function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'handle_new_user' 
AND pronamespace = 'public'::regnamespace;

-- 4. Check the trigger
SELECT tgname, tgrelid::regclass, tgfoid::regprocedure
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- 5. Try a minimal insert to see what fails
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    error_message TEXT;
    error_detail TEXT;
    error_hint TEXT;
BEGIN
    -- Test 1: Can we insert into users table directly?
    BEGIN
        INSERT INTO public.users (id, email, created_at, updated_at)
        VALUES (test_user_id, 'direct-test@example.com', NOW(), NOW());
        
        RAISE NOTICE 'SUCCESS: Direct insert into users table works';
        
        -- Clean up
        DELETE FROM public.users WHERE id = test_user_id;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS 
            error_message = MESSAGE_TEXT,
            error_detail = PG_EXCEPTION_DETAIL,
            error_hint = PG_EXCEPTION_HINT;
            
        RAISE NOTICE 'FAILED: Direct insert into users table';
        RAISE NOTICE 'Error: %', error_message;
        RAISE NOTICE 'Detail: %', error_detail;
        RAISE NOTICE 'Hint: %', error_hint;
    END;
    
    -- Test 2: Can we insert into subscriptions table?
    BEGIN
        -- First create a user
        INSERT INTO public.users (id, email, created_at, updated_at)
        VALUES (test_user_id, 'sub-test@example.com', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
        
        -- Then try subscription
        INSERT INTO public.subscriptions (
            user_id, plan_id, status, 
            current_period_start, current_period_end,
            created_at, updated_at
        )
        VALUES (
            test_user_id, 'free', 'active',
            NOW(), NOW() + INTERVAL '30 days',
            NOW(), NOW()
        );
        
        RAISE NOTICE 'SUCCESS: Direct insert into subscriptions table works';
        
        -- Clean up
        DELETE FROM public.subscriptions WHERE user_id = test_user_id;
        DELETE FROM public.users WHERE id = test_user_id;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS 
            error_message = MESSAGE_TEXT,
            error_detail = PG_EXCEPTION_DETAIL,
            error_hint = PG_EXCEPTION_HINT;
            
        RAISE NOTICE 'FAILED: Direct insert into subscriptions table';
        RAISE NOTICE 'Error: %', error_message;
        RAISE NOTICE 'Detail: %', error_detail;
        RAISE NOTICE 'Hint: %', error_hint;
        
        -- Try to clean up
        DELETE FROM public.users WHERE id = test_user_id;
    END;
END $$;