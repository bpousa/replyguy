-- Check and setup test users for each tier

-- First, let's see what users we have
DO $$
DECLARE
    v_user_count INTEGER;
    v_user_list TEXT;
BEGIN
    SELECT COUNT(*), string_agg(email, ', ' ORDER BY email)
    INTO v_user_count, v_user_list
    FROM users;
    
    RAISE NOTICE 'Found % users: %', v_user_count, v_user_list;
END $$;

-- Check current subscriptions
SELECT 
    u.email,
    s.plan_id,
    s.status,
    sp.name as plan_name,
    s.current_period_end
FROM users u
JOIN subscriptions s ON s.user_id = u.id AND s.is_active = true
JOIN subscription_plans sp ON sp.id = s.plan_id
ORDER BY u.email;

-- Now let's update specific users to different tiers for testing
-- We'll look for test users or specific emails

-- Update mikegiannulis@gmail.com to Professional/Pro tier (as mentioned in the upgrade script)
UPDATE subscriptions s
SET 
    plan_id = 'professional',
    status = 'active',
    current_period_start = NOW(),
    current_period_end = NOW() + INTERVAL '30 days'
FROM users u
WHERE s.user_id = u.id 
    AND u.email = 'mikegiannulis@gmail.com'
    AND s.is_active = true;

-- If we have any test users, let's assign them different tiers
-- Update user with email containing 'test' and 'basic' to basic tier
UPDATE subscriptions s
SET 
    plan_id = 'basic',
    status = 'active',
    current_period_start = NOW(),
    current_period_end = NOW() + INTERVAL '30 days'
FROM users u
WHERE s.user_id = u.id 
    AND (u.email ILIKE '%test%basic%' OR u.email ILIKE '%basic%test%')
    AND s.is_active = true;

-- Update user with email containing 'test' and 'pro' to pro tier
UPDATE subscriptions s
SET 
    plan_id = 'pro',
    status = 'active',
    current_period_start = NOW(),
    current_period_end = NOW() + INTERVAL '30 days'
FROM users u
WHERE s.user_id = u.id 
    AND (u.email ILIKE '%test%pro%' OR u.email ILIKE '%pro%test%')
    AND s.is_active = true;

-- Update user with email containing 'test' and 'business' to business tier
UPDATE subscriptions s
SET 
    plan_id = 'business',
    status = 'active',
    current_period_start = NOW(),
    current_period_end = NOW() + INTERVAL '30 days'
FROM users u
WHERE s.user_id = u.id 
    AND (u.email ILIKE '%test%business%' OR u.email ILIKE '%business%test%')
    AND s.is_active = true;

-- Create test users if they don't exist
-- This creates one test user for each tier
DO $$
DECLARE
    v_test_user_id UUID;
BEGIN
    -- Create test user for Basic tier if doesn't exist
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'test-basic@replyguy.app') THEN
        -- Insert into auth.users first
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'test-basic@replyguy.app',
            crypt('testpassword123', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW()
        )
        RETURNING id INTO v_test_user_id;
        
        -- The trigger should create the user and subscription automatically
        -- But let's update the subscription to basic
        UPDATE subscriptions 
        SET plan_id = 'basic', status = 'active'
        WHERE user_id = v_test_user_id;
        
        RAISE NOTICE 'Created test user: test-basic@replyguy.app';
    END IF;
    
    -- Create test user for Pro tier if doesn't exist
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'test-pro@replyguy.app') THEN
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'test-pro@replyguy.app',
            crypt('testpassword123', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW()
        )
        RETURNING id INTO v_test_user_id;
        
        UPDATE subscriptions 
        SET plan_id = 'pro', status = 'active'
        WHERE user_id = v_test_user_id;
        
        RAISE NOTICE 'Created test user: test-pro@replyguy.app';
    END IF;
    
    -- Create test user for Business tier if doesn't exist
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'test-business@replyguy.app') THEN
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'test-business@replyguy.app',
            crypt('testpassword123', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW()
        )
        RETURNING id INTO v_test_user_id;
        
        UPDATE subscriptions 
        SET plan_id = 'business', status = 'active'
        WHERE user_id = v_test_user_id;
        
        RAISE NOTICE 'Created test user: test-business@replyguy.app';
    END IF;
END $$;

-- Show final subscription distribution
SELECT 
    sp.name as plan_name,
    sp.id as plan_id,
    COUNT(s.user_id) as user_count,
    array_agg(u.email ORDER BY u.email) as users
FROM subscription_plans sp
LEFT JOIN subscriptions s ON s.plan_id = sp.id AND s.is_active = true
LEFT JOIN users u ON u.id = s.user_id
WHERE sp.active = true
GROUP BY sp.name, sp.id, sp.sort_order
ORDER BY sp.sort_order;