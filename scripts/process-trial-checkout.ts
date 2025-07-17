#!/usr/bin/env tsx
// Script to manually process a completed checkout session
// This simulates what the webhook should do

import { config } from 'dotenv';
import { resolve } from 'path';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      persistSession: false,
    },
  }
);

async function processTrialCheckout(userEmail: string) {
  console.log('Looking for checkout sessions for user:', userEmail);
  
  try {
    // Find the user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .single();
      
    if (userError || !user) {
      console.error('User not found:', userEmail);
      return;
    }
    
    console.log('Found user:', user.id);
    
    // List recent checkout sessions
    const sessions = await stripe.checkout.sessions.list({
      limit: 100,
      expand: ['data.line_items'],
      created: {
        gte: Math.floor(Date.now() / 1000) - 86400, // Last 24 hours
      },
    });
    
    console.log(`\nTotal sessions in last 24 hours: ${sessions.data.length}`);
    
    // Show all sessions for debugging
    sessions.data.forEach((s, i) => {
      console.log(`\nSession ${i + 1}:`);
      console.log('  ID:', s.id);
      console.log('  Customer email:', s.customer_email || 'none');
      console.log('  Status:', s.status);
      console.log('  Created:', new Date(s.created * 1000).toLocaleString());
      console.log('  Mode:', s.mode);
      console.log('  Amount:', s.amount_total ? `$${s.amount_total / 100}` : 'N/A');
    });
    
    // Check if any session might be for this user
    let matchingSession = null;
    for (const session of sessions.data) {
      if (session.status === 'complete' && session.amount_total === 100) { // $1.00
        console.log('\nChecking session for trial match:', session.id);
        console.log('  Metadata:', session.metadata);
        console.log('  Client ref ID:', session.client_reference_id);
        console.log('  Subscription:', session.subscription);
        
        // If it's the only $1 session, it's probably our user's
        matchingSession = session;
      }
    }
    
    // Find sessions for this user
    const userSessions = sessions.data.filter(session => 
      session.customer_email === userEmail || 
      session.client_reference_id === user.id ||
      session.metadata?.userId === user.id
    );
    
    // If no exact match but we have a $1 session, use it
    if (userSessions.length === 0 && matchingSession) {
      console.log('\nNo exact match, but found a $1 trial session - processing it');
      userSessions.push(matchingSession);
    }
    
    console.log(`Found ${userSessions.length} checkout sessions for this user`);
    
    for (const session of userSessions) {
      console.log('\nProcessing session:', session.id);
      console.log('Status:', session.status);
      console.log('Payment status:', session.payment_status);
      console.log('Customer:', session.customer);
      console.log('Subscription:', session.subscription);
      
      if (session.status === 'complete' && session.subscription) {
        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        const priceId = subscription.items.data[0].price.id;
        
        console.log('\nSubscription details:');
        console.log('ID:', subscription.id);
        console.log('Status:', subscription.status);
        console.log('Price ID:', priceId);
        console.log('Trial end:', subscription.trial_end ? new Date(subscription.trial_end * 1000) : 'No trial');
        
        // Find the plan
        const { data: plan } = await supabase
          .from('subscription_plans')
          .select('*')
          .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
          .single();
          
        if (!plan) {
          console.error('Plan not found for price:', priceId);
          continue;
        }
        
        console.log('Plan:', plan.name, '(', plan.id, ')');
        
        // Check if subscription exists
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('stripe_subscription_id', subscription.id)
          .single();
          
        if (existingSub) {
          console.log('Subscription already exists in database');
        } else {
          console.log('Creating subscription in database...');
          
          const billingAnchorDay = new Date(subscription.current_period_start * 1000).getDate();
          
          const subscriptionData: any = {
            user_id: user.id,
            plan_id: plan.id,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: session.customer as string,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            billing_anchor_day: billingAnchorDay,
          };
          
          if (subscription.trial_end) {
            subscriptionData.trialing_until = new Date(subscription.trial_end * 1000).toISOString();
          }
          
          const { error: insertError } = await supabase
            .from('subscriptions')
            .insert(subscriptionData);
            
          if (insertError) {
            console.error('Error creating subscription:', insertError);
          } else {
            console.log('Subscription created successfully');
          }
        }
        
        // Update user
        console.log('Updating user record...');
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            stripe_customer_id: session.customer as string,
            subscription_tier: plan.id,
            subscription_status: subscription.status,
            trial_offer_accepted: !!subscription.trial_end,
            has_seen_trial_offer: true
          })
          .eq('id', user.id);
          
        if (updateError) {
          console.error('Error updating user:', updateError);
        } else {
          console.log('User updated successfully');
        }
      }
    }
    
    // Check final state
    console.log('\nFinal check:');
    const { data: finalUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
      
    const { data: userSubs } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id);
      
    console.log('User subscription_tier:', finalUser?.subscription_tier);
    console.log('User subscription_status:', finalUser?.subscription_status);
    console.log('User trial_offer_accepted:', finalUser?.trial_offer_accepted);
    console.log('Active subscriptions:', userSubs?.filter(s => s.status === 'active' || s.status === 'trialing').length);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Get email from command line
const email = process.argv[2];
if (!email) {
  console.error('Usage: tsx scripts/process-trial-checkout.ts <user-email>');
  process.exit(1);
}

processTrialCheckout(email);