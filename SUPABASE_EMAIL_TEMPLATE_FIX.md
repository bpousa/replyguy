# Supabase Email Template Configuration Fix

## The Problem
Users are being redirected directly to `/dashboard` after email confirmation, bypassing the `/auth/callback` route. This causes the session to not be properly established.

## The Solution
Update your Supabase email templates to redirect to the callback route.

### Steps to Fix:

1. **Go to Supabase Dashboard** → Authentication → Email Templates

2. **Update the Confirm Signup template**:
   
   Change from:
   ```html
   <a href="{{ .ConfirmationURL }}">Confirm your email</a>
   ```
   
   To:
   ```html
   <a href="{{ .SiteURL }}/auth/callback?token={{ .Token }}&type=signup&redirect_to={{ .SiteURL }}/dashboard">Confirm your email</a>
   ```

3. **OR if using the default template**, update the **Redirect URL** in Authentication → URL Configuration:
   
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