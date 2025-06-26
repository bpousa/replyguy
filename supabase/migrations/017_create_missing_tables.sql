-- Create missing subscriptions table and fix the schema
-- This migration creates any missing tables that should have been in 007

-- 1. Create subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'trialing',
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all subscriptions" ON public.subscriptions
  FOR ALL
  USING (auth.role() = 'service_role');

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);

-- 5. Add updated_at trigger
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. Now add the is_active column
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN GENERATED ALWAYS AS (
  status IN ('active', 'trialing') AND 
  (cancel_at_period_end = false OR cancel_at_period_end IS NULL)
) STORED;

-- 7. Create the unique constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_one_active_subscription_per_user'
    ) THEN
        CREATE UNIQUE INDEX idx_one_active_subscription_per_user 
        ON public.subscriptions (user_id) 
        WHERE is_active = true;
    END IF;
END $$;

-- 8. Backfill subscriptions for existing users
INSERT INTO subscriptions (
  user_id,
  plan_id,
  status,
  current_period_start,
  current_period_end
)
SELECT 
  u.id,
  'free',
  'trialing',
  NOW(),
  NOW() + INTERVAL '30 days'
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions s WHERE s.user_id = u.id
)
ON CONFLICT DO NOTHING;

-- 9. Report status
DO $$
DECLARE
    v_total_users INTEGER;
    v_users_with_subs INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_users FROM users;
    SELECT COUNT(DISTINCT user_id) INTO v_users_with_subs FROM subscriptions;
    
    RAISE NOTICE 'Total Users: %', v_total_users;
    RAISE NOTICE 'Users with Subscriptions: %', v_users_with_subs;
END $$;