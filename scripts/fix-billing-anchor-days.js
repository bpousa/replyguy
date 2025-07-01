#!/usr/bin/env node

/**
 * Script to fix billing anchor days for existing subscriptions
 * This ensures all active subscriptions have the correct billing_anchor_day set
 * and recalculates current period usage
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Use service key for admin access
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function fixBillingAnchorDays() {
  console.log('🔧 Starting billing anchor day fix...\n');

  try {
    // Get all subscriptions that need fixing
    const { data: subscriptions, error: fetchError } = await supabase
      .from('subscriptions')
      .select('id, user_id, stripe_subscription_id, billing_anchor_day, current_period_start')
      .in('status', ['active', 'trialing', 'past_due']);

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError);
      return;
    }

    console.log(`📊 Found ${subscriptions.length} active/trialing subscriptions\n`);

    let fixed = 0;
    let alreadyCorrect = 0;
    let errors = 0;

    for (const sub of subscriptions) {
      try {
        // Skip if billing_anchor_day is already set
        if (sub.billing_anchor_day) {
          alreadyCorrect++;
          continue;
        }

        console.log(`\n🔍 Processing subscription ${sub.id} for user ${sub.user_id}`);

        // Get the subscription from Stripe
        const stripeSubscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
        
        // Calculate billing anchor day from Stripe data
        const billingAnchorDay = new Date(stripeSubscription.current_period_start * 1000).getDate();
        
        console.log(`  📅 Billing anchor day: ${billingAnchorDay}`);
        console.log(`  📆 Current period: ${new Date(stripeSubscription.current_period_start * 1000).toISOString()} to ${new Date(stripeSubscription.current_period_end * 1000).toISOString()}`);

        // Update the subscription with billing anchor day
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            billing_anchor_day: billingAnchorDay,
            current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString()
          })
          .eq('id', sub.id);

        if (updateError) {
          console.error(`  ❌ Error updating subscription:`, updateError);
          errors++;
        } else {
          console.log(`  ✅ Fixed billing anchor day`);
          fixed++;
        }

      } catch (error) {
        console.error(`  ❌ Error processing subscription ${sub.id}:`, error.message);
        errors++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`  ✅ Fixed: ${fixed}`);
    console.log(`  ⏭️  Already correct: ${alreadyCorrect}`);
    console.log(`  ❌ Errors: ${errors}`);

    // Now fix the test-business@replyguy.com user specifically
    console.log('\n🔍 Checking test-business@replyguy.com user...');
    
    const { data: testUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'test-business@replyguy.com')
      .single();

    if (testUser) {
      console.log(`  Found user: ${testUser.id}`);
      
      // Get their current subscription
      const { data: userSub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', testUser.id)
        .in('status', ['active', 'trialing'])
        .single();

      if (userSub) {
        console.log(`  Subscription ID: ${userSub.id}`);
        console.log(`  Billing anchor day: ${userSub.billing_anchor_day}`);
        console.log(`  Current period: ${userSub.current_period_start} to ${userSub.current_period_end}`);
        
        // Calculate what their current usage should be
        const { data: currentUsage } = await supabase.rpc('get_current_usage', {
          p_user_id: testUser.id
        });
        
        console.log(`  Current usage: ${JSON.stringify(currentUsage)}`);
        
        // Get daily usage for current billing period
        const { data: dailyUsage } = await supabase
          .from('daily_usage')
          .select('date, replies_generated, memes_generated, suggestions_used')
          .eq('user_id', testUser.id)
          .gte('date', userSub.current_period_start)
          .lte('date', userSub.current_period_end)
          .order('date', { ascending: false });
          
        console.log(`\n  Daily usage in current period:`);
        dailyUsage?.forEach(day => {
          console.log(`    ${day.date}: ${day.replies_generated} replies, ${day.memes_generated} memes, ${day.suggestions_used} suggestions`);
        });
      }
    }

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    console.log('\n✅ Script completed');
  }
}

// Run the script
fixBillingAnchorDays();