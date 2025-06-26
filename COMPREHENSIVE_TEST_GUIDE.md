# 🧪 Comprehensive Test Guide - ReplyGuy
*Last Updated: Thursday, June 26, 2025*

## 🚀 Latest Deployment
- **Production URL**: https://replyguy.appendment.com
- **Deployment Status**: ✅ Ready
- **Version**: Session fixes deployed

## 🔑 Test Accounts

### Primary Test Accounts
| Tier | Email | Password | Features | Limits |
|------|-------|----------|----------|--------|
| **Free** | `test-free@replyguy.com` | `TestFree123!` | Basic replies | 10 replies/month |
| **X Basic** | `test-basic@replyguy.com` | `TestBasic123!` | + Memes, Suggestions | 300 replies, 10 memes, 50 suggestions |
| **X Pro** | `test-pro@replyguy.com` | `TestPro123!` | + Style Matching, Write Like Me | 500 replies, 50 memes, 100 suggestions |
| **X Business** | `test-business@replyguy.com` | `TestBusiness123!` | All features | 1000 replies, 100 memes, 200 suggestions |

## 🧪 Test Scenarios

### 1. Authentication Flow (Session Fix Verification)
**Purpose**: Verify the session creation fixes are working

#### Test 1A: New User Signup
1. Open incognito browser
2. Navigate to https://replyguy.appendment.com
3. Click "Start Free Trial"
4. Sign up with email: `test-session-[timestamp]@mailinator.com`
5. **Expected**: 
   - Success message shown
   - Email sent
   - In dev mode: Auto-signin should work
6. Check email at mailinator.com
7. Click verification link
8. **Expected**: 
   - Redirected to dashboard (not login page)
   - No 401 errors
   - Session established

#### Test 1B: Session Debug Endpoint
1. While logged in, visit: https://replyguy.appendment.com/api/auth/session
2. **Expected JSON response**:
   ```json
   {
     "session": {
       "exists": true,
       "user": { "email": "..." }
     },
     "cookies": {
       "authCookies": [...]
     }
   }
   ```

#### Test 1C: Protected Routes
1. Navigate to https://replyguy.appendment.com/dashboard
2. **Expected**: Dashboard loads without redirect to login
3. Navigate to https://replyguy.appendment.com/billing
4. **Expected**: Billing page loads

### 2. Daily Goal & Usage Persistence
**Purpose**: Verify usage tracking persists across sessions

#### Test 2A: Reply Generation & Tracking
1. Login as `test-basic@replyguy.com` (Password: `TestBasic123!`)
2. Go to Dashboard
3. Note current usage count
4. Generate a reply:
   - Tweet: "Just launched my new AI startup!"
   - Response idea: "Congratulations on the launch"
   - Tone: Supportive
5. **Expected**:
   - Reply generates successfully
   - Console shows: `[process] ✅ Usage tracked successfully`
   - Usage count increases by 1
6. **Hard refresh** the page (Ctrl+F5)
7. **Expected**: Usage count persists

#### Test 2B: Meme Generation
1. Still logged in as test-basic
2. Generate a reply with "Include meme" checked
3. **Expected**:
   - Meme generates
   - Meme usage tracked
   - Console: `[meme] ✅ Usage tracked successfully`

#### Test 2C: Daily Goal Setting
1. Set a daily goal (e.g., 5 replies)
2. Generate replies to meet the goal
3. **Expected**:
   - Progress bar updates
   - Goal persists after refresh
   - Celebration when goal met

### 3. Member Level Features
**Purpose**: Verify each tier has correct features

#### Test 3A: Free Tier Limitations
1. Login as `test-free@replyguy.com`
2. Try to generate a reply with meme
3. **Expected**: "Upgrade to create memes" message
4. Check usage dashboard
5. **Expected**: 
   - Shows "Free Plan"
   - Meme limit: 0
   - No perplexity research

#### Test 3B: X Pro Features
1. Login as `test-pro@replyguy.com`
2. Generate a reply
3. **Expected features available**:
   - Style matching toggle
   - Write Like Me option
   - Real-time research (Perplexity)
   - Up to 500 replies/month

