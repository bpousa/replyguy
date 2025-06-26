#!/usr/bin/env tsx

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testPaymentFlow() {
  console.log('🧪 === END-TO-END PAYMENT FLOW TEST ===\n');
  
  console.log('📋 Test Requirements:');
  console.log('1. You must be logged in as a user');
  console.log('2. Stripe must be in test mode (using test API keys)');
  console.log('3. Database must have price IDs configured\n');
  
  const tests = {
    checkout: false,
    portal: false,
    webhooks: false,
    limits: false
  };
  
  try {
    // Test 1: Checkout API
    console.log('1. Testing Checkout API...');
    console.log('   Note: This will fail with 401 if not authenticated');
    
    const checkoutResponse = await fetch(`${BASE_URL}/api/stripe/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planId: 'pro',
        billingCycle: 'monthly'
      })
    });
    
    if (checkoutResponse.status === 401) {
      console.log('   ⚠️  401 Unauthorized - Please log in first');
      console.log('   Run this test from the browser console while logged in');
    } else if (checkoutResponse.ok) {
      const { url } = await checkoutResponse.json();
      console.log('   ✅ Checkout session created successfully');
      console.log(`   Checkout URL: ${url}`);
      tests.checkout = true;
    } else {
      const error = await checkoutResponse.json();
      console.log('   ❌ Checkout failed:', error.error);
    }
    
    // Test 2: Portal API
    console.log('\n2. Testing Customer Portal API...');
    
    const portalResponse = await fetch(`${BASE_URL}/api/stripe/portal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        returnUrl: `${BASE_URL}/settings`
      })
    });
    
    if (portalResponse.status === 401) {
      console.log('   ⚠️  401 Unauthorized - Please log in first');
    } else if (portalResponse.status === 404) {
      console.log('   ⚠️  No billing information - User needs to subscribe first');
    } else if (portalResponse.ok) {
      const { url } = await portalResponse.json();
      console.log('   ✅ Portal session created successfully');
      console.log(`   Portal URL: ${url}`);
      tests.portal = true;
    } else {
      const error = await portalResponse.json();
      console.log('   ❌ Portal failed:', error.error);
    }
    
    // Test 3: Check Limits API
    console.log('\n3. Testing Check Limits API...');
    
    const limitsResponse = await fetch(`${BASE_URL}/api/check-limits`);
    
    if (limitsResponse.ok) {
      const { data } = await limitsResponse.json();
      console.log('   ✅ Limits check successful');
      console.log('   Current usage:', data.usage);
      console.log('   Limits:', data.limits);
      tests.limits = true;
    } else if (limitsResponse.status === 401) {
      console.log('   ⚠️  401 Unauthorized - Please log in first');
    } else {
      const error = await limitsResponse.json();
      console.log('   ❌ Check limits failed:', error.error);
    }
    
    // Test 4: Process API with limits
    console.log('\n4. Testing Process API (Reply Generation)...');
    
    const processResponse = await fetch(`${BASE_URL}/api/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalTweet: 'Test tweet for payment flow testing',
        responseIdea: 'Testing the payment system',
        responseType: 'agree',
        tone: 'friendly',
        needsResearch: false,
        replyLength: 'short',
        enableStyleMatching: false,
        includeMeme: false,
        useCustomStyle: false,
        userId: 'test-user' // This will need to be a real user ID
      })
    });
    
    if (processResponse.status === 429) {
      const error = await processResponse.json();
      console.log('   ✅ Rate limiting is working correctly');
      console.log('   Limit reached:', error.error);
      console.log('   Usage:', `${error.used}/${error.limit}`);
    } else if (processResponse.ok) {
      const { data } = await processResponse.json();
      console.log('   ✅ Reply generated successfully');
      console.log('   Cost:', data.cost);
      console.log('   Reply preview:', data.reply.substring(0, 50) + '...');
    } else {
      const error = await processResponse.json();
      console.log('   ❌ Process failed:', error.error);
    }
    
    // Summary
    console.log('\n📊 TEST SUMMARY');
    console.log('================');
    console.log(`Checkout API: ${tests.checkout ? '✅ Working' : '❌ Not tested (auth required)'}`);
    console.log(`Portal API: ${tests.portal ? '✅ Working' : '❌ Not tested (auth required)'}`);
    console.log(`Limits API: ${tests.limits ? '✅ Working' : '❌ Not tested (auth required)'}`);
    
    console.log('\n📝 Manual Testing Steps:');
    console.log('1. Log into the application');
    console.log('2. Go to /pricing and select a plan');
    console.log('3. Complete Stripe checkout (use test card: 4242 4242 4242 4242)');
    console.log('4. Verify subscription appears in /settings');
    console.log('5. Try generating replies up to your limit');
    console.log('6. Verify upgrade modal appears when limit reached');
    console.log('7. Access billing portal from settings');
    console.log('8. Test cancellation and resubscription');
    
    console.log('\n🔍 Browser Console Test Script:');
    console.log('Copy and run this in the browser console while logged in:\n');
    
    const browserScript = `
// Test Checkout
fetch('/api/stripe/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    planId: 'pro',
    billingCycle: 'monthly'
  })
})
.then(r => r.json())
.then(data => {
  if (data.url) {
    console.log('✅ Checkout URL:', data.url);
    console.log('Click to open:', data.url);
  } else {
    console.log('❌ Error:', data.error);
  }
});

// Test Portal
fetch('/api/stripe/portal', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    returnUrl: window.location.origin + '/settings'
  })
})
.then(r => r.json())
.then(data => {
  if (data.url) {
    console.log('✅ Portal URL:', data.url);
  } else {
    console.log('❌ Error:', data.error);
  }
});`;
    
    console.log(browserScript);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testPaymentFlow().catch(console.error);