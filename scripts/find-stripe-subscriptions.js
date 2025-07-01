#!/usr/bin/env node

/**
 * Find users with proper Stripe subscriptions
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function findStripeSubscriptions() {
  console.log('🔍 Finding users with Stripe subscriptions...\n');
  
  try {
    // Get all active subscriptions with Stripe IDs
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select(`
        id,
        user_id,
        stripe_subscription_id,
        billing_anchor_day,
        status,
        current_period_start,
        current_period_end,
        users!inner(email)
      `)
      .in('status', ['active', 'trialing'])
      .not('stripe_subscription_id', 'is', null)
      .limit(10);
      
    if (error) {
      console.error('Error fetching subscriptions:', error);
      return;
    }
    
    console.log(`Found ${subscriptions.length} active subscriptions with Stripe IDs:\n`);
    
    subscriptions.forEach((sub, index) => {
      console.log(`${index + 1}. User: ${sub.users.email}`);
      console.log(`   Stripe ID: ${sub.stripe_subscription_id}`);
      console.log(`   Billing Anchor Day: ${sub.billing_anchor_day || 'NOT SET'}`);
      console.log(`   Period: ${sub.current_period_start?.split('T')[0]} to ${sub.current_period_end?.split('T')[0]}`);
      console.log(`   Status: ${sub.status}\n`);
    });
    
    // Check antoni.mike+15@gmail.com specifically
    console.log('🔍 Checking antoni.mike+15@gmail.com...\n');
    
    const { data: antoniUser } = await supabase
      .from('users')
      .select(`
        id,
        email,
        subscriptions!inner(*)
      `)
      .eq('email', 'antoni.mike+15@gmail.com')
      .single();
      
    if (antoniUser && antoniUser.subscriptions) {
      const sub = antoniUser.subscriptions[0];
      console.log('Found subscription:');
      console.log(`  Stripe ID: ${sub.stripe_subscription_id}`);
      console.log(`  Billing Anchor Day: ${sub.billing_anchor_day || 'NOT SET'}`);
      console.log(`  Status: ${sub.status}`);
      
      // Test get_current_usage for this user
      const { data: usage } = await supabase.rpc('get_current_usage', {
        p_user_id: antoniUser.id
      });
      
      console.log('\nCurrent usage:');
      console.log(`  Replies: ${usage?.total_replies ?? 'undefined'}`);
      console.log(`  Memes: ${usage?.total_memes ?? 'undefined'}`);
      console.log(`  Suggestions: ${usage?.total_suggestions ?? 'undefined'}`);
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

findStripeSubscriptions();