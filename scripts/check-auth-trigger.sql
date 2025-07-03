-- Check the current trigger configuration
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

-- Check if there are any recent users without public.users records
SELECT 
    au.id,
    au.email,
    au.created_at,
    au.email_confirmed_at,
    pu.id as public_user_id
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.created_at > NOW() - INTERVAL '24 hours'
ORDER BY au.created_at DESC
LIMIT 10;