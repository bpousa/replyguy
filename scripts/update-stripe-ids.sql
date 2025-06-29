-- Update subscription_plans with actual Stripe price IDs
-- Based on the prices found in Stripe (as of January 2025)

-- X Basic (growth plan)
UPDATE subscription_plans SET 
  stripe_price_id_monthly = 'price_1RdeVL08qNQAUd0lXDjPoiLc',  -- $19/month
  stripe_price_id_yearly = 'price_1RdeWf08qNQAUd0legzU7ors'    -- $190/year
WHERE id = 'growth';

-- X Pro (professional plan)  
UPDATE subscription_plans SET 
  stripe_price_id_monthly = 'price_1RdeXj08qNQAUd0lEFRP81ys',  -- $49/month
  stripe_price_id_yearly = 'price_1RdeYb08qNQAUd0lYnOVQsa3'    -- $490/year
WHERE id = 'professional';

-- X Business (enterprise plan)
UPDATE subscription_plans SET 
  stripe_price_id_monthly = 'price_1RdeZg08qNQAUd0l5lxm7yE7',  -- $99/month
  stripe_price_id_yearly = 'price_1Rdea108qNQAUd0lyuFEiqb6'    -- $990/year
WHERE id = 'enterprise';

-- Verify the updates
SELECT id, name, stripe_price_id_monthly, stripe_price_id_yearly, price_monthly, price_yearly 
FROM subscription_plans 
WHERE id IN ('growth', 'professional', 'enterprise');