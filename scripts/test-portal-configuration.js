#!/usr/bin/env node

// Test the ReplyGuy portal configuration
require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('Error: STRIPE_SECRET_KEY not found in environment variables');
  process.exit(1);
}

if (!process.env.STRIPE_PORTAL_CONFIG_ID) {
  console.error('Error: STRIPE_PORTAL_CONFIG_ID not found in environment variables');
  console.error('\nPlease add the portal configuration ID to your .env.local file:');
  console.error('STRIPE_PORTAL_CONFIG_ID=bpc_1RfhoV08qNQAUd0lCw9iJPQq');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

async function testPortalConfiguration() {
  console.log('Testing ReplyGuy portal configuration...\n');
  console.log(`Configuration ID: ${process.env.STRIPE_PORTAL_CONFIG_ID}\n`);

  try {
    // Retrieve the portal configuration
    const configuration = await stripe.billingPortal.configurations.retrieve(
      process.env.STRIPE_PORTAL_CONFIG_ID
    );

    console.log('✅ Portal configuration found!');
    console.log('\nConfiguration Details:');
    console.log(`- Active: ${configuration.active}`);
    console.log(`- Created: ${new Date(configuration.created * 1000).toLocaleString()}`);
    console.log(`- Default return URL: ${configuration.default_return_url || 'Not set'}`);
    
    if (configuration.business_profile) {
      console.log('\nBusiness Profile:');
      console.log(`- Headline: ${configuration.business_profile.headline || 'Not set'}`);
      console.log(`- Privacy Policy: ${configuration.business_profile.privacy_policy_url || 'Not set'}`);
      console.log(`- Terms of Service: ${configuration.business_profile.terms_of_service_url || 'Not set'}`);
    }

    console.log('\nEnabled Features:');
    const features = configuration.features;
    
    if (features.customer_update?.enabled) {
      console.log(`- ✅ Customer updates: ${features.customer_update.allowed_updates.join(', ')}`);
    }
    
    if (features.invoice_history?.enabled) {
      console.log('- ✅ Invoice history');
    }
    
    if (features.payment_method_update?.enabled) {
      console.log('- ✅ Payment method updates');
    }
    
    if (features.subscription_cancel?.enabled) {
      console.log(`- ✅ Subscription cancellation (mode: ${features.subscription_cancel.mode})`);
      if (features.subscription_cancel.cancellation_reason?.enabled) {
        console.log(`    Reasons: ${features.subscription_cancel.cancellation_reason.options.join(', ')}`);
      }
    }
    
    if (features.subscription_update?.enabled) {
      console.log('- ✅ Plan switching');
      console.log(`    Proration: ${features.subscription_update.proration_behavior}`);
      
      if (features.subscription_update.products && features.subscription_update.products.length > 0) {
        console.log('\n    Products available for switching:');
        
        // Get product details
        for (const productConfig of features.subscription_update.products) {
          try {
            const product = await stripe.products.retrieve(productConfig.product);
            console.log(`    - ${product.name} (${product.id})`);
          } catch (err) {
            console.log(`    - Product ${productConfig.product} (unable to retrieve details)`);
          }
        }
      }
    }

    // Test creating a test session (optional)
    console.log('\n📋 Testing portal session creation...');
    
    // We need a test customer for this
    const testCustomer = await stripe.customers.list({ limit: 1 });
    
    if (testCustomer.data.length > 0) {
      try {
        const session = await stripe.billingPortal.sessions.create({
          customer: testCustomer.data[0].id,
          configuration: process.env.STRIPE_PORTAL_CONFIG_ID,
          return_url: 'https://replyguy.appendment.com/settings?test=true'
        });
        
        console.log('✅ Successfully created test portal session!');
        console.log(`   Session URL: ${session.url.substring(0, 50)}...`);
      } catch (err) {
        console.log('⚠️  Could not create test session:', err.message);
      }
    } else {
      console.log('⚠️  No customers found for testing session creation');
    }

    console.log('\n✅ Portal configuration is properly set up and ready to use!');

  } catch (error) {
    console.error('\n❌ Error testing portal configuration:', error.message);
    
    if (error.statusCode === 404) {
      console.error('\nThe portal configuration ID was not found.');
      console.error('Please check that you have the correct ID in your .env.local file.');
    }
  }
}

testPortalConfiguration();