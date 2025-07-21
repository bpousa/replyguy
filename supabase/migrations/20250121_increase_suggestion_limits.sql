-- Migration: Increase AI suggestion limits across all plans
-- Date: 2025-01-21
-- Purpose: Give free users 5 AI suggestions and double limits for all paid plans

-- Update Free plan to include 5 AI suggestions
UPDATE subscription_plans SET 
  suggestion_limit = 5,
  features = jsonb_build_array(
    '10 replies per month',
    '5 AI suggestions',
    'Basic reply types',
    'Standard support',
    'Daily goal tracking'
  )
WHERE id = 'free';

-- Update X Basic (formerly Growth) plan to 100 AI suggestions
UPDATE subscription_plans SET 
  suggestion_limit = 100,
  features = jsonb_build_array(
    '300 replies per month',
    '10 memes per month',
    '100 AI suggestions',
    'All reply types',
    'Email support'
  )
WHERE id = 'growth';

-- Update X Pro (formerly Professional) plan to 200 AI suggestions
UPDATE subscription_plans SET 
  suggestion_limit = 200,
  features = jsonb_build_array(
    '500 replies per month',
    '50 memes per month',
    '200 AI suggestions',
    'Write Like Me™ AI training',
    'Style matching',
    'Medium-length replies',
    'Priority support'
  )
WHERE id = 'professional';

-- Update X Business (formerly Enterprise) plan to 400 AI suggestions
UPDATE subscription_plans SET 
  suggestion_limit = 400,
  features = jsonb_build_array(
    '1000 replies per month',
    '100 memes per month',
    '400 AI suggestions',
    'Write Like Me™ AI training',
    'Real-time fact checking',
    'Long-form replies (1000 chars)',
    'API access',
    'Dedicated support'
  )
WHERE id = 'enterprise';

-- Verify the updates
SELECT 
  id,
  name,
  suggestion_limit,
  features
FROM subscription_plans
WHERE active = true
ORDER BY sort_order;