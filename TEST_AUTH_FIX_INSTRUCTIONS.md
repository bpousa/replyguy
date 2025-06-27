# ReplyGuy Authentication Fix - Test Instructions

**Date**: June 27, 2025  
**Purpose**: Verify that authentication issues with /api/process have been resolved

## What Was Fixed
1. Added `credentials: 'include'` to the fetch request for /api/process
2. Updated middleware to properly detect Supabase auth cookies
3. Added debug logging to help diagnose auth issues

## Test Prerequisites
- Clear browser cache and cookies completely
- Use Chrome with Developer Tools open (Console tab)
- Test URL: https://replyguy.appendment.com

## Test Steps

### Test 1: Fresh Login and Reply Generation
1. **Clear all cookies** for replyguy.appendment.com
2. Navigate to https://replyguy.appendment.com
3. You should be redirected to login page
4. Log in with test account
5. After successful login, you should see the dashboard
6. **Check Console** for middleware logs showing cookie detection

### Test 2: Generate Reply (Main Test)
1. On the dashboard, fill in the reply form:
   - Original Tweet: "Just discovered that coffee at 3pm might not be the best idea for sleep"
   - Your Response: "I learned this the hard way last week"
   - Response Type: Agree
   - Tone: Casual
   - Research: No
   - Include Meme: No

2. **Before clicking Generate**, open Network tab in DevTools
3. Click "Generate Reply"
4. **In Network tab**, find the `/api/process` request
5. Click on it and check:
   - Status should be 200 OK (not 401 or 500)
   - In Request Headers, look for `Cookie` header
   - Should contain `sb-aaplsgskmoeyvvedjzxp-auth-token`

### Test 3: Verify Usage Tracking
1. Note the daily counter value before generation
2. After successful reply generation:
   - Counter should increment by 1
   - Generated reply should appear
3. Refresh the page
4. Counter should persist at the new value

### Test 4: Console Logs Check
In the browser console, you should see:
- `[middleware] Found auth cookie: sb-aaplsgskmoeyvvedjzxp-auth-token`
- No authentication errors
- Successful usage tracking logs

## Expected Results

✅ **PASS if**:
- /api/process returns 200 OK
- Reply generates successfully
- Daily counter increments
- Auth cookies are properly sent

❌ **FAIL if**:
- /api/process returns 401 (Unauthorized)
- /api/process returns 500 (Server Error)
- Counter doesn't increment
- "Unauthenticated" error appears

## Test Report Template

```markdown
## Authentication Fix Test Report
**Date**: [Current Date]
**Tester**: [Name]

### Test Results
- [ ] Login successful
- [ ] Cookies properly set
- [ ] /api/process returns 200 OK
- [ ] Reply generated successfully
- [ ] Usage counter incremented
- [ ] No authentication errors

### Network Details
- /api/process status: ___
- Cookie header present: Yes/No
- Auth token in cookie: Yes/No

### Console Logs
[Paste any relevant console logs]

### Issues Found
[List any issues]

### Overall Status
- [ ] All tests passed
- [ ] Some issues remain
```

## Important Notes

1. **Hard refresh** (Ctrl+Shift+R) between tests to ensure fresh state
2. **Check cookies** in DevTools > Application > Cookies
3. Look for cookie named `sb-aaplsgskmoeyvvedjzxp-auth-token`
4. If auth fails, check if cookie exists and isn't expired

## Debugging Tips

If authentication still fails:
1. Check Application > Cookies in DevTools
2. Look for all cookies starting with `sb-`
3. Note their names and values
4. Check if they're httpOnly and secure
5. Verify they're not expired

The key cookie should be named:
`sb-aaplsgskmoeyvvedjzxp-auth-token`