#!/bin/bash

# Script to apply all subscription-related database fixes
# Run this with: bash scripts/apply-subscription-fixes.sh

echo "=== Applying Subscription System Fixes ==="
echo "This script will apply all necessary database migrations to fix the subscription system"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Error: Supabase CLI is not installed"
    echo "Please install it from: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Prompt for confirmation
read -p "This will modify your database. Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted"
    exit 1
fi

# Set the user for migrations (as requested)
export SUPABASE_DB_USER="mike"

echo ""
echo "Step 1: Creating missing subscription_plans table..."
supabase db push --file supabase/migrations/002_subscription_plans.sql

echo ""
echo "Step 2: Enhancing new user trigger to auto-assign free plan..."
supabase db push --file supabase/migrations/012_enhance_new_user_trigger.sql

echo ""
echo "Step 3: Adding subscription constraints..."
supabase db push --file supabase/migrations/013_add_subscription_constraints.sql

echo ""
echo "Step 4: Fixing incorrect update statements..."
supabase db push --file supabase/migrations/014_fix_incorrect_update_statement.sql

echo ""
echo "Step 5: Backfilling existing users with subscriptions..."
supabase db push --file supabase/migrations/015_backfill_user_subscriptions.sql

echo ""
echo "=== All migrations applied successfully! ==="
echo ""
echo "Next steps:"
echo "1. Test signup flow: New users should automatically get a free subscription"
echo "2. Test Stripe checkout: Purchasing a plan should update the subscription"
echo "3. Test feature gating: Plan limits should be enforced correctly"
echo "4. Check dashboard: User's plan should display correctly"
echo ""
echo "To manually test the subscription system:"
echo "- Check a user's subscription: SELECT * FROM user_subscription_info WHERE email = 'user@example.com';"
echo "- Upgrade a user manually: Run scripts/upgrade-user-to-pro.sql"
echo "- Check plan details: SELECT * FROM subscription_plans WHERE active = true ORDER BY sort_order;"