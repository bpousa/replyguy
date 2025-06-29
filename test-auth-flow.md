# Testing Auth Flow - Signup to Stripe Checkout

## Overview
This document outlines how to test the complete authentication flow from signup through email verification to Stripe checkout.

## Test Steps

### 1. Clear All Data
- Clear browser cookies and localStorage
- Open browser DevTools Console to monitor logs

### 2. Start Signup Process
1. Navigate to `/auth/signup`
2. Enter a new email address
3. Select a paid plan (e.g., X Basic)
4. Click "Start Free Trial"

### 3. Email Verification
1. Check email for verification link
2. The link should look like:
   ```
   https://aaplsgskmoeyvvedjzxp.supabase.co/auth/v1/verify?token=pkce_[token]&type=signup&redirect_to=https://replyguy.appendment.com/auth/callback
   ```
3. Click the verification link

### 4. Expected Flow
1. Browser redirects to `/auth/callback`
2. Console should show:
   - `[auth-callback] Received callback:`
   - `[auth-callback] Handling PKCE token verification...`
   - Either session establishment or redirect to `/auth/loading`

3. If redirected to `/auth/loading`:
   - Should see "Completing sign in..." message
   - Console shows session check attempts
   - Eventually redirects to `/auth/checkout-redirect`

4. On `/auth/checkout-redirect`:
   - Should see "Email Verified!" message
   - Shows selected plan details
   - "Continue to Secure Checkout" button appears
   - Console shows session refresh attempts if needed

5. Click "Continue to Secure Checkout":
   - Should redirect to Stripe checkout page
   - No 401 errors should occur

### 5. Console Logs to Monitor

Key logs that indicate proper flow:
- `[auth-callback] Handling PKCE token verification...`
- `[auth-loading] Session established successfully`
- `[checkout-redirect] Session established after refresh`
- `[checkout-redirect] Checkout successful, redirecting to Stripe`

Error logs to watch for:
- `[checkout-redirect] No auth after all retries`
- `[auth-callback] No session created or found`
- `401 Unauthorized` errors

### 6. Common Issues and Solutions

**Issue**: Redirected to login with `error=session_required`
- **Cause**: Session not established in time
- **Solution**: The new retry logic should prevent this

**Issue**: "Failed to establish session" on login page
- **Cause**: Session verification failing
- **Solution**: The improved retry logic in login should handle this

**Issue**: 401 error when clicking checkout
- **Cause**: Session not properly passed to API
- **Solution**: The checkout page now retries with session refresh

## Debugging Tips

1. **Check Network Tab**:
   - Look for `/auth/v1/verify` request
   - Verify cookies are being set properly
   - Check for any 401 responses

2. **Monitor Console**:
   - Enable verbose logging in DevTools
   - Look for auth state changes
   - Check for session establishment logs

3. **Inspect Cookies**:
   - Look for `sb-[project-ref]-auth-token` cookies
   - Verify they're being set with proper attributes

## Test Variations

1. **Fast Click**: Click verification link immediately after receiving email
2. **Delayed Click**: Wait 30 seconds before clicking verification link
3. **Different Browsers**: Test in Chrome, Firefox, Safari
4. **Mobile**: Test on mobile devices

## Expected Success Criteria

- ✅ No redirect to login page after email verification
- ✅ Smooth transition from verification to checkout
- ✅ No 401 errors during the flow
- ✅ Stripe checkout page loads successfully
- ✅ User can complete payment and access dashboard