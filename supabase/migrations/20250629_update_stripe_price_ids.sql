-- Update subscription_plans with actual LIVE Stripe price IDs
-- Based on the prices created in Stripe live mode (January 2025)

-- X Basic (growth plan)
UPDATE subscription_plans SET 
  stripe_price_id_monthly = 'price_1RfShx08qNQAUd0lD1D2BBN4',  -- $19/month (LIVE)
  stripe_price_id_yearly = 'price_1RfShx08qNQAUd0lG4jrZF22'    -- $190/year (LIVE)
WHERE id = 'growth';

-- X Pro (professional plan)  
UPDATE subscription_plans SET 
  stripe_price_id_monthly = 'price_1RfShy08qNQAUd0lmouMvBHX',  -- $49/month (LIVE)
  stripe_price_id_yearly = 'price_1RfShy08qNQAUd0ls3glg2GG'    -- $490/year (LIVE)
WHERE id = 'professional';

-- X Business (enterprise plan)
UPDATE subscription_plans SET 
  stripe_price_id_monthly = 'price_1RfShy08qNQAUd0lrjhW24Vq',  -- $99/month (LIVE)
  stripe_price_id_yearly = 'price_1RfShz08qNQAUd0lqgR9rlZu'    -- $990/year (LIVE)
WHERE id = 'enterprise';

-- Verify the updates
SELECT id, name, stripe_price_id_monthly, stripe_price_id_yearly, price_monthly, price_yearly 
FROM subscription_plans 
WHERE id IN ('growth', 'professional', 'enterprise');