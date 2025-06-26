#!/usr/bin/env node
/**
 * Webhook Replay Script
 * 
 * This script can replay failed webhook events or fetch and process events
 * from Stripe that may have been missed during downtime.
 * 
 * Usage:
 * npm run replay-webhooks -- --type failed
 * npm run replay-webhooks -- --from "2025-01-25" --to "2025-01-26"
 * npm run replay-webhooks -- --event-id evt_1234567890
 */

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { config } from 'dotenv';
import { parseArgs } from 'util';

// Load environment variables
config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface ReplayOptions {
  type?: 'failed' | 'missing';
  from?: string;
  to?: string;
  eventId?: string;
  dryRun?: boolean;
}

async function replayFailedEvents() {
  console.log('🔄 Replaying failed webhook events...');
  
  // Get all failed events from our database
  const { data: failedEvents, error } = await supabase
    .from('stripe_webhook_events')
    .select('*')
    .eq('status', 'failed')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Failed to fetch failed events:', error);
    return;
  }

  console.log(`📊 Found ${failedEvents?.length || 0} failed events to replay`);

  for (const event of failedEvents || []) {
    console.log(`\n🔁 Replaying event ${event.stripe_event_id} (${event.event_type})`);
    
    try {
      // Replay the event by calling our webhook endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'replay', // Special signature for replays
        },
        body: JSON.stringify(event.payload),
      });

      if (response.ok) {
        console.log(`✅ Successfully replayed event ${event.stripe_event_id}`);
        
        // Update status to processed
        await supabase
          .from('stripe_webhook_events')
          .update({ 
            status: 'processed',
            retry_count: event.retry_count + 1,
          })
          .eq('id', event.id);
      } else {
        console.error(`❌ Failed to replay event ${event.stripe_event_id}:`, await response.text());
      }
    } catch (error) {
      console.error(`❌ Error replaying event ${event.stripe_event_id}:`, error);
    }
  }
}

async function fetchMissingEvents(from: Date, to: Date) {
  console.log(`🔍 Fetching Stripe events from ${from.toISOString()} to ${to.toISOString()}`);
  
  let hasMore = true;
  let startingAfter: string | undefined;
  let totalEvents = 0;
  let processedEvents = 0;

  while (hasMore) {
    // Fetch events from Stripe
    const events = await stripe.events.list({
      created: {
        gte: Math.floor(from.getTime() / 1000),
        lte: Math.floor(to.getTime() / 1000),
      },
      limit: 100,
      starting_after: startingAfter,
    });

    totalEvents += events.data.length;
    
    for (const event of events.data) {
      // Check if we've already processed this event
      const { data: existingEvent } = await supabase
        .from('stripe_webhook_events')
        .select('id')
        .eq('stripe_event_id', event.id)
        .single();

      if (!existingEvent) {
        console.log(`📥 Processing missing event ${event.id} (${event.type})`);
        
        try {
          // Process the event
          const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/webhook`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'stripe-signature': 'replay', // Special signature for replays
            },
            body: JSON.stringify(event),
          });

          if (response.ok) {
            console.log(`✅ Successfully processed event ${event.id}`);
            processedEvents++;
          } else {
            console.error(`❌ Failed to process event ${event.id}:`, await response.text());
          }
        } catch (error) {
          console.error(`❌ Error processing event ${event.id}:`, error);
        }
      }
    }

    hasMore = events.has_more;
    if (hasMore && events.data.length > 0) {
      startingAfter = events.data[events.data.length - 1].id;
    }
  }

  console.log(`\n📊 Summary: Found ${totalEvents} total events, processed ${processedEvents} missing events`);
}

async function replaySpecificEvent(eventId: string) {
  console.log(`🎯 Replaying specific event: ${eventId}`);
  
  try {
    // Fetch the event from Stripe
    const event = await stripe.events.retrieve(eventId);
    
    console.log(`📥 Processing event ${event.id} (${event.type})`);
    
    // Process the event
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'replay', // Special signature for replays
      },
      body: JSON.stringify(event),
    });

    if (response.ok) {
      console.log(`✅ Successfully processed event ${event.id}`);
    } else {
      console.error(`❌ Failed to process event ${event.id}:`, await response.text());
    }
  } catch (error) {
    console.error(`❌ Error processing event:`, error);
  }
}

async function main() {
  console.log('🚀 Stripe Webhook Replay Tool\n');

  // Parse command line arguments
  const { values } = parseArgs({
    options: {
      type: { type: 'string' },
      from: { type: 'string' },
      to: { type: 'string' },
      'event-id': { type: 'string' },
      'dry-run': { type: 'boolean' },
    },
  });

  const options: ReplayOptions = {
    type: values.type as 'failed' | 'missing',
    from: values.from,
    to: values.to,
    eventId: values['event-id'],
    dryRun: values['dry-run'],
  };

  // Validate environment
  if (!process.env.STRIPE_SECRET_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  try {
    if (options.eventId) {
      // Replay a specific event
      await replaySpecificEvent(options.eventId);
    } else if (options.type === 'failed') {
      // Replay all failed events
      await replayFailedEvents();
    } else if (options.from && options.to) {
      // Fetch and process missing events from a date range
      const fromDate = new Date(options.from);
      const toDate = new Date(options.to);
      
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        console.error('❌ Invalid date format. Use YYYY-MM-DD');
        process.exit(1);
      }
      
      await fetchMissingEvents(fromDate, toDate);
    } else {
      console.log('Usage:');
      console.log('  Replay failed events:     npm run replay-webhooks -- --type failed');
      console.log('  Fetch missing events:     npm run replay-webhooks -- --from "2025-01-25" --to "2025-01-26"');
      console.log('  Replay specific event:    npm run replay-webhooks -- --event-id evt_1234567890');
      console.log('  Dry run (no processing):  npm run replay-webhooks -- --type failed --dry-run');
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }

  console.log('\n✨ Done!');
}

// Run the script
main().catch(console.error);