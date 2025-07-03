# Signup Error Fix Summary

## Problem
Users were getting a 500 error when trying to sign up with the message:
```
AuthApiError: Database error saving new user
```

## Root Cause
The `handle_new_user()` trigger function was referencing a non-existent `subscription_tier` column on the `users` table. The system actually uses a separate `subscriptions` table with a `plan_id` column to track user subscription tiers.

## Solution
Created migration file: `supabase/migrations/20250703_fix_signup_error.sql`

### Key Changes:
1. **Fixed handle_new_user function**:
   - Removed reference to non-existent `subscription_tier` column
   - Added proper error handling with EXCEPTION block
   - Ensured all required columns are inserted with proper defaults

2. **Fixed complete_referral function**:
   - Changed to look up subscription tier from `subscriptions` table instead of `users` table
   - Added proper fallback to 'free' tier if no active subscription found

3. **Fixed get_user_limits function**:
   - Updated to get subscription tier from `subscriptions` table
   - Properly handles referral bonuses for all users

4. **Added column checks**:
   - Ensures `referred_by` and `referral_code` columns exist on users table
   - Creates necessary indexes

## Testing
1. **Run the migration**:
   ```bash
   # Local testing
   psql $DATABASE_URL < supabase/migrations/20250703_fix_signup_error.sql
   
   # Or through Supabase CLI
   su mike -c "supabase db push"
   ```

2. **Test signup flow**:
   ```bash
   # Run the test script
   npm install @supabase/supabase-js  # if not already installed
   node scripts/test-signup-fix.js
   ```

3. **Manual testing**:
   - Try signing up a new user through the UI
   - Test with and without referral codes
   - Verify user profile and subscription are created

## Verification Steps
1. Check that new users can sign up without errors
2. Verify user profile is created in `users` table
3. Verify free subscription is created in `subscriptions` table
4. Test referral system still works correctly
5. Confirm existing users are not affected

## Rollback Plan
If issues arise, you can rollback by:
1. Restoring the previous version of the functions from the referral system migration
2. The changes are backward compatible, so no data migration is needed

## Future Considerations
- Consider adding a `subscription_tier` computed column or view to simplify queries
- Add better error logging in trigger functions
- Consider moving subscription logic to application layer for better error handling