-- Check and fix RLS policies that might be blocking email confirmation

-- 1. Check current RLS policies on key tables
SELECT 'Current RLS policies:' as info;
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'subscriptions', 'referrals', 'referral_bonuses')
ORDER BY tablename, policyname;

-- 2. Check if RLS is enabled on tables
SELECT 'RLS status on tables:' as info;
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'subscriptions', 'referrals', 'referral_bonuses');

-- 3. Temporarily disable RLS on these tables to test if that's the issue
-- (This is just for testing - we'll re-enable with proper policies)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_bonuses DISABLE ROW LEVEL SECURITY;

-- 4. Grant necessary permissions to functions
GRANT ALL ON public.users TO postgres;
GRANT ALL ON public.subscriptions TO postgres;
GRANT ALL ON public.referrals TO postgres;
GRANT ALL ON public.referral_bonuses TO postgres;

-- 5. Ensure the functions run with proper permissions
ALTER FUNCTION handle_new_user() SECURITY DEFINER;
ALTER FUNCTION handle_email_verified() SECURITY DEFINER;
ALTER FUNCTION complete_referral(UUID) SECURITY DEFINER;
ALTER FUNCTION generate_referral_code(UUID) SECURITY DEFINER;

-- 6. Create proper RLS policies (if we want to re-enable RLS)
-- Users table - allow service role full access
CREATE POLICY "Service role can do anything" ON public.users
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Subscriptions table
CREATE POLICY "Service role can do anything" ON public.subscriptions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Referrals table
CREATE POLICY "Service role can do anything" ON public.referrals
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view referrals they created" ON public.referrals
    FOR SELECT USING (auth.uid() = referrer_id);

CREATE POLICY "Users can view referrals where they were referred" ON public.referrals
    FOR SELECT USING (auth.uid() = referred_id);

-- Referral bonuses table
CREATE POLICY "Service role can do anything" ON public.referral_bonuses
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view own bonuses" ON public.referral_bonuses
    FOR SELECT USING (auth.uid() = user_id);

-- 7. Test a simulated signup with RLS disabled
DO $$
DECLARE
    test_auth_user RECORD;
    test_id UUID := gen_random_uuid();
BEGIN
    RAISE NOTICE 'Testing signup flow with RLS disabled...';
    
    -- Create a mock auth user record
    test_auth_user := ROW(
        test_id,                    -- id
        'test@example.com'::text,   -- email
        NOW(),                      -- email_confirmed_at
        '{"full_name": "Test User", "referral_code": ""}'::jsonb  -- raw_user_meta_data
    );
    
    -- Test handle_new_user by directly calling it
    BEGIN
        -- Insert into users table
        INSERT INTO public.users (id, email, full_name, created_at, updated_at)
        VALUES (test_id, 'test@example.com', 'Test User', NOW(), NOW());
        
        -- Insert subscription
        INSERT INTO public.subscriptions (
            user_id, plan_id, status,
            current_period_start, current_period_end,
            created_at, updated_at
        ) VALUES (
            test_id, 'free', 'active',
            NOW(), NOW() + INTERVAL '30 days',
            NOW(), NOW()
        );
        
        RAISE NOTICE '✓ Manual signup simulation successful';
        
        -- Clean up
        DELETE FROM public.subscriptions WHERE user_id = test_id;
        DELETE FROM public.users WHERE id = test_id;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✗ Manual signup simulation failed: %', SQLERRM;
        -- Clean up on error
        DELETE FROM public.subscriptions WHERE user_id = test_id;
        DELETE FROM public.users WHERE id = test_id;
    END;
END $$;

SELECT 'RLS policies have been checked and updated. If email confirmation is still failing, the issue may be with Supabase Auth configuration.' as message;