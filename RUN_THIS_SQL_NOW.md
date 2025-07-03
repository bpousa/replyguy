# 🚨 EMERGENCY SQL FIX - RUN THIS NOW!

The email confirmation is failing because database triggers are throwing errors during the confirmation process. When triggers fail, Supabase rejects the entire operation.

## Run this SQL immediately in Supabase:

1. Go to: https://app.supabase.com/project/aaplsgskmoeyvvedjzxp/sql/new
2. Copy and paste the contents of: `/scripts/fix-email-confirmation-emergency.sql`
3. Click "Run"

## What this fix does:

1. **Removes failing triggers** that are blocking email confirmation
2. **Creates minimal, fail-safe functions** that won't block signup
3. **Fixes the stuck user** (antoni.mike+16@gmail.com)
4. **Tests the fix** to ensure it works

## The core issue:

The referral system functions are referencing columns that don't exist (`subscription_tier`) and failing during user creation. When these triggers fail, Supabase returns "Error confirming user".

This emergency fix simplifies the signup flow to ensure it always succeeds. You can restore the full referral functionality later once users can sign up.

## After running the SQL:

1. The stuck user should be able to log in
2. New users should be able to sign up and confirm emails
3. Test by creating a new account

This is a critical fix that must be applied before launch!