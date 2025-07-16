-- Check if all required tables and columns exist

-- 1. Check users table has trial tracking columns
SELECT 
    EXISTS(SELECT 1 FROM information_schema.columns 
           WHERE table_name='users' AND column_name='has_seen_trial_offer') as has_seen_trial_offer,
    EXISTS(SELECT 1 FROM information_schema.columns 
           WHERE table_name='users' AND column_name='trial_offer_shown_at') as trial_offer_shown_at,
    EXISTS(SELECT 1 FROM information_schema.columns 
           WHERE table_name='users' AND column_name='trial_offer_accepted') as trial_offer_accepted;

-- 2. Check if subscription_plans table exists and has trial columns
SELECT 
    EXISTS(SELECT 1 FROM information_schema.tables 
           WHERE table_name='subscription_plans') as subscription_plans_exists,
    EXISTS(SELECT 1 FROM information_schema.columns 
           WHERE table_name='subscription_plans' AND column_name='stripe_trial_price_id_monthly') as has_trial_price_column;

-- 3. Check if trial prices are set
SELECT id, name, 
       stripe_price_id_monthly,
       stripe_trial_price_id_monthly
FROM subscription_plans 
WHERE id IN ('growth', 'professional');