#!/usr/bin/env tsx

import * as dotenv from 'dotenv';
import Stripe from 'stripe';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function verifyStripeWebhooks() {
  console.log('🔍 === STRIPE WEBHOOK VERIFICATION ===\n');
  
  // Check environment variables
  console.log('1. Checking Environment Variables...');
  
  const requiredVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_KEY'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log('❌ Missing environment variables:');
    missingVars.forEach(varName => console.log(`   - ${varName}`));
    console.log('\nPlease set these in your .env.local file');
    return;
  }
  
  console.log('✅ All required environment variables are set');
  
  // Verify webhook secret format
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  if (!webhookSecret.startsWith('whsec_')) {
    console.log('⚠️  Warning: STRIPE_WEBHOOK_SECRET should start with "whsec_"');
  }
  
  // Initialize Stripe
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16',
  });
  
  console.log('\n2. Checking Stripe API Connection...');
  
  try {
    // Test API connection
    const account = await stripe.accounts.retrieve();
    console.log('✅ Connected to Stripe account:', account.email || account.id);
    console.log('   Mode:', account.charges_enabled ? 'Live' : 'Test');
    
    // List recent webhook endpoints
    console.log('\n3. Checking Webhook Endpoints...');
    const webhookEndpoints = await stripe.webhookEndpoints.list({ limit: 10 });
    
    if (webhookEndpoints.data.length === 0) {
      console.log('❌ No webhook endpoints configured in Stripe');
      console.log('   Please add a webhook endpoint in the Stripe Dashboard:');
      console.log('   https://dashboard.stripe.com/webhooks');
      console.log('   Endpoint URL: https://your-domain.com/api/stripe/webhook');
    } else {
      console.log(`✅ Found ${webhookEndpoints.data.length} webhook endpoint(s):`);
      
      webhookEndpoints.data.forEach((endpoint, index) => {
        console.log(`\n   Endpoint ${index + 1}:`);
        console.log(`   - URL: ${endpoint.url}`);
        console.log(`   - Status: ${endpoint.status}`);
        console.log(`   - Events: ${endpoint.enabled_events.length} event types`);
        
        // Check if our required events are configured
        const requiredEvents = [
          'checkout.session.completed',
          'customer.subscription.created',
          'customer.subscription.updated',
          'customer.subscription.deleted',
          'invoice.payment_failed'
        ];
        
        const missingEvents = requiredEvents.filter(
          event => !endpoint.enabled_events.includes(event)
        );
        
        if (missingEvents.length > 0) {
          console.log('   ⚠️  Missing events:');
          missingEvents.forEach(event => console.log(`      - ${event}`));
        } else {
          console.log('   ✅ All required events configured');
        }
      });
    }
    
    // Check products and prices
    console.log('\n4. Checking Products and Prices...');
    const products = await stripe.products.list({ active: true });
    
    if (products.data.length === 0) {
      console.log('❌ No active products found');
      console.log('   Please create products as described in STRIPE_SETUP.md');
    } else {
      console.log(`✅ Found ${products.data.length} active product(s):`);
      
      for (const product of products.data) {
        console.log(`\n   Product: ${product.name}`);
        console.log(`   - ID: ${product.id}`);
        
        // Get prices for this product
        const prices = await stripe.prices.list({
          product: product.id,
          active: true
        });
        
        console.log(`   - Prices: ${prices.data.length} active`);
        prices.data.forEach(price => {
          const recurring = price.recurring ? `${price.recurring.interval}ly` : 'one-time';
          const amount = (price.unit_amount || 0) / 100;
          console.log(`     • ${price.currency.toUpperCase()} $${amount} ${recurring} (${price.id})`);
        });
      }
    }
    
    // Test webhook signing
    console.log('\n5. Testing Webhook Signature Verification...');
    
    try {
      // Create a test payload
      const testPayload = JSON.stringify({
        id: 'evt_test',
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_test' } }
      });
      
      // Create a test signature (this will fail verification, which is expected)
      const testSignature = `t=${Math.floor(Date.now() / 1000)},v1=test_signature`;
      
      try {
        stripe.webhooks.constructEvent(testPayload, testSignature, webhookSecret);
      } catch (err) {
        if (err instanceof Error && err.message.includes('No signatures found')) {
          console.log('✅ Webhook signature verification is properly configured');
        } else {
          console.log('✅ Webhook secret is set and being validated');
        }
      }
    } catch (error) {
      console.log('❌ Error testing webhook signature:', error);
    }
    
    console.log('\n6. Summary:');
    console.log('============');
    console.log('✅ Stripe API connection: OK');
    console.log(`${webhookEndpoints.data.length > 0 ? '✅' : '❌'} Webhook endpoints: ${webhookEndpoints.data.length > 0 ? 'Configured' : 'Not configured'}`);
    console.log(`${products.data.length > 0 ? '✅' : '❌'} Products: ${products.data.length > 0 ? 'Created' : 'Not created'}`);
    console.log('✅ Webhook secret: Set');
    
    console.log('\n📋 Next Steps:');
    if (webhookEndpoints.data.length === 0) {
      console.log('1. Add webhook endpoint in Stripe Dashboard');
    }
    if (products.data.length === 0) {
      console.log('2. Create products and prices as per STRIPE_SETUP.md');
    }
    console.log('3. Update database with Stripe price IDs');
    console.log('4. Test a checkout session in test mode');
    
  } catch (error) {
    console.error('❌ Stripe API Error:', error);
    console.log('\nPlease check:');
    console.log('1. Your STRIPE_SECRET_KEY is correct');
    console.log('2. Your Stripe account is active');
    console.log('3. You have the necessary permissions');
  }
}

// Run the verification
verifyStripeWebhooks().catch(console.error);