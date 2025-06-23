-- Add active column to subscription_plans if it doesn't exist
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Update existing plans to be active
UPDATE subscription_plans SET active = true WHERE active IS NULL;