#### Test 3C: Plan Badge Display
1. Check header for each account
2. **Expected**: Plan badge shows:
   - Correct plan name (Free, X Basic, X Pro, X Business)
   - Renewal date for paid plans
   - "Payment Required" for past_due status

### 4. Billing & Subscription Management
**Purpose**: Verify billing features work correctly

#### Test 4A: Manage Billing Button
1. Login as `test-pro@replyguy.com`
2. Click "Manage Billing" in dashboard
3. **Expected**: 
   - Redirects to Stripe customer portal
   - Can update payment method
   - Can cancel subscription

#### Test 4B: Upgrade Flow
1. Login as `test-free@replyguy.com`
2. Click "Upgrade Plan"
3. Select X Basic
4. **Expected**:
   - Redirects to Stripe checkout
   - After payment, plan updates immediately
   - New limits apply

### 5. Error Handling & Edge Cases

#### Test 5A: Expired Session Recovery
1. Login to any account
2. Wait for session to expire (or manually delete cookies)
3. Try to access dashboard
4. **Expected**: 
   - Redirected to login
   - After login, return to intended page

#### Test 5B: Rate Limiting
1. Login as `test-free@replyguy.com`
2. Generate 10 replies (the limit)
3. Try to generate 11th reply
4. **Expected**: 
   - "Monthly reply limit reached" error
   - Upgrade prompt shown

## 📊 Database Verification Queries

Run these in Supabase SQL editor to verify data:

```sql
-- Check user accounts
SELECT email, subscription_tier, created_at 
FROM users 
WHERE email LIKE 'test-%@replyguy.com'
ORDER BY created_at DESC;

-- Check active subscriptions
SELECT u.email, s.status, s.billing_anchor_day, sp.name as plan
FROM subscriptions s
JOIN users u ON s.user_id = u.id
JOIN subscription_plans sp ON s.plan_id = sp.id
WHERE u.email LIKE 'test-%@replyguy.com';

-- Check today's usage
SELECT u.email, du.replies_today, du.memes_today, du.date
FROM daily_usage du
JOIN users u ON du.user_id = u.id
WHERE du.date = CURRENT_DATE
AND u.email LIKE 'test-%@replyguy.com';

-- Check billing period usage
SELECT u.email, bpu.replies_count, bpu.memes_count, bpu.period_start
FROM billing_period_usage bpu
JOIN users u ON bpu.user_id = u.id
WHERE u.email LIKE 'test-%@replyguy.com'
ORDER BY period_start DESC;
```

## 🐛 Common Issues & Solutions

### Issue: 401 Error on Checkout
**Solution**: Clear cookies and login again. Check /api/auth/session for debug info.

### Issue: Usage Not Persisting
**Solution**: Check console for tracking errors. Verify billing_anchor_day is set.

### Issue: Wrong Plan Features
**Solution**: Refresh plan context. Check PlanContext is wrapping the component.

## 📝 Console Logs to Monitor

### Success Patterns
```
[auth-callback] Session created successfully
[auth-context] Valid session found
[process] ✅ Usage tracked successfully
[dashboard] Current usage fetched
[user-plan] Usage fetched successfully
```

### Error Patterns
```
[auth] Failed to set cookie
[process] Failed to track usage
[auth-callback] Exchange error
[auth-context] Session expired
```

## 🚨 Critical Test: End-to-End Flow

1. **Sign up** → Verify email → **No 401** → Dashboard accessible
2. **Generate reply** → Refresh → **Usage persists**
3. **Set daily goal** → Meet goal → **Celebration shown**
4. **Upgrade plan** → Features unlock → **Billing works**

## 📱 Mobile Testing

1. Test on mobile browser
2. Verify responsive design
3. Check touch interactions
4. Test meme generation on mobile

## 🔍 Performance Checks

1. Page load times < 3 seconds
2. Reply generation < 5 seconds
3. No memory leaks after multiple generations
4. Smooth UI interactions

---

**Remember**: Always test in incognito/private mode to avoid cached sessions!