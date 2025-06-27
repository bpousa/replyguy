# 🍪 Cookie Authentication Fix Test Guide

**Deployment Time**: June 27, 2025  
**Fix Deployed**: Cookie-based authentication implementation

## What Was Fixed

### Root Cause
- Authentication tokens were stored in **localStorage** only
- Server-side APIs expected **cookies** for authentication
- Result: Complete authentication failure (all APIs returned 401)

### Solution Implemented
1. **Updated Browser Client** - Now uses `@supabase/ssr` with cookie handlers
2. **Cookie Management** - Proper cookie setting/reading on client-side
3. **Migration Helper** - Helps transition from localStorage to cookies
4. **Debug Utilities** - Cookie debugging for troubleshooting

## Test Steps

### 1. Quick Cookie Check
Visit: https://replyguy.appendment.com/api/auth/debug

Expected result:
```json
{
  "cookies": {
    "authCookiesCount": 2-4,  // Should be > 0 after login
    "authCookies": [...]      // Should show sb- cookies
  }
}
```

### 2. Login Test
1. Go to: https://replyguy.appendment.com/auth/login
2. Login with test account:
   - Email: `test-pro@replyguy.com`
   - Password: `TestPro123!`
3. Open browser DevTools > Application > Cookies
4. **Verify**: You should see cookies starting with `sb-`

### 3. API Access Test
After login, check if APIs work:
```bash
# In browser console:
fetch('/api/user/plan').then(r => r.json()).then(console.log)
```

Expected: User plan data (not 401 error)

### 4. Session Persistence Test
1. After login, refresh the page (F5)
2. You should remain logged in
3. Navigate to dashboard
4. Generate a test reply
5. All should work without 401 errors

## Browser Console Checks

Look for these logs:
- `[auth] Browser cookie set: sb-*`
- `[auth-context] Valid session found`
- `[auth-migration] Cookies set successfully`

**NO** 401 errors should appear

## Test Accounts

| Email | Password | Tier |
|-------|----------|------|
| `test-free@replyguy.com` | `TestFree123!` | Free |
| `test-basic@replyguy.com` | `TestBasic123!` | X Basic |
| `test-pro@replyguy.com` | `TestPro123!` | X Pro |
| `test-business@replyguy.com` | `TestBusiness123!` | X Business |

## Expected Outcomes

✅ **Success Indicators**:
- Cookies visible in browser DevTools
- Login redirects to dashboard properly
- APIs return data (not 401)
- Sessions persist across refreshes
- Reply generation works

❌ **Failure Indicators**:
- No cookies after login
- Still getting 401 errors
- Session lost on refresh
- APIs reject requests

## Quick Troubleshooting

If authentication still fails:

1. **Clear Everything**:
   - Clear all cookies for the domain
   - Clear localStorage
   - Try incognito mode

2. **Check Debug Endpoint**:
   ```
   https://replyguy.appendment.com/api/auth/debug
   ```
   Should show auth cookies after login

3. **Verify Deployment**:
   Check if the latest commit is deployed by viewing page source
   and looking for the cookie handling code

## Migration Notes

The fix includes automatic migration:
- If auth data exists in localStorage, it will be preserved
- Cookies will be set alongside localStorage initially
- localStorage will be cleared once cookies are confirmed working

---

**Critical**: This fix addresses the core authentication issue. If cookies are now being set properly, the 401 errors should be completely resolved.