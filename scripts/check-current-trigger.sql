-- Check current trigger and function state
SELECT 
    tgname as trigger_name,
    CASE 
        WHEN tgtype::int & 4 = 4 AND tgtype::int & 16 = 16 THEN 'INSERT OR UPDATE'
        WHEN tgtype::int & 4 = 4 THEN 'INSERT ONLY'
        WHEN tgtype::int & 16 = 16 THEN 'UPDATE ONLY'
        ELSE 'OTHER'
    END as trigger_events,
    tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- Check the function definition
SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';

-- Check recently created users and their status
SELECT 
    au.id,
    au.email,
    au.created_at as auth_created,
    au.email_confirmed_at,
    pu.id as public_user_exists,
    s.id as subscription_exists
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
LEFT JOIN public.subscriptions s ON au.id = s.user_id AND s.status = 'active'
WHERE au.created_at > NOW() - INTERVAL '2 hours'
ORDER BY au.created_at DESC;