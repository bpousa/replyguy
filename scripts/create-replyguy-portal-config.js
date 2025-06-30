#!/usr/bin/env node

// Create a separate Customer Portal configuration for ReplyGuy
require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('Error: STRIPE_SECRET_KEY not found in environment variables');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

async function createReplyGuyPortalConfig() {
  console.log('Creating ReplyGuy-specific Customer Portal configuration...\n');

  try {
    // First, get the ReplyGuy product IDs
    const products = await stripe.products.list({ 
      active: true,
      limit: 100 
    });
    
    const replyGuyProducts = products.data.filter(p => 
      p.name === 'X Basic' || 
      p.name === 'X Pro' || 
      p.name === 'X Business'
    );

    if (replyGuyProducts.length === 0) {
      console.error('❌ No ReplyGuy products found! Make sure X Basic, X Pro, and X Business products exist.');
      return;
    }

    console.log('Found ReplyGuy products:');
    replyGuyProducts.forEach(p => console.log(`- ${p.name} (${p.id})`));

    // Get all prices for these products
    const prices = await stripe.prices.list({
      active: true,
      limit: 100
    });

    const replyGuyPrices = prices.data.filter(price => 
      replyGuyProducts.some(product => product.id === price.product)
    );

    console.log(`\nFound ${replyGuyPrices.length} ReplyGuy prices`);

    // Group prices by product for the configuration
    const productPrices = {};
    replyGuyPrices.forEach(price => {
      if (!productPrices[price.product]) {
        productPrices[price.product] = [];
      }
      productPrices[price.product].push(price.id);
    });

    // Create a new portal configuration
    const configuration = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: 'Manage your ReplyGuy subscription',
        // Privacy and terms URLs can be added later
        // privacy_policy_url: 'https://replyguy.appendment.com/privacy',
        // terms_of_service_url: 'https://replyguy.appendment.com/terms',
      },
      features: {
        // Customer can update their email and tax ID
        customer_update: {
          enabled: true,
          allowed_updates: ['email', 'tax_id'],
        },
        // Show invoice history
        invoice_history: {
          enabled: true,
        },
        // Allow updating payment methods
        payment_method_update: {
          enabled: true,
        },
        // Allow cancellation at period end
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          proration_behavior: 'none',
          cancellation_reason: {
            enabled: true,
            options: [
              'too_expensive',
              'missing_features',
              'switched_service',
              'unused',
              'other'
            ]
          }
        },
        // Allow switching between ReplyGuy plans
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price'],
          proration_behavior: 'always_invoice',
          products: Object.entries(productPrices).map(([productId, priceIds]) => ({
            product: productId,
            prices: priceIds,
          })),
        },
      },
      // Default return URL
      default_return_url: 'https://replyguy.appendment.com/settings?billingUpdated=1',
    });

    console.log('\n✅ Successfully created ReplyGuy portal configuration!');
    console.log('\n========================================');
    console.log('IMPORTANT: Save this configuration ID:');
    console.log(`\nSTRIPE_PORTAL_CONFIG_ID=${configuration.id}`);
    console.log('========================================\n');
    
    console.log('Next steps:');
    console.log('1. Add STRIPE_PORTAL_CONFIG_ID to your Vercel environment variables');
    console.log('2. The codebase will be updated to use this configuration');
    console.log('3. Test the portal with a real customer account\n');

    // Show configuration details
    console.log('Configuration Details:');
    console.log(`- Active: ${configuration.active}`);
    console.log(`- Created: ${new Date(configuration.created * 1000).toLocaleString()}`);
    console.log('\nEnabled Features:');
    console.log('- ✅ Customer updates (email, tax ID)');
    console.log('- ✅ Invoice history');
    console.log('- ✅ Payment method updates');
    console.log('- ✅ Subscription cancellation (at period end)');
    console.log('- ✅ Plan switching between ReplyGuy plans');
    console.log('\nProducts included in switching:');
    replyGuyProducts.forEach(p => console.log(`  - ${p.name}`));

  } catch (error) {
    console.error('\n❌ Error creating portal configuration:', error.message);
    if (error.raw) {
      console.error('\nDetails:', JSON.stringify(error.raw, null, 2));
    }
    if (error.type === 'StripePermissionError') {
      console.error('\nMake sure your API key has permission to manage portal configurations.');
    }
  }
}

// Run the script
createReplyGuyPortalConfig();