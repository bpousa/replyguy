-- Debug script to check subscription data for trial offer issues

-- Check if specific test emails have any subscriptions
SELECT 
    u.id as user_id,
    u.email,
    u.has_seen_trial_offer,
    u.trial_offer_accepted,
    s.id as subscription_id,
    s.status as subscription_status,
    s.created_at as sub_created,
    s.stripe_subscription_id
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id
WHERE u.email IN (
    'antoni.mike+30@gmail.com',
    'antoni.mike+31@gmail.com'
)
ORDER BY u.email, s.created_at DESC;

-- Check ALL active subscriptions (to see if there's stale data)
SELECT 
    s.id,
    s.user_id,
    s.status,
    s.created_at,
    u.email
FROM subscriptions s
LEFT JOIN users u ON s.user_id = u.id
WHERE s.status = 'active'
ORDER BY s.created_at DESC
LIMIT 20;

-- Check for orphaned subscriptions (no matching user)
SELECT 
    s.*
FROM subscriptions s
LEFT JOIN users u ON s.user_id = u.id
WHERE u.id IS NULL;