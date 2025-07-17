#!/usr/bin/env tsx
// URGENT: Fix trial subscriptions that are set to $1/month instead of regular prices

import { config } from 'dotenv';
import { resolve } from 'path';
import Stripe from 'stripe';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Correct price IDs for the actual subscriptions (LIVE MODE)
const CORRECT_PRICES = {
  'price_1Rlhbf08qNQAUd0lbUZR3RwW': 'price_1RfShx08qNQAUd0lD1D2BBN4', // X Basic: $1 trial -> $19/month (LIVE)
  'price_1Rlhbg08qNQAUd0lmrEzmJWe': 'price_1RfShy08qNQAUd0lmouMvBHX', // X Pro: $1 trial -> $49/month (LIVE)
};

async function fixTrialSubscriptions() {
  console.log('🚨 FIXING TRIAL SUBSCRIPTIONS...\n');
  
  try {
    // List subscriptions for the affected customers
    const customers = [
      'antoni.mike+35@gmail.com',
      'antoni.mike+36@gmail.com'
    ];
    
    for (const email of customers) {
      console.log(`\n📧 Checking subscriptions for: ${email}`);
      
      // Find customer
      const customerList = await stripe.customers.list({
        email,
        limit: 10
      });
      
      if (customerList.data.length === 0) {
        console.log('❌ Customer not found');
        continue;
      }
      
      for (const customer of customerList.data) {
        console.log(`\n👤 Customer ID: ${customer.id}`);
        
        // Get their subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          limit: 10
        });
        
        for (const subscription of subscriptions.data) {
          const currentPriceId = subscription.items.data[0].price.id;
          const correctPriceId = CORRECT_PRICES[currentPriceId as keyof typeof CORRECT_PRICES];
          
          if (correctPriceId) {
            console.log(`\n🔧 Found problematic subscription: ${subscription.id}`);
            console.log(`   Current price: ${currentPriceId} ($1/month)`);
            console.log(`   Should be: ${correctPriceId} ($19 or $49/month)`);
            console.log(`   Status: ${subscription.status}`);
            console.log(`   Next billing: ${new Date(subscription.current_period_end * 1000).toLocaleDateString()}`);
            
            // Update the subscription to the correct price
            try {
              const updated = await stripe.subscriptions.update(subscription.id, {
                items: [{
                  id: subscription.items.data[0].id,
                  price: correctPriceId,
                }],
                proration_behavior: 'none', // Don't charge them immediately
                trial_end: subscription.current_period_end, // Keep trial until current period ends
              });
              
              console.log(`✅ FIXED! Subscription will bill at correct price after ${new Date(updated.current_period_end * 1000).toLocaleDateString()}`);
            } catch (error) {
              console.error(`❌ Failed to update subscription:`, error);
            }
          } else {
            console.log(`✓ Subscription ${subscription.id} is already on correct price`);
          }
        }
      }
    }
    
    console.log('\n\n⚠️  IMPORTANT NEXT STEPS:');
    console.log('1. These subscriptions will now bill at the correct price after their current period');
    console.log('2. You should email these customers to inform them of the correction');
    console.log('3. Fix the trial price creation to use Stripe trial periods instead of $1 recurring prices');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the fix
fixTrialSubscriptions();