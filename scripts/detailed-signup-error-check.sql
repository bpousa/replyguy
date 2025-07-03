-- Detailed check for signup error

-- 1. Check for missing columns in users table
SELECT 'Checking for missing columns in users table:' as check_type;
SELECT 
    'referred_by' as column_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'referred_by'
    ) THEN '✓ Exists' ELSE '✗ MISSING' END as status
UNION ALL
SELECT 
    'referral_code' as column_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'referral_code'
    ) THEN '✓ Exists' ELSE '✗ MISSING' END as status
UNION ALL
SELECT 
    'stripe_customer_id' as column_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'stripe_customer_id'
    ) THEN '✓ Exists' ELSE '✗ MISSING' END as status
UNION ALL
SELECT 
    'daily_goal' as column_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'daily_goal'
    ) THEN '✓ Exists' ELSE '✗ MISSING' END as status
UNION ALL
SELECT 
    'timezone' as column_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'timezone'
    ) THEN '✓ Exists' ELSE '✗ MISSING' END as status;

-- 2. Check for duplicate constraint on subscriptions
SELECT 'Checking subscriptions constraints:' as check_type;
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.subscriptions'::regclass
ORDER BY conname;

-- 3. Check if generate_referral_code function exists
SELECT 'Checking generate_referral_code function:' as check_type;
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'generate_referral_code' 
        AND pronamespace = 'public'::regnamespace
    ) THEN '✓ Function exists' ELSE '✗ Function MISSING' END as status;

-- 4. Add missing columns if needed
DO $$
BEGIN
    -- Add referred_by column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'referred_by'
    ) THEN
        ALTER TABLE public.users ADD COLUMN referred_by UUID REFERENCES public.users(id);
        RAISE NOTICE '✓ Added missing referred_by column';
    END IF;
    
    -- Add referral_code column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'referral_code'
    ) THEN
        ALTER TABLE public.users ADD COLUMN referral_code VARCHAR(20) UNIQUE;
        RAISE NOTICE '✓ Added missing referral_code column';
    END IF;
    
    -- Add other columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'stripe_customer_id'
    ) THEN
        ALTER TABLE public.users ADD COLUMN stripe_customer_id TEXT UNIQUE;
        RAISE NOTICE '✓ Added missing stripe_customer_id column';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'daily_goal'
    ) THEN
        ALTER TABLE public.users ADD COLUMN daily_goal INTEGER DEFAULT 10 CHECK (daily_goal >= 1 AND daily_goal <= 100);
        RAISE NOTICE '✓ Added missing daily_goal column';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'timezone'
    ) THEN
        ALTER TABLE public.users ADD COLUMN timezone TEXT DEFAULT 'America/New_York';
        RAISE NOTICE '✓ Added missing timezone column';
    END IF;
END $$;

-- 5. Create generate_referral_code function if missing
CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_code VARCHAR(20);
  v_attempts INTEGER := 0;
BEGIN
  LOOP
    v_code := UPPER(SUBSTRING(p_user_id::TEXT, 1, 4) || SUBSTRING(MD5(RANDOM()::TEXT), 1, 6));
    
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE referral_code = v_code) THEN
      UPDATE public.users SET referral_code = v_code WHERE id = p_user_id;
      RETURN v_code;
    END IF;
    
    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'Failed to generate unique referral code after 10 attempts';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Test the exact operations from handle_new_user
SELECT 'Testing handle_new_user operations:' as test_type;
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'signup-test-' || extract(epoch from now())::text || '@example.com';
    error_msg TEXT;
    error_detail TEXT;
    error_hint TEXT;
BEGIN
    -- Test 1: Insert user
    BEGIN
        INSERT INTO public.users (
            id, 
            email, 
            full_name, 
            referred_by,
            created_at,
            updated_at
        ) VALUES (
            test_id, 
            test_email, 
            'Test User',
            NULL,
            NOW(),
            NOW()
        );
        RAISE NOTICE '✓ User insert successful';
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS 
            error_msg = MESSAGE_TEXT,
            error_detail = PG_EXCEPTION_DETAIL,
            error_hint = PG_EXCEPTION_HINT;
        RAISE NOTICE '✗ User insert failed: %', error_msg;
        RAISE NOTICE '  Detail: %', error_detail;
        RAISE NOTICE '  Hint: %', error_hint;
        -- Don't continue if user insert fails
        RETURN;
    END;
    
    -- Test 2: Insert subscription
    BEGIN
        INSERT INTO public.subscriptions (
            user_id,
            plan_id,
            status,
            current_period_start,
            current_period_end,
            created_at,
            updated_at
        ) VALUES (
            test_id,
            'free',
            'active',
            NOW(),
            NOW() + INTERVAL '30 days',
            NOW(),
            NOW()
        );
        RAISE NOTICE '✓ Subscription insert successful';
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS 
            error_msg = MESSAGE_TEXT,
            error_detail = PG_EXCEPTION_DETAIL,
            error_hint = PG_EXCEPTION_HINT;
        RAISE NOTICE '✗ Subscription insert failed: %', error_msg;
        RAISE NOTICE '  Detail: %', error_detail;
        RAISE NOTICE '  Hint: %', error_hint;
    END;
    
    -- Test 3: Generate referral code
    BEGIN
        PERFORM public.generate_referral_code(test_id);
        RAISE NOTICE '✓ Referral code generation successful';
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
        RAISE NOTICE '✗ Referral code generation failed: %', error_msg;
    END;
    
    -- Clean up
    DELETE FROM public.subscriptions WHERE user_id = test_id;
    DELETE FROM public.users WHERE id = test_id;
    
    RAISE NOTICE '✓ All tests completed';
END $$;

-- 7. Check for any active subscription constraint issues
SELECT 'Checking for subscription constraint violations:' as check_type;
SELECT 
    u.email,
    COUNT(s.id) as active_subscription_count
FROM public.users u
JOIN public.subscriptions s ON u.id = s.user_id
WHERE s.status = 'active'
GROUP BY u.email
HAVING COUNT(s.id) > 1;

-- 8. Final status
SELECT 'FINAL DIAGNOSIS:' as status;
SELECT 'If you see any ✗ MISSING or failed messages above, those are causing the signup error.' as diagnosis;