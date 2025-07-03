# Email Confirmation Trigger Fix - Root Cause Documentation

## The Problem
Email confirmation was completely broken - users would click the confirmation link but wouldn't get logged in. They'd be redirected back to the signup page with no session established.

## Root Cause
The database trigger `on_auth_user_created` was only set to fire on INSERT operations, but **email confirmation is an UPDATE operation**.

### What Happens During Email Confirmation:
1. User signs up → Creates new row in `auth.users` (INSERT) ✓
2. User clicks confirmation link → Supabase updates existing row to set `email_confirmed_at` (UPDATE) ✗
3. Our trigger didn't fire on UPDATE, so:
   - User never got created in `public.users`
   - No subscription was created
   - No session could be established

## The Fix
Changed the trigger to fire on both INSERT and UPDATE operations:

```sql
-- OLD (BROKEN):
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- NEW (FIXED):
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

Also updated the `handle_new_user` function to intelligently handle both cases:
- On INSERT: Create user normally
- On UPDATE: Only process if it's an email confirmation (email_confirmed_at changed from NULL to a timestamp)

## When This Broke
This broke when we added the referral system and modified the database triggers. The original triggers may have been set up correctly, but our changes inadvertently removed the UPDATE event handling.

## How to Apply This Fix
If email confirmation breaks again, run:
```sql
/scripts/fix-email-confirmation-trigger.sql
```

## How to Verify
Check if your trigger handles both INSERT and UPDATE:
```sql
SELECT tgname, 
       CASE 
           WHEN tgtype::int & 4 = 4 AND tgtype::int & 16 = 16 THEN 'INSERT OR UPDATE'
           WHEN tgtype::int & 4 = 4 THEN 'INSERT ONLY'
           WHEN tgtype::int & 16 = 16 THEN 'UPDATE ONLY'
           ELSE 'OTHER'
       END as trigger_events
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';
```

Should return: `INSERT OR UPDATE`

## Prevention
Whenever modifying auth-related database triggers:
1. Remember that email confirmation is an UPDATE operation
2. Always include both INSERT and UPDATE in auth.users triggers
3. Test the full signup + email confirmation flow after any trigger changes

## Related Files
- `/scripts/fix-email-confirmation-trigger.sql` - The fix script
- `/scripts/trace-email-confirmation.sql` - Debugging script with logging
- `/app/auth/callback/route.ts` - Handles the redirect after confirmation
- `/app/auth/verify/page.tsx` - Client-side verification handler

## Key Learning
Supabase auth operations:
- Signup = INSERT into auth.users
- Email confirmation = UPDATE auth.users SET email_confirmed_at
- Password reset = UPDATE auth.users
- Email change = UPDATE auth.users

**Always use `INSERT OR UPDATE` for auth.users triggers!**