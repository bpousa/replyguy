-- Debug email confirmation flow

-- 1. Check current handle_new_user function
SELECT 'Current handle_new_user function:' as status;
SELECT prosrc 
FROM pg_proc 
WHERE proname = 'handle_new_user' 
AND pronamespace = 'public'::regnamespace;

-- 2. Check auth.users for recent signups
SELECT 'Recent auth.users entries:' as status;
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    raw_user_meta_data->>'full_name' as full_name,
    raw_user_meta_data->>'selected_plan' as selected_plan
FROM auth.users
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check if users exist in public.users
SELECT 'Checking public.users sync:' as status;
SELECT 
    au.email,
    au.email_confirmed_at,
    CASE WHEN pu.id IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as in_public_users,
    CASE WHEN s.id IS NOT NULL THEN 'HAS SUBSCRIPTION' ELSE 'NO SUBSCRIPTION' END as subscription_status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
LEFT JOIN public.subscriptions s ON au.id = s.user_id AND s.status = 'active'
WHERE au.created_at > NOW() - INTERVAL '1 hour'
ORDER BY au.created_at DESC;

-- 4. Test if we can manually create a session
SELECT 'Testing session creation process...' as status;

-- 5. Check for any errors in handle_new_user execution
SELECT 'Checking for recent errors:' as status;
SELECT 
    datname,
    usename,
    application_name,
    state,
    query
FROM pg_stat_activity
WHERE state = 'idle in transaction'
OR query LIKE '%handle_new_user%'
LIMIT 5;