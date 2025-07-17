-- Update trial price IDs to LIVE mode prices
-- Run this after creating the products in Stripe live mode

-- IMPORTANT: Replace these placeholder IDs with the actual LIVE price IDs from Stripe
-- You'll get these IDs after running scripts/create-live-trial-products.sh

DO $$ 
BEGIN
    -- Check if subscription_plans table exists
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'subscription_plans'
    ) THEN
        -- Update X Basic (growth plan) with LIVE $1 trial price
        UPDATE subscription_plans SET 
          stripe_trial_price_id_monthly = 'price_1Rlhbf08qNQAUd0lbUZR3RwW'  -- X Basic $1 trial (LIVE)
        WHERE id = 'growth';

        -- Update X Pro (professional plan) with LIVE $1 trial price  
        UPDATE subscription_plans SET 
          stripe_trial_price_id_monthly = 'price_1Rlhbg08qNQAUd0lmrEzmJWe'  -- X Pro $1 trial (LIVE)
        WHERE id = 'professional';

        RAISE NOTICE 'Trial prices updated to LIVE mode';
    ELSE
        RAISE NOTICE 'Table subscription_plans does not exist';
    END IF;
END $$;