#!/usr/bin/env tsx
// Script to replay a checkout.session.completed webhook event

import { config } from 'dotenv';
import { resolve } from 'path';
import Stripe from 'stripe';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

async function replayCheckoutWebhook(sessionId: string) {
  console.log('Retrieving checkout session:', sessionId);
  
  try {
    // Get the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'subscription', 'customer'],
    });
    
    console.log('\nCheckout Session Details:');
    console.log('ID:', session.id);
    console.log('Status:', session.status);
    console.log('Customer:', session.customer);
    console.log('Customer Email:', session.customer_email);
    console.log('Client Reference ID:', session.client_reference_id);
    console.log('Metadata:', session.metadata);
    console.log('Subscription:', session.subscription);
    console.log('Amount:', `$${(session.amount_total || 0) / 100}`);
    
    if (session.status !== 'complete') {
      console.error('Session is not complete!');
      return;
    }
    
    // Create a webhook event object
    const event: Stripe.Event = {
      id: `evt_replay_${Date.now()}`,
      object: 'event',
      api_version: '2023-10-16',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: session as any,
        previous_attributes: null,
      },
      livemode: true,
      pending_webhooks: 0,
      request: {
        id: null,
        idempotency_key: null,
      },
      type: 'checkout.session.completed',
    };
    
    console.log('\nSending webhook event to local endpoint...');
    
    // Send to our webhook endpoint
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/webhook`;
    console.log('Sending to:', webhookUrl);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'replay', // Special signature for replay
      },
      body: JSON.stringify(event),
    });
    
    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Response:', responseText);
    
    if (!response.ok) {
      console.error('Webhook failed!');
    } else {
      console.log('Webhook processed successfully!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Get session ID from command line
const sessionId = process.argv[2];
if (!sessionId) {
  console.error('Usage: tsx scripts/replay-checkout-webhook.ts <session-id>');
  console.error('Example: tsx scripts/replay-checkout-webhook.ts cs_live_xxx');
  process.exit(1);
}

replayCheckoutWebhook(sessionId);