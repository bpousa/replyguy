-- Fix test users with correct plan IDs

-- First check what plans actually exist
SELECT id, name FROM subscription_plans WHERE active = true ORDER BY sort_order;

-- Update mikegiannulis@gmail.com to Professional tier
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

-- Update test-basic@replyguy.com to growth tier (which is X Basic)
UPDATE subscriptions s
SET 
    plan_id = 'growth',
    status = 'active', 
    current_period_start = NOW(),
    current_period_end = NOW() + INTERVAL '30 days'
FROM users u
WHERE s.user_id = u.id 
    AND u.email = 'test-basic@replyguy.com'
    AND s.is_active = true;

-- Update test-pro@replyguy.com to professional tier (which is X Pro)
UPDATE subscriptions s
SET 
    plan_id = 'professional',
    status = 'active',
    current_period_start = NOW(),
    current_period_end = NOW() + INTERVAL '30 days'
FROM users u
WHERE s.user_id = u.id 
    AND u.email = 'test-pro@replyguy.com'
    AND s.is_active = true;

-- Update test-business@replyguy.com to enterprise tier (which is X Business)
UPDATE subscriptions s
SET 
    plan_id = 'enterprise',
    status = 'active',
    current_period_start = NOW(),
    current_period_end = NOW() + INTERVAL '30 days'
FROM users u
WHERE s.user_id = u.id 
    AND u.email = 'test-business@replyguy.com'
    AND s.is_active = true;

-- Keep test-free@replyguy.com on free tier but make it active (not trial)
UPDATE subscriptions s
SET 
    status = 'active',
    current_period_start = NOW(),
    current_period_end = NOW() + INTERVAL '30 days'
FROM users u
WHERE s.user_id = u.id 
    AND u.email = 'test-free@replyguy.com'
    AND s.is_active = true;

-- Show final user distribution
SELECT 
    u.email,
    s.plan_id,
    sp.name as plan_name,
    s.status,
    sp.monthly_price || '/' || sp.yearly_price as pricing,
    sp.reply_limit || ' replies' as replies,
    sp.meme_limit || ' memes' as memes,
    CASE WHEN sp.enable_write_like_me THEN 'Yes' ELSE 'No' END as "Write Like Me"
FROM users u
JOIN subscriptions s ON s.user_id = u.id AND s.is_active = true
JOIN subscription_plans sp ON sp.id = s.plan_id
ORDER BY sp.sort_order, u.email;

-- Summary
SELECT 
    sp.name as plan_name,
    COUNT(s.user_id) as user_count,
    string_agg(DISTINCT s.status, ', ') as statuses
FROM subscription_plans sp
LEFT JOIN subscriptions s ON s.plan_id = sp.id AND s.is_active = true
WHERE sp.active = true
GROUP BY sp.name, sp.sort_order
ORDER BY sp.sort_order;