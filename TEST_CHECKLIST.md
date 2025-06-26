# 🔧 Authentication & Usage Persistence Test Checklist

## Summary of Fixes

### 1. Authentication Flow Fixes
- ✅ Auth callback now explicitly sets cookies before redirecting
- ✅ Created AuthContext for centralized session management  
- ✅ Updated checkout-redirect to use AuthContext instead of manual retries
- ✅ Implemented proper auth middleware for API routes
- ✅ Fixed cookie options with proper httpOnly, secure, sameSite settings

### 2. Usage Persistence Fixes
- ✅ Added .throwOnError() to all track_daily_usage calls
- ✅ Updated Stripe webhook to set billing_anchor_day on subscription creation
- ✅ Added error handling to all get_current_usage calls

## Manual Test Checklist

### 1. Authentication Flow Test
```
1. [ ] Clear all cookies/local storage
2. [ ] Sign up with new email
3. [ ] Check email and click verification link
4. [ ] Should redirect to /auth/checkout-redirect with plan
5. [ ] Click "Continue to Secure Checkout"
6. [ ] Check Network tab - /api/stripe/checkout should return 302/303 (NOT 401)
7. [ ] Should redirect to Stripe checkout page successfully
```

**Expected Logs:**
- `[auth-callback] Code exchanged successfully for user: {email}`
- `[auth-callback] Redirecting to: /auth/checkout-redirect?plan={planId}`
- `[checkout-redirect] Starting checkout for plan: {planId}`
- `[checkout-redirect] Checkout successful, redirecting to Stripe`

### 2. Usage Persistence Test
```
1. [ ] Sign in as user with active subscription
2. [ ] Go to dashboard
3. [ ] Generate a reply
4. [ ] Check console for: "[process] ✅ Usage tracked successfully"
5. [ ] Refresh page
6. [ ] Usage count should persist (not reset to 0)
7. [ ] Check database: SELECT * FROM daily_usage WHERE user_id = '{userId}' ORDER BY date DESC LIMIT 5;
```

**Expected Logs:**
- `[process] ✅ Usage tracked successfully for user: {userId}`
- `[dashboard] Current usage fetched: {total_replies: X}`

### 3. Billing Period Test
```
1. [ ] Complete a Stripe checkout
2. [ ] Check database: SELECT billing_anchor_day FROM subscriptions WHERE user_id = '{userId}';
3. [ ] Should show a number 1-31 (day of month)
4. [ ] Generate replies until hitting limit
5. [ ] Usage should reset on billing anchor day (not calendar month)
```

### 4. Error Resilience Test
```
1. [ ] Generate a reply as authenticated user
2. [ ] Even if usage tracking fails, reply should still generate
3. [ ] Check console for any error logs
4. [ ] All errors should have descriptive messages with context
```

## Network Tab Checklist

### Auth Flow
- [ ] `/auth/callback` - Should see sb-* cookies being set
- [ ] `/api/stripe/checkout` - Request should include Cookie header with sb-* tokens
- [ ] No 401 errors during checkout flow

### Usage Tracking
- [ ] `/api/process` - Should complete successfully even if usage tracking fails
- [ ] Response should include generated reply

## Database Verification Queries

```sql
-- Check if user exists
SELECT id, email, billing_anchor_day, created_at 
FROM users 
WHERE email = 'test@example.com';

-- Check subscription details
SELECT s.*, sp.name as plan_name
FROM subscriptions s
JOIN subscription_plans sp ON s.plan_id = sp.id
WHERE s.user_id = '{userId}';

-- Check daily usage
SELECT * 
FROM daily_usage 
WHERE user_id = '{userId}' 
ORDER BY date DESC 
LIMIT 5;

-- Check billing period usage
SELECT * 
FROM billing_period_usage 
WHERE user_id = '{userId}'
ORDER BY period_start DESC
LIMIT 1;

-- Verify billing anchor day is set
SELECT user_id, billing_anchor_day, current_period_start, current_period_end
FROM subscriptions
WHERE billing_anchor_day IS NOT NULL;
```

## Console Log Patterns to Verify

### Success Patterns
- `[auth-callback] Code exchanged successfully`
- `[auth-context] Initial session found`
- `[checkout-redirect] Checkout successful`
- `[process] ✅ Usage tracked successfully`
- `[user-plan] Usage fetched successfully`

### Error Patterns (Should be descriptive)
- `[auth] Failed to set cookie: {cookieName} {error}`
- `[process] Failed to track usage: {detailed error object}`
- `[dashboard] Failed to fetch current usage: {detailed error object}`

## Vercel Deployment Check

```bash
# Check deployment logs
vercel logs --output raw

# Look for:
# - No TypeScript errors
# - Successful build
# - All API routes registered
```

## Final Verification

1. [ ] Auth flow works without 401 errors
2. [ ] Usage persists across page refreshes
3. [ ] Billing anchor day is set correctly
4. [ ] All errors are logged with context
5. [ ] Application remains functional even if tracking fails

## Known Issues Fixed

1. **401 on checkout**: Fixed by explicit cookie forwarding and session verification
2. **Usage not persisting**: Fixed by adding error handling and billing_anchor_day
3. **Silent failures**: Fixed by adding .throwOnError() and comprehensive logging
4. **Race conditions**: Fixed by using AuthContext with onAuthStateChange