-- Check current auth configuration
SELECT 
    raw_app_meta_data->>'selected_plan' as selected_plan,
    email,
    email_confirmed_at,
    created_at,
    updated_at
FROM auth.users
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 10;

-- Check if email confirmation is required
SELECT * FROM auth.config WHERE key = 'mailer_autoconfirm';

-- Check redirect URLs configured
SELECT * FROM auth.config WHERE key LIKE '%redirect%' OR key LIKE '%url%';

-- Check current auth flow configuration
SELECT * FROM auth.flow_state 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC 
LIMIT 10;