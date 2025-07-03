# URGENT: Fix Email Confirmation Before Launch

## The Problem
Email confirmation links are being sent with the Supabase domain instead of your custom domain, causing authentication to fail.

## IMMEDIATE FIX REQUIRED (Do This First!)

### 1. Update Supabase Dashboard Settings
1. Go to: https://app.supabase.com/project/aaplsgskmoeyvvedjzxp/settings/auth
2. In the **Site URL** field, change from:
   - Current: `https://aaplsgskmoeyvvedjzxp.supabase.co` (or similar)
   - To: `https://replyguy.appendment.com`
3. In the **Redirect URLs** section, add:
   - `https://replyguy.appendment.com/**`
4. Save the changes

### 2. Manual Fix for Stuck User (antoni.mike+16@gmail.com)
Run this SQL in Supabase SQL editor:
```sql
-- Manually confirm the user
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'antoni.mike+16@gmail.com';
```

## Backup Solution (Already Implemented)
I've created a backup confirmation handler at `/auth/confirm` that can process tokens from either domain.

## Testing After Fix
1. Create a new test account
2. Check that the confirmation email contains links to `replyguy.appendment.com`
3. Click the link and verify it confirms successfully
4. Ensure you can log in after confirmation

## Why This Happened
When you moved from the Supabase domain to replyguy.appendment.com, the auth settings in Supabase dashboard weren't updated. The referral system changes were coincidental - this is purely a domain configuration issue.