#!/usr/bin/env tsx
// Create a proper trial checkout session using Stripe's trial_period_days
// This is how trials SHOULD be created - not as separate $1 prices!

import { config } from 'dotenv';
import { resolve } from 'path';
import Stripe from 'stripe';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// The ACTUAL subscription prices (not trial prices)
const SUBSCRIPTION_PRICES = {
  basic: 'price_1RgM4T08qNQAUd0lDDkyKROE',      // X Basic $19/month
  professional: 'price_1RfShy08qNQAUd0lmouMvBHX', // X Pro $49/month
};

async function createProperTrialCheckout(plan: 'basic' | 'professional', customerEmail: string) {
  try {
    // Create checkout session with trial_period_days
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: customerEmail,
      line_items: [{
        price: SUBSCRIPTION_PRICES[plan],
        quantity: 1,
      }],
      subscription_data: {
        trial_period_days: 30,
        trial_settings: {
          end_behavior: {
            missing_payment_method: 'create_invoice',
          },
        },
      },
      payment_method_collection: 'if_required',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?trial=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/auth/trial-offer?canceled=true`,
    });
    
    console.log('\n✅ Created proper trial checkout session:');
    console.log(`Plan: ${plan}`);
    console.log(`Price: ${plan === 'basic' ? '$19' : '$49'}/month after 30-day trial`);
    console.log(`URL: ${session.url}`);
    console.log('\nThis is the CORRECT way to do trials!');
    
    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
  }
}

// Example usage
console.log('🎯 How to properly create trial subscriptions:\n');
console.log('Instead of creating separate $1 prices, use trial_period_days!');
console.log('This ensures customers are billed the correct amount after trial.\n');

// You can test with:
// createProperTrialCheckout('basic', 'test@example.com');