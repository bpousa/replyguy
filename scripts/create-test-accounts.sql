-- Create test accounts for each subscription level
-- Run this script with: supabase db push < scripts/create-test-accounts.sql

-- Function to create test user with subscription
CREATE OR REPLACE FUNCTION create_test_user_with_subscription(
  p_email TEXT,
  p_password TEXT,
  p_plan_id TEXT
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_plan RECORD;
  v_result JSONB;
BEGIN
  -- Get plan details
  SELECT * INTO v_plan FROM subscription_plans WHERE id = p_plan_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plan not found');
  END IF;

  -- Create auth user
  -- Note: This requires using Supabase Management API or Auth Admin API
  -- For now, we'll create the user record and you'll need to create auth accounts manually
  
  -- Generate a UUID for the user
  v_user_id := gen_random_uuid();
  
  -- Insert user record
  INSERT INTO users (id, email, created_at, updated_at)
  VALUES (v_user_id, p_email, NOW(), NOW())
  ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO v_user_id;
  
  -- Create active subscription
  INSERT INTO subscriptions (
    id,
    user_id,
    plan_id,
    status,
    stripe_customer_id,
    stripe_subscription_id,
    current_period_start,
    current_period_end,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    p_plan_id,
    'active',
    'cus_test_' || p_plan_id || '_' || substring(v_user_id::text, 1, 8),
    'sub_test_' || p_plan_id || '_' || substring(v_user_id::text, 1, 8),
    NOW(),
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW()
  );
  
  -- Initialize usage tracking
  INSERT INTO user_usage (user_id, reply_count, meme_count, suggestion_count)
  VALUES (v_user_id, 0, 0, 0);
  
  -- Initialize daily usage for today
  INSERT INTO daily_usage (user_id, date, replies_generated, memes_generated)
  VALUES (v_user_id, CURRENT_DATE, 0, 0);
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', p_email,
    'plan_id', p_plan_id,
    'plan_name', v_plan.name,
    'message', 'User created successfully. Please create auth account manually with email: ' || p_email || ' and password: ' || p_password
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create test users for each plan
DO $$
DECLARE
  v_result JSONB;
BEGIN
  -- Free plan test user
  v_result := create_test_user_with_subscription('test-free@replyguy.com', 'TestFree123!', 'free');
  RAISE NOTICE 'Free user: %', v_result;
  
  -- X Basic plan test user  
  v_result := create_test_user_with_subscription('test-basic@replyguy.com', 'TestBasic123!', 'basic');
  RAISE NOTICE 'Basic user: %', v_result;
  
  -- X Pro plan test user
  v_result := create_test_user_with_subscription('test-pro@replyguy.com', 'TestPro123!', 'pro');
  RAISE NOTICE 'Pro user: %', v_result;
  
  -- X Business plan test user
  v_result := create_test_user_with_subscription('test-business@replyguy.com', 'TestBusiness123!', 'business');
  RAISE NOTICE 'Business user: %', v_result;
END $$;

-- Clean up function
DROP FUNCTION IF EXISTS create_test_user_with_subscription(TEXT, TEXT, TEXT);

-- Show created test accounts
SELECT 
  u.email,
  sp.name as plan_name,
  sp.reply_limit,
  sp.meme_limit,
  sp.suggestion_limit,
  sp.enable_style_matching,
  sp.enable_write_like_me,
  s.status as subscription_status
FROM users u
JOIN subscriptions s ON s.user_id = u.id
JOIN subscription_plans sp ON sp.id = s.plan_id
WHERE u.email LIKE 'test-%@replyguy.com'
ORDER BY sp.sort_order;