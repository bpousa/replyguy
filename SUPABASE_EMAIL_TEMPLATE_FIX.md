# Supabase Email Template Configuration Fix

## The Problem
Users are being redirected directly to `/dashboard` after email confirmation, bypassing the `/auth/callback` route. This causes the session to not be properly established.

## The Solution
Update your Supabase settings to use the correct redirect URLs.

### Steps to Fix:

1. **Go to Supabase Dashboard** → Authentication → URL Configuration

2. **Update these settings**:
   - **Site URL**: `https://replyguy.appendment.com`
   - **Redirect URLs** (add ALL of these):
     ```
     https://replyguy.appendment.com/auth/callback
     https://replyguy.appendment.com/auth/email-confirmed
     https://replyguy.appendment.com/dashboard
     ```

3. **IMPORTANT**: In the **Email Templates** section:
   
   - Site URL: `https://replyguy.appendment.com`
   - Redirect URLs (add these):
     ```
     https://replyguy.appendment.com/auth/callback
     https://replyguy.appendment.com/auth/verify
     https://replyguy.appendment.com/dashboard
     ```

4. **Make sure the email confirmation URL pattern is**:
   ```
   https://replyguy.appendment.com/auth/callback?token_hash={{token_hash}}&type=signup
   ```

## Why This Matters
- The `/auth/callback` route handles session establishment
- It waits for cookies to propagate
- It sets auth flow markers
- It properly redirects based on user plan

## Testing
After making these changes:
1. Create a new account
2. Check the email - the link should go to `/auth/callback`
3. Click the link - you should see callback logs in console
4. Should redirect to dashboard with an active session

## Alternative Quick Fix
If you can't change the email templates, you can update the Supabase client configuration to use a different redirect URL:

```typescript
// In your signup code
const { error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
    data: {
      full_name: fullName,
      selected_plan: selectedPlan,
      referral_code: referralCode
    }
  }
});
```