#!/usr/bin/env node

/**
 * Send test webhooks for GHL mapping
 * Usage: node scripts/send-test-webhooks.js [event_type]
 * 
 * If no event_type provided, sends all events in sequence
 */

const fetch = require('node-fetch');

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://replyguy.appendment.com';
const TEST_API = `${BASE_URL}/api/test/webhook-events`;

const ALL_EVENTS = [
  'user_created_free',
  'user_created_paid', 
  'subscription_started_trial',
  'subscription_started_direct',
  'subscription_updated',
  'payment_failed',
  'payment_recovered',
  'subscription_canceled',
  'trial_ending',
  'user_profile_completed'
];

async function sendTestWebhook(eventType, delay = 0) {
  if (delay > 0) {
    console.log(`⏳ Waiting ${delay}ms before sending ${eventType}...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  console.log(`\n🚀 Sending test webhook: ${eventType}`);
  console.log('=' * 50);
  
  try {
    const response = await fetch(TEST_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        eventType,
        userId: `test-user-${eventType}-${Date.now()}`
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ ${eventType} sent successfully`);
      console.log(`📊 GHL Response Status: ${result.ghlResponse.status}`);
      
      // Show key fields from the payload
      const payload = result.testPayload;
      console.log(`📝 Event: ${payload.event}`);
      console.log(`👤 User: ${payload.userId}`);
      
      if (payload.data.trial_offer_token) {
        console.log(`🎫 Trial Token: ${payload.data.trial_offer_token.substring(0, 20)}...`);
      }
      
      if (payload.data.selected_plan) {
        console.log(`💰 Plan: ${payload.data.selected_plan}`);
      }
      
      if (payload.metadata.paymentType) {
        console.log(`💳 Payment Type: ${payload.metadata.paymentType}`);
      }
      
      console.log(`🕐 Timestamp: ${result.timestamp}`);
      
    } else {
      console.error(`❌ Failed to send ${eventType}:`, result.error);
    }
    
  } catch (error) {
    console.error(`💥 Error sending ${eventType}:`, error.message);
  }
}

async function main() {
  const eventType = process.argv[2];
  
  console.log('🎯 ReplyGuy Webhook Test Suite');
  console.log(`🌐 Target: ${BASE_URL}`);
  console.log(`🪝 GHL Webhook: ${process.env.GHL_WEBHOOK_URL ? 'Configured' : 'Not configured'}`);
  
  if (eventType) {
    if (!ALL_EVENTS.includes(eventType)) {
      console.error(`❌ Unknown event type: ${eventType}`);
      console.log(`📋 Available events: ${ALL_EVENTS.join(', ')}`);
      process.exit(1);
    }
    
    await sendTestWebhook(eventType);
  } else {
    console.log(`\n📨 Sending all ${ALL_EVENTS.length} test webhooks...`);
    console.log('⚠️  Each webhook will be sent with a 2-second delay to avoid deduplication');
    
    for (let i = 0; i < ALL_EVENTS.length; i++) {
      const event = ALL_EVENTS[i];
      const delay = i > 0 ? 2000 : 0; // 2 second delay between events
      await sendTestWebhook(event, delay);
    }
    
    console.log('\n🎉 All test webhooks sent!');
  }
  
  console.log('\n📖 Check your GHL webhook logs to map these events in your automation workflows.');
}

main().catch(console.error);