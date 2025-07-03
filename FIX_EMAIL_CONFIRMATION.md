# Fix Email Confirmation Issue

## Problem
Email confirmation links are using Supabase domain (`https://aaplsgskmoeyvvedjzxp.supabase.co`) instead of your app domain (`https://replyguy.appendment.com`), causing authentication to fail.

## Root Cause
The Supabase project's `site_url` configuration is not set to your custom domain. This needs to be updated in the Supabase dashboard.

## Solution Steps

### 1. Update Supabase Dashboard Settings

1. Go to https://app.supabase.com/project/aaplsgskmoeyvvedjzxp/settings/auth
2. Under "Site URL", change from:
   - Current: `https://aaplsgskmoeyvvedjzxp.supabase.co` (or similar)
   - To: `https://replyguy.appendment.com`
3. Under "Redirect URLs", make sure these are whitelisted:
   - `https://replyguy.appendment.com/**`
   - `https://replyguy.appendment.com/auth/callback`
   - `https://replyguy.appendment.com/auth/verify`
4. Save the changes

### 2. Update Email Templates (if custom templates are used)

In the Supabase dashboard:
1. Go to Authentication → Email Templates
2. For the "Confirm signup" template, ensure the confirmation URL uses:
   ```
   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
   ```
   NOT a hardcoded Supabase URL

### 3. Temporary Workaround (if needed immediately)

If you need to test immediately before the dashboard changes propagate, you can manually construct the correct URL:

1. When you receive a confirmation email with the wrong domain
2. Copy the token from the URL (everything after `token_hash=`)
3. Navigate to: `https://replyguy.appendment.com/auth/confirm?token_hash=YOUR_TOKEN&type=email`

### 4. Check Database Trigger (optional)

The `handle_new_user()` trigger might be causing issues. To debug:

```sql
-- Check if the trigger is failing
SELECT * FROM auth.users 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Check if users are being created in public.users
SELECT * FROM public.users 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Check for referral errors
SELECT * FROM referrals 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### 5. Environment Variable Check

Ensure your production environment has:
```env
NEXT_PUBLIC_APP_URL=https://replyguy.appendment.com
```

### Prevention

1. Always configure Supabase `site_url` when setting up custom domains
2. Test email flows after domain changes
3. Monitor auth logs in Supabase dashboard for confirmation failures

## Testing After Fix

1. Create a new test account
2. Check the confirmation email - it should now show `https://replyguy.appendment.com/...`
3. Click the link and verify it redirects correctly
4. Confirm you can log in after email verification

## Additional Notes

- Email confirmation links are generated server-side by Supabase
- The `emailRedirectTo` parameter in the signup only affects post-confirmation redirect, not the confirmation link itself
- Cookie domain issues are separate and already handled in your auth configuration