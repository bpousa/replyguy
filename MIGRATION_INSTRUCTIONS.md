# Usage Tracking Migration Instructions

## Overview
This migration fixes the usage tracking system to align with Stripe billing cycles instead of resetting on the 1st of each month for all users.

## Database Migration Required

### Option 1: Using Supabase SQL Editor (Recommended)
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. **IMPORTANT**: Make sure you're logged in as user `mike` (check the user dropdown in the SQL editor)
4. Copy and paste the contents of `/scripts/apply-billing-period-fix.sql`
5. Run the query

### Option 2: Using Supabase CLI
If you have proper database credentials:
```bash
# Apply the migration
npx supabase db push --db-url "YOUR_DATABASE_URL"
```

### Option 3: Manual Application
The migration file is located at:
- `/supabase/migrations/20250101_fix_billing_period_function.sql`

## What This Fixes

### Before
- All users' usage reset on the 1st of each month
- This didn't align with Stripe billing cycles
- Users who subscribed mid-month would see confusing usage resets

### After  
- **Free users**: Usage continues to reset on the 1st of each month
- **Paid users**: Usage resets on their billing anniversary
  - Example: User subscribes on the 15th → usage resets on the 15th of each month
  - Works for both monthly and annual subscriptions

## Fix Existing Data

After applying the migration, run the script to fix existing subscriptions:

```bash
node scripts/fix-billing-anchor-days.js
```

This script will:
1. Find all active subscriptions missing `billing_anchor_day`
2. Fetch the correct date from Stripe
3. Update the database
4. Log the results

## Testing

To verify the fix is working:

1. Check a paid user's billing period:
```sql
SELECT * FROM get_user_billing_period('USER_ID_HERE');
```

2. Check their current usage:
```sql
SELECT * FROM get_current_usage('USER_ID_HERE');
```

3. For the test-business@replyguy.com user specifically:
```sql
-- Get user ID
SELECT id FROM users WHERE email = 'test-business@replyguy.com';

-- Check their subscription
SELECT * FROM subscriptions 
WHERE user_id = 'USER_ID_FROM_ABOVE' 
AND status IN ('active', 'trialing');

-- Check their current usage
SELECT * FROM get_current_usage('USER_ID_FROM_ABOVE');
```

## Edge Cases Handled

1. **Billing on the 31st**: If a user's billing date is the 31st, but the month only has 30 days (or 28/29 for February), the system uses the last day of that month
2. **No subscription**: Falls back to calendar month (1st) 
3. **Missing billing_anchor_day**: Defaults to 1st until the fix script is run

## Monitoring

After deployment, monitor:
- New subscriptions should automatically have `billing_anchor_day` set
- Usage should reset on the correct day for each user
- The `/api/user/plan` endpoint should show correct usage counts