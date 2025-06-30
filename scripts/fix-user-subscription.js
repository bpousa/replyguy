#!/usr/bin/env node

// Script to fix user subscription data for users who completed checkout but show as free plan
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: Missing required environment variables');
  process.exit(1);
}

async function fixUserSubscription(email) {
  console.log(`Fixing subscription for user: ${email}\n`);

  try {
    // Get user data
    const userResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=*`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      }
    );

    const users = await userResponse.json();
    if (!users || users.length === 0) {
      console.error('User not found');
      return;
    }

    const user = users[0];
    console.log('Found user:', {
      id: user.id,
      email: user.email,
      subscription_tier: user.subscription_tier,
      stripe_customer_id: user.stripe_customer_id
    });

    if (!user.stripe_customer_id) {
      console.error('User has no Stripe customer ID');
      return;
    }

    // Get Stripe subscription via API
    const Stripe = require('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });

    // Get subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripe_customer_id,
      limit: 10
    });

    console.log(`\nFound ${subscriptions.data.length} Stripe subscriptions`);

    if (subscriptions.data.length === 0) {
      console.error('No subscriptions found in Stripe');
      return;
    }

    // Find the active/trialing subscription
    const activeSubscription = subscriptions.data.find(
      sub => sub.status === 'active' || sub.status === 'trialing'
    );

    if (!activeSubscription) {
      console.error('No active or trialing subscription found');
      return;
    }

    console.log('\nActive subscription found:', {
      id: activeSubscription.id,
      status: activeSubscription.status,
      created: new Date(activeSubscription.created * 1000).toLocaleString(),
      trial_end: activeSubscription.trial_end ? new Date(activeSubscription.trial_end * 1000).toLocaleString() : null
    });

    // Get the plan from price ID
    const priceId = activeSubscription.items.data[0].price.id;
    console.log('Price ID:', priceId);

    // Find the plan in database
    const planResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/subscription_plans?or=(stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId})&select=*`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      }
    );

    const plans = await planResponse.json();
    if (!plans || plans.length === 0) {
      console.error('Plan not found in database for price ID:', priceId);
      return;
    }

    const plan = plans[0];
    console.log('\nFound plan:', plan.name, `(${plan.id})`);

    // Check if subscription record exists
    const subResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/subscriptions?stripe_subscription_id=eq.${activeSubscription.id}&select=*`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      }
    );

    const existingSubs = await subResponse.json();

    if (!existingSubs || existingSubs.length === 0) {
      console.log('\n🔧 Creating missing subscription record...');
      
      // Create the subscription record
      const createResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/subscriptions`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            user_id: user.id,
            plan_id: plan.id,
            stripe_subscription_id: activeSubscription.id,
            stripe_customer_id: user.stripe_customer_id,
            status: activeSubscription.status,
            current_period_start: new Date(activeSubscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(activeSubscription.current_period_end * 1000).toISOString(),
            billing_anchor_day: new Date(activeSubscription.current_period_start * 1000).getDate(),
            trialing_until: activeSubscription.trial_end ? new Date(activeSubscription.trial_end * 1000).toISOString() : null
          })
        }
      );

      if (!createResponse.ok) {
        const error = await createResponse.text();
        console.error('Failed to create subscription:', error);
        return;
      }

      console.log('✅ Created subscription record');
    } else {
      console.log('✅ Subscription record already exists');
    }

    // Update user's subscription tier
    console.log('\n🔧 Updating user subscription tier...');
    
    const updateResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/users?id=eq.${user.id}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription_tier: plan.id,
          subscription_status: activeSubscription.status
        })
      }
    );

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      console.error('Failed to update user:', error);
      return;
    }

    console.log('✅ Updated user subscription tier to:', plan.name);
    console.log('\n🎉 User subscription has been fixed!');

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the script
const email = process.argv[2];
if (!email) {
  console.error('Usage: node fix-user-subscription.js <email>');
  console.error('Example: node fix-user-subscription.js antoni.mike+15@gmail.com');
  process.exit(1);
}

fixUserSubscription(email);