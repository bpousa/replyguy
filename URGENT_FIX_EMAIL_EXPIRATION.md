# URGENT: Fix Email Link Expiration

## The Problem
Email confirmation links are expiring too quickly (possibly set to a very short time like 1 hour or less).

## Immediate Fix Required

### 1. Go to Supabase Dashboard
1. Go to: https://app.supabase.com/project/aaplsgskmoeyvvedjzxp/settings/auth
2. Scroll down to **Email Templates** section
3. Look for **Email OTP Expiry** setting

### 2. Increase the Expiration Time
- Change from current setting to: **86400** seconds (24 hours)
- Or at minimum: **3600** seconds (1 hour)

### 3. Alternative: Use Magic Link Instead
If OTP tokens keep expiring, you can switch to magic links:

In your email template for "Confirm signup", use:
```
{{ .ConfirmationURL }}
```

Instead of:
```
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup
```

### 4. Test with a Fresh Account
After making these changes:
1. Create a new test account
2. Check that the confirmation email arrives
3. Click the link within a reasonable time
4. Confirm it works

## Why This Happened
The PKCE flow tokens have a shorter expiration by default. When combined with any delay in email delivery or user action, they expire before the user clicks them.