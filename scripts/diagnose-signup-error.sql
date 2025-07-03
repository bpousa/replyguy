-- Focused diagnosis of signup error

-- 1. Check if handle_new_user function exists in the correct schema
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'handle_new_user';

-- 2. Check if the function is in public schema (it should be)
SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'handle_new_user' 
    AND n.nspname = 'public'
);

-- 3. Let's see the exact trigger definition
SELECT 
    tgname,
    tgrelid::regclass as table_full_name,
    tgfoid::regprocedure as function_full_name,
    pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- 4. Try to execute the function manually to see the exact error
DO $$
DECLARE
    test_user RECORD;
    error_msg TEXT;
    error_detail TEXT;
    error_hint TEXT;
    error_context TEXT;
BEGIN
    -- Create a mock auth.users record
    test_user := ROW(
        gen_random_uuid(),                    -- id
        'aud',                               -- aud
        'authenticated',                     -- role
        'test@example.com',                  -- email
        now(),                               -- email_confirmed_at
        now(),                               -- invited_at
        '',                                  -- phone
        null,                                -- phone_confirmed_at
        null,                                -- recovery_sent_at
        null,                                -- email_change_sent_at
        null,                                -- new_email
        null,                                -- new_phone
        now(),                               -- created_at
        now(),                               -- updated_at
        null,                                -- last_sign_in_at
        '{"full_name": "Test User"}'::jsonb, -- raw_user_meta_data
        false,                               -- is_super_admin
        null,                                -- email_change
        null,                                -- email_change_token_new
        null,                                -- email_change_confirm_status
        null,                                -- phone_change
        null,                                -- phone_change_token
        null,                                -- phone_change_sent_at
        'email',                             -- confirmation_method
        null,                                -- reauthentication_token
        null                                 -- reauthentication_sent_at
    );
    
    -- Try to manually call handle_new_user
    BEGIN
        -- First check if we can call the function at all
        PERFORM public.handle_new_user();
        RAISE NOTICE 'Function exists and can be called';
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS 
            error_msg = MESSAGE_TEXT,
            error_detail = PG_EXCEPTION_DETAIL,
            error_hint = PG_EXCEPTION_HINT,
            error_context = PG_EXCEPTION_CONTEXT;
            
        RAISE NOTICE 'Error calling function: %', error_msg;
        RAISE NOTICE 'Detail: %', error_detail;
        RAISE NOTICE 'Hint: %', error_hint;
        RAISE NOTICE 'Context: %', error_context;
    END;
    
    -- Now let's test the actual inserts that the function would do
    RAISE NOTICE '--- Testing individual operations ---';
    
    -- Test 1: Insert into users
    BEGIN
        INSERT INTO public.users (id, email, created_at, updated_at)
        VALUES (test_user.id, test_user.email, NOW(), NOW());
        
        RAISE NOTICE 'SUCCESS: Can insert into users table';
        DELETE FROM public.users WHERE id = test_user.id;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
        RAISE NOTICE 'FAILED: Cannot insert into users - %', error_msg;
    END;
    
    -- Test 2: Check if free plan exists
    IF EXISTS (SELECT 1 FROM public.subscription_plans WHERE id = 'free') THEN
        RAISE NOTICE 'SUCCESS: Free plan exists';
    ELSE
        RAISE NOTICE 'FAILED: Free plan does not exist!';
    END IF;
    
    -- Test 3: Insert into subscriptions
    BEGIN
        -- First ensure user exists
        INSERT INTO public.users (id, email, created_at, updated_at)
        VALUES (test_user.id, test_user.email, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
        
        INSERT INTO public.subscriptions (
            user_id, plan_id, status,
            current_period_start, current_period_end
        ) VALUES (
            test_user.id, 'free', 'active',
            NOW(), NOW() + INTERVAL '30 days'
        );
        
        RAISE NOTICE 'SUCCESS: Can insert into subscriptions table';
        
        -- Cleanup
        DELETE FROM public.subscriptions WHERE user_id = test_user.id;
        DELETE FROM public.users WHERE id = test_user.id;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
        RAISE NOTICE 'FAILED: Cannot insert into subscriptions - %', error_msg;
        -- Try cleanup
        DELETE FROM public.users WHERE id = test_user.id;
    END;
    
END $$;

-- 5. Check for any constraints that might be causing issues
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid IN (
    'public.users'::regclass,
    'public.subscriptions'::regclass
)
ORDER BY conrelid, conname;