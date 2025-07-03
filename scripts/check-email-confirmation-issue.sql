-- Check what might be blocking email confirmation

-- 1. Check if there are any errors in the handle_new_user function
SELECT 'Checking handle_new_user function...' as status;
SELECT proname, pronargs, proargtypes 
FROM pg_proc 
WHERE proname = 'handle_new_user' 
AND pronamespace = 'public'::regnamespace;

-- 2. Check recent users and their confirmation status
SELECT 'Recent signups and confirmation status:' as status;
SELECT 
    au.id,
    au.email,
    au.created_at,
    au.email_confirmed_at,
    au.raw_user_meta_data->>'selected_plan' as selected_plan,
    CASE WHEN pu.id IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as in_public_users,
    CASE WHEN s.id IS NOT NULL THEN 'HAS SUBSCRIPTION' ELSE 'NO SUBSCRIPTION' END as subscription_status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
LEFT JOIN public.subscriptions s ON au.id = s.user_id AND s.status = 'active'
WHERE au.created_at > NOW() - INTERVAL '2 hours'
ORDER BY au.created_at DESC;

-- 3. Check if the trigger is firing multiple times
SELECT 'Checking triggers on auth.users:' as status;
SELECT tgname, tgtype, tgenabled
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass
AND NOT tgisinternal
ORDER BY tgname;

-- 4. Test if we can manually confirm a user
-- This simulates what Supabase does during email confirmation
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Get a recent unconfirmed user
    SELECT id INTO test_user_id
    FROM auth.users
    WHERE email_confirmed_at IS NULL
    AND created_at > NOW() - INTERVAL '2 hours'
    LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        RAISE NOTICE 'Found unconfirmed user: %', test_user_id;
        
        -- Try to update email_confirmed_at (this is what Supabase does)
        UPDATE auth.users
        SET email_confirmed_at = NOW()
        WHERE id = test_user_id
        AND email_confirmed_at IS NULL;
        
        RAISE NOTICE 'Email confirmation update successful';
        
        -- Revert the change
        UPDATE auth.users
        SET email_confirmed_at = NULL
        WHERE id = test_user_id;
        
        RAISE NOTICE 'Test completed and reverted';
    ELSE
        RAISE NOTICE 'No unconfirmed users found to test';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error during test: %', SQLERRM;
END $$;

-- 5. Check if there are any RLS policies that might interfere
SELECT 'Checking RLS policies on auth schema:' as status;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'auth'
ORDER BY tablename, policyname;