-- Fix stuck email confirmations

-- 1. Check for unconfirmed users
SELECT 'Unconfirmed users:' as status;
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    CASE 
        WHEN email_confirmed_at IS NULL THEN 'NOT CONFIRMED'
        ELSE 'CONFIRMED'
    END as confirmation_status
FROM auth.users
WHERE email_confirmed_at IS NULL
ORDER BY created_at DESC;

-- 2. Manually confirm specific user (antoni.mike+16@gmail.com)
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'antoni.mike+16@gmail.com'
AND email_confirmed_at IS NULL;

-- 3. Check if user exists in public.users table
SELECT 'Checking public.users table:' as status;
SELECT 
    u.id,
    u.email,
    u.created_at,
    s.plan_id,
    s.status as subscription_status
FROM public.users u
LEFT JOIN public.subscriptions s ON u.id = s.user_id
WHERE u.email = 'antoni.mike+16@gmail.com';

-- 4. If user doesn't exist in public.users, create them
DO $$
DECLARE
    v_user_id UUID;
    v_email TEXT := 'antoni.mike+16@gmail.com';
BEGIN
    -- Get the auth user ID
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = v_email;
    
    IF v_user_id IS NOT NULL THEN
        -- Check if user exists in public.users
        IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
            -- Create user in public.users
            INSERT INTO public.users (id, email, full_name, created_at, updated_at)
            VALUES (v_user_id, v_email, '', NOW(), NOW());
            
            -- Create free subscription
            INSERT INTO public.subscriptions (
                user_id, plan_id, status,
                current_period_start, current_period_end,
                created_at, updated_at
            ) VALUES (
                v_user_id, 'free', 'active',
                NOW(), NOW() + INTERVAL '30 days',
                NOW(), NOW()
            );
            
            RAISE NOTICE 'Created user and subscription for %', v_email;
        ELSE
            RAISE NOTICE 'User already exists in public.users';
        END IF;
    ELSE
        RAISE NOTICE 'User not found in auth.users';
    END IF;
END $$;

-- 5. Verify the fix
SELECT 'Final verification:' as status;
SELECT 
    au.email,
    au.email_confirmed_at,
    pu.id as public_user_id,
    s.plan_id,
    s.status as subscription_status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
LEFT JOIN public.subscriptions s ON pu.id = s.user_id
WHERE au.email = 'antoni.mike+16@gmail.com';

-- 6. General fix for any other unconfirmed users (optional - uncomment to use)
-- UPDATE auth.users 
-- SET email_confirmed_at = NOW()
-- WHERE email_confirmed_at IS NULL
-- AND created_at < NOW() - INTERVAL '1 hour';