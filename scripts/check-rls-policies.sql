-- Check RLS policies that might be blocking signup

-- Check if RLS is enabled on tables
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('users', 'subscriptions', 'referrals');

-- Check all policies on users table
SELECT 
    pol.polname as policy_name,
    pol.polcmd as command,
    pol.polpermissive as permissive,
    pol.polroles::regrole[] as roles,
    pg_get_expr(pol.polqual, pol.polrelid) as using_expr,
    pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check_expr
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
WHERE pc.relname = 'users' AND pc.relnamespace = 'public'::regnamespace;

-- Check all policies on subscriptions table
SELECT 
    pol.polname as policy_name,
    pol.polcmd as command,
    pol.polpermissive as permissive,
    pol.polroles::regrole[] as roles,
    pg_get_expr(pol.polqual, pol.polrelid) as using_expr,
    pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check_expr
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
WHERE pc.relname = 'subscriptions' AND pc.relnamespace = 'public'::regnamespace;

-- Create INSERT policies if missing
-- The handle_new_user function runs as SECURITY DEFINER so it should bypass RLS,
-- but let's make sure the policies exist anyway

-- Check if INSERT policy exists for users table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND policyname = 'Service role can insert users'
    ) THEN
        -- Create policy for service role to insert users
        EXECUTE 'CREATE POLICY "Service role can insert users" ON public.users FOR INSERT TO service_role WITH CHECK (true)';
        RAISE NOTICE 'Created INSERT policy for users table';
    END IF;
END $$;

-- Check if INSERT policy exists for subscriptions table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'subscriptions' 
        AND policyname = 'Service role can insert subscriptions'
    ) THEN
        -- Create policy for service role to insert subscriptions
        EXECUTE 'CREATE POLICY "Service role can insert subscriptions" ON public.subscriptions FOR INSERT TO service_role WITH CHECK (true)';
        RAISE NOTICE 'Created INSERT policy for subscriptions table';
    END IF;
END $$;

-- Also check the function ownership and permissions
SELECT 
    p.proname as function_name,
    p.proowner::regrole as owner,
    p.prosecdef as security_definer,
    p.proacl as access_privileges
FROM pg_proc p
WHERE p.proname = 'handle_new_user'
AND p.pronamespace = 'public'::regnamespace;