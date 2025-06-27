# 🧪 Developer Testing Instructions - Post-Fix Verification

**Date**: June 27, 2025  
**Purpose**: Verify all API fixes and usage tracking are working correctly  
**Time Required**: ~30 minutes

## 📋 Pre-Test Setup

### 1. Clear Browser State
- Open Chrome/Firefox in **Incognito/Private** mode
- Or clear all cookies/localStorage for `replyguy.appendment.com`
- Open DevTools Console (F12) and keep it visible during testing

### 2. Test Accounts Available
| Email | Password | Plan | Daily Limit | Monthly Limit |
|-------|----------|------|-------------|---------------|
| `test-free@replyguy.com` | `TestFree123!` | Free | 10 | 5 |
| `test-basic@replyguy.com` | `TestBasic123!` | X Basic | 10 | 50 |
| `test-pro@replyguy.com` | `TestPro123!` | X Pro | 10 | 200 |
| `test-business@replyguy.com` | `TestBusiness123!` | X Business | 10 | 1000 |

## 🔍 Test Suite 1: Authentication & Basic Functionality

### Test 1.1: Login Flow
1. Navigate to https://replyguy.appendment.com
2. Click "Sign In"
3. Login with `test-pro@replyguy.com` / `TestPro123!`
4. **✅ PASS if**: Redirected to dashboard without errors
5. **❌ FAIL if**: 404 error, stuck on login, or console errors

### Test 1.2: Session Persistence
1. After login, refresh the page (F5)
2. **✅ PASS if**: Still logged in, dashboard loads
3. **❌ FAIL if**: Redirected to login or 401 errors

### Test 1.3: API Health Check
1. Open Network tab in DevTools
2. Refresh dashboard
3. Check these requests:
   - `/api/user/plan` → Should be 200 OK
   - `/api/user/usage` → Should be 200 OK
4. **✅ PASS if**: All return 200 status
5. **❌ FAIL if**: Any 401, 404, 500, or 406 errors

## 🔍 Test Suite 2: Usage Tracking Core Functionality

### Test 2.1: Initial State
1. On dashboard, locate the daily goal tracker
2. **✅ PASS if**: Shows "0 of 10 replies today" (or similar)
3. **❌ FAIL if**: Shows undefined, NaN, or errors

### Test 2.2: Reply Generation & Tracking
1. Fill in the reply form:
   - **Original Tweet**: "Just launched my new AI startup!"
   - **Your Response**: "Congratulations on the launch"
   - **Response Type**: Agree
   - **Tone**: Enthusiastic
2. Click "Generate Reply"
3. Wait for generation to complete
4. **✅ PASS if**: 
   - Reply generates successfully
   - Daily counter updates to "1 of 10 replies"
   - No console errors
5. **❌ FAIL if**:
   - "Classification failed" error
   - Counter stays at 0
   - Any 500 errors in console

### Test 2.3: Multiple Generations
1. Generate 2 more replies with different inputs
2. **✅ PASS if**: Counter increments each time (1→2→3)
3. **❌ FAIL if**: Counter stuck or resets

### Test 2.4: Persistence Check
1. After generating 3 replies, refresh the page
2. **✅ PASS if**: Counter still shows "3 of 10 replies"
3. **❌ FAIL if**: Counter resets to 0

## 🔍 Test Suite 3: Advanced Features

### Test 3.1: Settings & Daily Goal
1. Navigate to Settings page
2. Check current daily goal (should be 10)
3. Change to 20
4. Save settings
5. Return to dashboard
6. **✅ PASS if**: Now shows "X of 20 replies"
7. **❌ FAIL if**: Still shows old goal or errors

### Test 3.2: Monthly Usage Display
1. Check the usage dashboard section
2. **✅ PASS if**: Shows monthly usage (e.g., "7 of 200 replies this month")
3. **❌ FAIL if**: Shows undefined or errors

### Test 3.3: Plan Features
1. Check which features are enabled for the account
2. Try toggling advanced features (memes, research, etc.)
3. **✅ PASS if**: Features match the plan tier
4. **❌ FAIL if**: Features don't load or show errors

## 🔍 Test Suite 4: Limit Testing

### Test 4.1: Free Account Limits
1. Logout and login with `test-free@replyguy.com`
2. Check monthly limit display (should show X of 5)
3. Try to generate replies up to the limit
4. **✅ PASS if**: 
   - Can generate up to 5 replies
   - Get limit warning after 5th
   - Upgrade prompt appears
5. **❌ FAIL if**: Can exceed limit or errors occur

## 🔍 Test Suite 5: Error Recovery

### Test 5.1: Network Interruption
1. Generate a reply
2. While it's loading, go offline (F12 → Network → Offline)
3. **✅ PASS if**: Shows user-friendly error message
4. **❌ FAIL if**: Crashes or shows technical errors

### Test 5.2: Invalid Input
1. Try generating with empty fields
2. Try with extremely long text (>1000 chars)
3. **✅ PASS if**: Shows validation errors
4. **❌ FAIL if**: Sends request anyway or crashes

## 📊 Console Error Checklist

During ALL tests, watch for these in console:
- ❌ **MUST NOT SEE**:
  - `500 Internal Server Error`
  - `404 Not Found` (except for expected routes)
  - `406 Not Acceptable`
  - `Failed to fetch`
  - `Classification failed`
  - `track_daily_usage` errors
  
- ✅ **OK TO SEE**:
  - Info logs about auth state
  - Debug messages (if any)
  - Third-party analytics

## 📝 Test Report Template

Copy and fill this out:

```markdown
## ReplyGuy Test Report
**Date**: [DATE]
**Tester**: [NAME]
**Environment**: Production (replyguy.appendment.com)

### Test Results Summary
- [ ] Authentication: PASS/FAIL
- [ ] Usage Tracking: PASS/FAIL
- [ ] API Health: PASS/FAIL
- [ ] Limit Enforcement: PASS/FAIL
- [ ] Error Handling: PASS/FAIL

### Issues Found
1. [Describe any issues]

### Console Errors
[Paste any console errors]

### Screenshots
[Attach if relevant]

### Overall Status
- [ ] ✅ All tests passed - ready for production
- [ ] ⚠️ Minor issues - fix before heavy usage
- [ ] ❌ Major issues - needs immediate attention
```

## 🚀 Quick Smoke Test (5 minutes)

If short on time, just do this:
1. Login with `test-pro@replyguy.com`
2. Generate one reply
3. Check counter incremented
4. Refresh page
5. Check counter persisted
6. No console errors = ✅ PASS

## 🆘 If Tests Fail

1. **Take screenshots** of:
   - Console errors
   - Network tab showing failed requests
   - Current state of UI

2. **Note**:
   - Exact steps to reproduce
   - Which test account used
   - Time of test

3. **Check**:
   - Migration was applied: `SELECT proname FROM pg_proc WHERE proname = 'get_current_usage';`
   - Latest code deployed: Check Vercel dashboard

---

**Expected Result**: All tests should PASS. Usage tracking should work flawlessly with no API errors.