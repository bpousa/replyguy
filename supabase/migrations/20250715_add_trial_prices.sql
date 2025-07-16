-- Add trial price IDs for $1 30-day trials
-- Created for special onboarding offer for new free users

-- First ensure the subscription_plans table exists
-- (This migration depends on 002_subscription_plans.sql being run first)
DO $$ 
BEGIN
    -- Check if subscription_plans table exists
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'subscription_plans'
    ) THEN
        -- Add columns for trial price IDs if they don't exist
        ALTER TABLE subscription_plans
        ADD COLUMN IF NOT EXISTS stripe_trial_price_id_monthly VARCHAR(255),
        ADD COLUMN IF NOT EXISTS stripe_trial_price_id_yearly VARCHAR(255);
    ELSE
        RAISE NOTICE 'Table subscription_plans does not exist. Please run migration 002_subscription_plans.sql first.';
    END IF;
END $$;

-- Update plans with trial prices only if table exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'subscription_plans'
    ) THEN
        -- Update X Basic (growth plan) with $1 trial price
        UPDATE subscription_plans SET 
          stripe_trial_price_id_monthly = 'price_1RlGUQ08qNQAUd0lhSz7IEvB'  -- $1 for 30 days, then $19/month
        WHERE id = 'growth';

        -- Update X Pro (professional plan) with $1 trial price  
        UPDATE subscription_plans SET 
          stripe_trial_price_id_monthly = 'price_1RlGV108qNQAUd0l4uxeX34V'  -- $1 for 30 days, then $49/month
        WHERE id = 'professional';

        -- Note: Enterprise plan doesn't get a trial offer in this flow

        -- Add a comment to document the trial offer structure
        COMMENT ON COLUMN subscription_plans.stripe_trial_price_id_monthly IS 'Stripe price ID for $1 30-day trial offers shown to new free users on first login';
    END IF;
END $$;