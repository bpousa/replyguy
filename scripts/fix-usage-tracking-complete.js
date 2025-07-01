#!/usr/bin/env node

/**
 * Complete fix for usage tracking issues
 * This script will update the database and fix the test user's data
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function fixTestUserBillingAnchor() {
  console.log('🔧 Fixing test-business@replyguy.com billing anchor day...\n');
  
  try {
    // Get the test user
    const { data: testUser, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'test-business@replyguy.com')
      .single();
      
    if (userError || !testUser) {
      console.error('❌ Test user not found:', userError);
      return;
    }
    
    console.log(`✅ Found test user: ${testUser.email} (${testUser.id})`);
    
    // Get their active subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', testUser.id)
      .in('status', ['active', 'trialing'])
      .single();
      
    if (subError || !subscription) {
      console.error('❌ No active subscription found:', subError);
      return;
    }
    
    console.log(`\n📊 Current Subscription:`);
    console.log(`  ID: ${subscription.id}`);
    console.log(`  Stripe ID: ${subscription.stripe_subscription_id}`);
    console.log(`  Status: ${subscription.status}`);
    console.log(`  Billing Anchor Day: ${subscription.billing_anchor_day || 'NOT SET'}`);
    
    // If billing anchor day is not set, calculate it from Stripe
    if (!subscription.billing_anchor_day && subscription.stripe_subscription_id) {
      console.log('\n🔍 Fetching billing details from Stripe...');
      
      const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
      const billingAnchorDay = new Date(stripeSubscription.current_period_start * 1000).getDate();
      
      console.log(`  Stripe Period Start: ${new Date(stripeSubscription.current_period_start * 1000).toISOString()}`);
      console.log(`  Calculated Billing Anchor Day: ${billingAnchorDay}`);
      
      // Update the subscription
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          billing_anchor_day: billingAnchorDay,
          current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString()
        })
        .eq('id', subscription.id);
        
      if (updateError) {
        console.error('❌ Failed to update subscription:', updateError);
      } else {
        console.log('✅ Updated billing anchor day successfully!');
        subscription.billing_anchor_day = billingAnchorDay;
      }
    }
    
    // Now let's calculate what the current billing period should be
    if (subscription.billing_anchor_day) {
      console.log('\n📅 Calculating current billing period...');
      
      const today = new Date();
      const currentDay = today.getDate();
      const billingAnchorDay = subscription.billing_anchor_day;
      
      let periodStart, periodEnd;
      
      if (currentDay >= billingAnchorDay) {
        // We're in the current month's billing period
        periodStart = new Date(today.getFullYear(), today.getMonth(), billingAnchorDay);
      } else {
        // We're still in the previous month's billing period
        periodStart = new Date(today.getFullYear(), today.getMonth() - 1, billingAnchorDay);
      }
      
      // Calculate period end (one day before next period starts)
      periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      periodEnd.setDate(periodEnd.getDate() - 1);
      
      console.log(`  Period Start: ${periodStart.toISOString().split('T')[0]}`);
      console.log(`  Period End: ${periodEnd.toISOString().split('T')[0]}`);
      
      // Get usage for this period
      const { data: dailyUsage, error: usageError } = await supabase
        .from('daily_usage')
        .select('date, replies_generated, memes_generated, suggestions_used')
        .eq('user_id', testUser.id)
        .gte('date', periodStart.toISOString().split('T')[0])
        .lte('date', periodEnd.toISOString().split('T')[0])
        .order('date', { ascending: false });
        
      if (!usageError && dailyUsage) {
        console.log(`\n📊 Usage in Current Billing Period:`);
        
        let totalReplies = 0, totalMemes = 0, totalSuggestions = 0;
        
        dailyUsage.forEach(day => {
          console.log(`  ${day.date}: ${day.replies_generated} replies, ${day.memes_generated} memes, ${day.suggestions_used} suggestions`);
          totalReplies += day.replies_generated || 0;
          totalMemes += day.memes_generated || 0;
          totalSuggestions += day.suggestions_used || 0;
        });
        
        console.log(`\n  TOTALS: ${totalReplies} replies, ${totalMemes} memes, ${totalSuggestions} suggestions`);
      }
      
      // Check if billing_period_usage table exists and has data
      const { data: billingPeriodUsage } = await supabase
        .from('billing_period_usage')
        .select('*')
        .eq('user_id', testUser.id)
        .gte('billing_period_start', periodStart.toISOString().split('T')[0])
        .single();
        
      if (billingPeriodUsage) {
        console.log('\n📈 Billing Period Usage Record:');
        console.log(`  Replies: ${billingPeriodUsage.replies_generated}`);
        console.log(`  Memes: ${billingPeriodUsage.memes_generated}`);
        console.log(`  Suggestions: ${billingPeriodUsage.suggestions_used}`);
      } else {
        console.log('\n⚠️  No billing period usage record found');
      }
    }
    
    // Test the get_current_usage function
    console.log('\n🧪 Testing get_current_usage function...');
    
    try {
      const { data: currentUsage, error: rpcError } = await supabase.rpc('get_current_usage', {
        p_user_id: testUser.id
      });
      
      if (rpcError) {
        console.error('❌ Error calling get_current_usage:', rpcError);
      } else if (currentUsage) {
        console.log('✅ get_current_usage returned:');
        console.log(`  Replies: ${currentUsage.total_replies ?? 'undefined'}`);
        console.log(`  Memes: ${currentUsage.total_memes ?? 'undefined'}`);
        console.log(`  Suggestions: ${currentUsage.total_suggestions ?? 'undefined'}`);
        
        if (currentUsage.total_replies === undefined) {
          console.log('\n⚠️  The function is returning undefined values.');
          console.log('  This indicates the get_user_billing_period function is missing or failing.');
          console.log('  Please apply the migration in Supabase SQL Editor!');
        }
      }
    } catch (error) {
      console.error('❌ Failed to call get_current_usage:', error);
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the fix
fixTestUserBillingAnchor();