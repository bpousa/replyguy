-- Create a mapping table for trial prices to plans
-- This is needed because trial prices are separate from regular prices in Stripe
CREATE TABLE IF NOT EXISTS public.trial_price_plan_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_price_id TEXT UNIQUE NOT NULL,
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.trial_price_plan_mappings ENABLE ROW LEVEL SECURITY;

-- Create policies (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view trial price mappings" ON public.trial_price_plan_mappings
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create update trigger
CREATE TRIGGER update_trial_price_plan_mappings_updated_at 
  BEFORE UPDATE ON public.trial_price_plan_mappings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Insert the trial price mappings
INSERT INTO public.trial_price_plan_mappings (trial_price_id, plan_id, description) VALUES
  ('price_1Rlhbf08qNQAUd0lbUZR3RwW', 'growth', 'X Basic $1 for 30 days trial'),
  ('price_1Rlhbg08qNQAUd0lmrEzmJWe', 'professional', 'X Pro $1 for 30 days trial')
ON CONFLICT (trial_price_id) DO UPDATE SET
  plan_id = EXCLUDED.plan_id,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Create index for faster lookups
CREATE INDEX idx_trial_price_plan_mappings_trial_price_id ON public.trial_price_plan_mappings(trial_price_id);

-- Add comment for documentation
COMMENT ON TABLE public.trial_price_plan_mappings IS 'Maps Stripe trial price IDs to subscription plan IDs';
COMMENT ON COLUMN public.trial_price_plan_mappings.trial_price_id IS 'The Stripe price ID for the trial (e.g., $1 for 30 days)';
COMMENT ON COLUMN public.trial_price_plan_mappings.plan_id IS 'The subscription plan this trial price is for';

-- Create a helper function to get plan ID from any price (regular or trial)
CREATE OR REPLACE FUNCTION public.get_plan_from_any_price(price_id TEXT)
RETURNS TEXT AS $$
DECLARE
  v_plan_id TEXT;
BEGIN
  -- Check regular prices first
  SELECT id INTO v_plan_id
  FROM public.subscription_plans 
  WHERE stripe_price_id_monthly = price_id 
     OR stripe_price_id_yearly = price_id
  LIMIT 1;
  
  -- If not found, check trial prices
  IF v_plan_id IS NULL THEN
    SELECT plan_id INTO v_plan_id
    FROM public.trial_price_plan_mappings
    WHERE trial_price_id = price_id;
  END IF;
  
  RETURN v_plan_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_plan_from_any_price TO authenticated;

-- Verify the mappings
SELECT 
  t.trial_price_id,
  t.plan_id,
  t.description,
  sp.name as plan_name,
  sp.stripe_price_id_monthly as regular_monthly_price
FROM public.trial_price_plan_mappings t
JOIN public.subscription_plans sp ON sp.id = t.plan_id;