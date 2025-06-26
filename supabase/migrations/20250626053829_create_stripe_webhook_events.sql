-- Create table to track processed Stripe webhook events for idempotency
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id SERIAL PRIMARY KEY,
  stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  payload JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'processed',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient lookups
CREATE INDEX idx_stripe_webhook_events_stripe_event_id ON stripe_webhook_events(stripe_event_id);
CREATE INDEX idx_stripe_webhook_events_event_type ON stripe_webhook_events(event_type);
CREATE INDEX idx_stripe_webhook_events_created_at ON stripe_webhook_events(created_at);
CREATE INDEX idx_stripe_webhook_events_status ON stripe_webhook_events(status);

-- Add comment
COMMENT ON TABLE stripe_webhook_events IS 'Tracks processed Stripe webhook events to ensure idempotency';

-- Create table for subscription state tracking
CREATE TABLE IF NOT EXISTS subscription_state_log (
  id SERIAL PRIMARY KEY,
  subscription_id UUID REFERENCES subscriptions(id),
  stripe_subscription_id VARCHAR(255),
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  old_plan_id VARCHAR(50),
  new_plan_id VARCHAR(50),
  metadata JSONB,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by VARCHAR(50) DEFAULT 'webhook'
);

-- Index for subscription lookups
CREATE INDEX idx_subscription_state_log_subscription_id ON subscription_state_log(subscription_id);
CREATE INDEX idx_subscription_state_log_changed_at ON subscription_state_log(changed_at);

-- Add billing period columns to subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS billing_anchor_day INTEGER,
ADD COLUMN IF NOT EXISTS trialing_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_retry_count INTEGER DEFAULT 0;

-- Add comment on new columns
COMMENT ON COLUMN subscriptions.billing_anchor_day IS 'Day of month when billing cycle resets (1-31)';
COMMENT ON COLUMN subscriptions.trialing_until IS 'End of trial period if applicable';
COMMENT ON COLUMN subscriptions.payment_failed_at IS 'Timestamp of last payment failure';
COMMENT ON COLUMN subscriptions.payment_retry_count IS 'Number of payment retry attempts';

-- Create function to clean up old webhook events (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS void AS $$
BEGIN
  DELETE FROM stripe_webhook_events 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT ON stripe_webhook_events TO authenticated;
GRANT SELECT ON subscription_state_log TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_webhook_events() TO service_role;