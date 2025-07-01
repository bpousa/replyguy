#!/usr/bin/env node

/**
 * Script to apply the billing period migration directly to Supabase
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service key for admin access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const migrationSQL = `
-- Create the missing get_user_billing_period function
-- This function calculates the current billing period for a user based on their subscription

CREATE OR REPLACE FUNCTION get_user_billing_period(p_user_id UUID)
RETURNS TABLE(period_start DATE, period_end DATE)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_billing_anchor_day INTEGER;
    v_current_date DATE;
    v_period_start DATE;
    v_period_end DATE;
BEGIN
    -- Get the current date
    v_current_date := CURRENT_DATE;
    
    -- Get the billing anchor day from the user's active subscription
    SELECT s.billing_anchor_day INTO v_billing_anchor_day
    FROM subscriptions s
    WHERE s.user_id = p_user_id
    AND s.status IN ('active', 'trialing')
    ORDER BY s.created_at DESC
    LIMIT 1;
    
    -- If no billing anchor day found, default to 1st of month
    IF v_billing_anchor_day IS NULL THEN
        v_billing_anchor_day := 1;
    END IF;
    
    -- Calculate the billing period start date
    -- If current day >= billing anchor day, we're in the current month's period
    -- If current day < billing anchor day, we're still in the previous month's period
    IF EXTRACT(DAY FROM v_current_date)::INTEGER >= v_billing_anchor_day THEN
        -- Current month's period
        v_period_start := DATE_TRUNC('month', v_current_date) + (v_billing_anchor_day - 1) * INTERVAL '1 day';
    ELSE
        -- Previous month's period
        v_period_start := DATE_TRUNC('month', v_current_date - INTERVAL '1 month') + (v_billing_anchor_day - 1) * INTERVAL '1 day';
    END IF;
    
    -- Handle edge case for billing anchor days > 28
    -- If the billing anchor day doesn't exist in a month (e.g., 31st in February), 
    -- use the last day of that month
    IF v_billing_anchor_day > 28 THEN
        -- Check if the calculated start date is valid
        IF EXTRACT(DAY FROM v_period_start)::INTEGER != v_billing_anchor_day THEN
            -- Use the last day of the month instead
            v_period_start := DATE_TRUNC('month', v_period_start) + INTERVAL '1 month' - INTERVAL '1 day';
        END IF;
    END IF;
    
    -- Calculate the period end date (day before next period starts)
    v_period_end := v_period_start + INTERVAL '1 month' - INTERVAL '1 day';
    
    -- Handle edge case for period end as well
    IF v_billing_anchor_day > 28 THEN
        -- Ensure end date doesn't skip months
        DECLARE
            v_next_month DATE;
            v_next_anchor_date DATE;
        BEGIN
            v_next_month := DATE_TRUNC('month', v_period_start + INTERVAL '1 month');
            v_next_anchor_date := v_next_month + (v_billing_anchor_day - 1) * INTERVAL '1 day';
            
            -- If next anchor date would be invalid, use last day of next month
            IF EXTRACT(DAY FROM v_next_anchor_date)::INTEGER != v_billing_anchor_day THEN
                v_next_anchor_date := v_next_month + INTERVAL '1 month' - INTERVAL '1 day';
            END IF;
            
            v_period_end := v_next_anchor_date - INTERVAL '1 day';
        END;
    END IF;
    
    RETURN QUERY SELECT v_period_start, v_period_end;
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION get_user_billing_period(UUID) IS 
'Calculates the current billing period for a user based on their subscription billing_anchor_day. 
Falls back to calendar month (1st) if no active subscription. 
Handles edge cases for months with fewer days than the anchor day.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_billing_period(UUID) TO authenticated;
`;

async function applyMigration() {
  console.log('🚀 Applying billing period migration...\n');
  
  try {
    // First, let's check if the function already exists
    const { data: existingFunc, error: checkError } = await supabase.rpc('pg_get_functiondef', {
      funcname: 'get_user_billing_period'
    }).single();
    
    if (existingFunc && !checkError) {
      console.log('⚠️  Function get_user_billing_period already exists, skipping creation');
    } else {
      // Apply the migration using raw SQL
      console.log('📝 Creating get_user_billing_period function...');
      
      // Note: Supabase JS client doesn't support direct SQL execution
      // We need to use the SQL editor in Supabase dashboard
      console.log('\n❗ IMPORTANT: The Supabase JS client does not support direct SQL execution.');
      console.log('\nPlease follow these steps to apply the migration:\n');
      console.log('1. Go to your Supabase dashboard: https://app.supabase.com');
      console.log('2. Select your project: replyguy');
      console.log('3. Navigate to SQL Editor');
      console.log('4. Make sure you are logged in as user "mike"');
      console.log('5. Copy and paste the SQL from: /scripts/apply-billing-period-fix.sql');
      console.log('6. Click "Run" to execute the migration\n');
      
      // Let's at least test the current functionality
      console.log('📊 Testing current usage tracking...\n');
      
      // Get test user
      const { data: testUser } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', 'test-business@replyguy.com')
        .single();
        
      if (testUser) {
        console.log(`Found test user: ${testUser.email} (${testUser.id})`);
        
        // Get their subscription
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*, subscription_plans(*)')
          .eq('user_id', testUser.id)
          .in('status', ['active', 'trialing'])
          .single();
          
        if (subscription) {
          console.log(`\nSubscription Details:`);
          console.log(`  Plan: ${subscription.subscription_plans.name}`);
          console.log(`  Status: ${subscription.status}`);
          console.log(`  Billing Anchor Day: ${subscription.billing_anchor_day || 'NOT SET'}`);
          console.log(`  Current Period: ${subscription.current_period_start} to ${subscription.current_period_end}`);
          
          // Get current usage
          const { data: usage } = await supabase.rpc('get_current_usage', {
            p_user_id: testUser.id
          });
          
          if (usage) {
            console.log(`\nCurrent Usage:`);
            console.log(`  Replies: ${usage.total_replies}`);
            console.log(`  Memes: ${usage.total_memes}`);
            console.log(`  Suggestions: ${usage.total_suggestions}`);
          }
          
          // Get recent daily usage
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          
          const { data: dailyUsage } = await supabase
            .from('daily_usage')
            .select('date, replies_generated, memes_generated, suggestions_used')
            .eq('user_id', testUser.id)
            .gte('date', startOfMonth.toISOString().split('T')[0])
            .order('date', { ascending: false })
            .limit(5);
            
          if (dailyUsage && dailyUsage.length > 0) {
            console.log(`\nRecent Daily Usage:`);
            dailyUsage.forEach(day => {
              console.log(`  ${day.date}: ${day.replies_generated} replies, ${day.memes_generated} memes, ${day.suggestions_used} suggestions`);
            });
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the migration
applyMigration();