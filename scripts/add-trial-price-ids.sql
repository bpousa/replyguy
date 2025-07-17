-- Add trial price IDs to subscription plans
-- The trial prices are separate from regular prices, so we need to map them

-- Create a temporary table to store trial price mappings
CREATE TEMP TABLE trial_price_mappings (
  regular_price_id TEXT,
  trial_price_id TEXT,
  plan_name TEXT
);

-- Insert the mappings based on what we created earlier
INSERT INTO trial_price_mappings VALUES
  -- X Basic (Growth) plan mappings
  ('price_1RgM4T08qNQAUd0lDDkyKROE', 'price_1Rlhbf08qNQAUd0lbUZR3RwW', 'X Basic'),  -- Monthly regular -> trial
  -- X Pro (Professional) plan mappings  
  ('price_1RgM4T08qNQAUd0lBE8gJR6H', 'price_1Rlhbg08qNQAUd0lmrEzmJWe', 'X Pro');    -- Monthly regular -> trial

-- Show current subscription plans
SELECT 
  id,
  name,
  stripe_price_id_monthly,
  stripe_price_id_yearly
FROM subscription_plans
WHERE active = true
ORDER BY sort_order;

-- For now, let's create a function to handle trial checkouts
-- This will map trial price IDs to the correct plan
CREATE OR REPLACE FUNCTION get_plan_id_from_price(price_id TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Direct match first
  RETURN (
    SELECT id FROM subscription_plans 
    WHERE stripe_price_id_monthly = price_id 
       OR stripe_price_id_yearly = price_id
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql;

-- Create a mapping table for trial prices to plans
CREATE TABLE IF NOT EXISTS trial_price_plan_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_price_id TEXT UNIQUE NOT NULL,
  plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert the trial price mappings
INSERT INTO trial_price_plan_mappings (trial_price_id, plan_id) VALUES
  ('price_1Rlhbf08qNQAUd0lbUZR3RwW', 'growth'),      -- X Basic $1 trial
  ('price_1Rlhbg08qNQAUd0lmrEzmJWe', 'professional') -- X Pro $1 trial
ON CONFLICT (trial_price_id) DO NOTHING;

-- Update the webhook handler function to check both regular and trial prices
CREATE OR REPLACE FUNCTION get_plan_from_any_price(price_id TEXT)
RETURNS TEXT AS $$
DECLARE
  v_plan_id TEXT;
BEGIN
  -- Check regular prices first
  SELECT id INTO v_plan_id
  FROM subscription_plans 
  WHERE stripe_price_id_monthly = price_id 
     OR stripe_price_id_yearly = price_id
  LIMIT 1;
  
  -- If not found, check trial prices
  IF v_plan_id IS NULL THEN
    SELECT plan_id INTO v_plan_id
    FROM trial_price_plan_mappings
    WHERE trial_price_id = price_id;
  END IF;
  
  RETURN v_plan_id;
END;
$$ LANGUAGE plpgsql;

-- Verify the mappings
SELECT 
  t.trial_price_id,
  t.plan_id,
  sp.name as plan_name,
  sp.stripe_price_id_monthly as regular_monthly_price
FROM trial_price_plan_mappings t
JOIN subscription_plans sp ON sp.id = t.plan_id;