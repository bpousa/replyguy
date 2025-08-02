import { NextRequest, NextResponse } from 'next/server';

type EventType = 
  | 'user_created'
  | 'user_profile_completed'
  | 'subscription_started'
  | 'subscription_updated'
  | 'payment_failed'
  | 'payment_recovered'
  | 'subscription_canceled'
  | 'trial_ending';

interface GHLWebhookEvent {
  event: EventType;
  userId: string;
  data: any;
  metadata?: Record<string, any>;
  generateTrialToken?: boolean; // Option to generate trial token
}

// Queue for retry logic
const retryQueue: Map<string, { event: GHLWebhookEvent; attempts: number }> = new Map();

// Track recent webhook events to prevent duplicates (in-memory for now)
const recentEvents: Map<string, number> = new Map(); // eventKey -> timestamp
const DEDUP_WINDOW_MS = 30000; // 30 seconds

async function sendEventToGHL(event: GHLWebhookEvent): Promise<boolean> {
  const ghlWebhookUrl = process.env.GHL_WEBHOOK_URL;
  const ghlApiKey = process.env.GHL_API_KEY;
  
  console.log('[GHL webhook] Attempting to send event:', {
    event: event.event,
    userId: event.userId,
    hasWebhookUrl: !!ghlWebhookUrl,
    webhookUrl: ghlWebhookUrl?.substring(0, 50) + '...'
  });
  
  if (!ghlWebhookUrl) {
    console.error('[GHL webhook] GHL_WEBHOOK_URL not configured');
    return false;
  }
  
  try {
    // First, sync the full user data
    const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ghl/sync-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: event.userId })
    });
    
    if (!syncResponse.ok) {
      console.error('Failed to sync user data before sending event');
      return false;
    }
    
    const syncResult = await syncResponse.json();
    const userData = syncResult.results?.[0]?.data;
    
    if (!userData) {
      console.error('No user data found for event');
      return false;
    }
    
    // Send the event with full user data
    const response = await fetch(ghlWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ghlApiKey && { 'Authorization': `Bearer ${ghlApiKey}` })
      },
      body: JSON.stringify({
        event: event.event,
        timestamp: new Date().toISOString(),
        user: userData,
        metadata: event.metadata
      })
    });
    
    if (!response.ok) {
      console.error('GHL webhook failed:', response.status, await response.text());
      return false;
    }
    
    console.log(`✅ GHL event sent: ${event.event} for user ${event.userId}`);
    return true;
    
  } catch (error) {
    console.error('Error sending event to GHL:', error);
    return false;
  }
}

async function processEventWithRetry(event: GHLWebhookEvent, eventId: string) {
  const maxRetries = 3;
  const retryDelay = 5000; // 5 seconds
  
  // Check if already in retry queue
  const existing = retryQueue.get(eventId);
  const attempts = existing ? existing.attempts + 1 : 1;
  
  const success = await sendEventToGHL(event);
  
  if (!success && attempts < maxRetries) {
    // Add to retry queue
    retryQueue.set(eventId, { event, attempts });
    
    // Schedule retry
    setTimeout(async () => {
      console.log(`🔄 Retrying GHL event (attempt ${attempts + 1}/${maxRetries}): ${event.event}`);
      await processEventWithRetry(event, eventId);
    }, retryDelay * attempts);
  } else if (success) {
    // Remove from retry queue if successful
    retryQueue.delete(eventId);
  } else {
    // Max retries reached
    console.error(`❌ Failed to send GHL event after ${maxRetries} attempts: ${event.event}`);
    retryQueue.delete(eventId);
  }
}

export async function POST(req: NextRequest) {
  console.log('[GHL webhook] Received POST request');
  
  try {
    const body = await req.json();
    const { event, userId, data, metadata: initialMetadata, generateTrialToken = true } = body as GHLWebhookEvent;
    
    console.log('[GHL webhook] Request body:', {
      event,
      userId,
      hasData: !!data,
      hasMetadata: !!initialMetadata,
      generateTrialToken
    });
    let metadata = initialMetadata || {};
    
    // Check for duplicate events
    const eventKey = `${event}_${userId}`;
    const now = Date.now();
    const lastEventTime = recentEvents.get(eventKey);
    
    if (lastEventTime && (now - lastEventTime) < DEDUP_WINDOW_MS) {
      console.log(`[GHL webhook] ⚠️ Duplicate event ignored: ${eventKey} (within ${DEDUP_WINDOW_MS}ms)`);
      return NextResponse.json({
        message: 'Duplicate event ignored',
        eventKey,
        timeSinceLastEvent: now - lastEventTime
      });
    }
    
    // Clean up old events (older than 5 minutes)
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    for (const [key, timestamp] of recentEvents.entries()) {
      if (timestamp < fiveMinutesAgo) {
        recentEvents.delete(key);
      }
    }
    
    // Record this event
    recentEvents.set(eventKey, now);
    
    if (!event || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: event, userId' },
        { status: 400 }
      );
    }
    
    // Validate event type
    const validEvents: EventType[] = [
      'user_created',
      'user_profile_completed',
      'subscription_started',
      'subscription_updated',
      'payment_failed',
      'payment_recovered',
      'subscription_canceled',
      'trial_ending'
    ];
    
    if (!validEvents.includes(event)) {
      return NextResponse.json(
        { error: `Invalid event type: ${event}` },
        { status: 400 }
      );
    }
    
    // Check if GHL sync is enabled
    if (process.env.GHL_SYNC_ENABLED !== 'true') {
      return NextResponse.json({
        message: 'GHL sync is disabled',
        received: true
      });
    }
    
    // Generate unique event ID for idempotency
    const eventId = `${event}_${userId}_${Date.now()}`;
    
    // For user_created events, generate trial offer token if requested
    let trialOfferData = null;
    if (event === 'user_created' && generateTrialToken) {
      try {
        const tokenResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/trial-offer/generate-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId, 
            source: 'webhook' 
          })
        });
        
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          trialOfferData = {
            token: tokenData.token,
            url: tokenData.url,
            expires_at: tokenData.expires_at,
            user_email: tokenData.user_email
          };
          console.log(`✅ Trial offer token generated for user ${userId}`);
          
          // Add trial offer info to metadata for GHL
          metadata = {
            ...metadata,
            trial_offer_url: tokenData.url,
            trial_offer_token: tokenData.token,
            trial_expires_at: tokenData.expires_at
          };
        }
      } catch (error) {
        console.error('Failed to generate trial offer token:', error);
      }
    }
    
    // Process event asynchronously with retry
    processEventWithRetry({ event, userId, data, metadata }, eventId)
      .catch(error => console.error('Error in async event processing:', error));
    
    return NextResponse.json({
      message: 'Event received and queued for processing',
      eventId,
      timestamp: new Date().toISOString(),
      ...(trialOfferData && { 
        trial_offer: {
          token: trialOfferData.token,
          url: trialOfferData.url,
          expires_at: trialOfferData.expires_at,
          user_email: trialOfferData.user_email
        }
      })
    });
    
  } catch (error) {
    console.error('GHL webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

// GET endpoint for health check
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    ghlConfigured: !!process.env.GHL_WEBHOOK_URL,
    syncEnabled: process.env.GHL_SYNC_ENABLED === 'true',
    retryQueueSize: retryQueue.size,
    timestamp: new Date().toISOString()
  });
}