-- Check subscription plans and their price IDs
SELECT 
  id,
  name,
  stripe_price_id_monthly,
  stripe_price_id_yearly,
  active
FROM subscription_plans
ORDER BY sort_order;

-- Check if trial price IDs exist
SELECT 
  id,
  name,
  stripe_price_id_monthly
FROM subscription_plans
WHERE stripe_price_id_monthly IN (
  'price_1Rlhbf08qNQAUd0lbUZR3RwW',  -- X Basic $1 trial
  'price_1Rlhbg08qNQAUd0lmrEzmJWe'   -- X Pro $1 trial
);

-- Find the user that actually made the purchase
SELECT 
  id,
  email,
  created_at,
  trial_offer_accepted,
  has_seen_trial_offer
FROM users
WHERE id = 'e41f263d-2ebf-42fa-b2d0-85e3bc0c60ee';

-- Check subscriptions for that user
SELECT 
  s.*,
  sp.name as plan_name
FROM subscriptions s
LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
WHERE s.user_id = 'e41f263d-2ebf-42fa-b2d0-85e3bc0c60ee';
EOF < /dev/null
