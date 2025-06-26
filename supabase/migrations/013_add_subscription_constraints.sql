-- Add constraints to ensure data integrity for subscriptions
-- Prevents duplicate active subscriptions and ensures proper state management

-- First, let's add a computed column to track truly active subscriptions
-- (status in active/trialing AND not cancelled)
ALTER TABLE public.subscriptions 
ADD COLUMN is_active BOOLEAN GENERATED ALWAYS AS (
  status IN ('active', 'trialing') AND 
  (cancel_at_period_end = false OR cancel_at_period_end IS NULL)
) STORED;

-- Create unique index to ensure only one active subscription per user
-- This prevents race conditions from Stripe webhooks creating duplicates
CREATE UNIQUE INDEX idx_one_active_subscription_per_user 
ON public.subscriptions (user_id) 
WHERE is_active = true;

-- Add index for common queries
CREATE INDEX idx_subscriptions_user_status ON public.subscriptions(user_id, status);
CREATE INDEX idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id) 
WHERE stripe_subscription_id IS NOT NULL;

-- Add check constraint to ensure valid status values
ALTER TABLE public.subscriptions 
ADD CONSTRAINT chk_subscription_status 
CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired'));

-- Add check constraint to ensure period dates are logical
ALTER TABLE public.subscriptions 
ADD CONSTRAINT chk_subscription_periods 
CHECK (current_period_start <= current_period_end);

-- Create function to handle subscription state transitions
CREATE OR REPLACE FUNCTION public.handle_subscription_state_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When activating a new subscription, deactivate others for the same user
  IF NEW.is_active = true AND OLD.is_active IS DISTINCT FROM NEW.is_active THEN
    UPDATE public.subscriptions 
    SET status = 'canceled',
        updated_at = NOW()
    WHERE user_id = NEW.user_id 
      AND id != NEW.id 
      AND is_active = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce one active subscription rule
CREATE TRIGGER enforce_single_active_subscription
  BEFORE INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_subscription_state_change();

-- Add comments for documentation
COMMENT ON COLUMN public.subscriptions.is_active IS 'Computed column: true if subscription is active or trialing and not cancelled';
COMMENT ON INDEX idx_one_active_subscription_per_user IS 'Ensures only one active subscription per user to prevent billing conflicts';
COMMENT ON FUNCTION public.handle_subscription_state_change() IS 'Automatically deactivates other subscriptions when a new one becomes active';