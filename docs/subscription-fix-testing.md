# Subscription System Fix - Testing Checklist

## Overview
This document provides a comprehensive testing checklist to verify that all subscription system fixes have been applied correctly.

## Pre-Testing Setup

1. **Apply all migrations**:
   ```bash
   bash scripts/apply-subscription-fixes.sh
   ```

2. **Verify database schema**:
   ```sql
   -- Check that subscription_plans table exists
   SELECT COUNT(*) FROM subscription_plans;
   
   -- Check that all plans are loaded
   SELECT id, name, reply_limit, meme_limit FROM subscription_plans WHERE active = true ORDER BY sort_order;
   
   -- Check user subscription view
   SELECT * FROM user_subscription_info LIMIT 5;
   ```

## Test Cases

### 1. New User Signup Flow ✅
- [ ] Create a new account via the signup page
- [ ] Verify user record is created in `users` table
- [ ] Verify free subscription is auto-assigned in `subscriptions` table
- [ ] Verify subscription status is 'trialing' with 30-day period
- [ ] Check dashboard shows "Free" plan with correct limits (10 replies)

### 2. Existing User Migration ✅
- [ ] Check that existing users have been assigned free subscriptions
- [ ] Verify no users are left without a subscription:
  ```sql
  SELECT COUNT(*) FROM users u 
  LEFT JOIN subscriptions s ON s.user_id = u.id 
  WHERE s.id IS NULL;
  -- Should return 0
  ```

### 3. Stripe Checkout Flow ✅
- [ ] Click "Upgrade" from pricing page
- [ ] Select "X Basic" plan ($19/month)
- [ ] Complete Stripe checkout (use test card: 4242 4242 4242 4242)
- [ ] Verify webhook creates/updates subscription record
- [ ] Check dashboard shows new plan immediately
- [ ] Verify limits are updated (300 replies, 10 memes)

### 4. Feature Gating ✅
- [ ] **Free user**: 
  - Can generate up to 10 replies
  - Cannot generate memes
  - Cannot use AI suggestions
  - Cannot use Write Like Me
- [ ] **X Basic user**:
  - Can generate up to 300 replies
  - Can generate up to 10 memes
  - Can use AI suggestions (50/month)
  - Cannot use Write Like Me
- [ ] **X Pro user**:
  - Can generate up to 500 replies
  - Can generate up to 50 memes
  - Unlimited AI suggestions
  - Can use Write Like Me feature

### 5. Usage Tracking ✅
- [ ] Generate a reply and verify:
  - `daily_usage` table is updated
  - `user_usage` table is updated
  - Reply count increases in dashboard
- [ ] Generate a meme (if plan allows) and verify counts update
- [ ] Check that usage resets at billing period

### 6. Billing Portal ✅
- [ ] Access billing portal from settings
- [ ] Verify current plan is shown correctly
- [ ] Test plan upgrade (Basic → Pro)
- [ ] Test plan downgrade (Pro → Basic)
- [ ] Test subscription cancellation
- [ ] Test subscription resumption

### 7. API Endpoints ✅
- [ ] `/api/check-limits` returns correct limits and usage
- [ ] `/api/process` respects plan limits
- [ ] `/api/stripe/webhook` handles all events correctly

### 8. Edge Cases ✅
- [ ] User with cancelled subscription can still use free tier
- [ ] Multiple subscription attempts create only one active subscription
- [ ] Plan changes take effect immediately
- [ ] Past due subscriptions show warning but allow free tier usage

## SQL Verification Queries

```sql
-- Check subscription distribution
SELECT 
  sp.name as plan_name,
  COUNT(DISTINCT s.user_id) as user_count,
  s.status
FROM subscriptions s
JOIN subscription_plans sp ON sp.id = s.plan_id
WHERE s.is_active = true
GROUP BY sp.name, s.status
ORDER BY sp.sort_order;

-- Find any users without subscriptions
SELECT u.email, u.created_at
FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.id AND s.is_active = true
WHERE s.id IS NULL;

-- Check recent signups got free plans
SELECT 
  u.email,
  u.created_at,
  s.plan_id,
  s.status,
  s.created_at as subscription_created
FROM users u
JOIN subscriptions s ON s.user_id = u.id
WHERE u.created_at > NOW() - INTERVAL '7 days'
ORDER BY u.created_at DESC;

-- Verify no duplicate active subscriptions
SELECT user_id, COUNT(*) as active_count
FROM subscriptions
WHERE is_active = true
GROUP BY user_id
HAVING COUNT(*) > 1;
-- Should return no rows
```

## Development Testing

For local development without Stripe:
1. Sign up for a new account
2. Manually assign dev_test plan:
   ```sql
   UPDATE subscriptions 
   SET plan_id = 'dev_test' 
   WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com');
   ```
3. Verify all features are enabled
4. Test that limits are effectively unlimited (9999)

## Post-Deployment Monitoring

1. **Monitor error logs** for:
   - Failed subscription queries
   - Webhook processing errors
   - Feature gating failures

2. **Track metrics**:
   - New user → free plan assignment rate (should be 100%)
   - Successful checkout → subscription creation rate
   - Feature usage by plan tier

3. **User feedback**:
   - Watch for reports of missing features
   - Monitor support tickets about billing issues
   - Check for confusion about plan limits

## Rollback Plan

If issues are discovered:
1. Keep the subscription_plans table (it's needed)
2. Revert code changes if necessary
3. The enhanced trigger is backward compatible
4. User data is preserved in all cases

## Success Criteria

- ✅ 100% of new signups get free subscriptions
- ✅ All existing users have subscriptions assigned
- ✅ No duplicate active subscriptions exist
- ✅ Feature gating works correctly for all plans
- ✅ Stripe webhooks update subscriptions properly
- ✅ Dashboard displays correct plan information
- ✅ Usage tracking functions accurately